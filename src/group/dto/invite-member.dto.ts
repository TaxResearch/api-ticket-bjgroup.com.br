import { IsEmail, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class InviteMemberDto {
  @IsEmail({}, { message: 'Por favor, forneça um email válido.' })
  @IsNotEmpty({ message: 'O email não pode estar vazio.' })
  email: string;

  @IsOptional()
  @IsIn(['admin', 'member'], {
    message: 'O role deve ser "admin" ou "member".',
  })
  role?: string;
}
