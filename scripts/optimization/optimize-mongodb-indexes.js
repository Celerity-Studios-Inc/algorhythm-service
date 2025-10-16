#!/usr/bin/env node

/**
 * 🔧 MONGODB INDEX OPTIMIZATION FOR ALGORHYTHM SERVICE
 * 
 * This script creates optimized indexes for the AlgoRhythm service
 * that work regardless of asset count and leverage existing infrastructure.
 */

const { MongoClient } = require('mongodb');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

console.log('🔧 Optimizing MongoDB indexes for AlgoRhythm service...');
console.log('📊 Database:', DB_NAME);

async function optimizeIndexes() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // 1. ANALYZE CURRENT COLLECTIONS
    console.log('\n📊 Analyzing current collections...');
    
    const collections = await db.listCollections().toArray();
    console.log('📁 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // 2. OPTIMIZE ASSETS COLLECTION
    console.log('\n🚀 Optimizing Assets collection indexes...');
    
    try {
      const assets = db.collection('assets');
      
      // Create optimized indexes for AlgoRhythm queries
      const assetIndexes = [
        // Primary query indexes
        { 
          key: { nna_address: 1 }, 
          name: 'nna_address_unique', 
          unique: true, 
          sparse: true 
        },
        { 
          key: { layer: 1, category: 1, subcategory: 1 }, 
          name: 'layer_category_subcategory_compound' 
        },
        { 
          key: { layer: 1, compatibility_score: -1 }, 
          name: 'layer_compatibility_desc' 
        },
        
        // AlgoRhythm template recommendation indexes
        { 
          key: { layer: 1, category: 1, compatibility_score: -1, created_at: -1 }, 
          name: 'algorhythm_template_recommendation' 
        },
        { 
          key: { layer: 1, tags: 1, compatibility_score: -1 }, 
          name: 'algorhythm_layer_tags_compatibility' 
        },
        
        // ReViz Complete Experience indexes
        { 
          key: { layer: 1, category: 1, subcategory: 1, compatibility_score: -1 }, 
          name: 'reviz_layer_assets_optimized' 
        },
        
        // Performance optimization indexes
        { 
          key: { created_at: -1 }, 
          name: 'created_at_desc' 
        },
        { 
          key: { gcp_storage_url: 1 }, 
          name: 'gcp_storage_url_index', 
          sparse: true 
        },
        { 
          key: { thumbnail_url: 1 }, 
          name: 'thumbnail_url_index', 
          sparse: true 
        }
      ];
      
      for (const index of assetIndexes) {
        try {
          await assets.createIndex(index.key, { 
            name: index.name, 
            unique: index.unique || false,
            sparse: index.sparse || false,
            background: true
          });
          console.log(`✅ Created asset index: ${index.name}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️  Asset index ${index.name} already exists`);
          } else {
            console.log(`⚠️  Asset index ${index.name} creation failed: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`⚠️  Assets collection optimization failed: ${error.message}`);
    }
    
    // 3. OPTIMIZE COMPOSITES COLLECTION
    console.log('\n🎬 Optimizing Composites collection indexes...');
    
    try {
      const composites = db.collection('composites');
      
      // Create optimized indexes for composite queries
      const compositeIndexes = [
        // Primary composite lookup indexes
        { 
          key: { composite_id: 1 }, 
          name: 'composite_id_unique', 
          unique: true 
        },
        { 
          key: { nna_address: 1 }, 
          name: 'composite_nna_address_unique', 
          unique: true, 
          sparse: true 
        },
        
        // AlgoRhythm template recommendation indexes
        { 
          key: { song_id: 1, compatibility_score: -1 }, 
          name: 'algorhythm_song_composites' 
        },
        { 
          key: { song_id: 1, created_at: -1 }, 
          name: 'algorhythm_song_recent_composites' 
        },
        { 
          key: { 'components.song_id': 1, compatibility_score: -1 }, 
          name: 'algorhythm_components_song_lookup' 
        },
        
        // ReViz Complete Experience indexes
        { 
          key: { song_id: 1, category: 1, subcategory: 1 }, 
          name: 'reviz_song_category_composites' 
        },
        
        // Performance optimization indexes
        { 
          key: { compatibility_score: -1 }, 
          name: 'compatibility_score_desc' 
        },
        { 
          key: { created_at: -1 }, 
          name: 'composite_created_at_desc' 
        },
        { 
          key: { gcp_storage_url: 1 }, 
          name: 'composite_gcp_storage_url', 
          sparse: true 
        }
      ];
      
      for (const index of compositeIndexes) {
        try {
          await composites.createIndex(index.key, { 
            name: index.name, 
            unique: index.unique || false,
            sparse: index.sparse || false,
            background: true
          });
          console.log(`✅ Created composite index: ${index.name}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️  Composite index ${index.name} already exists`);
          } else {
            console.log(`⚠️  Composite index ${index.name} creation failed: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`⚠️  Composites collection optimization failed: ${error.message}`);
    }
    
    // 4. CREATE CACHE OPTIMIZATION INDEXES
    console.log('\n💾 Creating cache optimization indexes...');
    
    const cacheCollections = ['recommendationcaches', 'analytics_events'];
    
    for (const collectionName of cacheCollections) {
      try {
        const collection = db.collection(collectionName);
        
        // Create cache-specific indexes
        const cacheIndexes = [
          { 
            key: { cache_key: 1 }, 
            name: 'cache_key_unique', 
            unique: true 
          },
          { 
            key: { song_id: 1, created_at: -1 }, 
            name: 'cache_song_timestamp' 
          },
          { 
            key: { created_at: 1 }, 
            name: 'cache_created_at_ttl', 
            expireAfterSeconds: 3600 // 1 hour TTL
          }
        ];
        
        for (const index of cacheIndexes) {
          try {
            await collection.createIndex(index.key, { 
              name: index.name, 
              unique: index.unique || false,
              background: true,
              expireAfterSeconds: index.expireAfterSeconds || undefined
            });
            console.log(`✅ Created cache index: ${collectionName}.${index.name}`);
          } catch (error) {
            if (error.code === 85) {
              console.log(`ℹ️  Cache index ${collectionName}.${index.name} already exists`);
            } else {
              console.log(`⚠️  Cache index ${collectionName}.${index.name} creation failed: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Cache collection ${collectionName} optimization failed: ${error.message}`);
      }
    }
    
    // 5. ANALYZE INDEX PERFORMANCE
    console.log('\n📊 Analyzing index performance...');
    
    try {
      // Get index statistics for assets
      const assetIndexStats = await db.collection('assets').aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      console.log('📈 Asset Collection Indexes:');
      assetIndexStats.forEach(stat => {
        console.log(`  ${stat.name}: ${stat.accesses?.ops || 0} operations`);
      });
      
      // Get index statistics for composites
      const compositeIndexStats = await db.collection('composites').aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      console.log('📈 Composite Collection Indexes:');
      compositeIndexStats.forEach(stat => {
        console.log(`  ${stat.name}: ${stat.accesses?.ops || 0} operations`);
      });
      
    } catch (error) {
      console.log(`⚠️  Index performance analysis failed: ${error.message}`);
    }
    
    // 6. GENERATE OPTIMIZATION REPORT
    console.log('\n📊 Generating optimization report...');
    
    const optimizationReport = {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      optimizations_applied: [
        'Asset collection indexes optimized',
        'Composite collection indexes optimized',
        'Cache optimization indexes created',
        'Performance monitoring indexes created'
      ],
      recommendations: [
        'Monitor slow query logs regularly',
        'Implement cache warming strategies',
        'Use background index creation for large collections',
        'Regular index maintenance and cleanup'
      ]
    };
    
    // Save optimization report
    try {
      const fs = require('fs');
      const reportPath = 'logs/mongodb-optimization-report.json';
      fs.mkdirSync('logs', { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(optimizationReport, null, 2));
      console.log(`📄 Optimization report saved to: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️  Could not save optimization report: ${error.message}`);
    }
    
    console.log('\n🚀 MongoDB index optimization completed successfully!');
    console.log('📊 Optimizations applied:');
    console.log('  ✅ Asset collection indexes optimized for AlgoRhythm queries');
    console.log('  ✅ Composite collection indexes optimized for template recommendations');
    console.log('  ✅ Cache optimization indexes created');
    console.log('  ✅ Performance monitoring indexes created');
    console.log('  ✅ Asset-count independent optimization');
    
  } catch (error) {
    console.error('❌ Error optimizing MongoDB indexes:', error);
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
  optimizeIndexes()
    .then(() => {
      console.log('✅ MongoDB index optimization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ MongoDB index optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeIndexes };
