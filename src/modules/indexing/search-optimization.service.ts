import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

/**
 * Search Optimization Service
 * 
 * This service provides optimized search capabilities for assets and composites
 * with advanced filtering, sorting, and performance optimization.
 */
@Injectable()
export class SearchOptimizationService {
  private readonly logger = new Logger(SearchOptimizationService.name);

  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<Asset>,
    @InjectModel(Composite.name) private readonly compositeModel: Model<Composite>,
  ) {}

  /**
   * Update asset index for search optimization
   */
  async updateAssetIndex(assetData: any): Promise<void> {
    try {
      this.logger.log(`🔍 Updating search index for asset: ${assetData.assetId}`);

      // Create search optimization fields
      const searchFields = {
        searchableText: this.createSearchableText(assetData),
        searchTags: this.createSearchTags(assetData),
        searchCategories: this.createSearchCategories(assetData),
        searchLayers: this.createSearchLayers(assetData),
        searchScores: this.createSearchScores(assetData),
      };

      // Update asset with search optimization fields
      await this.assetModel.findByIdAndUpdate(
        assetData.assetId,
        searchFields,
        { new: true }
      );

      this.logger.log(`✅ Search index updated for asset: ${assetData.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update search index for asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update composite index for search optimization
   */
  async updateCompositeIndex(compositeData: any): Promise<void> {
    try {
      this.logger.log(`🔍 Updating search index for composite: ${compositeData.compositeId}`);

      // Create search optimization fields
      const searchFields = {
        searchableText: this.createSearchableText(compositeData),
        searchTags: this.createSearchTags(compositeData),
        searchCategories: this.createSearchCategories(compositeData),
        searchLayers: this.createSearchLayers(compositeData),
        searchScores: this.createSearchScores(compositeData),
        searchComponents: this.createSearchComponents(compositeData),
      };

      // Update composite with search optimization fields
      await this.compositeModel.findByIdAndUpdate(
        compositeData.compositeId,
        searchFields,
        { new: true }
      );

      this.logger.log(`✅ Search index updated for composite: ${compositeData.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update search index for composite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove asset from search index
   */
  async removeAssetFromIndex(assetId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Removing asset from search index: ${assetId}`);

      await this.assetModel.findByIdAndDelete(assetId);

      this.logger.log(`✅ Asset removed from search index: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to remove asset from search index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove composite from search index
   */
  async removeCompositeFromIndex(compositeId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Removing composite from search index: ${compositeId}`);

      await this.compositeModel.findByIdAndDelete(compositeId);

      this.logger.log(`✅ Composite removed from search index: ${compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to remove composite from search index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search assets with advanced filtering
   */
  async searchAssets(query: any): Promise<any[]> {
    try {
      const {
        search,
        layer,
        category,
        subcategory,
        tags,
        minScore,
        maxScore,
        sortBy,
        sortOrder,
        limit,
        offset
      } = query;

      // Build search criteria
      const criteria: any = {};

      if (search) {
        criteria.$text = { $search: search };
      }

      if (layer) {
        criteria.layer = layer;
      }

      if (category) {
        criteria.category = category;
      }

      if (subcategory) {
        criteria.subcategory = subcategory;
      }

      if (tags && tags.length > 0) {
        criteria.tags = { $in: tags };
      }

      if (minScore !== undefined || maxScore !== undefined) {
        criteria['compatibilityScores.overall'] = {};
        if (minScore !== undefined) {
          criteria['compatibilityScores.overall'].$gte = minScore;
        }
        if (maxScore !== undefined) {
          criteria['compatibilityScores.overall'].$lte = maxScore;
        }
      }

      // Build sort criteria
      const sort: any = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by creation date
      }

      // Execute search
      const assets = await this.assetModel
        .find(criteria)
        .sort(sort)
        .limit(limit || 50)
        .skip(offset || 0);

      return assets;
    } catch (error) {
      this.logger.error(`❌ Failed to search assets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search composites with advanced filtering
   */
  async searchComposites(query: any): Promise<any[]> {
    try {
      const {
        search,
        layer,
        category,
        subcategory,
        compositeType,
        componentCount,
        componentLayers,
        tags,
        minScore,
        maxScore,
        sortBy,
        sortOrder,
        limit,
        offset
      } = query;

      // Build search criteria
      const criteria: any = {};

      if (search) {
        criteria.$text = { $search: search };
      }

      if (layer) {
        criteria.layer = layer;
      }

      if (category) {
        criteria.category = category;
      }

      if (subcategory) {
        criteria.subcategory = subcategory;
      }

      if (compositeType) {
        criteria.compositeType = compositeType;
      }

      if (componentCount) {
        criteria.componentCount = componentCount;
      }

      if (componentLayers && componentLayers.length > 0) {
        criteria.componentLayers = { $in: componentLayers };
      }

      if (tags && tags.length > 0) {
        criteria.tags = { $in: tags };
      }

      if (minScore !== undefined || maxScore !== undefined) {
        criteria['compatibilityScores.overall'] = {};
        if (minScore !== undefined) {
          criteria['compatibilityScores.overall'].$gte = minScore;
        }
        if (maxScore !== undefined) {
          criteria['compatibilityScores.overall'].$lte = maxScore;
        }
      }

      // Build sort criteria
      const sort: any = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by creation date
      }

      // Execute search
      const composites = await this.compositeModel
        .find(criteria)
        .sort(sort)
        .limit(limit || 50)
        .skip(offset || 0);

      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to search composites: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, type: 'assets' | 'composites' = 'assets'): Promise<string[]> {
    try {
      const model = type === 'assets' ? this.assetModel : this.compositeModel;
      
      const suggestions = await model.aggregate([
        {
          $match: {
            $text: { $search: query }
          }
        },
        {
          $group: {
            _id: '$name',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      return suggestions.map(s => s._id);
    } catch (error) {
      this.logger.error(`❌ Failed to get search suggestions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<any> {
    try {
      const assetStats = await this.assetModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: '$compatibilityScores.overall' },
            avgFreshness: { $avg: '$freshnessScore' }
          }
        }
      ]);

      const compositeStats = await this.compositeModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: '$compatibilityScores.overall' },
            avgFreshness: { $avg: '$freshnessScore' }
          }
        }
      ]);

      return {
        assets: assetStats[0] || { total: 0, avgScore: 0, avgFreshness: 0 },
        composites: compositeStats[0] || { total: 0, avgScore: 0, avgFreshness: 0 },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get search stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rebuild all search indexes
   */
  async rebuildIndexes(): Promise<void> {
    try {
      this.logger.log(`🔄 Rebuilding all search indexes`);

      // Get all assets and composites
      const assets = await this.assetModel.find({});
      const composites = await this.compositeModel.find({});

      // Rebuild asset search indexes
      for (const asset of assets) {
        await this.updateAssetIndex(asset);
      }

      // Rebuild composite search indexes
      for (const composite of composites) {
        await this.updateCompositeIndex(composite);
      }

      this.logger.log(`✅ All search indexes rebuilt successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to rebuild search indexes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create searchable text from data
   */
  private createSearchableText(data: any): string {
    const parts = [
      data.name,
      data.description,
      data.tags?.join(' '),
      data.metadata?.aiMetadata?.description,
      data.metadata?.songMetadata?.songName,
      data.metadata?.songMetadata?.artistName,
      data.metadata?.starMetadata?.starName,
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Create search tags from data
   */
  private createSearchTags(data: any): string[] {
    const tags = data.tags || [];
    const metadataTags = data.metadata?.tags || [];
    return [...tags, ...metadataTags];
  }

  /**
   * Create search categories from data
   */
  private createSearchCategories(data: any): string[] {
    return [data.layer, data.category, data.subcategory].filter(Boolean);
  }

  /**
   * Create search layers from data
   */
  private createSearchLayers(data: any): string[] {
    return [data.layer].filter(Boolean);
  }

  /**
   * Create search scores from data
   */
  private createSearchScores(data: any): any {
    return {
      compatibility: data.compatibilityScores?.overall || 0,
      freshness: data.freshnessScore || 0,
      popularity: Math.random() * 100, // Mock popularity score
    };
  }

  /**
   * Create search components from composite data
   */
  private createSearchComponents(data: any): any {
    return {
      componentCount: data.componentCount,
      componentLayers: data.componentLayers,
      componentIds: data.componentIds,
      layerDistribution: this.calculateLayerDistribution(data.componentLayers),
    };
  }

  /**
   * Calculate layer distribution for search optimization
   */
  private calculateLayerDistribution(componentLayers: string[]): any {
    const distribution: any = {};
    for (const layer of componentLayers) {
      distribution[layer] = (distribution[layer] || 0) + 1;
    }
    return distribution;
  }
}
