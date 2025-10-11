import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

/**
 * Local Data Storage Service
 * 
 * This service maintains a local copy of asset and composite data
 * for fast queries and autonomous operation. It processes webhook
 * events to keep the local data in sync with the NNA Registry.
 */
@Injectable()
export class LocalDataStorageService {
  private readonly logger = new Logger(LocalDataStorageService.name);

  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<Asset>,
    @InjectModel(Composite.name) private readonly compositeModel: Model<Composite>,
  ) {}

  /**
   * Store or update an asset in local storage
   */
  async storeAsset(assetData: any): Promise<void> {
    try {
      this.logger.log(`📦 Storing asset in local storage: ${assetData.assetId}`);

      const asset = new this.assetModel({
        _id: assetData.assetId,
        name: assetData.name,
        layer: assetData.layer,
        category: assetData.category,
        subcategory: assetData.subcategory,
        gcpStorageUrl: assetData.gcpStorageUrl,
        thumbnailUrl: assetData.thumbnailUrl,
        previewUrl: assetData.previewUrl,
        metadata: assetData.metadata,
        tags: assetData.tags,
        description: assetData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await asset.save();
      this.logger.log(`✅ Asset stored successfully: ${assetData.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to store asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store or update a composite in local storage
   */
  async storeComposite(compositeData: any): Promise<void> {
    try {
      this.logger.log(`📦 Storing composite in local storage: ${compositeData.compositeId}`);

      const composite = new this.compositeModel({
        _id: compositeData.compositeId,
        name: compositeData.name,
        layer: compositeData.layer,
        category: compositeData.category,
        subcategory: compositeData.subcategory,
        gcpStorageUrl: compositeData.gcpStorageUrl,
        thumbnailUrl: compositeData.thumbnailUrl,
        previewUrl: compositeData.previewUrl,
        compositeType: compositeData.compositeType,
        componentCount: compositeData.componentCount,
        componentLayers: compositeData.componentLayers,
        componentIds: compositeData.componentIds,
        components: compositeData.components,
        metadata: compositeData.metadata,
        tags: compositeData.tags,
        description: compositeData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await composite.save();
      this.logger.log(`✅ Composite stored successfully: ${compositeData.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to store composite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing asset in local storage
   */
  async updateAsset(assetId: string, updateData: any): Promise<void> {
    try {
      this.logger.log(`🔄 Updating asset in local storage: ${assetId}`);

      const result = await this.assetModel.findByIdAndUpdate(
        assetId,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      if (result) {
        this.logger.log(`✅ Asset updated successfully: ${assetId}`);
      } else {
        this.logger.warn(`⚠️ Asset not found for update: ${assetId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to update asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an asset from local storage
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Deleting asset from local storage: ${assetId}`);

      const result = await this.assetModel.findByIdAndDelete(assetId);
      
      if (result) {
        this.logger.log(`✅ Asset deleted successfully: ${assetId}`);
      } else {
        this.logger.warn(`⚠️ Asset not found for deletion: ${assetId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get asset by ID from local storage
   */
  async getAssetById(assetId: string): Promise<any> {
    try {
      const asset = await this.assetModel.findById(assetId);
      return asset;
    } catch (error) {
      this.logger.error(`❌ Failed to get asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get composite by ID from local storage
   */
  async getCompositeById(compositeId: string): Promise<any> {
    try {
      const composite = await this.compositeModel.findById(compositeId);
      return composite;
    } catch (error) {
      this.logger.error(`❌ Failed to get composite: ${error.message}`);
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
   * Get all assets for a specific song
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
   * Get all composites for a specific song
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
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    try {
      const assetCount = await this.assetModel.countDocuments();
      const compositeCount = await this.compositeModel.countDocuments();
      
      return {
        assets: assetCount,
        composites: compositeCount,
        total: assetCount + compositeCount,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get storage stats: ${error.message}`);
      throw error;
    }
  }
}
