import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplateRecommendationController } from './template-recommendation.controller';
import { TemplateRecommendationService } from './template-recommendation.service';

@Module({
  imports: [HttpModule],
  controllers: [TemplateRecommendationController],
  providers: [TemplateRecommendationService],
  exports: [TemplateRecommendationService],
})
export class AlgorhythmModule {}