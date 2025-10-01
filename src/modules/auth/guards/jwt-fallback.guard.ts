import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtFallbackGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Try AlgoRhythm JWT secret first
      const algorhythmSecret = this.configService.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, algorhythmSecret) as any;
      
      request.user = {
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role || 'user',
        tokenSource: 'algorhythm'
      };
      
      return true;
      } catch (algorhythmError) {
        // If AlgoRhythm verification fails, try NNA Registry JWT secret as fallback
        try {
          const nnaSecret = this.configService.get<string>('NNA_REGISTRY_JWT_SECRET');
          console.log('🔍 JWT Fallback Debug: NNA_REGISTRY_JWT_SECRET loaded:', nnaSecret ? 'YES' : 'NO');
          console.log('🔍 JWT Fallback Debug: Secret length:', nnaSecret ? nnaSecret.length : 0);
          if (!nnaSecret) {
            throw new UnauthorizedException('NNA Registry JWT secret not configured');
          }

        const payload = jwt.verify(token, nnaSecret) as any;
        
        request.user = {
          userId: payload.userId || payload.sub,
          email: payload.email,
          role: payload.role || 'user',
          tokenSource: 'nna_registry'
        };
        
        return true;
      } catch (nnaError) {
        throw new UnauthorizedException('Invalid token from both AlgoRhythm and NNA Registry');
      }
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
