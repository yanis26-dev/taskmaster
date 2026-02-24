import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

export class TransitionTaskDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
