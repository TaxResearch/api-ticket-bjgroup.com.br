import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createBoardDto: CreateBoardDto) {
    return this.boardService.create(req.user.userId, createBoardDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req, @Query('groupId') groupId?: string) {
    const parsedGroupId = groupId ? parseInt(groupId) : undefined;
    return this.boardService.findAll(req.user.userId, parsedGroupId);
  }

  // ROTA PÚBLICA (Sem Guard): Obter dados do board pelo token
  @Get('public/:token')
  async getPublicBoardInfo(@Param('token') token: string) {
    return this.boardService.findByPublicToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.boardService.findOne(+id, req.user.userId);
  }

  // ROTA PROTEGIDA: Ativar/Desativar Tickets
  @UseGuards(JwtAuthGuard)
  @Patch(':id/public-toggle')
  async togglePublic(
    @Param('id', ParseIntPipe) id: number,
    @Body('isPublic', ParseBoolPipe) isPublic: boolean,
    @Req() req,
  ) {
    return this.boardService.togglePublic(id, req.user.userId, isPublic);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req,
    @Body() updateBoardDto: UpdateBoardDto,
  ) {
    return this.boardService.update(+id, req.user.userId, updateBoardDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.boardService.remove(+id, req.user.userId);
  }
}
