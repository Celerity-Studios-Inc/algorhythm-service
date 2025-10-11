import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocalDataStorageService } from './local-data-storage.service';
import { RealTimeIndexService } from './real-time-index.service';
import { AssetIndexingService } from './asset-indexing.service';
import { CompositeIndexingService } from './composite-indexing.service';
import { SearchOptimizationService } from './search-optimization.service';
import { LocalDataQueryService } from './local-data-query.service';
import { CacheWarmingService } from './cache-warming.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { PerformanceMonitoringController } from './performance-monitoring.controller';
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
    ]),
  ],
  controllers: [PerformanceMonitoringController],
  providers: [
    LocalDataStorageService,
    RealTimeIndexService,
    AssetIndexingService,
    CompositeIndexingService,
    SearchOptimizationService,
    LocalDataQueryService,
    CacheWarmingService,
    PerformanceMonitoringService,
  ],
  exports: [
    LocalDataStorageService,
    RealTimeIndexService,
    AssetIndexingService,
    CompositeIndexingService,
    SearchOptimizationService,
    LocalDataQueryService,
    CacheWarmingService,
    PerformanceMonitoringService,
  ],
})
export class IndexingModule {}
