import { Controller, Post, Headers, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DaemonService } from './daemon.service';

@ApiTags('Daemon')
@Controller('api/v1/daemon/admin-key')
export class DaemonBypassController {
  constructor(private readonly daemonService: DaemonService) {}

  /**
   * Temporary admin-key protected trigger for index rebuilds.
   * Auth: provide header x-admin-api-key matching process.env.ADMIN_API_KEY
   */
  @Post('trigger-index-build')
  @ApiOperation({ summary: 'Trigger index build (temporary admin-key bypass)' })
  @ApiResponse({ status: 200, description: 'Index build triggered successfully' })
  async triggerIndexBuildWithAdminKey(
    @Headers('x-admin-api-key') adminKey?: string,
  ) {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) {
      throw new BadRequestException('ADMIN_API_KEY not configured');
    }
    if (!adminKey || adminKey !== expected) {
      throw new ForbiddenException('Invalid admin API key');
    }

    await this.daemonService.triggerIndexBuild();
    return { message: 'Index build triggered successfully' };
  }
}


