/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /**
   * POST /api/groups
   * Criar novo grupo
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGroupDto: CreateGroupDto, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.create(createGroupDto, userId);
  }

  /**
   * GET /api/groups
   * Listar grupos do usuário
   */
  @Get()
  async findAll(@Req() req) {
    const userId = req.user.userId;
    return this.groupService.findUserGroups(userId);
  }

  /**
   * GET /api/groups/invites/pending
   * Listar convites pendentes
   */
  @Get('invites/pending')
  async getPendingInvites(@Req() req) {
    const userId = req.user.userId;
    return this.groupService.findPendingInvites(userId);
  }

  /**
   * GET /api/groups/:id/members
   * Obter membros aceitos do grupo (para atribuição de tarefas)
   */
  @Get(':id/members')
  async getAcceptedMembers(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.getAcceptedMembers(id, userId);
  }

  /**
   * GET /api/groups/:id
   * Detalhes do grupo
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.findOne(id, userId);
  }

  /**
   * PATCH /api/groups/:id
   * Atualizar grupo
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.groupService.update(id, updateGroupDto, userId);
  }

  /**
   * DELETE /api/groups/:id
   * Deletar grupo
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.remove(id, userId);
  }

  /**
   * POST /api/groups/:id/invite
   * Convidar usuário para grupo
   */
  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() inviteDto: InviteMemberDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.groupService.inviteMember(id, inviteDto, userId);
  }

  /**
   * POST /api/groups/:id/accept-invite
   * Aceitar convite para grupo
   */
  @Post(':id/accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.acceptInvite(id, userId);
  }

  /**
   * POST /api/groups/:id/reject-invite
   * Rejeitar convite
   */
  @Post(':id/reject-invite')
  @HttpCode(HttpStatus.OK)
  async rejectInvite(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.rejectInvite(id, userId);
  }

  /**
   * GET /api/groups/:id/members
   * Listar membros do grupo
   */
  @Get(':id/members')
  async getMembers(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.userId;
    return this.groupService.getGroupMembers(id, userId);
  }

  /**
   * DELETE /api/groups/:id/members/:memberId
   * Remover membro do grupo
   */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.groupService.removeMember(id, memberId, userId);
  }
}
