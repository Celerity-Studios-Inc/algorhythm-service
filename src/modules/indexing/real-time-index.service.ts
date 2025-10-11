import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LocalDataStorageService } from './local-data-storage.service';
import { AssetIndexingService } from './asset-indexing.service';
import { CompositeIndexingService } from './composite-indexing.service';
import { SearchOptimizationService } from './search-optimization.service';

/**
 * Real-time Index Service
 * 
 * This service processes webhook events and updates local indexes
 * in real-time. It coordinates between storage, indexing, and
 * search optimization services.
 */
@Injectable()
export class RealTimeIndexService {
  private readonly logger = new Logger(RealTimeIndexService.name);

  constructor(
    private readonly localDataStorage: LocalDataStorageService,
    private readonly assetIndexing: AssetIndexingService,
    private readonly compositeIndexing: CompositeIndexingService,
    private readonly searchOptimization: SearchOptimizationService,
  ) {}

  /**
   * Handle asset created events
   */
  @OnEvent('algorhythm.asset.created')
  async handleAssetCreated(event: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset created event: ${event.assetId}`);

      // Store asset in local storage
      await this.localDataStorage.storeAsset(event);

      // Update asset index
      await this.assetIndexing.indexAsset(event);

      // Update search optimization
      await this.searchOptimization.updateAssetIndex(event);

      this.logger.log(`✅ Asset created event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset created event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle asset updated events
   */
  @OnEvent('algorhythm.asset.updated')
  async handleAssetUpdated(event: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset updated event: ${event.assetId}`);

      // Update asset in local storage
      await this.localDataStorage.updateAsset(event.assetId, event);

      // Update asset index
      await this.assetIndexing.updateAssetIndex(event);

      // Update search optimization
      await this.searchOptimization.updateAssetIndex(event);

      this.logger.log(`✅ Asset updated event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset updated event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle composite created events
   */
  @OnEvent('algorhythm.composite.created')
  async handleCompositeCreated(event: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing composite created event: ${event.compositeId}`);

      // Store composite in local storage
      await this.localDataStorage.storeComposite(event);

      // Update composite index
      await this.compositeIndexing.indexComposite(event);

      // Update search optimization
      await this.searchOptimization.updateCompositeIndex(event);

      this.logger.log(`✅ Composite created event processed: ${event.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite created event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle asset deleted events
   */
  @OnEvent('algorhythm.asset.deleted')
  async handleAssetDeleted(event: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset deleted event: ${event.assetId}`);

      // Delete asset from local storage
      await this.localDataStorage.deleteAsset(event.assetId);

      // Remove from asset index
      await this.assetIndexing.removeAssetFromIndex(event.assetId);

      // Update search optimization
      await this.searchOptimization.removeAssetFromIndex(event.assetId);

      this.logger.log(`✅ Asset deleted event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset deleted event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const storageStats = await this.localDataStorage.getStorageStats();
      const assetIndexStats = await this.assetIndexing.getIndexStats();
      const compositeIndexStats = await this.compositeIndexing.getIndexStats();
      const searchStats = await this.searchOptimization.getSearchStats();

      return {
        storage: storageStats,
        assetIndex: assetIndexStats,
        compositeIndex: compositeIndexStats,
        search: searchStats,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get index stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rebuild all indexes
   */
  async rebuildIndexes(): Promise<void> {
    try {
      this.logger.log(`🔄 Rebuilding all indexes`);

      // Get all assets and composites from local storage
      const assets = await this.localDataStorage.searchAssets({});
      const composites = await this.localDataStorage.searchComposites({});

      // Rebuild asset index
      await this.assetIndexing.rebuildIndex(assets);

      // Rebuild composite index
      await this.compositeIndexing.rebuildIndex(composites);

      // Rebuild search optimization
      await this.searchOptimization.rebuildIndexes();

      this.logger.log(`✅ All indexes rebuilt successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to rebuild indexes: ${error.message}`);
      throw error;
    }
  }
}
