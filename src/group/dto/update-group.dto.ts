import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsOptional()
  @MaxLength(100, { message: 'O nome não pode ter mais que 100 caracteres.' })
  name?: string;

  @IsString({ message: 'A descrição deve ser uma string.' })
  @IsOptional()
  @MaxLength(500, {
    message: 'A descrição não pode ter mais que 500 caracteres.',
  })
  description?: string;
}
