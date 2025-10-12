import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtFallbackGuard } from './guards/jwt-fallback.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller('auth')
export class AuthController {
  constructor(private configService: ConfigService) {}

  @Get('debug')
  debugEnvironmentVariables() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const nnaJwtSecret = this.configService.get<string>('NNA_REGISTRY_JWT_SECRET');
    const revizApiKey = this.configService.get<string>('REVIZ_API_KEY');
    
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
      revizApiKey: {
        loaded: !!revizApiKey,
        length: revizApiKey ? revizApiKey.length : 0,
        preview: revizApiKey ? `${revizApiKey.substring(0, 8)}...` : 'undefined'
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

  @Post('test-api-key')
  @UseGuards(ApiKeyGuard)
  testApiKey(@Body() body: any) {
    return {
      success: true,
      message: 'API key authentication successful',
      user: body.user || 'No user data in body',
      timestamp: new Date().toISOString()
    };
  }
}