#!/usr/bin/env node

/**
 * 🔧 PERFORMANCE TUNING SCRIPT
 * 
 * This script tunes performance parameters for the Algorhythm service
 * to ensure optimal performance for ReViz API integration.
 */

const { MongoClient } = require('mongodb');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algorhythm-dev';
const DB_NAME = MONGODB_URI.split('/').pop()?.split('?')[0] || 'algorhythm-dev';

console.log('🔧 Starting performance tuning...');
console.log('📊 Database:', DB_NAME);
console.log('💻 System:', os.platform(), os.arch());
console.log('🧠 Memory:', `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log('⚡ CPU Cores:', os.cpus().length);

async function performanceTuning() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // 1. SYSTEM PERFORMANCE ANALYSIS
    console.log('\n💻 System Performance Analysis...');
    
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    };
    
    console.log('📊 System Information:');
    console.log(`   Platform: ${systemInfo.platform} ${systemInfo.arch}`);
    console.log(`   Total Memory: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Free Memory: ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Memory Usage: ${((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(1)}%`);
    console.log(`   CPU Cores: ${systemInfo.cpuCount}`);
    console.log(`   Load Average: ${systemInfo.loadAverage.map(load => load.toFixed(2)).join(', ')}`);
    console.log(`   Uptime: ${(systemInfo.uptime / 3600).toFixed(2)} hours`);
    
    // 2. DATABASE PERFORMANCE ANALYSIS
    console.log('\n📊 Database Performance Analysis...');
    
    try {
      // Get database statistics
      const dbStats = await db.stats();
      console.log('📊 Database Statistics:');
      console.log(`   Collections: ${dbStats.collections}`);
      console.log(`   Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Total Size: ${(dbStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Calculate performance metrics
      const indexRatio = (dbStats.indexSize / dbStats.dataSize * 100).toFixed(1);
      const storageEfficiency = (dbStats.dataSize / dbStats.storageSize * 100).toFixed(1);
      
      console.log(`   Index Ratio: ${indexRatio}%`);
      console.log(`   Storage Efficiency: ${storageEfficiency}%`);
      
      // Performance recommendations based on metrics
      if (parseFloat(indexRatio) > 50) {
        console.log('⚠️  High index ratio - consider index optimization');
      }
      if (parseFloat(storageEfficiency) < 80) {
        console.log('⚠️  Low storage efficiency - consider collection optimization');
      }
      
    } catch (error) {
      console.log('⚠️  Could not get database statistics:', error.message);
    }
    
    // 3. COLLECTION PERFORMANCE ANALYSIS
    console.log('\n📁 Collection Performance Analysis...');
    
    const collections = ['assets', 'composites', 'compatibilityscores', 'recommendationcaches'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const stats = await collection.stats();
        
        console.log(`\n📊 ${collectionName.toUpperCase()} Performance:`);
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Avg Document Size: ${(stats.avgObjSize || 0).toFixed(2)} bytes`);
        console.log(`   Indexes: ${stats.nindexes}`);
        console.log(`   Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Performance recommendations
        const avgDocSize = stats.avgObjSize || 0;
        const indexSizeRatio = (stats.totalIndexSize / stats.size * 100).toFixed(1);
        
        if (avgDocSize > 1024 * 1024) { // 1MB
          console.log(`   ⚠️  Large average document size: ${(avgDocSize / 1024).toFixed(2)} KB`);
        }
        if (parseFloat(indexSizeRatio) > 30) {
          console.log(`   ⚠️  High index size ratio: ${indexSizeRatio}%`);
        }
        if (stats.nindexes > 10) {
          console.log(`   ⚠️  Many indexes: ${stats.nindexes} (consider consolidation)`);
        }
        
        // Get index details
        const indexes = await collection.listIndexes().toArray();
        console.log(`   🔍 Index Details:`);
        indexes.forEach(index => {
          const keyStr = Object.entries(index.key).map(([k, v]) => `${k}:${v}`).join(',');
          console.log(`      - ${index.name}: {${keyStr}}`);
        });
        
      } catch (error) {
        console.log(`⚠️  Could not analyze ${collectionName}: ${error.message}`);
      }
    }
    
    // 4. CACHE PERFORMANCE OPTIMIZATION
    console.log('\n💾 Cache Performance Optimization...');
    
    try {
      const cacheCollection = db.collection('recommendationcaches');
      const cacheStats = await cacheCollection.stats();
      
      console.log('📊 Cache Performance:');
      console.log(`   Cache Entries: ${cacheStats.count.toLocaleString()}`);
      console.log(`   Cache Size: ${(cacheStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Analyze cache hit patterns
      const hitPatterns = await cacheCollection.aggregate([
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lt: ['$hitCount', 1] }, then: '0 hits' },
                  { case: { $lt: ['$hitCount', 5] }, then: '1-4 hits' },
                  { case: { $lt: ['$hitCount', 10] }, then: '5-9 hits' },
                  { case: { $lt: ['$hitCount', 50] }, then: '10-49 hits' },
                  { case: { $gte: ['$hitCount', 50] }, then: '50+ hits' }
                ],
                default: 'unknown'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log('📊 Cache Hit Patterns:');
      hitPatterns.forEach(pattern => {
        console.log(`   ${pattern._id}: ${pattern.count.toLocaleString()} entries`);
      });
      
      // Cache optimization recommendations
      const totalEntries = cacheStats.count;
      const highHitEntries = hitPatterns
        .filter(p => p._id.includes('10+') || p._id.includes('50+'))
        .reduce((sum, p) => sum + p.count, 0);
      
      const hitRatio = totalEntries > 0 ? (highHitEntries / totalEntries * 100).toFixed(1) : 0;
      console.log(`📊 Cache Hit Ratio: ${hitRatio}% (${highHitEntries}/${totalEntries} high-hit entries)`);
      
      if (parseFloat(hitRatio) < 20) {
        console.log('⚠️  Low cache hit ratio - consider cache strategy optimization');
      }
      
    } catch (error) {
      console.log('⚠️  Could not analyze cache performance:', error.message);
    }
    
    // 5. REVIZ API PERFORMANCE OPTIMIZATION
    console.log('\n🎬 ReViz API Performance Optimization...');
    
    try {
      // Analyze composite query patterns
      const compositeCollection = db.collection('composites');
      const compositeStats = await compositeCollection.aggregate([
        {
          $group: {
            _id: null,
            totalComposites: { $sum: 1 },
            avgCompatibilityScore: { $avg: '$compatibilityScore' },
            avgFileSize: { $avg: '$fileSize' },
            avgDuration: { $avg: '$duration' }
          }
        }
      ]).toArray();
      
      if (compositeStats.length > 0) {
        const stats = compositeStats[0];
        console.log('📊 Composite Performance:');
        console.log(`   Total Composites: ${stats.totalComposites.toLocaleString()}`);
        console.log(`   Avg Compatibility Score: ${(stats.avgCompatibilityScore || 0).toFixed(3)}`);
        console.log(`   Avg File Size: ${(stats.avgFileSize || 0).toFixed(2)} MB`);
        console.log(`   Avg Duration: ${(stats.avgDuration || 0).toFixed(2)} seconds`);
      }
      
      // Analyze asset layer distribution
      const assetCollection = db.collection('assets');
      const layerDistribution = await assetCollection.aggregate([
        { $group: { _id: '$layer', count: { $sum: 1 }, avgSize: { $avg: '$fileSize' } } },
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log('📊 Asset Layer Distribution:');
      layerDistribution.forEach(layer => {
        console.log(`   ${layer._id}: ${layer.count.toLocaleString()} assets, avg ${(layer.avgSize || 0).toFixed(2)} MB`);
      });
      
      // Analyze compatibility score distribution
      const compatibilityCollection = db.collection('compatibilityscores');
      const scoreDistribution = await compatibilityCollection.aggregate([
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lt: ['$score', 0.3] }, then: 'Low (0-0.3)' },
                  { case: { $lt: ['$score', 0.6] }, then: 'Medium (0.3-0.6)' },
                  { case: { $lt: ['$score', 0.8] }, then: 'High (0.6-0.8)' },
                  { case: { $gte: ['$score', 0.8] }, then: 'Very High (0.8-1.0)' }
                ],
                default: 'Unknown'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log('📊 Compatibility Score Distribution:');
      scoreDistribution.forEach(score => {
        console.log(`   ${score._id}: ${score.count.toLocaleString()} pairs`);
      });
      
    } catch (error) {
      console.log('⚠️  Could not analyze ReViz API performance:', error.message);
    }
    
    // 6. PERFORMANCE RECOMMENDATIONS
    console.log('\n💡 Performance Recommendations...');
    
    const recommendations = [
      '🔍 Monitor slow query log and optimize frequently slow queries',
      '📊 Use compound indexes for multi-field queries in ReViz API',
      '💾 Implement Redis caching for frequently accessed composite data',
      '🗂️  Consider collection partitioning for large datasets',
      '⚡ Use connection pooling to reduce connection overhead',
      '📈 Monitor memory usage and optimize large documents',
      '🔄 Implement query result caching for composite lookups',
      '🎯 Use projection to limit returned fields in API responses',
      '📊 Regular index maintenance and optimization',
      '🚀 Consider read replicas for read-heavy workloads'
    ];
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    // 7. GENERATE PERFORMANCE REPORT
    console.log('\n📊 Generating performance report...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      system: systemInfo,
      database: {
        name: DB_NAME,
        collections: collections.length
      },
      recommendations: recommendations.length
    };
    
    const reportPath = path.join(__dirname, '..', 'reports', 'performance-report.json');
    const reportDir = path.dirname(reportPath);
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Performance report saved to: ${reportPath}`);
    
    console.log('\n✅ Performance tuning completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during performance tuning:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the performance tuning
if (require.main === module) {
  performanceTuning()
    .then(() => {
      console.log('🎉 Performance tuning completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Performance tuning failed:', error);
      process.exit(1);
    });
}

module.exports = { performanceTuning };
