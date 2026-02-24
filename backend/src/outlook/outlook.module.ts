import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutlookService } from './outlook.service';
import { OutlookController } from './outlook.controller';
import { WebhookController } from './webhook.controller';
import { AuthModule } from '../auth/auth.module';
import { QUEUE_WEBHOOK } from '../jobs/queue-names';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_WEBHOOK }),
    AuthModule,
  ],
  controllers: [OutlookController, WebhookController],
  providers: [OutlookService],
  exports: [OutlookService],
})
export class OutlookModule {}
