import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PusherService } from '../pusher/pusher.service';
import { DiscordService } from '../discord/discord.service';
import {
  CreateSubtaskDto,
  CreateCommentDto,
  CreateTaskDto,
  CreateEmployeeTicketDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
  CreateTicketDto,
} from './dto/task.dto';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Na Fila',
  DOING: 'Em Andamento',
  DONE: 'Concluído',
};

// Tags de prioridade são "gerenciadas": entram/saem automaticamente conforme
// a prioridade do ticket, sem mexer nas tags manuais (empresa, categoria...).
const PRIORITY_TAGS: Record<string, string> = {
  HIGH: 'alta',
  URGENT: 'urgente',
};

// Normaliza um texto livre em tag: minúsculas, sem acentos, espaços -> hífen.
function slugifyTag(input?: string | null): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Monta as tags automáticas a partir dos dados que já temos do ticket:
// empresa do solicitante, categoria e primeiro nome de quem abriu.
// Ex.: { TaxResearch, Bug, "Mariana Silva" } -> "taxresearch,bug,mariana".
// A prioridade não entra aqui (no momento da criação é sempre MEDIUM); ela é
// adicionada depois, quando o dev classifica o ticket — ver syncPriorityTag.
function buildTicketTags(opts: {
  company?: string | null;
  category?: string | null;
  requesterName?: string | null;
}): string {
  const tags = [
    slugifyTag(opts.company),
    slugifyTag(opts.category),
    slugifyTag(opts.requesterName?.split(' ')[0]),
  ];
  return [...new Set(tags.filter(Boolean))].join(',');
}

