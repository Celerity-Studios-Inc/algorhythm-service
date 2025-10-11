import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetSchema } from '../../models/asset.schema';

/**
 * Asset Indexing Service
 * 
 * This service maintains optimized indexes for asset data
 * to enable fast queries and recommendations.
 */
@Injectable()
export class AssetIndexingService {
  private readonly logger = new Logger(AssetIndexingService.name);

  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<Asset>,
  ) {}

  /**
   * Index a single asset
   */
  async indexAsset(assetData: any): Promise<void> {
    try {
      this.logger.log(`📊 Indexing asset: ${assetData.assetId}`);

      // Create searchable fields
      const searchableFields = {
        name: assetData.name,
        layer: assetData.layer,
        category: assetData.category,
        subcategory: assetData.subcategory,
        tags: assetData.tags || [],
        description: assetData.description,
        // Create searchable text from metadata
        searchableText: this.createSearchableText(assetData),
        // Create compatibility scores
        compatibilityScores: this.calculateCompatibilityScores(assetData),
        // Create freshness score
        freshnessScore: this.calculateFreshnessScore(assetData),
      };

      // Update asset with indexed fields
      await this.assetModel.findByIdAndUpdate(
        assetData.assetId,
        {
          ...searchableFields,
          indexedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      this.logger.log(`✅ Asset indexed successfully: ${assetData.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to index asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update asset index
   */
  async updateAssetIndex(assetData: any): Promise<void> {
    try {
      this.logger.log(`🔄 Updating asset index: ${assetData.assetId}`);

      // Recalculate searchable fields
      const searchableFields = {
        name: assetData.name,
        layer: assetData.layer,
        category: assetData.category,
        subcategory: assetData.subcategory,
        tags: assetData.tags || [],
        description: assetData.description,
        searchableText: this.createSearchableText(assetData),
        compatibilityScores: this.calculateCompatibilityScores(assetData),
        freshnessScore: this.calculateFreshnessScore(assetData),
      };

      // Update asset with new indexed fields
      await this.assetModel.findByIdAndUpdate(
        assetData.assetId,
        {
          ...searchableFields,
          indexedAt: new Date(),
        },
        { new: true }
      );

      this.logger.log(`✅ Asset index updated successfully: ${assetData.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update asset index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove asset from index
   */
  async removeAssetFromIndex(assetId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Removing asset from index: ${assetId}`);

      await this.assetModel.findByIdAndDelete(assetId);

      this.logger.log(`✅ Asset removed from index: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to remove asset from index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search assets by criteria
   */
  async searchAssets(criteria: any): Promise<any[]> {
    try {
      const assets = await this.assetModel.find(criteria);
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to search assets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by song ID
   */
  async getAssetsBySong(songId: string): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({
        'metadata.songMetadata.songId': songId
      });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by song: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by layer
   */
  async getAssetsByLayer(layer: string): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({ layer });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by layer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by category
   */
  async getAssetsByCategory(category: string): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({ category });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by subcategory
   */
  async getAssetsBySubcategory(subcategory: string): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({ subcategory });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by subcategory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by tags
   */
  async getAssetsByTags(tags: string[]): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({
        tags: { $in: tags }
      });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by tags: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by compatibility score
   */
  async getAssetsByCompatibilityScore(minScore: number): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({
        'compatibilityScores.overall': { $gte: minScore }
      });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by compatibility score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assets by freshness score
   */
  async getAssetsByFreshnessScore(minScore: number): Promise<any[]> {
    try {
      const assets = await this.assetModel.find({
        freshnessScore: { $gte: minScore }
      });
      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to get assets by freshness score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rebuild entire asset index
   */
  async rebuildIndex(assets: any[]): Promise<void> {
    try {
      this.logger.log(`🔄 Rebuilding asset index with ${assets.length} assets`);

      for (const asset of assets) {
        await this.indexAsset(asset);
      }

      this.logger.log(`✅ Asset index rebuilt successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to rebuild asset index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const totalAssets = await this.assetModel.countDocuments();
      const assetsByLayer = await this.assetModel.aggregate([
        { $group: { _id: '$layer', count: { $sum: 1 } } }
      ]);
      const assetsByCategory = await this.assetModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      return {
        totalAssets,
        assetsByLayer,
        assetsByCategory,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get index stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create searchable text from asset data
   */
  private createSearchableText(assetData: any): string {
    const parts = [
      assetData.name,
      assetData.description,
      assetData.tags?.join(' '),
      assetData.metadata?.aiMetadata?.description,
      assetData.metadata?.songMetadata?.songName,
      assetData.metadata?.songMetadata?.artistName,
      assetData.metadata?.starMetadata?.starName,
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Calculate compatibility scores for asset
   */
  private calculateCompatibilityScores(assetData: any): any {
    // This would contain the actual compatibility scoring logic
    // For now, return mock scores
    return {
      overall: Math.random() * 100,
      layer: Math.random() * 100,
      category: Math.random() * 100,
      subcategory: Math.random() * 100,
      tags: Math.random() * 100,
    };
  }

  /**
   * Calculate freshness score for asset
   */
  private calculateFreshnessScore(assetData: any): number {
    // This would contain the actual freshness scoring logic
    // For now, return mock score
    return Math.random() * 100;
  }
}
