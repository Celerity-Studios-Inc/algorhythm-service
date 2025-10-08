import { Controller, Post, Body, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReVizCompleteExperienceEnhancedService, ReVizCompleteRequest, ReVizCompleteResponse } from './reviz-complete-experience-enhanced.service';

/**
 * 🔧 V2.0: Enhanced ReViz Complete Experience Controller
 * GCP URL-based architecture - no streaming needed (responses always small)
 */
@Controller('api/v1/reviz')
@UseGuards(JwtAuthGuard)
export class ReVizCompleteExperienceEnhancedController {
  private readonly logger = new Logger(ReVizCompleteExperienceEnhancedController.name);

  constructor(
    private readonly revizService: ReVizCompleteExperienceEnhancedService
  ) {}

  /**
   * 🔧 V2.0: Simple endpoint - no streaming needed (responses always small)
   */
  @Post('complete-experience')
  async getCompleteExperience(
    @Body() request: ReVizCompleteRequest
  ): Promise<ReVizCompleteResponse> {
    this.logger.log(`Processing complete experience request for song: ${request.song_id}`);
    return await this.revizService.getCompleteExperience(request);
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0',
      architecture: 'GCP URL-based'
    };
  }
}