// Mantém a tag de prioridade em sincronia sem destruir as tags manuais:
// remove qualquer token gerenciado (alta/urgente) e re-adiciona o atual.
function syncPriorityTag(
  tagsStr: string | null | undefined,
  priority?: string | null,
): string {
  const managed = Object.values(PRIORITY_TAGS);
  const arr = (tagsStr || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && !managed.includes(t));
  if (priority && PRIORITY_TAGS[priority]) arr.push(PRIORITY_TAGS[priority]);
  return [...new Set(arr)].join(',');
}

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pusherService: PusherService,
    private discordService: DiscordService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: number) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status || 'TODO',
        boardId: createTaskDto.boardId,
        priority: createTaskDto.priority || 'MEDIUM',
        // Prazo de Entrega: derivado das horas estimadas (now + horas).
        dueDate: createTaskDto.estimatedTime
          ? new Date(Date.now() + createTaskDto.estimatedTime * 3600000)
          : createTaskDto.dueDate,
        estimatedTime: createTaskDto.estimatedTime,
        assignedUserId: createTaskDto.assignedUserId,
        requiresValidation: createTaskDto.requiresValidation ?? false,
        // Validador só faz sentido quando exige validação.
        validatorUserId: createTaskDto.requiresValidation
          ? (createTaskDto.validatorUserId ?? null)
          : null,
        tags:
          syncPriorityTag(
            createTaskDto.tags,
            createTaskDto.priority || 'MEDIUM',
          ) || null,
      },
    });
    this.pusherService.trigger('devdeck-tickets', 'ticket.created', {
      ticketId: ticket.id,
      boardId: ticket.boardId,
    });
    return ticket;
  }

  async createPublicTicket(
    publicToken: string,
    createTicketDto: CreateTicketDto,
    files?: Express.Multer.File[],
  ) {
    const board = await this.prisma.board.findUnique({
      where: { publicToken: publicToken },
    });

    if (!board || !board.isPublicTicketBoard) {
      throw new NotFoundException('Quadro de tickets inválido ou desativado.');
    }

    return this.persistPublicTicket(board.id, createTicketDto, files);
  }

  // Cria ticket no board principal (kanban coletivo) sem necessidade de token.
  // Usado pelos painéis da holding que abrem o widget sem captura manual de token.
  async createMainBoardTicket(
    createTicketDto: CreateTicketDto,
    files?: Express.Multer.File[],
  ) {
    const board = await this.prisma.board.findFirst({
      where: { isMainTicketBoard: true },
    });

    if (!board) {
      throw new NotFoundException(
        'Nenhum board principal de tickets configurado. Contate o administrador.',
      );
    }

    return this.persistPublicTicket(board.id, createTicketDto, files);
  }

  private async persistPublicTicket(
    boardId: number,
    createTicketDto: CreateTicketDto,
    files?: Express.Multer.File[],
  ) {
    const attachments = files?.length
      ? JSON.stringify(files.map((f) => `/uploads/${f.filename}`))
      : null;

    const ticket = await this.prisma.ticket.create({
      data: {
        title: createTicketDto.title,
        description: createTicketDto.description,
        status: 'TODO',
        boardId,
        priority: 'MEDIUM',
        isTicket: true,
        requesterName: createTicketDto.requesterName,
        // Normaliza o e-mail (identidade do solicitante) p/ não fragmentar histórico.
        requesterEmail: createTicketDto.requesterEmail?.trim().toLowerCase(),
        requesterCompany: createTicketDto.requesterCompany,
        category: createTicketDto.category,
        tags: buildTicketTags({
          company: createTicketDto.requesterCompany,
          category: createTicketDto.category,
          requesterName: createTicketDto.requesterName,
        }),
        attachments,
      },
    });
    this.pusherService.trigger('devdeck-tickets', 'ticket.created', {
      ticketId: ticket.id,
      boardId: ticket.boardId,
    });
    return ticket;
  }

  async createEmployeeTicket(
    userId: number,
    dto: CreateEmployeeTicketDto,
    files?: Express.Multer.File[],
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const board = await this.prisma.board.findFirst({
      where: { isMainTicketBoard: true },
    });
    if (!board) {
      throw new NotFoundException(
        'Nenhum board principal de tickets configurado. Contate o administrador.',
      );
    }

    const attachments = files?.length
      ? JSON.stringify(files.map((f) => `/uploads/${f.filename}`))
      : null;

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: 'TODO',
        boardId: board.id,
        priority: 'MEDIUM',
        isTicket: true,
        category: dto.category,
        requesterUserId: userId,
        requesterName: user.name,
        requesterEmail: user.email?.trim().toLowerCase(),
        requesterCompany: dto.requesterCompany || user.company,
        tags: buildTicketTags({
          company: dto.requesterCompany || user.company,
          category: dto.category,
          requesterName: user.name,
        }),
        attachments,
      },
    });
    this.pusherService.trigger('devdeck-tickets', 'ticket.created', {
      ticketId: ticket.id,
      boardId: ticket.boardId,
    });
    return ticket;
  }

  async findMyTickets(userId: number) {
    return this.prisma.ticket.findMany({
      where: { requesterUserId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        requesterCompany: true,
        status: true,
        priority: true,
        attachments: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignedUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(boardId: number) {
    return this.prisma.ticket.findMany({
      where: { boardId },
      include: {
        subtasks: { orderBy: { id: 'asc' } },
        assignedUser: { select: { id: true, name: true, email: true } },
        requester: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        subtasks: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, userId?: number) {
    const existing = await this.findOne(id);

    // Validação obrigatória: ticket que exige validação só pode ir para DONE
    // pelas mãos do validador designado — bloqueia o "arrastar para concluir".
    const willRequireValidation =
      updateTaskDto.requiresValidation ?? existing.requiresValidation;
    const effectiveValidator =
      updateTaskDto.validatorUserId !== undefined
        ? updateTaskDto.validatorUserId
        : existing.validatorUserId;
    if (updateTaskDto.status === 'DONE' && willRequireValidation) {
      if (!effectiveValidator || userId !== effectiveValidator) {
        throw new ForbiddenException(
          'Este ticket requer validação. Apenas o validador designado pode concluí-lo.',
        );
      }
    }

    // Prazo de Entrega: a data é derivada das horas estimadas. Só recalcula
    // quando o prazo realmente muda, ancorando em "agora" (reinicia o relógio);
    // outras edições não mexem na data já definida.
    const dueDate =
      updateTaskDto.estimatedTime !== undefined &&
      updateTaskDto.estimatedTime !== existing.estimatedTime
        ? updateTaskDto.estimatedTime
          ? new Date(Date.now() + updateTaskDto.estimatedTime * 3600000)
          : null
        : undefined;

    // Mantém a tag de prioridade sincronizada quando a prioridade ou as tags
    // mudam, sem destruir as tags manuais.
    const tags =
      updateTaskDto.priority !== undefined || updateTaskDto.tags !== undefined
        ? syncPriorityTag(
            updateTaskDto.tags !== undefined
              ? updateTaskDto.tags
              : existing.tags,
            updateTaskDto.priority ?? existing.priority,
          ) || null
        : undefined;

    // Desligar a validação limpa o validador designado.
    const validatorReset =
      updateTaskDto.requiresValidation === false
        ? { validatorUserId: null }
        : {};

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...updateTaskDto,
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...validatorReset,
      },
    });

    // Discord pessoal ao responsável quando ticket é atribuído
    if (
      updateTaskDto.assignedUserId !== undefined &&
      updateTaskDto.assignedUserId !== null &&
      updateTaskDto.assignedUserId !== existing.assignedUserId
    ) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: updateTaskDto.assignedUserId },
      });
      if (assignee?.discordWebhook) {
        this.discordService
          .sendNotification(
            assignee.discordWebhook,
            `🎯 **Novo ticket atribuído a você!**\n\n**${existing.title}**\n${existing.description ? existing.description.substring(0, 200) : ''}\n\nAcesse o DevDeck para ver os detalhes.`,
          )
          .catch((e) => console.error('Erro Discord assign:', e));
      }
    }

    if (
      updateTaskDto.status &&
      updateTaskDto.status !== existing.status &&
      existing.requesterUserId
    ) {
      const requester = await this.prisma.user.findUnique({
        where: { id: existing.requesterUserId },
      });
      if (requester) {
        const statusLabel =
          STATUS_LABELS[updateTaskDto.status] || updateTaskDto.status;
        await this.emailService.sendEmail(
          requester.email,
          `Atualização do seu ticket: ${existing.title}`,
          `Olá ${requester.name},\n\nSeu ticket "${existing.title}" foi atualizado para: ${statusLabel}.\n\nAtt,\nEquipe de Desenvolvimento BJGROUP`,
          `<p>Olá <strong>${requester.name}</strong>,</p><p>Seu ticket <strong>"${existing.title}"</strong> foi atualizado para: <strong>${statusLabel}</strong>.</p><br><p>Att,<br>Equipe de Desenvolvimento BJGROUP</p>`,
        );
      }
    }

    this.pusherService.trigger('devdeck-tickets', 'ticket.updated', {
      ticketId: updated.id,
      status: updated.status,
      assignedUserId: updated.assignedUserId,
    });
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const result = await this.prisma.ticket.delete({ where: { id } });
    this.pusherService.trigger('devdeck-tickets', 'ticket.deleted', {
      ticketId: id,
    });
    return result;
  }

  async createSubtask(ticketId: number, createSubtaskDto: CreateSubtaskDto) {
    return this.prisma.subtask.create({
      data: {
        ticketId,
        title: createSubtaskDto.title,
        completed: createSubtaskDto.completed || false,
      },
    });
  }

  async updateSubtask(
    ticketId: number,
    subtaskId: number,
    updateSubtaskDto: UpdateSubtaskDto,
  ) {
    return this.prisma.subtask.update({
      where: { id: subtaskId, ticketId },
      data: updateSubtaskDto,
    });
  }

  async removeSubtask(ticketId: number, subtaskId: number) {
    return this.prisma.subtask.delete({
      where: { id: subtaskId, ticketId },
    });
  }

  async getComments(ticketId: number) {
    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(ticketId: number, userId: number, dto: CreateCommentDto) {
    const ticket = await this.findOne(ticketId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const comment = await this.prisma.ticketComment.create({
      data: { ticketId, userId, authorName: user.name, content: dto.content },
      include: { user: { select: { id: true, name: true } } },
    });

    if (ticket.requesterEmail) {
      const requesterName = ticket.requesterName || 'Cliente';
      const htmlBody = `<p>Olá <strong>${requesterName}</strong>,</p><p><strong>${user.name}</strong> enviou uma mensagem sobre seu ticket <strong>"${ticket.title}"</strong>:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:16px 0;color:#333">${dto.content.replace(/\n/g, '<br>')}</blockquote><p>Att,<br>Equipe de Desenvolvimento BJGROUP</p>`;
      this.emailService
        .sendEmail(
          ticket.requesterEmail,
          `Nova mensagem sobre seu ticket: ${ticket.title}`,
          `Olá ${requesterName},\n\n${user.name} enviou uma mensagem sobre seu ticket "${ticket.title}":\n\n"${dto.content}"\n\nAtt,\nEquipe de Desenvolvimento BJGROUP`,
          htmlBody,
        )
        .catch((e) => console.error('Erro email comment:', e));
    }

    this.pusherService.trigger('devdeck-tickets', 'ticket.comment', {
      ticketId,
      commentId: comment.id,
    });

    return comment;
  }

  async findMyAssignedTasks(userId: number) {
    return this.prisma.ticket.findMany({
      where: { assignedUserId: userId, status: { not: 'DONE' } },
      include: {
        subtasks: { orderBy: { id: 'asc' } },
        assignedUser: { select: { id: true, name: true, email: true } },
        requester: {
          select: { id: true, name: true, email: true, company: true },
        },
        board: { select: { id: true, name: true, groupId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUnassignedGroupTasks(userId: number) {
    return this.prisma.ticket.findMany({
      where: {
        assignedUserId: null,
        status: { not: 'DONE' },
        OR: [
          {
            board: {
              type: 'group',
              group: {
                members: { some: { userId, inviteStatus: 'accepted' } },
              },
            },
          },
          { board: { isMainTicketBoard: true } },
        ],
      },
      include: {
        subtasks: { orderBy: { id: 'asc' } },
        requester: {
          select: { id: true, name: true, email: true, company: true },
        },
        board: {
          select: {
            id: true,
            name: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findCompletedTasks(userId: number) {
    return this.prisma.ticket.findMany({
      where: {
        status: 'DONE',
        board: {
          OR: [
            { userId },
            {
              type: 'group',
              group: {
                members: { some: { userId, inviteStatus: 'accepted' } },
              },
            },
          ],
        },
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        requester: {
          select: { id: true, name: true, email: true, company: true },
        },
        board: { select: { id: true, name: true, groupId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
