import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const MAX_ATTACHMENTS_PER_TASK = 3;

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, taskId: string, file: Express.Multer.File) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new NotFoundException('Task not found');

    const count = await this.prisma.attachment.count({ where: { taskId } });
    if (count >= MAX_ATTACHMENTS_PER_TASK) {
      throw new BadRequestException(`Maximum ${MAX_ATTACHMENTS_PER_TASK} attachments per task`);
    }

    return this.prisma.attachment.create({
      data: {
        taskId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
      },
      select: { id: true, taskId: true, filename: true, mimeType: true, size: true, createdAt: true },
    });
  }

  async download(userId: string, taskId: string, attachmentId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new NotFoundException('Task not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, taskId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    return attachment;
  }

  async remove(userId: string, taskId: string, attachmentId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new NotFoundException('Task not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, taskId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
