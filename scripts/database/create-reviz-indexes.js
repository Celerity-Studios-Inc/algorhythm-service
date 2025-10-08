#!/usr/bin/env node

/**
 * Create optimized indexes for ReViz Enhanced API
 * Critical for performance with 3M+ assets
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function createReVizIndexes() {
  console.log('🔧 Creating optimized indexes for ReViz Enhanced API');
  console.log('==================================================');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nna-registry-service-dev');
    
    // 1. Assets Collection - Critical Performance Indexes
    console.log('\n📊 Creating Assets indexes...');
    
    const assetsCollection = db.collection('assets');
    
    // Primary query index for layer + assetType + trending score
    await assetsCollection.createIndex(
      { 
        layer: 1, 
        assetType: 1, 
        'trendingScore.score': -1,
        createdAt: -1 
      },
      { 
        name: 'layer_assetType_trendingScore_createdAt',
        background: true 
      }
    );
    console.log('✅ Created: layer_assetType_trendingScore_createdAt');
    
    // Base asset to variants lookup
    await assetsCollection.createIndex(
      { 
        baseAssetId: 1, 
        assetType: 1,
        createdAt: -1 
      },
      { 
        name: 'baseAssetId_assetType_createdAt',
        background: true 
      }
    );
    console.log('✅ Created: baseAssetId_assetType_createdAt');
    
    // Trending score queries
    await assetsCollection.createIndex(
      { 
        layer: 1, 
        'trendingScore.score': -1 
      },
      { 
        name: 'layer_trendingScore',
        background: true 
      }
    );
    console.log('✅ Created: layer_trendingScore');
    
    // Engagement metrics for analytics
    await assetsCollection.createIndex(
      { 
        'engagementMetrics.lastUpdated': -1 
      },
      { 
        name: 'engagementMetrics_lastUpdated',
        background: true 
      }
    );
    console.log('✅ Created: engagementMetrics_lastUpdated');
    
    // Expiring trending scores
    await assetsCollection.createIndex(
      { 
        'trendingScore.expiresAt': 1 
      },
      { 
        name: 'trendingScore_expiresAt',
        background: true,
        expireAfterSeconds: 0 // TTL index
      }
    );
    console.log('✅ Created: trendingScore_expiresAt (TTL)');
    
    // 2. Composites Collection - Performance Indexes
    console.log('\n🎬 Creating Composites indexes...');
    
    const compositesCollection = db.collection('composites');
    
    // Song-based composite queries
    await compositesCollection.createIndex(
      { 
        songId: 1, 
        compatibilityScore: -1,
        createdAt: -1 
      },
      { 
        name: 'songId_compatibilityScore_createdAt',
        background: true 
      }
    );
    console.log('✅ Created: songId_compatibilityScore_createdAt');
    
    // Component-based queries
    await compositesCollection.createIndex(
      { 
        'components.starId': 1,
        'components.lookId': 1,
        'components.moveId': 1,
        'components.worldId': 1
      },
      { 
        name: 'components_star_look_move_world',
        background: true 
      }
    );
    console.log('✅ Created: components_star_look_move_world');
    
    // 3. Analytics Events Collection - Performance Indexes
    console.log('\n📈 Creating Analytics Events indexes...');
    
    const analyticsCollection = db.collection('analytics-events');
    
    // Time-based analytics queries
    await analyticsCollection.createIndex(
      { 
        timestamp: -1, 
        assetId: 1, 
        eventType: 1 
      },
      { 
        name: 'timestamp_assetId_eventType',
        background: true 
      }
    );
    console.log('✅ Created: timestamp_assetId_eventType');
    
    // User-based analytics
    await analyticsCollection.createIndex(
      { 
        userId: 1, 
        timestamp: -1 
      },
      { 
        name: 'userId_timestamp',
        background: true 
      }
    );
    console.log('✅ Created: userId_timestamp');
    
    // Asset-based analytics
    await analyticsCollection.createIndex(
      { 
        assetId: 1, 
        eventType: 1,
        timestamp: -1 
      },
      { 
        name: 'assetId_eventType_timestamp',
        background: true 
      }
    );
    console.log('✅ Created: assetId_eventType_timestamp');
    
    // TTL for analytics events (90 days)
    await analyticsCollection.createIndex(
      { 
        timestamp: 1 
      },
      { 
        name: 'timestamp_ttl',
        background: true,
        expireAfterSeconds: 7776000 // 90 days
      }
    );
    console.log('✅ Created: timestamp_ttl (90 days)');
    
    // 4. Recommendation Cache Collection - Performance Indexes
    console.log('\n💾 Creating Recommendation Cache indexes...');
    
    const cacheCollection = db.collection('recommendation-cache');
    
    // Cache lookup by song and user
    await cacheCollection.createIndex(
      { 
        songId: 1, 
        userId: 1 
      },
      { 
        name: 'songId_userId',
        background: true 
      }
    );
    console.log('✅ Created: songId_userId');
    
    // TTL for cache entries (7 days)
    await cacheCollection.createIndex(
      { 
        expiresAt: 1 
      },
      { 
        name: 'expiresAt_ttl',
        background: true,
        expireAfterSeconds: 0 // TTL index
      }
    );
    console.log('✅ Created: expiresAt_ttl (7 days)');
    
    // 5. Compatibility Scores Collection - Performance Indexes
    console.log('\n🔗 Creating Compatibility Scores indexes...');
    
    const compatibilityCollection = db.collection('compatibility-scores');
    
    // Asset pair lookups
    await compatibilityCollection.createIndex(
      { 
        assetId1: 1, 
        assetId2: 1 
      },
      { 
        name: 'assetId1_assetId2',
        background: true,
        unique: true 
      }
    );
    console.log('✅ Created: assetId1_assetId2 (unique)');
    
    // Score-based queries
    await compatibilityCollection.createIndex(
      { 
        score: -1,
        createdAt: -1 
      },
      { 
        name: 'score_createdAt',
        background: true 
      }
    );
    console.log('✅ Created: score_createdAt');
    
    console.log('\n🎉 All indexes created successfully!');
    console.log('=====================================');
    
    // Display index statistics
    console.log('\n📊 Index Statistics:');
    const collections = ['assets', 'composites', 'analytics-events', 'recommendation-cache', 'compatibility-scores'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      console.log(`\n${collectionName}:`);
      indexes.forEach(index => {
        console.log(`  • ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createReVizIndexes()
    .then(() => {
      console.log('\n🚀 ReViz Enhanced API indexes are ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to create indexes:', error);
      process.exit(1);
    });
}

module.exports = { createReVizIndexes };
