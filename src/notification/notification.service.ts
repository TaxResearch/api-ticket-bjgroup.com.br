import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { DiscordService } from '../discord/discord.service';
import { User } from '@prisma/client';

const STATUS_LABEL: Record<string, string> = {
  TODO: '📝 TODO',
  DOING: '🔄 Em Andamento',
  DONE: '✅ Concluído',
};

const STATUS_ORDER = ['DOING', 'TODO', 'DONE'];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private discordService: DiscordService,
  ) {}

  // CORREÇÃO: Agora aceita 'string | null' para não quebrar se o usuário não configurou
  private isTodayAllowed(userDays: string | null): boolean {
    if (!userDays) return true; // Se não configurado, permite envio (comportamento padrão)
    const today = new Date().getDay().toString(); // 0=Dom, 1=Seg...
    return userDays.split(',').includes(today);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailySummary() {
    this.logger.log('Rodando resumo diário...');

    // Busca usuários que querem receber notificações por email
    const users = await this.prisma.user.findMany({
      where: { notifyDailySummary: true },
      include: {
        groupMembers: {
          where: { inviteStatus: 'accepted' },
          select: { groupId: true },
        },
      },
    });

    for (const user of users) {
      if (!this.isTodayAllowed(user.notificationDays)) continue;

      const groupIds = user.groupMembers.map((gm) => gm.groupId);

      const pendingTasks = await this.prisma.ticket.findMany({
        where: {
          status: { not: 'DONE' },
          board: {
            OR: [
              { userId: user.id, type: 'personal' },
              { groupId: { in: groupIds }, type: 'group' },
            ],
          },
        },
        include: { board: true },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingTasks.length > 0) {
        // Agrupa tarefas por board para enviar notificações no canal correto
        const tasksByBoard = new Map<number, any[]>();

        pendingTasks.forEach((task) => {
          if (!tasksByBoard.has(task.boardId)) {
            tasksByBoard.set(task.boardId, []);
          }
          tasksByBoard.get(task.boardId)!.push(task);
        });

        // Envia email geral com resumo de todos os boards
        let emailText = `Olá ${user.name}!\n\nVocê tem ${pendingTasks.length} tarefa(s) pendente(s) hoje:\n`;
        pendingTasks.forEach((task) => {
          const prefix =
            task.board.type === 'group' ? '[👥 Grupo]' : '[👤 Pessoal]';
          emailText += `• ${prefix} [${task.board.name}] ${task.title} (${task.status})\n`;
        });

        if (user.notifyDailySummary) {
          this.emailService
            .sendEmail(user.email, 'Seu Resumo Diário - DevDeck', emailText)
            .catch((e) => this.logger.error(`Erro email ${user.email}`, e));
        }

        // Envia para Discord - apenas boards coletivos, tickets sem responsável
        for (const [boardId, tasks] of tasksByBoard.entries()) {
          const board = tasks[0].board;

          if (!board.discordWebhook || board.type !== 'group') continue;

          const unassigned = tasks.filter(
            (t) => t.assignedUserId === null && t.status !== 'DONE',
          );

          if (unassigned.length === 0) continue;

          const ticketList = unassigned
            .map((t) => `• ${t.title}`)
            .join('\n')
            .slice(0, 1024);

          this.discordService
            .sendEmbed(board.discordWebhook, {
              title: `📢 ${board.name} — Tickets Disponíveis`,
              description: 'Os tickets abaixo ainda não têm responsável. Alguém pode pegar!',
              color: 0x5865f2,
              fields: [
                {
                  name: `🎫 Sem responsável (${unassigned.length})`,
                  value: ticketList,
                  inline: false,
                },
              ],
              footer: { text: `${unassigned.length} ticket(s) aguardando atribuição` },
              timestamp: new Date().toISOString(),
            })
            .catch((e) =>
              this.logger.error(`Erro Discord board ${board.name}`, e),
            );
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleStaleTasks() {
    this.logger.log('Verificando tarefas paradas...');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const staleTasks = await this.prisma.ticket.findMany({
      where: {
        status: 'DOING',
        updatedAt: { lt: twoDaysAgo },
      },
      include: {
        board: {
          include: {
            user: true,
            group: {
              include: {
                members: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    // Agrupa tarefas por board para enviar no canal correto
    const tasksByBoard = new Map<number, any[]>();
    const notificationsMap = new Map<number, { user: User; tasks: any[] }>();

    for (const task of staleTasks) {
      // Agrupa por board para Discord
      if (!tasksByBoard.has(task.boardId)) {
        tasksByBoard.set(task.boardId, []);
      }
      tasksByBoard.get(task.boardId)!.push(task);

      // Agrupa por usuário para Email
      const potentialUsers: User[] = [];

      if (task.board.type === 'personal' && task.board.user) {
        potentialUsers.push(task.board.user);
      } else if (task.board.type === 'group' && task.board.group) {
        potentialUsers.push(...task.board.group.members.map((m) => m.user));
      }

      for (const u of potentialUsers) {
        if (u.notifyStaleTasks) {
          if (!notificationsMap.has(u.id)) {
            notificationsMap.set(u.id, { user: u, tasks: [] });
          }
          const entry = notificationsMap.get(u.id);
          if (entry && !entry.tasks.find((t) => t.id === task.id)) {
            entry.tasks.push(task);
          }
        }
      }
    }

    // Envia notificações por Email (agrupadas por usuário)
    for (const { user, tasks } of notificationsMap.values()) {
      if (!this.isTodayAllowed(user.notificationDays)) continue;

      let messageText = `⚠️ Atenção, ${user.name}!\n\nTarefas paradas há mais de 2 dias:\n`;
      tasks.forEach((task) => {
        const boardInfo =
          task.board.type === 'group'
            ? `[👥 ${task.board.name}]`
            : `[👤 ${task.board.name}]`;
        messageText += `• ${boardInfo} ${task.title}\n`;
      });

      if (user.notifyStaleTasks) {
        this.emailService
          .sendEmail(user.email, 'Alerta: Tarefas Paradas', messageText)
          .catch((e) => this.logger.error(`Erro email stale ${user.email}`, e));
      }
    }

    // Envia notificações por Discord (agrupadas por board/canal)
    for (const [boardId, tasks] of tasksByBoard.entries()) {
      const board = tasks[0].board;

      if (board.discordWebhook) {
        const taskList = tasks
          .map((t) => `• ${t.title}`)
          .join('\n')
          .slice(0, 1024);

        this.discordService
          .sendEmbed(board.discordWebhook, {
            title: `⚠️ Tarefas Paradas — ${board.name}`,
            description: `**${tasks.length}** tarefa(s) em **DOING** sem atualização há mais de 2 dias:`,
            color: 0xffa500,
            fields: [{ name: '🔄 Em Andamento', value: taskList }],
            footer: { text: 'Revise e mova ou atualize as tarefas.' },
            timestamp: new Date().toISOString(),
          })
          .catch((e) =>
            this.logger.error(`Erro Discord stale board ${board.name}`, e),
          );
      }
    }

    if (staleTasks.length > 0) {
      await this.prisma.ticket.updateMany({
        where: { id: { in: staleTasks.map((t) => t.id) } },
        data: { updatedAt: new Date() },
      });
    }
  }

  async testDiscordWebhooks(): Promise<string[]> {
    const boards = await this.prisma.board.findMany({
      where: {
        type: 'group',
        discordWebhook: { not: null },
        NOT: { discordWebhook: '' },
      },
      include: {
        tickets: {
          where: { status: { not: 'DONE' }, assignedUserId: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    this.logger.log(`testDiscordWebhooks: ${boards.length} board(s) coletivo(s) com webhook.`);

    const sent: string[] = [];

    for (const board of boards) {
      if (!board.discordWebhook) continue;

      const unassigned = board.tickets;

      if (unassigned.length === 0) {
        await this.discordService.sendEmbed(board.discordWebhook, {
          title: `📢 ${board.name} — Tickets Disponíveis`,
          description: 'Nenhum ticket sem responsável no momento. 🎉',
          color: 0x57f287,
          footer: { text: 'DevDeck · teste de webhook' },
          timestamp: new Date().toISOString(),
        });
      } else {
        const ticketList = unassigned
          .map((t) => `• ${t.title}`)
          .join('\n')
          .slice(0, 1024);

        await this.discordService.sendEmbed(board.discordWebhook, {
          title: `📢 ${board.name} — Tickets Disponíveis`,
          description: 'Os tickets abaixo ainda não têm responsável. Alguém pode pegar!',
          color: 0x5865f2,
          fields: [
            {
              name: `🎫 Sem responsável (${unassigned.length})`,
              value: ticketList,
              inline: false,
            },
          ],
          footer: { text: `${unassigned.length} ticket(s) aguardando atribuição · teste de webhook` },
          timestamp: new Date().toISOString(),
        });
      }

      sent.push(board.name);
    }

    return sent;
  }
}
