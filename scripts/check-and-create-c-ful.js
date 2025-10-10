#!/usr/bin/env node

/**
 * Check existing C.FUL composites and create new ones if needed
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function checkAndCreateCFul() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Checking existing C.FUL composites...');
    
    // Check for existing C.FUL composites
    const existingCFul = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    console.log(`📊 Found ${existingCFul.length} existing C.FUL composites:`);
    existingCFul.forEach(asset => {
      console.log(`   - ${asset.name} (${asset.nna_address})`);
    });
    
    if (existingCFul.length > 0) {
      console.log('✅ C.FUL composites already exist! ReViz API should work now.');
      return;
    }
    
    // Check for C.PAR composites to understand the pattern
    const existingCPar = await assets.find({ 
      name: { $regex: /^C\.PAR\./ } 
    }).toArray();
    
    console.log(`📊 Found ${existingCPar.length} existing C.PAR composites:`);
    existingCPar.forEach(asset => {
      console.log(`   - ${asset.name} (${asset.nna_address})`);
    });
    
    // Create C.FUL composites based on existing C.PAR ones
    console.log('\n🌱 Creating C.FUL composites based on existing C.PAR...');
    
    const cFulComposites = existingCPar.map((parAsset, index) => ({
      name: `C.FUL.ALL.${String(index + 1).padStart(3, '0')}`,
      nna_address: `9.001.001.${String(index + 1).padStart(3, '0')}`,
      layer: 'C',
      category: 'FUL',
      subcategory: 'ALL',
      description: `Full composite based on ${parAsset.name} - ${parAsset.description || 'Complete composite with all layers'}`,
      compositeType: 'full_curated',
      assetType: 'base',
      components: parAsset.components || {
        song_id: '1.018.004.006',
        star_id: '2.009.002.018',
        look_id: '3.003.001.001',
        move_id: '4.022.002.003',
        world_id: '5.015.001.001'
      },
      gcpStorageUrl: `https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.${String(index + 1).padStart(3, '0')}/full.mp4`,
      thumbnailUrl: `https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.${String(index + 1).padStart(3, '0')}/thumb.jpg`,
      previewUrl: `https://storage.googleapis.com/nna_registry_assets_dev/composites/C.FUL.ALL.${String(index + 1).padStart(3, '0')}/preview.mp4`,
      tags: [...(parAsset.tags || []), 'full-composite', 'c-ful'],
      duration: 30,
      fileSize: 15.2,
      resolution: '1080p',
      format: 'mp4',
      qualityScore: 0.9,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    if (cFulComposites.length === 0) {
      console.log('⚠️  No C.PAR composites found to base C.FUL on. Creating sample C.FUL...');
      
      const sampleCFul = {
        name: 'C.FUL.ALL.001',
        nna_address: '9.001.001.001',
        layer: 'C',
        category: 'FUL',
        subcategory: 'ALL',
        description: 'Sample full composite with all layers',
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
      };
      
      cFulComposites.push(sampleCFul);
    }
    
    // Insert C.FUL composites
    const result = await assets.insertMany(cFulComposites);
    console.log(`✅ Successfully created ${result.insertedCount} C.FUL composite assets`);
    
    cFulComposites.forEach(asset => {
      console.log(`   📦 Created: ${asset.name} - ${asset.description}`);
    });
    
    console.log('\n🎯 ReViz API will now return C.FUL composites with GCP URLs!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAndCreateCFul();
