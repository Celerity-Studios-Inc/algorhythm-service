#!/usr/bin/env ts-node

/**
 * 🔧 V2.0: Database Migration Script
 * Migrate assets to GCP URL-based architecture
 */

import { connect, connection, model } from 'mongoose';
import { Asset, AssetSchema } from '../src/models/asset.schema';
import { Composite, CompositeSchema } from '../src/models/composite.schema';

async function migrateToGCPURLs() {
  try {
    console.log('🚀 Starting GCP URL migration...');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await connect(mongoUri);
    console.log('✓ Connected to database');
    
    // Create models
    const AssetModel = model('Asset', AssetSchema);
    const CompositeModel = model('Composite', CompositeSchema);
    
    // Find assets without GCP URLs
    const assetsToMigrate = await AssetModel.find({
      $or: [
        { gcpStorageUrl: { $exists: false } },
        { thumbnailUrl: { $exists: false } },
        { previewUrl: { $exists: false } }
      ]
    });
    
    console.log(`Found ${assetsToMigrate.length} assets to migrate`);
    
    let success = 0;
    let failed = 0;
    
    for (const asset of assetsToMigrate) {
      try {
        // Set default assetType if missing
        if (!asset.assetType) {
          asset.assetType = 'base';
        }
        
        // Generate GCP URLs based on asset name and layer
        const layerName = { 'S': 'stars', 'L': 'looks', 'M': 'moves', 'W': 'worlds', 'G': 'songs' }[asset.layer];
        const baseUrl = `https://storage.googleapis.com/reviz-assets/${layerName}/${asset.name}`;
        
        // Set URLs
        asset.gcpStorageUrl = asset.fileUrl || `${baseUrl}/full.mp4`;
        asset.thumbnailUrl = `${baseUrl}/thumb.jpg`;
        asset.previewUrl = `${baseUrl}/preview.mp4`;
        
        await asset.save();
        success++;
        console.log(`✓ Migrated: ${asset.name}`);
      } catch (error) {
        failed++;
        console.error(`✗ Failed: ${asset.name}`, error.message);
      }
    }
    
    // Migrate composites
    const compositesToMigrate = await CompositeModel.find({
      $or: [
        { gcpStorageUrl: { $exists: false } },
        { fullVideoUrl: { $exists: false } }
      ]
    });
    
    console.log(`Found ${compositesToMigrate.length} composites to migrate`);
    
    for (const composite of compositesToMigrate) {
      try {
        const baseUrl = `https://storage.googleapis.com/reviz-composites/${composite.name}`;
        
        composite.gcpStorageUrl = composite.previewVideoUrl || `${baseUrl}/full.mp4`;
        composite.fullVideoUrl = `${baseUrl}/full.mp4`;
        
        await composite.save();
        console.log(`✓ Migrated composite: ${composite.name}`);
      } catch (error) {
        console.error(`✗ Failed composite: ${composite.name}`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`Assets: ${success} success, ${failed} failed`);
    console.log(`Composites: ${compositesToMigrate.length} migrated`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run migration
migrateToGCPURLs()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
