#!/usr/bin/env node

/**
 * Seed C.FUL (Full) Composite Assets for ReViz Developers
 * This script creates C.FUL composite assets in the development database
 * so that the ReViz API can return them instead of empty results.
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

class CFullCompositeSeeder {
  constructor() {
    this.mongoClient = null;
    this.db = null;
  }

  async connect() {
    console.log('🔌 Connecting to MongoDB...');
    this.mongoClient = new MongoClient(MONGODB_URI);
    await this.mongoClient.connect();
    this.db = this.mongoClient.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async seedCFulComposites() {
    console.log('🌱 Seeding C.FUL (Full) Composite Assets...');
    
    const cFulComposites = [
      {
        name: 'C.FUL.ALL.001',
        nna_address: '9.001.001.001',
        layer: 'C',
        category: 'FUL',
        subcategory: 'ALL',
        description: 'Full composite with all layers - Emma with Blonde Hair wearing a Charcoal Cat dress',
        compositeType: 'full_curated',
        assetType: 'base',
        components: {
          song_id: '1.018.004.006',
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001'
        },
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.001/full.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.001/thumb.jpg',
        previewUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.001/preview.mp4',
        tags: ['nna-layer-G', 'nna-layer-S', 'nna-layer-L', 'nna-layer-M', 'nna-layer-W', 'nna-compliant', 'full-composite'],
        duration: 30,
        fileSize: 15.2,
        resolution: '1080p',
        format: 'mp4',
        qualityScore: 0.9,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'C.FUL.ALL.002',
        nna_address: '9.001.001.002',
        layer: 'C',
        category: 'FUL',
        subcategory: 'ALL',
        description: 'Full composite with all layers - Emma Blue Hair wearing Charcoal_Cat_Print_Cropped_Top',
        compositeType: 'full_curated',
        assetType: 'base',
        components: {
          song_id: '1.018.004.006',
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001'
        },
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.002/full.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.002/thumb.jpg',
        previewUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.002/preview.mp4',
        tags: ['nna-layer-G', 'nna-layer-S', 'nna-layer-L', 'nna-layer-M', 'nna-layer-W', 'nna-compliant', 'full-composite'],
        duration: 30,
        fileSize: 15.2,
        resolution: '1080p',
        format: 'mp4',
        qualityScore: 0.9,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'C.FUL.ALL.003',
        nna_address: '9.001.001.003',
        layer: 'C',
        category: 'FUL',
        subcategory: 'ALL',
        description: 'Full composite with all layers - Modern dance performance',
        compositeType: 'full_curated',
        assetType: 'base',
        components: {
          song_id: '1.018.004.006',
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001'
        },
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.003/full.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.003/thumb.jpg',
        previewUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.003/preview.mp4',
        tags: ['nna-layer-G', 'nna-layer-S', 'nna-layer-L', 'nna-layer-M', 'nna-layer-W', 'nna-compliant', 'full-composite'],
        duration: 30,
        fileSize: 15.2,
        resolution: '1080p',
        format: 'mp4',
        qualityScore: 0.9,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const assets = this.db.collection('assets');
    
    // Check for existing C.FUL composites
    const existingCFul = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    if (existingCFul.length > 0) {
      console.log(`⚠️  Found ${existingCFul.length} existing C.FUL composites:`);
      existingCFul.forEach(asset => console.log(`    - ${asset.name}`));
      console.log('💡 C.FUL composites already exist in database');
      return;
    }

    try {
      const result = await assets.insertMany(cFulComposites);
      console.log(`✅ Successfully inserted ${result.insertedCount} C.FUL composite assets`);
      
      // Log the created assets
      cFulComposites.forEach(asset => {
        console.log(`   📦 Created: ${asset.name} - ${asset.description}`);
      });
      
      console.log('\n🎯 ReViz API will now return C.FUL composites with GCP URLs!');
      
    } catch (error) {
      console.error('❌ Error inserting C.FUL composites:', error);
      throw error;
    }
  }

  async run() {
    try {
      await this.connect();
      await this.seedCFulComposites();
      console.log('\n✅ C.FUL composite seeding completed successfully!');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new CFullCompositeSeeder();
  seeder.run();
}

module.exports = CFullCompositeSeeder;
