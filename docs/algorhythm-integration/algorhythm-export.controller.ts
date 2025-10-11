import { Controller, Post, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { CompositeMetadataAggregatorService } from '../ai/services/composite-metadata-aggregator.service';
import { AlgorhythmSyncService } from './services/algorhythm-sync.service';

@ApiTags('Algorhythm Export')
@Controller('algorhythm-export')
@UseGuards(JwtAuthGuard)
export class AlgorhythmExportController {
  private readonly logger = new Logger(AlgorhythmExportController.name);

  constructor(
    private readonly assetsService: AssetsService,
    private readonly compositeMetadataAggregatorService: CompositeMetadataAggregatorService,
    private readonly algorhythmSyncService: AlgorhythmSyncService,
  ) {}

  @Get('composites')
  @ApiOperation({
    summary: 'Export Composite assets for Algorhythm service',
    description: 'Exports all Composite assets with their metadata for Algorhythm template recommendations'
  })
  @ApiResponse({
    status: 200,
    description: 'Composite assets exported successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalComposites: { type: 'number' },
        composites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              compositeId: { type: 'string' },
              name: { type: 'string' },
              songId: { type: 'string' },
              algorhythmMetadata: { type: 'object' },
              aggregatedMetadata: { type: 'object' },
              components: { type: 'array' },
              gcpStorageUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async exportComposites() {
    try {
      this.logger.log('🎼 [ALGORHYTHM EXPORT] Starting Composite assets export...');
      
      // Get all Composite assets with metadata
      const compositeAssets = await this.assetsService.findByLayer('C');
      
      this.logger.log(`📦 Found ${compositeAssets.length} Composite assets`);
      
      // Filter assets with proper metadata
      const assetsWithMetadata = compositeAssets.filter(asset => 
        asset.algorhythmMetadata || asset.aggregatedMetadata
      );
      
      this.logger.log(`✅ ${assetsWithMetadata.length} assets have enhanced metadata`);
      
      // Transform for Algorhythm export
      const exportData = assetsWithMetadata.map(asset => {
        // Extract song ID from composite name (format: C.FUL.ALL.XXX:songId+...)
        const songIdMatch = asset.name.match(/:(\d+\.\d+\.\d+\.\d+)\+/);
        const songId = songIdMatch ? songIdMatch[1] : null;
        
        return {
          compositeId: (asset as any)._id.toString(),
          name: asset.name,
          songId,
          algorhythmMetadata: asset.algorhythmMetadata,
          aggregatedMetadata: asset.aggregatedMetadata,
          components: asset.components?.map(comp => ({
            id: (comp as any)._id?.toString(),
            name: comp.name,
            layer: comp.layer,
            category: comp.category,
            subcategory: comp.subcategory
          })) || [],
          gcpStorageUrl: asset.gcpStorageUrl,
          thumbnailUrl: (asset as any).thumbnailUrl,
          description: asset.description,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        };
      });
      
      // Group by song ID for analysis
      const songGroups = {};
      exportData.forEach(asset => {
        if (asset.songId) {
          if (!songGroups[asset.songId]) {
            songGroups[asset.songId] = [];
          }
          songGroups[asset.songId].push(asset);
        }
      });
      
      this.logger.log(`🎵 Songs with Composite assets: ${Object.keys(songGroups).length}`);
      Object.entries(songGroups).forEach(([songId, assets]) => {
        this.logger.log(`   🎵 Song ${songId}: ${(assets as any[]).length} composites`);
      });
      
      return {
        success: true,
        totalComposites: exportData.length,
        songsWithComposites: Object.keys(songGroups).length,
        songGroups,
        composites: exportData,
        exportDate: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ [ALGORHYTHM EXPORT] Export failed:', error);
      throw error;
    }
  }

  @Get('composites/by-song/:songId')
  @ApiOperation({
    summary: 'Export Composite assets for specific song',
    description: 'Exports Composite assets that use a specific song ID'
  })
  async exportCompositesBySong(songId: string) {
    try {
      this.logger.log(`🎵 [ALGORHYTHM EXPORT] Exporting composites for song: ${songId}`);
      
      // Get all Composite assets
      const compositeAssets = await this.assetsService.findByLayer('C');
      
      // Filter by song ID
      const songComposites = compositeAssets.filter(asset => 
        asset.name.includes(`:${songId}+`) || asset.name.includes(`+${songId}+`)
      );
      
      this.logger.log(`📦 Found ${songComposites.length} composites for song ${songId}`);
      
      // Transform for export
      const exportData = songComposites.map(asset => ({
        compositeId: (asset as any)._id.toString(),
        name: asset.name,
        songId,
        algorhythmMetadata: asset.algorhythmMetadata,
        aggregatedMetadata: asset.aggregatedMetadata,
        components: asset.components?.map(comp => ({
          id: (comp as any)._id?.toString(),
          name: comp.name,
          layer: comp.layer,
          category: comp.category,
          subcategory: comp.subcategory
        })) || [],
        gcpStorageUrl: asset.gcpStorageUrl,
        thumbnailUrl: (asset as any).thumbnailUrl,
        description: asset.description,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      }));
      
      return {
        success: true,
        songId,
        totalComposites: exportData.length,
        composites: exportData,
        exportDate: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`❌ [ALGORHYTHM EXPORT] Export failed for song ${songId}:`, error);
      throw error;
    }
  }

  @Post('sync-to-algorhythm')
  @ApiOperation({
    summary: 'Sync Composite assets to Algorhythm service',
    description: 'Pushes Composite assets to Algorhythm service for template recommendations'
  })
  async syncToAlgorhythm() {
    try {
      this.logger.log('🚀 [ALGORHYTHM SYNC] Starting bulk sync to Algorhythm service...');
      
      // Use the new sync service for bulk sync
      const syncResult = await this.algorhythmSyncService.syncAllComposites();
      
      this.logger.log(`✅ [ALGORHYTHM SYNC] Bulk sync completed: ${syncResult.successfulSyncs}/${syncResult.totalComposites} successful`);
      
      return {
        success: syncResult.success,
        message: syncResult.success 
          ? 'Composite assets successfully synced to Algorhythm' 
          : 'Some Composite assets failed to sync',
        totalComposites: syncResult.totalComposites,
        successfulSyncs: syncResult.successfulSyncs,
        failedSyncs: syncResult.failedSyncs,
        errors: syncResult.errors,
        nextSteps: [
          'Verify template availability in Algorhythm',
          'Test template recommendations',
          'Monitor webhook delivery success'
        ]
      };
      
    } catch (error) {
      this.logger.error('❌ [ALGORHYTHM SYNC] Bulk sync failed:', error);
      throw error;
    }
  }

  @Post('sync-by-song/:songId')
  @ApiOperation({
    summary: 'Sync Composite assets for specific song to Algorhythm',
    description: 'Pushes Composite assets for a specific song to Algorhythm service'
  })
  async syncBySong(songId: string) {
    try {
      this.logger.log(`🎵 [ALGORHYTHM SYNC] Starting sync for song: ${songId}`);
      
      const syncResult = await this.algorhythmSyncService.syncCompositesBySong(songId);
      
      this.logger.log(`✅ [ALGORHYTHM SYNC] Song sync completed: ${syncResult.successfulSyncs}/${syncResult.totalComposites} successful for song ${songId}`);
      
      return {
        success: syncResult.success,
        message: syncResult.success 
          ? `Composite assets for song ${songId} successfully synced to Algorhythm` 
          : `Some Composite assets for song ${songId} failed to sync`,
        songId: syncResult.songId,
        totalComposites: syncResult.totalComposites,
        successfulSyncs: syncResult.successfulSyncs,
        failedSyncs: syncResult.failedSyncs,
        errors: syncResult.errors
      };
      
    } catch (error) {
      this.logger.error(`❌ [ALGORHYTHM SYNC] Song sync failed for ${songId}:`, error);
      throw error;
    }
  }

  @Get('test-webhook')
  @ApiOperation({
    summary: 'Test webhook connectivity to Algorhythm',
    description: 'Tests webhook connectivity to Algorhythm service'
  })
  async testWebhook() {
    try {
      this.logger.log('🧪 [ALGORHYTHM SYNC] Testing webhook connectivity...');
      
      const testResult = await this.algorhythmSyncService.testWebhookConnectivity();
      
      return {
        success: testResult.success,
        message: testResult.message,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ [ALGORHYTHM SYNC] Webhook test failed:', error);
      throw error;
    }
  }

  @Get('sync-statistics')
  @ApiOperation({
    summary: 'Get Algorhythm sync statistics',
    description: 'Returns statistics about Composite assets and sync status'
  })
  async getSyncStatistics() {
    try {
      this.logger.log('📊 [ALGORHYTHM SYNC] Gathering sync statistics...');
      
      const stats = await this.algorhythmSyncService.getSyncStatistics();
      
      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ [ALGORHYTHM SYNC] Failed to get sync statistics:', error);
      throw error;
    }
  }
}
