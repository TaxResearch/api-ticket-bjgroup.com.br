import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  CreateCommentDto,
  CreateEmployeeTicketDto,
  UpdateTaskDto,
  CreateSubtaskDto,
  UpdateSubtaskDto,
  CreateTicketDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevTeamGuard } from '../auth/dev-team.guard';

const uploadStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

// Upload de anexos: limita tamanho e tipo (endpoints públicos sem auth).
const ALLOWED_UPLOAD = /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|txt|csv)$/i;
const uploadOptions = {
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB por arquivo
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (ALLOWED_UPLOAD.test(file.originalname)) cb(null, true);
    else cb(new BadRequestException('Tipo de arquivo não permitido.'), false);
  },
};

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Post()
  create(@Req() req, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto, req.user.userId);
  }

  // ROTA PÚBLICA: Criar Ticket no board principal (Sem Guard, Sem Token).
  // Cai no kanban coletivo (isMainTicketBoard) — sem captura manual de token.
  @Post('ticket')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, uploadOptions),
  )
  async createMainTicket(
    @Body() createTicketDto: CreateTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.createMainBoardTicket(createTicketDto, files);
  }

  // ROTA PÚBLICA: Criar Ticket (Sem Guard)
  @Post('ticket/:token')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, uploadOptions),
  )
  async createTicket(
    @Param('token') token: string,
    @Body() createTicketDto: CreateTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.createPublicTicket(token, createTicketDto, files);
  }

  // Funcionário autenticado abre ticket no board principal
  @UseGuards(JwtAuthGuard)
  @Post('employee-submit')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, uploadOptions),
  )
  createEmployeeTicket(
    @Req() req,
    @Body() dto: CreateEmployeeTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.createEmployeeTicket(req.user.userId, dto, files);
  }

  // Funcionário vê seus próprios tickets
  @UseGuards(JwtAuthGuard)
  @Get('my-tickets')
  findMyTickets(@Req() req) {
    return this.taskService.findMyTickets(req.user.userId);
  }

  // Acompanhamento pelo portal: o solicitante lê a conversa do SEU ticket.
  // Sem DevTeamGuard — ownership é validado no service por requesterUserId.
  @UseGuards(JwtAuthGuard)
  @Get('my-tickets/:id/comments')
  getMyTicketComments(@Req() req, @Param('id') id: string) {
    return this.taskService.findMyTicketComments(req.user.userId, +id);
  }

  // Acompanhamento pelo portal: o solicitante responde no SEU ticket (com anexos).
  @UseGuards(JwtAuthGuard)
  @Post('my-tickets/:id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 5, uploadOptions))
  addMyTicketComment(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.addMyTicketComment(req.user.userId, +id, dto, files);
  }

  // --- Acompanhamento embutido no painel (widget): escopo por e-mail via token ---
  // Sem guard: a autorização é a verificação do token assinado (HMAC) no service.
  // Rotas estáticas declaradas ANTES das genéricas :id para não colidir.
  @Get('track/tickets')
  trackTickets(@Query('token') token: string) {
    return this.taskService.findTicketsByTrack(token);
  }

  @Get('track/tickets/:id/comments')
  trackComments(@Query('token') token: string, @Param('id') id: string) {
    return this.taskService.findTrackComments(token, +id);
  }

  @Post('track/tickets/:id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 5, uploadOptions))
  addTrackComment(
    @Query('token') token: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.addTrackComment(token, +id, dto, files);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get('my-tasks')
  findMyTasks(@Req() req) {
    return this.taskService.findMyAssignedTasks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get('unassigned')
  findUnassigned(@Req() req) {
    return this.taskService.findUnassignedGroupTasks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get('history')
  findHistory(@Req() req) {
    return this.taskService.findCompletedTasks(req.user.userId);
  }

  // Fila "Aguardando minha validação" — rota estática antes de :id.
  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get('awaiting-validation')
  findAwaitingValidation(@Req() req) {
    return this.taskService.findAwaitingMyValidation(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get()
  findAll(@Query('boardId') boardId: string) {
    return this.taskService.findAll(+boardId);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    return this.taskService.update(+id, updateTaskDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.remove(+id);
  }

  // Comments
  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.taskService.getComments(+id);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Post(':id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 5, uploadOptions))
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.taskService.addComment(+id, req.user.userId, dto, files);
  }

  // Subtasks
  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Post(':id/subtasks')
  createSubtask(
    @Param('id') id: string,
    @Body() createSubtaskDto: CreateSubtaskDto,
  ) {
    return this.taskService.createSubtask(+id, createSubtaskDto);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
  ) {
    return this.taskService.updateSubtask(+id, +subtaskId, updateSubtaskDto);
  }

  @UseGuards(JwtAuthGuard, DevTeamGuard)
  @Delete(':id/subtasks/:subtaskId')
  removeSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
  ) {
    return this.taskService.removeSubtask(+id, +subtaskId);
  }
}
