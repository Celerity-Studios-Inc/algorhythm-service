import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ReVizCompleteExperienceService, ReVizCompleteRequest, ReVizCompleteResponse } from './reviz-complete-experience.service';

@Controller('api/v1/reviz')
export class ReVizCompleteExperienceController {
  private readonly logger = new Logger(ReVizCompleteExperienceController.name);

  constructor(
    private readonly revizCompleteExperienceService: ReVizCompleteExperienceService,
  ) {}

  @Post('complete-experience')
  async getCompleteExperience(
    @Body() request: ReVizCompleteRequest,
  ): Promise<ReVizCompleteResponse> {
    this.logger.log(`🎬 ReViz complete experience request for song: ${request.song_id}`);
    
    try {
      const result = await this.revizCompleteExperienceService.getCompleteExperience(request);
      
      this.logger.log(`✅ ReViz complete experience successful: ${result.data.performance_metrics.total_assets_loaded} assets loaded`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ ReViz complete experience failed: ${error.message}`);
      throw error;
    }
  }
}
