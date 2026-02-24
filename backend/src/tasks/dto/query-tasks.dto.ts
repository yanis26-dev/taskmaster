import { IsOptional, IsEnum, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class QueryTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: TaskStatus[];

  @IsOptional()
  @IsEnum(TaskPriority, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  priority?: TaskPriority[];

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  /** due_at date range: YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  /** Free-text search across title + notes */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeCompleted?: boolean;
}
