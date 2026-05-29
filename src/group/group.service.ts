import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar novo grupo
   */
  async create(createGroupDto: CreateGroupDto, userId: number) {
    return this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description || null,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'owner',
            inviteStatus: 'accepted',
          },
        },
      },
      include: { members: true },
    });
  }

  /**
   * Listar grupos do usuário (como membro ou owner)
   */
  async findUserGroups(userId: number) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
            inviteStatus: 'accepted',
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obter detalhes do grupo (validar acesso)
   */
  async findOne(id: number, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        boards: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verificar se user é membro
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Você não é membro deste grupo');
    }

    return group;
  }

  /**
   * Obter membros aceitos do grupo (para atribuição de tarefas)
   */
  async getAcceptedMembers(id: number, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            inviteStatus: 'accepted',
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verificar se user é membro
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Você não é membro deste grupo');
    }

    return group.members;
  }

  /**
   * Atualizar grupo (apenas owner/admin)
   */
  async update(id: number, updateGroupDto: UpdateGroupDto, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const member = group.members.find((m) => m.userId === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este grupo',
      );
    }

    return this.prisma.group.update({
      where: { id },
      data: updateGroupDto,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  /**
   * Deletar grupo (apenas owner)
   */
  async remove(id: number, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    if (group.createdBy !== userId) {
      throw new ForbiddenException('Apenas o criador pode deletar o grupo');
    }

    return this.prisma.group.delete({ where: { id } });
  }

  /**
   * Convidar usuário para grupo
   */
  async inviteMember(
    groupId: number,
    inviteDto: InviteMemberDto,
    userId: number,
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const inviterMember = group.members.find((m) => m.userId === userId);
    if (
      !inviterMember ||
      (inviterMember.role !== 'owner' && inviterMember.role !== 'admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para convidar usuários',
      );
    }

    // Encontrar usuário por email
    const userToInvite = await this.prisma.user.findUnique({
      where: { email: inviteDto.email },
    });

    if (!userToInvite) {
      throw new BadRequestException('Usuário com este email não existe');
    }

    // Verificar se já é membro
    const existingMember = group.members.find(
      (m) => m.userId === userToInvite.id,
    );
    if (existingMember) {
      throw new BadRequestException(
        'Este usuário já é membro do grupo ou tem um convite pendente',
      );
    }

    // Criar convite
    return this.prisma.groupMember.create({
      data: {
        groupId,
        userId: userToInvite.id,
        role: inviteDto.role || 'member',
        inviteStatus: 'pending',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Listar convites pendentes do usuário
   */
  async findPendingInvites(userId: number) {
    return this.prisma.groupMember.findMany({
      where: {
        userId,
        inviteStatus: 'pending',
      },
      include: {
        group: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Aceitar convite para grupo
   */
  async acceptInvite(groupId: number, userId: number) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (member.inviteStatus === 'accepted') {
      throw new BadRequestException('Você já é membro deste grupo');
    }

    return this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { inviteStatus: 'accepted' },
      include: {
        group: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Rejeitar convite
   */
  async rejectInvite(groupId: number, userId: number) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Convite não encontrado');
    }

    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /**
   * Remover membro do grupo (owner/admin)
   */
  async removeMember(groupId: number, memberId: number, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const requesterMember = group.members.find((m) => m.userId === userId);
    if (
      !requesterMember ||
      (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para remover membros',
      );
    }

    // Não permitir remover owner
    const targetMember = group.members.find((m) => m.userId === memberId);
    if (targetMember?.role === 'owner') {
      throw new BadRequestException('Não é possível remover o owner');
    }

    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: memberId } },
    });
  }

  /**
   * Listar membros do grupo
   */
  async getGroupMembers(groupId: number, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verificar se user é membro
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Você não é membro deste grupo');
    }

    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
