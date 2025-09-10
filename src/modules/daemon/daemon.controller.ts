import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DaemonService } from './daemon.service';
import { ScoreComputationService } from './score-computation.service';
import { IndexBuilderService } from './index-builder.service';

@ApiTags('Daemon')
@Controller('api/v1/daemon')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DaemonController {
  constructor(
    private readonly daemonService: DaemonService,
    private readonly scoreComputationService: ScoreComputationService,
    private readonly indexBuilderService: IndexBuilderService,
  ) {}

  @Post('trigger-index-build')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger recommendation index build' })
  @ApiResponse({ status: 200, description: 'Index build triggered successfully' })
  async triggerIndexBuild() {
    await this.daemonService.triggerIndexBuild();
    return { message: 'Index build triggered successfully' };
  }

  @Post('trigger-score-update')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger compatibility score update' })
  @ApiResponse({ status: 200, description: 'Score update triggered successfully' })
  async triggerScoreUpdate() {
    await this.daemonService.triggerScoreUpdate();
    return { message: 'Score update triggered successfully' };
  }

  @Get('stats')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get daemon statistics' })
  @ApiResponse({ status: 200, description: 'Daemon statistics retrieved successfully' })
  async getStats() {
    const scoreStats = await this.scoreComputationService.getScoreStats();
    return {
      score_stats: scoreStats,
      last_updated: new Date(),
    };
  }

  @Post('warm-cache')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually warm up cache' })
  @ApiResponse({ status: 200, description: 'Cache warmed up successfully' })
  async warmCache() {
    await this.indexBuilderService.warmUpCache();
    return { message: 'Cache warmed up successfully' };
  }

  @Post('cleanup')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger cleanup' })
  @ApiResponse({ status: 200, description: 'Cleanup triggered successfully' })
  async triggerCleanup() {
    await this.indexBuilderService.cleanupOldData();
    return { message: 'Cleanup triggered successfully' };
  }
}
