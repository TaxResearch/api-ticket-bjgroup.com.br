import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsInt,
  IsBoolean,
  ValidateNested,
  IsIn,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoardDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome não pode estar vazio.' })
  @MaxLength(100, { message: 'O nome não pode ter mais que 100 caracteres.' })
  name: string;

  @IsOptional()
  @IsIn(['personal', 'group'], {
    message: 'O tipo deve ser "personal" ou "group".',
  })
  type?: string;

  @IsOptional()
  @IsInt({ message: 'O ID do grupo deve ser um número inteiro.' })
  groupId?: number;

  @IsOptional()
  @ValidateIf((o) => o.discordWebhook !== null && o.discordWebhook !== '')
  @IsString()
  @IsUrl({}, { message: 'A URL do Webhook do Discord é inválida.' })
  @MaxLength(255, {
    message: 'O webhook não pode ter mais que 255 caracteres.',
  })
  discordWebhook?: string | null;
}

export class UpdateBoardDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome não pode estar vazio.' })
  @MaxLength(100, { message: 'O nome não pode ter mais que 100 caracteres.' })
  @IsOptional()
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.discordWebhook !== null && o.discordWebhook !== '')
  @IsString()
  @IsUrl({}, { message: 'A URL do Webhook do Discord é inválida.' })
  @MaxLength(255, {
    message: 'O webhook não pode ter mais que 255 caracteres.',
  })
  discordWebhook?: string | null;

  @IsOptional()
  @IsBoolean()
  isMainTicketBoard?: boolean;
}

export class BoardOrderDto {
  @IsInt({ message: 'O ID deve ser um número inteiro.' })
  id: number;

  @IsInt({ message: 'A ordem deve ser um número inteiro.' })
  order: number;
}

export class ReorderBoardsDto {
  @IsArray({ message: 'Boards deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => BoardOrderDto)
  boards: BoardOrderDto[];
}
