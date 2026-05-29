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

const uploadStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto, req.user.userId);
  }

  // ROTA PÚBLICA: Criar Ticket (Sem Guard)
  @Post('ticket/:token')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, { storage: uploadStorage }),
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
    FilesInterceptor('attachments', 5, { storage: uploadStorage }),
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

  @UseGuards(JwtAuthGuard)
  @Get('my-tasks')
  findMyTasks(@Req() req) {
    return this.taskService.findMyAssignedTasks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unassigned')
  findUnassigned(@Req() req) {
    return this.taskService.findUnassignedGroupTasks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  findHistory(@Req() req) {
    return this.taskService.findCompletedTasks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('boardId') boardId: string) {
    return this.taskService.findAll(+boardId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(+id, updateTaskDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.remove(+id);
  }

  // Comments
  @UseGuards(JwtAuthGuard)
  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.taskService.getComments(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req,
  ) {
    return this.taskService.addComment(+id, req.user.userId, dto);
  }

  // Subtasks
  @UseGuards(JwtAuthGuard)
  @Post(':id/subtasks')
  createSubtask(
    @Param('id') id: string,
    @Body() createSubtaskDto: CreateSubtaskDto,
  ) {
    return this.taskService.createSubtask(+id, createSubtaskDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
  ) {
    return this.taskService.updateSubtask(+id, +subtaskId, updateSubtaskDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/subtasks/:subtaskId')
  removeSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
  ) {
    return this.taskService.removeSubtask(+id, +subtaskId);
  }
}
