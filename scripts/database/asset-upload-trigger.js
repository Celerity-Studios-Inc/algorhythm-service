#!/usr/bin/env node

/**
 * Asset Upload Trigger for AlgoRhythm
 * 
 * This script can be called when new assets are uploaded to:
 * 1. Immediately trigger index building
 * 2. Update recommendation cache
 * 3. Optimize for new asset types
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

class AssetUploadTrigger {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db('nna-registry-service-dev');
    console.log('🔌 Connected to MongoDB');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async triggerIndexBuild() {
    console.log('🚀 Triggering index build for new assets...');
    
    // Import and run the trigger index builder
    const { TriggerIndexBuilder } = require('./trigger-index-build.js');
    const builder = new TriggerIndexBuilder();
    
    await builder.connect();
    await builder.loadState();
    
    // Force rebuild by marking as changed
    builder.lastAssetCount = 0;
    builder.lastUpdateTime = null;
    
    await builder.buildIndexes();
    await builder.saveState();
    await builder.disconnect();
    
    console.log('✅ Index build triggered successfully');
  }

  async updateRecommendationCache() {
    console.log('🎵 Updating recommendation cache for new assets...');
    
    const assets = this.db.collection('assets');
    const recommendationCache = this.db.collection('recommendation-cache');
    
    // Get all songs and templates
    const songs = await assets.find({ layer: 'G' }).toArray();
    const templates = await assets.find({ layer: 'C' }).toArray();
    
    console.log(`📊 Found ${songs.length} songs and ${templates.length} templates`);
    
    // Update cache for each song
    for (const song of songs) {
      const recommendations = templates.slice(0, 5).map((template, index) => ({
        song_id: song.nna_address,
        template_id: template.nna_address,
        compatibility_score: 0.8 - (index * 0.1),
        components: {
          song_id: song.nna_address,
          star_id: '2.009.002.018', // Default star
          look_id: '3.003.001.001', // Default look
          move_id: '4.022.002.003', // Default move
          world_id: '5.015.001.001' // Default world
        },
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }));
      
      // Update cache
      await recommendationCache.deleteMany({ song_id: song.nna_address });
      await recommendationCache.insertMany(recommendations);
      
      console.log(`✅ Updated cache for ${song.nna_address} with ${recommendations.length} recommendations`);
    }
  }

  async optimizeForNewAssets() {
    console.log('🔧 Optimizing for new assets...');
    
    const assets = this.db.collection('assets');
    
    // Get asset distribution
    const assetStats = await assets.aggregate([
      {
        $group: {
          _id: '$layer',
          count: { $sum: 1 },
          categories: { $addToSet: '$category' }
        }
      }
    ]).toArray();
    
    console.log('📊 Current asset distribution:');
    assetStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} assets (${stat.categories.length} categories)`);
    });
    
    // Create optimized indexes for new asset types
    const newIndexes = [
      { 
        keys: { layer: 1, category: 1, subcategory: 1, nna_address: 1 },
        options: { name: 'optimized_limited_assets', background: true }
      },
      { 
        keys: { tags: 'text' },
        options: { name: 'tags_text_limited', background: true }
      },
      { 
        keys: { layer: 1, nna_address: 1 },
        options: { name: 'layer_address', background: true }
      }
    ];
    
    for (const index of newIndexes) {
      try {
        await assets.createIndex(index.keys, index.options);
        console.log(`✅ Created/updated index: ${index.options.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index already exists: ${index.options.name}`);
        } else {
          console.log(`⚠️  Index creation failed: ${index.options.name} - ${error.message}`);
        }
      }
    }
  }

  async updatePerformanceMetrics() {
    console.log('📊 Updating performance metrics...');
    
    const assets = this.db.collection('assets');
    
    const metrics = {
      total_assets: await assets.countDocuments(),
      songs: await assets.countDocuments({ layer: 'G' }),
      templates: await assets.countDocuments({ layer: 'C' }),
      stars: await assets.countDocuments({ layer: 'S' }),
      looks: await assets.countDocuments({ layer: 'L' }),
      moves: await assets.countDocuments({ layer: 'M' }),
      worlds: await assets.countDocuments({ layer: 'W' }),
      last_upload_trigger: new Date(),
      trigger_type: 'asset_upload'
    };
    
    await this.db.collection('performance-metrics').deleteMany({});
    await this.db.collection('performance-metrics').insertOne(metrics);
    
    console.log('✅ Performance metrics updated:');
    console.log(`  Total Assets: ${metrics.total_assets}`);
    console.log(`  Songs: ${metrics.songs}`);
    console.log(`  Templates: ${metrics.templates}`);
    console.log(`  Stars: ${metrics.stars}`);
    console.log(`  Looks: ${metrics.looks}`);
    console.log(`  Moves: ${metrics.moves}`);
    console.log(`  Worlds: ${metrics.worlds}`);
  }

  async run() {
    try {
      await this.connect();
      
      console.log('🎯 Asset Upload Trigger Started');
      console.log('==============================');
      
      // 1. Trigger index build
      await this.triggerIndexBuild();
      
      // 2. Update recommendation cache
      await this.updateRecommendationCache();
      
      // 3. Optimize for new assets
      await this.optimizeForNewAssets();
      
      // 4. Update performance metrics
      await this.updatePerformanceMetrics();
      
      console.log('✅ Asset upload trigger completed successfully!');
      
    } catch (error) {
      console.error('❌ Asset upload trigger failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const trigger = new AssetUploadTrigger();
  trigger.run()
    .then(() => {
      console.log('✅ Asset upload trigger completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Asset upload trigger failed:', error);
      process.exit(1);
    });
}

module.exports = { AssetUploadTrigger };
