#!/usr/bin/env node

/**
 * 🔧 DATABASE INDEX REBUILDING AND OPTIMIZATION SCRIPT
 * 
 * This script rebuilds and optimizes all database indexes for the Algorhythm service
 * to ensure optimal performance for ReViz API integration.
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algorhythm-dev';
const DB_NAME = MONGODB_URI.split('/').pop()?.split('?')[0] || 'algorhythm-dev';

console.log('🔧 Starting database index rebuilding and optimization...');
console.log('📊 Database:', DB_NAME);
console.log('🔗 URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

async function rebuildIndexes() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // 1. ASSET COLLECTION INDEXES
    console.log('\n📁 Rebuilding Asset collection indexes...');
    const assetCollection = db.collection('assets');
    
    // Drop existing indexes
    try {
      await assetCollection.dropIndexes();
      console.log('🗑️  Dropped existing Asset indexes');
    } catch (error) {
      console.log('ℹ️  No existing Asset indexes to drop');
    }
    
    // Create optimized indexes for Asset collection
    const assetIndexes = [
      // Primary query indexes
      { key: { assetId: 1 }, name: 'assetId_1' },
      { key: { layer: 1 }, name: 'layer_1' },
      { key: { category: 1 }, name: 'category_1' },
      { key: { subcategory: 1 }, name: 'subcategory_1' },
      
      // Performance optimization indexes
      { key: { layer: 1, category: 1 }, name: 'layer_category_compound' },
      { key: { layer: 1, compatibilityScore: -1 }, name: 'layer_compatibility_desc' },
      { key: { category: 1, subcategory: 1 }, name: 'category_subcategory_compound' },
      
      // ReViz API optimization indexes
      { key: { layer: 1, category: 1, compatibilityScore: -1 }, name: 'reviz_layer_category_compatibility' },
      { key: { assetId: 1, layer: 1, category: 1 }, name: 'reviz_asset_lookup' },
      
      // Metadata indexes
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
      { key: { fileSize: 1 }, name: 'fileSize_asc' },
      { key: { duration: 1 }, name: 'duration_asc' },
      
      // Text search indexes
      { key: { name: 'text', description: 'text' }, name: 'asset_text_search' },
      
      // Unique constraints
      { key: { assetId: 1 }, name: 'assetId_unique', unique: true },
    ];
    
    for (const index of assetIndexes) {
      try {
        await assetCollection.createIndex(index.key, { 
          name: index.name, 
          unique: index.unique || false,
          background: true 
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Index ${index.name} already exists or error: ${error.message}`);
      }
    }
    
    // 2. COMPOSITE COLLECTION INDEXES
    console.log('\n🎬 Rebuilding Composite collection indexes...');
    const compositeCollection = db.collection('composites');
    
    // Drop existing indexes
    try {
      await compositeCollection.dropIndexes();
      console.log('🗑️  Dropped existing Composite indexes');
    } catch (error) {
      console.log('ℹ️  No existing Composite indexes to drop');
    }
    
    // Create optimized indexes for Composite collection
    const compositeIndexes = [
      // Primary query indexes
      { key: { compositeId: 1 }, name: 'compositeId_1' },
      { key: { name: 1 }, name: 'name_1' },
      { key: { format: 1 }, name: 'format_1' },
      { key: { resolution: 1 }, name: 'resolution_1' },
      
      // Performance optimization indexes
      { key: { compositeId: 1, format: 1 }, name: 'compositeId_format_compound' },
      { key: { compatibilityScore: -1 }, name: 'compatibilityScore_desc' },
      { key: { duration: 1 }, name: 'duration_asc' },
      { key: { fileSize: 1 }, name: 'fileSize_asc' },
      
      // ReViz API optimization indexes
      { key: { compositeId: 1, compatibilityScore: -1 }, name: 'reviz_composite_lookup' },
      { key: { format: 1, resolution: 1, compatibilityScore: -1 }, name: 'reviz_format_resolution_compatibility' },
      
      // Metadata indexes
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
      
      // Text search indexes
      { key: { name: 'text', description: 'text' }, name: 'composite_text_search' },
      
      // Unique constraints
      { key: { compositeId: 1 }, name: 'compositeId_unique', unique: true },
    ];
    
    for (const index of compositeIndexes) {
      try {
        await compositeCollection.createIndex(index.key, { 
          name: index.name, 
          unique: index.unique || false,
          background: true 
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Index ${index.name} already exists or error: ${error.message}`);
      }
    }
    
    // 3. COMPATIBILITY SCORE COLLECTION INDEXES
    console.log('\n🔗 Rebuilding CompatibilityScore collection indexes...');
    const compatibilityCollection = db.collection('compatibilityscores');
    
    // Drop existing indexes
    try {
      await compatibilityCollection.dropIndexes();
      console.log('🗑️  Dropped existing CompatibilityScore indexes');
    } catch (error) {
      console.log('ℹ️  No existing CompatibilityScore indexes to drop');
    }
    
    // Create optimized indexes for CompatibilityScore collection
    const compatibilityIndexes = [
      // Primary query indexes
      { key: { assetId1: 1 }, name: 'assetId1_1' },
      { key: { assetId2: 1 }, name: 'assetId2_1' },
      { key: { score: -1 }, name: 'score_desc' },
      
      // Performance optimization indexes
      { key: { assetId1: 1, assetId2: 1 }, name: 'asset_pair_compound' },
      { key: { assetId1: 1, score: -1 }, name: 'assetId1_score_desc' },
      { key: { assetId2: 1, score: -1 }, name: 'assetId2_score_desc' },
      
      // ReViz API optimization indexes
      { key: { assetId1: 1, assetId2: 1, score: -1 }, name: 'reviz_compatibility_lookup' },
      
      // Metadata indexes
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
      
      // Unique constraints
      { key: { assetId1: 1, assetId2: 1 }, name: 'asset_pair_unique', unique: true },
    ];
    
    for (const index of compatibilityIndexes) {
      try {
        await compatibilityCollection.createIndex(index.key, { 
          name: index.name, 
          unique: index.unique || false,
          background: true 
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Index ${index.name} already exists or error: ${error.message}`);
      }
    }
    
    // 4. RECOMMENDATION CACHE COLLECTION INDEXES
    console.log('\n💾 Rebuilding RecommendationCache collection indexes...');
    const cacheCollection = db.collection('recommendationcaches');
    
    // Drop existing indexes
    try {
      await cacheCollection.dropIndexes();
      console.log('🗑️  Dropped existing RecommendationCache indexes');
    } catch (error) {
      console.log('ℹ️  No existing RecommendationCache indexes to drop');
    }
    
    // Create optimized indexes for RecommendationCache collection
    const cacheIndexes = [
      // Primary query indexes
      { key: { cacheKey: 1 }, name: 'cacheKey_1' },
      { key: { userId: 1 }, name: 'userId_1' },
      { key: { compositeId: 1 }, name: 'compositeId_1' },
      
      // Performance optimization indexes
      { key: { cacheKey: 1, expiresAt: 1 }, name: 'cacheKey_expires_compound' },
      { key: { userId: 1, compositeId: 1 }, name: 'user_composite_compound' },
      { key: { expiresAt: 1 }, name: 'expiresAt_asc' },
      
      // ReViz API optimization indexes
      { key: { cacheKey: 1, expiresAt: 1, hitCount: -1 }, name: 'reviz_cache_lookup' },
      
      // Metadata indexes
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
      { key: { hitCount: -1 }, name: 'hitCount_desc' },
      
      // Unique constraints
      { key: { cacheKey: 1 }, name: 'cacheKey_unique', unique: true },
    ];
    
    for (const index of cacheIndexes) {
      try {
        await cacheCollection.createIndex(index.key, { 
          name: index.name, 
          unique: index.unique || false,
          background: true 
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Index ${index.name} already exists or error: ${error.message}`);
      }
    }
    
    // 5. COLLECTION STATISTICS AND OPTIMIZATION
    console.log('\n📊 Analyzing collection statistics...');
    
    const collections = ['assets', 'composites', 'compatibilityscores', 'recommendationcaches'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const stats = await collection.stats();
        
        console.log(`\n📁 ${collectionName.toUpperCase()} Collection Stats:`);
        console.log(`   📄 Documents: ${stats.count.toLocaleString()}`);
        console.log(`   💾 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   🗂️  Indexes: ${stats.nindexes}`);
        console.log(`   💾 Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   ⚡ Average Object Size: ${(stats.avgObjSize || 0).toFixed(2)} bytes`);
        
        // Get index details
        const indexes = await collection.listIndexes().toArray();
        console.log(`   🔍 Indexes:`);
        indexes.forEach(index => {
          console.log(`      - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        
      } catch (error) {
        console.log(`⚠️  Could not get stats for ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Database index rebuilding and optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during index rebuilding:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the index rebuilding
if (require.main === module) {
  rebuildIndexes()
    .then(() => {
      console.log('🎉 Index rebuilding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Index rebuilding failed:', error);
      process.exit(1);
    });
}

module.exports = { rebuildIndexes };
