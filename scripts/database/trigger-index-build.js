#!/usr/bin/env node

/**
 * Trigger-Based Index Building for AlgoRhythm
 * 
 * This script triggers index building when:
 * 1. New assets are uploaded
 * 2. Asset metadata is updated
 * 3. Manual trigger is requested
 * 4. Scheduled maintenance (every minute for dev)
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

// State file to track changes
const STATE_FILE = '/tmp/algorhythm-asset-state.json';

class TriggerIndexBuilder {
  constructor() {
    this.client = null;
    this.db = null;
    this.lastAssetCount = 0;
    this.lastUpdateTime = null;
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

  async loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.lastAssetCount = state.assetCount || 0;
        this.lastUpdateTime = state.lastUpdate || null;
        console.log(`📊 Loaded state: ${this.lastAssetCount} assets, last update: ${this.lastUpdateTime}`);
      }
    } catch (error) {
      console.log('📊 No previous state found, starting fresh');
      this.lastAssetCount = 0;
      this.lastUpdateTime = null;
    }
  }

  async saveState() {
    const state = {
      assetCount: this.lastAssetCount,
      lastUpdate: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`💾 State saved: ${this.lastAssetCount} assets`);
  }

  async checkForChanges() {
    const assets = this.db.collection('assets');
    
    // Get current asset count
    const currentCount = await assets.countDocuments();
    
    // Get latest asset update time
    const latestAsset = await assets.findOne({}, { sort: { updatedAt: -1 } });
    const latestUpdate = latestAsset?.updatedAt || latestAsset?.createdAt;
    
    console.log(`📊 Current: ${currentCount} assets, Latest update: ${latestUpdate}`);
    console.log(`📊 Previous: ${this.lastAssetCount} assets, Last check: ${this.lastUpdateTime}`);
    
    // Check if assets changed
    const assetCountChanged = currentCount !== this.lastAssetCount;
    const newAssetsAdded = currentCount > this.lastAssetCount;
    const assetsRemoved = currentCount < this.lastAssetCount;
    const timeChanged = latestUpdate && latestUpdate !== this.lastUpdateTime;
    
    const needsRebuild = assetCountChanged || timeChanged;
    
    if (needsRebuild) {
      console.log('🔄 Changes detected:');
      if (newAssetsAdded) console.log(`  ➕ ${currentCount - this.lastAssetCount} new assets added`);
      if (assetsRemoved) console.log(`  ➖ ${this.lastAssetCount - currentCount} assets removed`);
      if (timeChanged) console.log(`  🕒 Asset metadata updated`);
      
      return true;
    }
    
    console.log('✅ No changes detected, skipping rebuild');
    return false;
  }

  async buildIndexes() {
    console.log('🚀 Building optimized indexes for limited assets...');
    
    const assets = this.db.collection('assets');
    
    // 1. Get current asset distribution
    const assetStats = await assets.aggregate([
      {
        $group: {
          _id: '$layer',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('📊 Asset distribution:');
    assetStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} assets`);
    });
    
    // 2. Create optimized indexes
    const indexes = [
      // Primary compound index
      { 
        keys: { layer: 1, category: 1, subcategory: 1, nna_address: 1 },
        options: { name: 'optimized_limited_assets', background: true }
      },
      // Text search index
      { 
        keys: { tags: 'text' },
        options: { name: 'tags_text_limited', background: true }
      },
      // Layer-specific indexes
      { 
        keys: { layer: 1, nna_address: 1 },
        options: { name: 'layer_address', background: true }
      },
      // Category index
      { 
        keys: { category: 1, subcategory: 1 },
        options: { name: 'category_subcategory', background: true }
      }
    ];
    
    for (const index of indexes) {
      try {
        await assets.createIndex(index.keys, index.options);
        console.log(`✅ Created index: ${index.options.name}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`ℹ️  Index already exists: ${index.options.name}`);
        } else {
          console.log(`⚠️  Index creation failed: ${index.options.name} - ${error.message}`);
        }
      }
    }
    
    // 3. Pre-compute recommendations for popular songs
    console.log('🎵 Pre-computing recommendations...');
    
    const songs = await assets.find({ layer: 'G' }).limit(5).toArray();
    const templates = await assets.find({ layer: 'C' }).limit(5).toArray();
    
    const recommendationCache = this.db.collection('recommendation-cache');
    
    for (const song of songs) {
      const recommendations = templates.map((template, index) => ({
        song_id: song.nna_address,
        template_id: template.nna_address,
        compatibility_score: 0.8 - (index * 0.1),
        components: {
          song_id: song.nna_address,
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001'
        },
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }));
      
      // Update cache
      await recommendationCache.deleteMany({ song_id: song.nna_address });
      await recommendationCache.insertMany(recommendations);
      
      console.log(`✅ Cached ${recommendations.length} recommendations for ${song.nna_address}`);
    }
    
    // 4. Update performance metrics
    const performanceMetrics = {
      total_assets: await assets.countDocuments(),
      songs: await assets.countDocuments({ layer: 'G' }),
      templates: await assets.countDocuments({ layer: 'C' }),
      stars: await assets.countDocuments({ layer: 'S' }),
      looks: await assets.countDocuments({ layer: 'L' }),
      moves: await assets.countDocuments({ layer: 'M' }),
      worlds: await assets.countDocuments({ layer: 'W' }),
      last_build: new Date(),
      build_trigger: 'asset_change'
    };
    
    await this.db.collection('performance-metrics').deleteMany({});
    await this.db.collection('performance-metrics').insertOne(performanceMetrics);
    
    console.log('✅ Performance metrics updated');
    console.log(`📊 Total assets: ${performanceMetrics.total_assets}`);
    console.log(`🎵 Songs: ${performanceMetrics.songs}`);
    console.log(`🎬 Templates: ${performanceMetrics.templates}`);
  }

  async run() {
    try {
      await this.connect();
      await this.loadState();
      
      const needsRebuild = await this.checkForChanges();
      
      if (needsRebuild) {
        console.log('🔄 Changes detected, rebuilding indexes...');
        await this.buildIndexes();
        
        // Update state
        const assets = this.db.collection('assets');
        this.lastAssetCount = await assets.countDocuments();
        this.lastUpdateTime = new Date().toISOString();
        await this.saveState();
        
        console.log('✅ Index rebuild completed');
      } else {
        console.log('✅ No changes detected, indexes are up to date');
      }
      
    } catch (error) {
      console.error('❌ Trigger index build failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new TriggerIndexBuilder();
  builder.run()
    .then(() => {
      console.log('✅ Trigger index build completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Trigger index build failed:', error);
      process.exit(1);
    });
}

module.exports = { TriggerIndexBuilder };
