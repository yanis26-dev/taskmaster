import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() archived?: boolean;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { tasks: { where: { status: { notIn: ['done', 'canceled'] } } } } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException();
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { userId, name: dto.name, description: dto.description, color: dto.color },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.assertOwner(userId, id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.project.delete({ where: { id } });
  }

  async getTasksForProject(userId: string, projectId: string) {
    await this.assertOwner(userId, projectId);
    return this.prisma.task.findMany({
      where: { projectId, userId },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { dueAt: 'asc' }],
    });
  }

  private async assertOwner(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId } });
    if (!project) throw new NotFoundException();
    if (project.userId !== userId) throw new ForbiddenException();
  }
}
