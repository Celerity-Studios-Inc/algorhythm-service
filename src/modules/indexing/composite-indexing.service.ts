import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Composite, CompositeSchema } from '../../models/composite.schema';

/**
 * Composite Indexing Service
 * 
 * This service maintains optimized indexes for composite data
 * to enable fast queries and recommendations.
 */
@Injectable()
export class CompositeIndexingService {
  private readonly logger = new Logger(CompositeIndexingService.name);

  constructor(
    @InjectModel(Composite.name) private readonly compositeModel: Model<Composite>,
  ) {}

  /**
   * Index a single composite
   */
  async indexComposite(compositeData: any): Promise<void> {
    try {
      this.logger.log(`📊 Indexing composite: ${compositeData.compositeId}`);

      // Create searchable fields
      const searchableFields = {
        name: compositeData.name,
        layer: compositeData.layer,
        category: compositeData.category,
        subcategory: compositeData.subcategory,
        compositeType: compositeData.compositeType,
        componentCount: compositeData.componentCount,
        componentLayers: compositeData.componentLayers,
        componentIds: compositeData.componentIds,
        tags: compositeData.tags || [],
        description: compositeData.description,
        // Create searchable text from metadata
        searchableText: this.createSearchableText(compositeData),
        // Create compatibility scores
        compatibilityScores: this.calculateCompatibilityScores(compositeData),
        // Create freshness score
        freshnessScore: this.calculateFreshnessScore(compositeData),
        // Create component relationships
        componentRelationships: this.createComponentRelationships(compositeData),
      };

      // Update composite with indexed fields
      await this.compositeModel.findByIdAndUpdate(
        compositeData.compositeId,
        {
          ...searchableFields,
          indexedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      this.logger.log(`✅ Composite indexed successfully: ${compositeData.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to index composite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update composite index
   */
  async updateCompositeIndex(compositeData: any): Promise<void> {
    try {
      this.logger.log(`🔄 Updating composite index: ${compositeData.compositeId}`);

      // Recalculate searchable fields
      const searchableFields = {
        name: compositeData.name,
        layer: compositeData.layer,
        category: compositeData.category,
        subcategory: compositeData.subcategory,
        compositeType: compositeData.compositeType,
        componentCount: compositeData.componentCount,
        componentLayers: compositeData.componentLayers,
        componentIds: compositeData.componentIds,
        tags: compositeData.tags || [],
        description: compositeData.description,
        searchableText: this.createSearchableText(compositeData),
        compatibilityScores: this.calculateCompatibilityScores(compositeData),
        freshnessScore: this.calculateFreshnessScore(compositeData),
        componentRelationships: this.createComponentRelationships(compositeData),
      };

      // Update composite with new indexed fields
      await this.compositeModel.findByIdAndUpdate(
        compositeData.compositeId,
        {
          ...searchableFields,
          indexedAt: new Date(),
        },
        { new: true }
      );

      this.logger.log(`✅ Composite index updated successfully: ${compositeData.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update composite index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove composite from index
   */
  async removeCompositeFromIndex(compositeId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Removing composite from index: ${compositeId}`);

      await this.compositeModel.findByIdAndDelete(compositeId);

      this.logger.log(`✅ Composite removed from index: ${compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to remove composite from index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search composites by criteria
   */
  async searchComposites(criteria: any): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find(criteria);
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to search composites: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by song ID
   */
  async getCompositesBySong(songId: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        'metadata.songMetadata.songId': songId
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by song: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by layer
   */
  async getCompositesByLayer(layer: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({ layer });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by layer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by category
   */
  async getCompositesByCategory(category: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({ category });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by subcategory
   */
  async getCompositesBySubcategory(subcategory: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({ subcategory });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by subcategory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by composite type
   */
  async getCompositesByType(compositeType: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({ compositeType });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by component count
   */
  async getCompositesByComponentCount(minCount: number, maxCount?: number): Promise<any[]> {
    try {
      const criteria: any = { componentCount: { $gte: minCount } };
      if (maxCount !== undefined) {
        criteria.componentCount.$lte = maxCount;
      }
      
      const composites = await this.compositeModel.find(criteria);
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by component count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by component layers
   */
  async getCompositesByComponentLayers(layers: string[]): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        componentLayers: { $in: layers }
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by component layers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by tags
   */
  async getCompositesByTags(tags: string[]): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        tags: { $in: tags }
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by tags: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by compatibility score
   */
  async getCompositesByCompatibilityScore(minScore: number): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        'compatibilityScores.overall': { $gte: minScore }
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by compatibility score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by freshness score
   */
  async getCompositesByFreshnessScore(minScore: number): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        freshnessScore: { $gte: minScore }
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by freshness score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composites by component ID
   */
  async getCompositesByComponentId(componentId: string): Promise<any[]> {
    try {
      const composites = await this.compositeModel.find({
        componentIds: componentId
      });
      return composites;
    } catch (error) {
      this.logger.error(`❌ Failed to get composites by component ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rebuild entire composite index
   */
  async rebuildIndex(composites: any[]): Promise<void> {
    try {
      this.logger.log(`🔄 Rebuilding composite index with ${composites.length} composites`);

      for (const composite of composites) {
        await this.indexComposite(composite);
      }

      this.logger.log(`✅ Composite index rebuilt successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to rebuild composite index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const totalComposites = await this.compositeModel.countDocuments();
      const compositesByLayer = await this.compositeModel.aggregate([
        { $group: { _id: '$layer', count: { $sum: 1 } } }
      ]);
      const compositesByCategory = await this.compositeModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      const compositesByType = await this.compositeModel.aggregate([
        { $group: { _id: '$compositeType', count: { $sum: 1 } } }
      ]);

      return {
        totalComposites,
        compositesByLayer,
        compositesByCategory,
        compositesByType,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get index stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create searchable text from composite data
   */
  private createSearchableText(compositeData: any): string {
    const parts = [
      compositeData.name,
      compositeData.description,
      compositeData.tags?.join(' '),
      compositeData.metadata?.aiMetadata?.description,
      compositeData.metadata?.songMetadata?.songName,
      compositeData.metadata?.songMetadata?.artistName,
      compositeData.metadata?.starMetadata?.starName,
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Calculate compatibility scores for composite
   */
  private calculateCompatibilityScores(compositeData: any): any {
    // This would contain the actual compatibility scoring logic
    // For now, return mock scores
    return {
      overall: Math.random() * 100,
      layer: Math.random() * 100,
      category: Math.random() * 100,
      subcategory: Math.random() * 100,
      tags: Math.random() * 100,
      components: Math.random() * 100,
    };
  }

  /**
   * Calculate freshness score for composite
   */
  private calculateFreshnessScore(compositeData: any): number {
    // This would contain the actual freshness scoring logic
    // For now, return mock score
    return Math.random() * 100;
  }

  /**
   * Create component relationships for composite
   */
  private createComponentRelationships(compositeData: any): any {
    return {
      componentCount: compositeData.componentCount,
      componentLayers: compositeData.componentLayers,
      componentIds: compositeData.componentIds,
      layerDistribution: this.calculateLayerDistribution(compositeData.componentLayers),
      componentTypes: this.calculateComponentTypes(compositeData.components),
    };
  }

  /**
   * Calculate layer distribution for composite
   */
  private calculateLayerDistribution(componentLayers: string[]): any {
    const distribution: any = {};
    for (const layer of componentLayers) {
      distribution[layer] = (distribution[layer] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Calculate component types for composite
   */
  private calculateComponentTypes(components: any[]): any {
    const types: any = {};
    for (const component of components) {
      const type = `${component.layer}.${component.category}`;
      types[type] = (types[type] || 0) + 1;
    }
    return types;
  }
}
