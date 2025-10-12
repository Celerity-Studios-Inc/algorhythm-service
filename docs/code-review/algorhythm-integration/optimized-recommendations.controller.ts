import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { OptimizedRecommendationsService } from './optimized-recommendations.service';
import { CompositeRecommendationsService } from './composite-recommendations.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { CompositeRecommendationDto } from './dto/composite-recommendation.dto';

@Controller('recommend')
@UseGuards(ApiKeyGuard)
export class OptimizedRecommendationsController {
  constructor(
    private readonly optimizedRecommendationsService: OptimizedRecommendationsService,
    private readonly compositeRecommendationsService: CompositeRecommendationsService,
  ) {}

  /**
   * 🚀 OPTIMIZED: Fast template recommendations
   */
  @Post('template')
  async getTemplateRecommendation(@Body() request: TemplateRecommendationDto) {
    return await this.optimizedRecommendationsService.getTemplateRecommendation(request);
  }

  /**
   * 🚀 NEW: Composite-based recommendations (ReViz developer requested)
   */
  @Post('composite')
  async getCompositeRecommendation(@Body() request: CompositeRecommendationDto) {
    return await this.compositeRecommendationsService.getCompositeRecommendation(request);
  }

  /**
   * 🚀 OPTIMIZED: Batch template recommendations
   */
  @Post('template/batch')
  async getBatchTemplateRecommendations(@Body() requests: TemplateRecommendationDto[]) {
    return await this.optimizedRecommendationsService.getBatchTemplateRecommendations(requests);
  }

  /**
   * 🚀 OPTIMIZED: Batch composite recommendations
   */
  @Post('composite/batch')
  async getBatchCompositeRecommendations(@Body() requests: CompositeRecommendationDto[]) {
    return await this.compositeRecommendationsService.getBatchCompositeRecommendations(requests);
  }

  /**
   * 🚀 CACHE WARMING: Warm cache for popular songs
   */
  @Post('warm-cache')
  async warmCache(@Body() body: { song_ids: string[] }) {
    await this.optimizedRecommendationsService.warmCacheForPopularSongs(body.song_ids);
    return {
      success: true,
      message: `Cache warmed for ${body.song_ids.length} songs`,
      timestamp: new Date().toISOString(),
    };
  }
}
