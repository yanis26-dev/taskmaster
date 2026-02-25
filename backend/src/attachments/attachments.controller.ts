import {
  Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors,
  UploadedFile, ParseFilePipe, MaxFileSizeValidator, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @UploadedFile(new ParseFilePipe({
      validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
    }))
    file: Express.Multer.File,
  ) {
    return this.attachmentsService.upload(user.sub, taskId, file);
  }

  @Get(':attachmentId')
  @ApiOperation({ summary: 'Download an attachment' })
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentsService.download(user.sub, taskId, attachmentId);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      'Content-Length': attachment.size,
    });
    res.send(attachment.data);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachmentsService.remove(user.sub, taskId, attachmentId);
  }
}
