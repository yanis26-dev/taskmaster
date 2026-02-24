import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() u: JwtPayload) { return this.svc.findAll(u.sub); }

  @Get(':id')
  findOne(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.svc.findOne(u.sub, id); }

  @Get(':id/tasks')
  getTasks(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.svc.getTasksForProject(u.sub, id); }

  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateProjectDto) { return this.svc.create(u.sub, dto); }

  @Put(':id')
  update(@CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.svc.update(u.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.svc.remove(u.sub, id); }
}
