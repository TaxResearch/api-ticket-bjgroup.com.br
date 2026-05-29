/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const user = await this.userService.findOneById(req.user.userId);
    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // Rota para atualizar as configurações
  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateSettings(
    @Req() req,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    const userId = req.user.userId;
    return this.userService.updateSettings(userId, updateUserSettingsDto);
  }
}
