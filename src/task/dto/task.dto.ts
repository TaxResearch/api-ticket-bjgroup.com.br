import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
} from 'class-validator';

// Empresas da holding BJGROUP — usado na validação e no formulário público.
export const HOLDING_COMPANIES = [
  'Previnity',
  'TaxResearch',
  'OkCarro',
  'Aplicari',
] as const;

// Enum para prioridade (opcional, mas bom para padronizar)
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @IsNotEmpty() // boardId continua obrigatório para tarefas internas
  boardId: number;

  // --- NOVOS CAMPOS ---
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: string; // Default será MEDIUM no banco

  @IsInt()
  @IsOptional()
  estimatedTime?: number; // Prazo de Entrega em horas (deriva o dueDate)

  @IsDateString()
  @IsOptional()
  dueDate?: string; // Data ISO 8601 (derivada de estimatedTime no service)

  @IsString()
  @IsOptional()
  tags?: string; // "bug,front,api"

  @IsInt()
  @IsOptional()
  assignedUserId?: number; // Pessoa responsável pela task

  @IsBoolean()
  @IsOptional()
  requiresValidation?: boolean; // Exige validação antes de concluir

  @IsInt()
  @IsOptional()
  validatorUserId?: number; // Dev designado para validar (quando requiresValidation)
}

// NOVO: DTO Exclusivo para Tickets Públicos (Não pede boardId, pede Token na URL)
export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Seu nome é obrigatório.' })
  requesterName: string;

  @IsEmail({}, { message: 'Forneça um email válido para contato.' })
  @IsNotEmpty()
  requesterEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'A empresa é obrigatória.' })
  @IsIn(HOLDING_COMPANIES as unknown as string[], {
    message: 'Selecione uma empresa válida do grupo.',
  })
  requesterCompany: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class CreateEmployeeTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  category: string;

  @IsString()
  @IsOptional()
  @IsIn(HOLDING_COMPANIES as unknown as string[], {
    message: 'Selecione uma empresa válida do grupo.',
  })
  requesterCompany?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsInt()
  @IsOptional()
  boardId?: number;

  @IsInt()
  @IsOptional()
  assignedUserId?: number;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: string;

  @IsInt()
  @IsOptional()
  estimatedTime?: number; // Prazo de Entrega em horas (deriva o dueDate)

  @IsDateString()
  @IsOptional()
  dueDate?: string; // Derivada de estimatedTime no service

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  requiresValidation?: boolean;

  @IsInt()
  @IsOptional()
  validatorUserId?: number; // Dev designado para validar (quando requiresValidation)
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

// Mantive Subtasks igual
export class CreateSubtaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}

export class UpdateSubtaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
