import { Injectable, Logger } from '@nestjs/common';
import { AssetsService } from '../../assets/assets.service';
import { AlgorhythmWebhookService } from './algorhythm-webhook.service';
import { AlgorhythmDataTransformerService } from './algorhythm-data-transformer.service';
import { Asset } from '../../../models/asset.schema';

@Injectable()
export class AlgorhythmSyncService {
  private readonly logger = new Logger(AlgorhythmSyncService.name);

  constructor(
    private readonly assetsService: AssetsService,
    private readonly webhookService: AlgorhythmWebhookService,
    private readonly dataTransformer: AlgorhythmDataTransformerService
  ) {}

  /**
   * Sync all Composite assets to Algorhythm (bulk operation)
   */
  async syncAllComposites(): Promise<{
    success: boolean;
    totalComposites: number;
    successfulSyncs: number;
    failedSyncs: number;
    errors: string[];
  }> {
    this.logger.log('🔄 [SYNC] Starting bulk sync of all Composite assets to Algorhythm');
    
    try {
      // Get all Composite assets
      const compositeAssets = await this.assetsService.findByLayer('C');
      this.logger.log(`📦 Found ${compositeAssets.length} Composite assets`);

      // Filter assets with metadata
      const assetsWithMetadata = compositeAssets.filter(asset => 
        asset.algorhythmMetadata || asset.aggregatedMetadata
      );
      this.logger.log(`✅ ${assetsWithMetadata.length} assets have enhanced metadata`);

      // Transform to Algorhythm format
      const templates = await this.dataTransformer.transformMultipleAssets(assetsWithMetadata);
      
      // Group by song ID for analysis
      const groupedTemplates = this.dataTransformer.groupTemplatesBySong(templates);
      
      // Sync each template
      const results = await this.syncTemplates(templates);
      
      this.logger.log(`🎉 [SYNC] Bulk sync completed: ${results.successfulSyncs}/${results.totalComposites} successful`);
      
      return {
        success: results.failedSyncs === 0,
        totalComposites: results.totalComposites,
        successfulSyncs: results.successfulSyncs,
        failedSyncs: results.failedSyncs,
        errors: results.errors
      };
    } catch (error) {
      this.logger.error(`❌ [SYNC] Bulk sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync Composite assets for a specific song
   */
  async syncCompositesBySong(songId: string): Promise<{
    success: boolean;
    songId: string;
    totalComposites: number;
    successfulSyncs: number;
    failedSyncs: number;
    errors: string[];
  }> {
    this.logger.log(`🎵 [SYNC] Starting sync of Composite assets for song: ${songId}`);
    
    try {
      // Get all Composite assets
      const compositeAssets = await this.assetsService.findByLayer('C');
      
      // Filter by song ID
      const songComposites = compositeAssets.filter(asset => 
        asset.name.includes(`:${songId}+`) || asset.name.includes(`+${songId}+`)
      );
      
      this.logger.log(`📦 Found ${songComposites.length} composites for song ${songId}`);
      
      if (songComposites.length === 0) {
        this.logger.warn(`⚠️ [SYNC] No Composite assets found for song ${songId}`);
        return {
          success: true,
          songId,
          totalComposites: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          errors: []
        };
      }

      // Transform to Algorhythm format
      const templates = await this.dataTransformer.transformMultipleAssets(songComposites);
      
      // Sync templates
      const results = await this.syncTemplates(templates);
      
      this.logger.log(`🎉 [SYNC] Song sync completed: ${results.successfulSyncs}/${results.totalComposites} successful for song ${songId}`);
      
      return {
        success: results.failedSyncs === 0,
        songId,
        totalComposites: results.totalComposites,
        successfulSyncs: results.successfulSyncs,
        failedSyncs: results.failedSyncs,
        errors: results.errors
      };
    } catch (error) {
      this.logger.error(`❌ [SYNC] Song sync failed for ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync individual Composite asset
   */
  async syncCompositeAsset(asset: Asset): Promise<{
    success: boolean;
    assetId: string;
    songId: string;
    error?: string;
  }> {
    this.logger.log(`🔄 [SYNC] Syncing individual Composite asset: ${asset._id}`);
    
    try {
      const songId = this.extractSongId(asset.name);
      if (!songId) {
        throw new Error(`Could not extract song ID from asset name: ${asset.name}`);
      }

      // Transform to Algorhythm format
      const template = await this.dataTransformer.transformToAlgorhythmTemplate(asset);
      
      // Validate template
      const validation = this.dataTransformer.validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Send webhook
      await this.webhookService.notifyCompositeCreated(asset);
      
      this.logger.log(`✅ [SYNC] Successfully synced Composite asset ${asset._id} for song ${songId}`);
      
      return {
        success: true,
        assetId: (asset as any)._id.toString(),
        songId
      };
    } catch (error) {
      this.logger.error(`❌ [SYNC] Failed to sync Composite asset ${asset._id}: ${error.message}`);
      return {
        success: false,
        assetId: (asset as any)._id.toString(),
        songId: this.extractSongId(asset.name) || 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Test webhook connectivity
   */
  async testWebhookConnectivity(): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log('🧪 [SYNC] Testing webhook connectivity to Algorhythm');
    
    try {
      const isConnected = await this.webhookService.testWebhook();
      
      if (isConnected) {
        this.logger.log('✅ [SYNC] Webhook connectivity test successful');
        return {
          success: true,
          message: 'Webhook connectivity test successful'
        };
      } else {
        this.logger.warn('⚠️ [SYNC] Webhook connectivity test failed');
        return {
          success: false,
          message: 'Webhook connectivity test failed'
        };
      }
    } catch (error) {
      this.logger.error(`❌ [SYNC] Webhook connectivity test error: ${error.message}`);
      return {
        success: false,
        message: `Webhook connectivity test error: ${error.message}`
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    totalComposites: number;
    compositesWithMetadata: number;
    songsWithComposites: number;
    averageSynergyScore: number;
    lastSyncDate?: Date;
  }> {
    this.logger.log('📊 [SYNC] Gathering sync statistics');
    
    try {
      const compositeAssets = await this.assetsService.findByLayer('C');
      const assetsWithMetadata = compositeAssets.filter(asset => 
        asset.algorhythmMetadata || asset.aggregatedMetadata
      );
      
      const templates = await this.dataTransformer.transformMultipleAssets(assetsWithMetadata);
      const stats = this.dataTransformer.getTransformationStats(templates);
      
      const songs = new Set(templates.map(t => t.songId));
      
      this.logger.log(`📊 [SYNC] Statistics: ${stats.totalTemplates} templates, ${songs.size} songs, ${stats.averageSynergyScore} avg synergy`);
      
      return {
        totalComposites: compositeAssets.length,
        compositesWithMetadata: assetsWithMetadata.length,
        songsWithComposites: songs.size,
        averageSynergyScore: stats.averageSynergyScore,
        lastSyncDate: new Date()
      };
    } catch (error) {
      this.logger.error(`❌ [SYNC] Failed to get sync statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync multiple templates with error handling
   */
  private async syncTemplates(templates: any[]): Promise<{
    totalComposites: number;
    successfulSyncs: number;
    failedSyncs: number;
    errors: string[];
  }> {
    const results = {
      totalComposites: templates.length,
      successfulSyncs: 0,
      failedSyncs: 0,
      errors: [] as string[]
    };

    for (const template of templates) {
      try {
        // Validate template
        const validation = this.dataTransformer.validateTemplate(template);
        if (!validation.isValid) {
          results.failedSyncs++;
          results.errors.push(`Template ${template.templateId} validation failed: ${validation.errors.join(', ')}`);
          continue;
        }

        // Create mock asset for webhook
        const mockAsset = this.createMockAssetFromTemplate(template);
        
        // Send webhook
        await this.webhookService.notifyCompositeCreated(mockAsset);
        
        results.successfulSyncs++;
        this.logger.log(`✅ [SYNC] Successfully synced template ${template.templateId} for song ${template.songId}`);
      } catch (error) {
        results.failedSyncs++;
        results.errors.push(`Template ${template.templateId} sync failed: ${error.message}`);
        this.logger.error(`❌ [SYNC] Failed to sync template ${template.templateId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Create mock asset from template for webhook
   */
  private createMockAssetFromTemplate(template: any): Asset {
    return {
      _id: template.templateId,
      name: template.name,
      layer: 'C',
      algorhythmMetadata: template.metadata,
      aggregatedMetadata: template.aggregatedMetadata,
      components: template.components,
      gcpStorageUrl: template.gcpStorageUrl,
      description: template.description,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    } as Asset;
  }

  /**
   * Extract song ID from asset name
   */
  private extractSongId(assetName: string): string | null {
    const match = assetName.match(/:(\d+\.\d+\.\d+\.\d+)\+/);
    return match ? match[1] : null;
  }
}
