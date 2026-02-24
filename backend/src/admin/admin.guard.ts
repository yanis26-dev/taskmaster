import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest();
    const user = await this.prisma.user.findUnique({ where: { id: req.user?.sub } });
    if (user?.role !== 'admin') throw new ForbiddenException('Admin access required');
    return true;
  }
}
