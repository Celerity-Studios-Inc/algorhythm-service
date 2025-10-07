#!/usr/bin/env node

/**
 * Optimize AlgoRhythm for Limited Development Assets
 * 
 * This script optimizes the system for the limited 90 assets in development:
 * - C: 36 templates (composites)
 * - S: 31 stars (characters)
 * - G: 11 songs
 * - L: 6 looks (outfits)
 * - W: 3 worlds (environments)
 * - M: 3 moves (dances)
 */

const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function optimizeForLimitedAssets() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔧 Optimizing AlgoRhythm for Limited Development Assets');
    console.log('======================================================');
    
    const db = client.db('nna-registry-service-dev');
    const assets = db.collection('assets');
    
    // 1. Get current asset distribution
    const assetStats = await assets.aggregate([
      {
        $group: {
          _id: '$layer',
          count: { $sum: 1 },
          categories: { $addToSet: '$category' }
        }
      }
    ]).toArray();
    
    console.log('📊 Current Asset Distribution:');
    assetStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} assets (${stat.categories.length} categories)`);
    });
    
    // 2. Create optimized indexes for limited dataset
    console.log('\n🚀 Creating Optimized Indexes...');
    
    // Single compound index for all queries
    await assets.createIndex(
      { layer: 1, category: 1, subcategory: 1, nna_address: 1 },
      { name: 'optimized_limited_assets', background: true }
    );
    console.log('✅ Created optimized compound index');
    
    // Text search index for tags (lightweight) - skip if comprehensive text index exists
    try {
      await assets.createIndex(
        { tags: 'text' },
        { name: 'tags_text_limited', background: true }
      );
      console.log('✅ Created lightweight text index');
    } catch (error) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('ℹ️  Skipping tags text index - comprehensive text index already exists');
      } else {
        throw error;
      }
    }
    
    // 3. Pre-compute recommendations for all songs
    console.log('\n🎵 Pre-computing Recommendations...');
    
    const songs = await assets.find({ layer: 'G' }).toArray();
    const templates = await assets.find({ layer: 'C' }).toArray();
    
    console.log(`📊 Found ${songs.length} songs and ${templates.length} templates`);
    
    // Create recommendation cache for each song
    const recommendationCache = db.collection('recommendation-cache');
    
    for (const song of songs) {
      // For limited assets, create simple recommendations
      const recommendations = templates.slice(0, 5).map((template, index) => ({
        song_id: song.nna_address,
        template_id: template.nna_address,
        compatibility_score: 0.8 - (index * 0.1), // Simple scoring
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
      
      // Store in cache
      await recommendationCache.deleteMany({ song_id: song.nna_address });
      await recommendationCache.insertMany(recommendations);
      
      console.log(`✅ Pre-computed ${recommendations.length} recommendations for ${song.nna_address}`);
    }
    
    // 4. Create asset lookup cache
    console.log('\n💾 Creating Asset Lookup Cache...');
    
    const assetCache = db.collection('asset-cache');
    await assetCache.deleteMany({}); // Clear existing cache
    
    const allAssets = await assets.find({}).toArray();
    const assetLookup = allAssets.reduce((acc, asset) => {
      acc[asset.nna_address] = {
        id: asset._id,
        name: asset.name,
        layer: asset.layer,
        category: asset.category,
        subcategory: asset.subcategory,
        tags: asset.tags || [],
        nna_address: asset.nna_address
      };
      return acc;
    }, {});
    
    await assetCache.insertOne({
      type: 'asset_lookup',
      data: assetLookup,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    console.log(`✅ Created asset lookup cache for ${Object.keys(assetLookup).length} assets`);
    
    // 5. Optimize for specific song-template combinations
    console.log('\n🎯 Optimizing Song-Template Combinations...');
    
    const popularCombinations = [
      { song: '1.013.017.001', templates: ['9.002.025.025', '9.002.025.003', '9.002.025.030'] },
      { song: '1.018.001.001', templates: ['9.001.001.001', '9.001.001.002', '9.001.001.003'] },
      { song: '1.018.004.001', templates: ['9.002.025.017', '9.002.025.018', '9.002.025.002'] }
    ];
    
    for (const combo of popularCombinations) {
      const optimizedRecommendations = combo.templates.map((templateId, index) => ({
        song_id: combo.song,
        template_id: templateId,
        compatibility_score: 0.9 - (index * 0.1),
        components: {
          song_id: combo.song,
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001'
        },
        optimized: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      }));
      
      await recommendationCache.deleteMany({ song_id: combo.song, optimized: true });
      await recommendationCache.insertMany(optimizedRecommendations);
      
      console.log(`✅ Optimized ${optimizedRecommendations.length} combinations for ${combo.song}`);
    }
    
    // 6. Create performance monitoring
    console.log('\n📊 Setting up Performance Monitoring...');
    
    const performanceMetrics = {
      total_assets: allAssets.length,
      songs: songs.length,
      templates: templates.length,
      stars: allAssets.filter(a => a.layer === 'S').length,
      looks: allAssets.filter(a => a.layer === 'L').length,
      moves: allAssets.filter(a => a.layer === 'M').length,
      worlds: allAssets.filter(a => a.layer === 'W').length,
      optimized_at: new Date(),
      cache_size: Object.keys(assetLookup).length,
      recommendations_precomputed: songs.length * 5
    };
    
    await db.collection('performance-metrics').deleteMany({});
    await db.collection('performance-metrics').insertOne(performanceMetrics);
    
    console.log('✅ Performance metrics stored');
    console.log('\n📊 Optimization Summary:');
    console.log(`  Total Assets: ${performanceMetrics.total_assets}`);
    console.log(`  Songs: ${performanceMetrics.songs}`);
    console.log(`  Templates: ${performanceMetrics.templates}`);
    console.log(`  Recommendations Pre-computed: ${performanceMetrics.recommendations_precomputed}`);
    console.log(`  Cache Size: ${performanceMetrics.cache_size} assets`);
    
    console.log('\n🎉 Optimization completed successfully!');
    console.log('💡 The system is now optimized for the limited development dataset');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run optimization
if (require.main === module) {
  optimizeForLimitedAssets()
    .then(() => {
      console.log('✅ Limited asset optimization completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeForLimitedAssets };
