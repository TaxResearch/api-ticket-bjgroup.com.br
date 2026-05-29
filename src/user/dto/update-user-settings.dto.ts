import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  notifyDailySummary?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyStaleTasks?: boolean;

  @IsString()
  @IsUrl({}, { message: 'A URL do Webhook do Discord é inválida.' })
  @IsOptional()
  discordWebhook?: string;

  @IsString()
  @IsOptional()
  notificationDays?: string;
}
