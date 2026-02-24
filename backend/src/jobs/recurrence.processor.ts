import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_RECURRENCE } from './queue-names';
import { PrismaService } from '../common/prisma/prisma.service';
import { RecurrenceService } from '../tasks/recurrence.service';

export const JOB_GENERATE_RECURRENCES = 'generate-recurrences';

@Processor(QUEUE_RECURRENCE)
export class RecurrenceProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurrenceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurrence: RecurrenceService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === JOB_GENERATE_RECURRENCES) {
      const spawned = await this.recurrence.generatePendingRecurrences();
      this.logger.log(`Recurrence job complete: ${spawned} tasks spawned`);
      return { spawned };
    }
  }
}
