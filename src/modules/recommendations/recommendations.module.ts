import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
import { ReVizCompleteExperienceProductionService } from './reviz-complete-experience-production.service';
import { ReVizCompleteExperienceProductionController } from './reviz-complete-experience-production.controller';
import { ReVizCompleteExperienceEnhancedService } from './reviz-complete-experience-enhanced.service';
import { ReVizCompleteExperienceEnhancedController } from './reviz-complete-experience-enhanced.controller';
import { ReVizCompositeExperienceService } from './reviz-composite-experience.service';
import { ReVizCompositeExperienceController } from './reviz-composite-experience.controller';
import { DebugController } from './debug.controller';
import { CacheWarmingService } from './cache-warming.service';
import { OptimizedRecommendationsService } from './optimized-recommendations.service';
import { LegacyRedirectController } from '../legacy/legacy-redirect.controller';
import { CompositeRecommendationsService } from './composite-recommendations.service';
import { ScoringModule } from '../scoring/scoring.module';
import { CachingModule } from '../caching/caching.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { 
  CompatibilityScore, 
  CompatibilityScoreSchema 
} from '../../models/compatibility-score.schema';
import { 
  RecommendationCache, 
  RecommendationCacheSchema 
} from '../../models/recommendation-cache.schema';
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [
    RecommendationsController, 
    ReVizCompleteExperienceProductionController,
    ReVizCompleteExperienceEnhancedController,
    ReVizCompositeExperienceController,
    DebugController,
    LegacyRedirectController  // Must be last to catch legacy routes
  ],
  providers: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceProductionService,
    ReVizCompleteExperienceEnhancedService,
    ReVizCompositeExperienceService,
    CacheWarmingService,
    OptimizedRecommendationsService,
    CompositeRecommendationsService
  ],
  exports: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceProductionService,
    ReVizCompleteExperienceEnhancedService,
    ReVizCompositeExperienceService,
    CacheWarmingService,
    OptimizedRecommendationsService,
    CompositeRecommendationsService
  ],
})
export class RecommendationsModule {
  constructor() {
    // 🔍 STARTUP LOGGING - WILL SHOW IN CLOUD RUN
    console.error('=====================================');
    console.error('🚀 RECOMMENDATIONS MODULE STARTING');
    console.error('=====================================');
    console.error('Module loaded successfully');
    console.error('=====================================');
  }
}
