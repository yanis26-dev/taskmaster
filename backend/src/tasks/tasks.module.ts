import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { RecurrenceService } from './recurrence.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, RecurrenceService],
  exports: [TasksService, RecurrenceService],
})
export class TasksModule {}
