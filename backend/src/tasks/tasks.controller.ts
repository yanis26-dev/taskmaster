import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto, TransitionTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryTasksDto) {
    return this.tasksService.findAll(user.sub, query);
  }

  @Get('today')
  @ApiOperation({ summary: 'Tasks due today + overdue' })
  findToday(@CurrentUser() user: JwtPayload) {
    return this.tasksService.findToday(user.sub);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Tasks in next 14 days' })
  findUpcoming(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
    return this.tasksService.findUpcoming(user.sub, days);
  }

  @Get('backlog')
  @ApiOperation({ summary: 'Unscheduled backlog tasks' })
  findBacklog(@CurrentUser() user: JwtPayload) {
    return this.tasksService.findBacklog(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task detail with activity log' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.findOne(user.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Full task update' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user.sub, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partial task update' })
  patch(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user.sub, id, dto);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition task status' })
  transition(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
  ) {
    return this.tasksService.transition(user.sub, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.remove(user.sub, id);
  }
}
