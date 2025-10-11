import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocalDataStorageService } from './local-data-storage.service';
import { RealTimeIndexService } from './real-time-index.service';
import { AssetIndexingService } from './asset-indexing.service';
import { CompositeIndexingService } from './composite-indexing.service';
import { SearchOptimizationService } from './search-optimization.service';
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
    ]),
  ],
  providers: [
    LocalDataStorageService,
    RealTimeIndexService,
    AssetIndexingService,
    CompositeIndexingService,
    SearchOptimizationService,
  ],
  exports: [
    LocalDataStorageService,
    RealTimeIndexService,
    AssetIndexingService,
    CompositeIndexingService,
    SearchOptimizationService,
  ],
})
export class IndexingModule {}
