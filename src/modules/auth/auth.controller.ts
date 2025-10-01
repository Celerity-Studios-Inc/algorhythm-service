import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtFallbackGuard } from './guards/jwt-fallback.guard';

@Controller('auth')
export class AuthController {
  constructor(private configService: ConfigService) {}

  @Get('debug')
  debugEnvironmentVariables() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const nnaJwtSecret = this.configService.get<string>('NNA_REGISTRY_JWT_SECRET');
    
    return {
      jwtSecret: {
        loaded: !!jwtSecret,
        length: jwtSecret ? jwtSecret.length : 0,
        preview: jwtSecret ? `${jwtSecret.substring(0, 8)}...` : 'undefined'
      },
      nnaJwtSecret: {
        loaded: !!nnaJwtSecret,
        length: nnaJwtSecret ? nnaJwtSecret.length : 0,
        preview: nnaJwtSecret ? `${nnaJwtSecret.substring(0, 8)}...` : 'undefined'
      },
      timestamp: new Date().toISOString()
    };
  }

  @Post('test-jwt')
  @UseGuards(JwtFallbackGuard)
  testJwtFallback(@Body() body: any) {
    return {
      success: true,
      message: 'JWT fallback authentication successful',
      user: body.user || 'No user data in body',
      timestamp: new Date().toISOString()
    };
  }
}