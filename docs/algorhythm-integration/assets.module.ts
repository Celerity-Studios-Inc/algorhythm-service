import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsController } from './assets.controller';
import { AlgorhythmExportController } from './algorhythm-export.controller';
import { AssetsService } from './assets.service';
import { AlgorhythmWebhookService } from './services/algorhythm-webhook.service';
import { AlgorhythmDataTransformerService } from './services/algorhythm-data-transformer.service';
import { AlgorhythmSyncService } from './services/algorhythm-sync.service';
import { AssetPatternService } from './services/asset-pattern.service';
import { AssetVersionHistoryService } from './services/asset-version-history.service';
import { VersionHistoryService } from './services/version-history.service';
import { Asset, AssetSchema } from '../../models/asset.schema';
import {
  VersionHistory,
  VersionHistorySchema,
} from '../../models/version-history.schema';
import { AssetVersion, AssetVersionSchema } from '../../models/asset-version.schema';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { MongoDBBloatPreventionService } from '../../common/services/mongodb-bloat-prevention.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: VersionHistory.name, schema: VersionHistorySchema },
      { name: AssetVersion.name, schema: AssetVersionSchema },
    ]),
    TaxonomyModule,
    forwardRef(() => AiModule),
    StorageModule,
  ],
  controllers: [AssetsController, AlgorhythmExportController],
  providers: [
    AssetsService,
    AssetPatternService,
    AssetVersionHistoryService,
    VersionHistoryService,
    MongoDBBloatPreventionService,
    AlgorhythmWebhookService,
    AlgorhythmDataTransformerService,
    AlgorhythmSyncService,
  ],
  exports: [
    AssetsService,
    AssetPatternService,
    AssetVersionHistoryService,
    VersionHistoryService,
  ],
})
export class AssetsModule {}
