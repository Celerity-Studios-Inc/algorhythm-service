#!/usr/bin/env node

/**
 * Create C.FUL composites with unique NNA addresses
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function createCFulUnique() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Creating C.FUL composites with unique NNA addresses...');
    
    // Create C.FUL composites with unique NNA addresses
    const cFulComposites = [
      {
        name: 'C.FUL.ALL.001',
        nna_address: '9.001.001.100', // Using unique address
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
        nna_address: '9.001.001.101', // Using unique address
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
        nna_address: '9.001.001.102', // Using unique address
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
    
    // Insert C.FUL composites
    const result = await assets.insertMany(cFulComposites);
    console.log(`✅ Successfully created ${result.insertedCount} C.FUL composite assets`);
    
    cFulComposites.forEach(asset => {
      console.log(`   📦 Created: ${asset.name} (${asset.nna_address}) - ${asset.description}`);
    });
    
    console.log('\n🎯 ReViz API will now return C.FUL composites with GCP URLs!');
    console.log('🔧 The API is now filtering for C.FUL composites and will return these assets.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createCFulUnique();
