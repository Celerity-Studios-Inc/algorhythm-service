import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Skip auth for health checks
    const request = context.switchToHttp().getRequest();
    if (request.url.includes('/health')) {
      return true;
    }

    return super.canActivate(context);
  }
}
