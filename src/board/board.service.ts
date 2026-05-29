import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BoardService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createBoardDto: CreateBoardDto) {
    if (createBoardDto.groupId) {
      const groupMember = await this.prisma.groupMember.findFirst({
        where: {
          groupId: createBoardDto.groupId,
          userId: userId,
          role: 'admin',
        },
      });

      if (!groupMember) {
        throw new ForbiddenException(
          'Apenas admins podem criar quadros neste grupo.',
        );
      }

      return this.prisma.board.create({
        data: {
          name: createBoardDto.name,
          type: 'group',
          groupId: createBoardDto.groupId,
        },
      });
    }

    return this.prisma.board.create({
      data: {
        name: createBoardDto.name,
        type: 'personal',
        userId: userId,
      },
    });
  }

  async findAll(userId: number, groupId?: number) {
    if (groupId) {
      const isMember = await this.prisma.groupMember.findFirst({
        where: { groupId, userId, inviteStatus: 'accepted' },
      });

      if (!isMember) {
        throw new ForbiddenException('Você não tem acesso a este grupo.');
      }

      return this.prisma.board.findMany({
        where: { groupId },
        orderBy: { order: 'asc' },
      });
    }

    return this.prisma.board.findMany({
      where: { userId, type: 'personal' },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: { group: { include: { members: true } } },
    });

    if (!board) {
      throw new NotFoundException(`Board com ID ${id} não encontrado.`);
    }

    if (board.type === 'personal') {
      if (board.userId !== userId) {
        throw new ForbiddenException('Acesso negado a este quadro pessoal.');
      }
    } else {
      // CORREÇÃO: Adicionado '?' para evitar erro se group for null
      const isMember = board.group?.members.some(
        (m) => m.userId === userId && m.inviteStatus === 'accepted',
      );
      if (!isMember) {
        throw new ForbiddenException('Você não é membro deste grupo.');
      }
    }

    return board;
  }

  async update(id: number, userId: number, updateBoardDto: UpdateBoardDto) {
    await this.findOne(id, userId);

    if (updateBoardDto.isMainTicketBoard === true) {
      await this.prisma.board.updateMany({
        where: { isMainTicketBoard: true, id: { not: id } },
        data: { isMainTicketBoard: false },
      });
    }

    return this.prisma.board.update({
      where: { id },
      data: updateBoardDto,
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.board.delete({
      where: { id },
    });
  }

  // --- TICKET PÚBLICO ---

  async togglePublic(boardId: number, userId: number, isPublic: boolean) {
    const board = await this.findOne(boardId, userId);

    let token = board.publicToken;

    if (isPublic && !token) {
      token = randomBytes(16).toString('hex');
    }

    return this.prisma.board.update({
      where: { id: boardId },
      data: {
        isPublicTicketBoard: isPublic,
        publicToken: isPublic ? token : board.publicToken,
      },
    });
  }

  async findByPublicToken(token: string) {
    const board = await this.prisma.board.findUnique({
      where: { publicToken: token },
      include: {
        group: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    if (!board || !board.isPublicTicketBoard) {
      throw new NotFoundException(
        'Este quadro de tickets não existe ou foi desativado.',
      );
    }

    return {
      id: board.id,
      name: board.name,
      // CORREÇÃO: Adicionado '?' para segurança
      ownerName: board.type === 'group' ? board.group?.name : board.user?.name,
      type: board.type,
      description: 'Central de Suporte',
    };
  }
}
