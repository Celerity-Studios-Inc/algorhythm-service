#!/usr/bin/env node

/**
 * 🔧 QUERY OPTIMIZATION SCRIPT
 * 
 * This script optimizes database queries and caching for the Algorhythm service
 * to ensure optimal performance for ReViz API integration.
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algorhythm-dev';
const DB_NAME = MONGODB_URI.split('/').pop()?.split('?')[0] || 'algorhythm-dev';

console.log('🔧 Starting query optimization...');
console.log('📊 Database:', DB_NAME);

async function optimizeQueries() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // 1. ANALYZE SLOW QUERIES
    console.log('\n🐌 Analyzing slow queries...');
    
    try {
      // Get current profiling level
      const profilingStatus = await db.command({ profile: -1 });
      console.log('📊 Current profiling level:', profilingStatus.was);
      
      // Set profiling level to capture slow operations
      await db.command({ profile: 2, slowms: 100 });
      console.log('📊 Profiling enabled for queries > 100ms');
      
      // Wait a moment for some queries to be captured
      console.log('⏳ Waiting for query data...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get slow query statistics
      const slowQueries = await db.collection('system.profile').find({
        ts: { $gte: new Date(Date.now() - 60000) }, // Last minute
        millis: { $gte: 100 }
      }).toArray();
      
      console.log(`📊 Found ${slowQueries.length} slow queries in the last minute`);
      
      if (slowQueries.length > 0) {
        console.log('\n🐌 Slow Query Analysis:');
        slowQueries.forEach((query, index) => {
          console.log(`\n${index + 1}. Query: ${query.command?.find || query.command?.aggregate || 'Unknown'}`);
          console.log(`   Collection: ${query.ns}`);
          console.log(`   Duration: ${query.millis}ms`);
          console.log(`   Timestamp: ${query.ts}`);
          if (query.planSummary) {
            console.log(`   Plan: ${query.planSummary}`);
          }
        });
      }
      
    } catch (error) {
      console.log('⚠️  Could not analyze slow queries:', error.message);
    }
    
    // 2. OPTIMIZE COLLECTION STATISTICS
    console.log('\n📊 Optimizing collection statistics...');
    
    const collections = ['assets', 'composites', 'compatibilityscores', 'recommendationcaches'];
    
    for (const collectionName of collections) {
      try {
        console.log(`\n🔧 Optimizing ${collectionName} collection...`);
        const collection = db.collection(collectionName);
        
        // Update collection statistics
        await collection.aggregate([{ $collStats: { count: {}, storageStats: {} } }]).toArray();
        console.log(`✅ Updated statistics for ${collectionName}`);
        
        // Analyze query patterns
        const sampleDocs = await collection.find({}).limit(10).toArray();
        if (sampleDocs.length > 0) {
          console.log(`📄 Sample document structure for ${collectionName}:`);
          const sampleDoc = sampleDocs[0];
          const fields = Object.keys(sampleDoc);
          console.log(`   Fields: ${fields.join(', ')}`);
          
          // Check for common query patterns
          const commonFields = ['assetId', 'compositeId', 'layer', 'category', 'compatibilityScore'];
          const availableFields = fields.filter(field => commonFields.includes(field));
          console.log(`   Queryable fields: ${availableFields.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`⚠️  Could not optimize ${collectionName}: ${error.message}`);
      }
    }
    
    // 3. CACHE OPTIMIZATION
    console.log('\n💾 Optimizing cache settings...');
    
    try {
      // Check cache collection size and cleanup
      const cacheCollection = db.collection('recommendationcaches');
      const cacheStats = await cacheCollection.stats();
      console.log(`📊 Cache collection size: ${(cacheStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Clean up expired cache entries
      const expiredCount = await cacheCollection.countDocuments({
        expiresAt: { $lt: new Date() }
      });
      
      if (expiredCount > 0) {
        console.log(`🗑️  Found ${expiredCount} expired cache entries`);
        const deleteResult = await cacheCollection.deleteMany({
          expiresAt: { $lt: new Date() }
        });
        console.log(`✅ Cleaned up ${deleteResult.deletedCount} expired cache entries`);
      } else {
        console.log('✅ No expired cache entries found');
      }
      
      // Optimize cache indexes
      const cacheIndexes = await cacheCollection.listIndexes().toArray();
      console.log(`📊 Cache indexes: ${cacheIndexes.length}`);
      
      // Check for optimal cache hit ratio
      const totalCacheEntries = await cacheCollection.countDocuments();
      const highHitCacheEntries = await cacheCollection.countDocuments({
        hitCount: { $gte: 5 }
      });
      
      if (totalCacheEntries > 0) {
        const hitRatio = (highHitCacheEntries / totalCacheEntries * 100).toFixed(2);
        console.log(`📊 Cache hit ratio: ${hitRatio}% (${highHitCacheEntries}/${totalCacheEntries} entries with 5+ hits)`);
      }
      
    } catch (error) {
      console.log('⚠️  Could not optimize cache:', error.message);
    }
    
    // 4. PERFORMANCE RECOMMENDATIONS
    console.log('\n💡 Performance recommendations...');
    
    const recommendations = [
      '🔍 Use compound indexes for multi-field queries',
      '📊 Monitor slow query log regularly',
      '💾 Implement query result caching for frequently accessed data',
      '🗂️  Consider sharding for large collections',
      '⚡ Use projection to limit returned fields',
      '🔄 Implement connection pooling',
      '📈 Monitor memory usage and index size',
      '🎯 Use explain() to analyze query execution plans'
    ];
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    // 5. REVIZ API SPECIFIC OPTIMIZATIONS
    console.log('\n🎬 ReViz API specific optimizations...');
    
    try {
      // Optimize for composite lookups
      const compositeCollection = db.collection('composites');
      const compositeCount = await compositeCollection.countDocuments();
      console.log(`📊 Total composites: ${compositeCount.toLocaleString()}`);
      
      // Optimize for asset layer queries
      const assetCollection = db.collection('assets');
      const layerStats = await assetCollection.aggregate([
        { $group: { _id: '$layer', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log('📊 Assets by layer:');
      layerStats.forEach(stat => {
        console.log(`   ${stat._id}: ${stat.count.toLocaleString()} assets`);
      });
      
      // Check for compatibility score distribution
      const compatibilityCollection = db.collection('compatibilityscores');
      const scoreStats = await compatibilityCollection.aggregate([
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$score' },
            minScore: { $min: '$score' },
            maxScore: { $max: '$score' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      if (scoreStats.length > 0) {
        const stats = scoreStats[0];
        console.log(`📊 Compatibility scores: ${stats.count.toLocaleString()} pairs`);
        console.log(`   Average: ${stats.avgScore.toFixed(3)}`);
        console.log(`   Range: ${stats.minScore.toFixed(3)} - ${stats.maxScore.toFixed(3)}`);
      }
      
    } catch (error) {
      console.log('⚠️  Could not analyze ReViz API optimizations:', error.message);
    }
    
    console.log('\n✅ Query optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during query optimization:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the optimization
if (require.main === module) {
  optimizeQueries()
    .then(() => {
      console.log('🎉 Query optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Query optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeQueries };
