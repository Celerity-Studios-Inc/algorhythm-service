#!/usr/bin/env node

/**
 * MongoDB Missing Index Checker and Creator
 * 
 * This script checks existing indexes and only creates missing ones
 * to avoid conflicts with existing index names.
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

class MissingIndexManager {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    let MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      const uriFile = 'mongodb-uri-dev.value';
      if (fs.existsSync(uriFile)) {
        MONGODB_URI = fs.readFileSync(uriFile, 'utf8').trim();
      } else {
        throw new Error(
          "MONGODB_URI not set and fallback file 'mongodb-uri-dev.value' not found."
        );
      }
    }
    
    const DB_NAME = 'nna-registry-service-dev';
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  async checkExistingIndexes() {
    console.log('🔍 Checking existing indexes...');
    
    const assetsCollection = this.db.collection('assets');
    const indexes = await assetsCollection.indexes();
    
    console.log('📊 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    return indexes;
  }

  async createMissingIndexes() {
    console.log('🚀 Creating missing performance indexes...');
    
    const assetsCollection = this.db.collection('assets');
    const existingIndexes = await this.checkExistingIndexes();
    
    // Define required indexes with their key patterns
    const requiredIndexes = [
      {
        name: 'text_search_index',
        key: { name: 'text', description: 'text', tags: 'text', friendlyName: 'text' },
        options: {
          background: true,
          weights: {
            name: 10,
            friendlyName: 8,
            description: 5,
            tags: 3
          }
        }
      },
      {
        name: 'createdAt_desc',
        key: { createdAt: -1 },
        options: { background: true }
      },
      {
        name: 'layer_createdAt_compound',
        key: { layer: 1, createdAt: -1 },
        options: { background: true }
      },
      {
        name: 'variant_query_optimization',
        key: { layer: 1, 'aiMetadata.starsMetadata.baseStarId': 1, createdAt: -1 },
        options: { background: true, sparse: true }
      },
      {
        name: 'asset_type_filtering',
        key: { layer: 1, 'aiMetadata.starsMetadata.assetType': 1, createdAt: -1 },
        options: { background: true, sparse: true }
      },
      {
        name: 'star_metadata_search',
        key: { 
          'aiMetadata.starsMetadata.starName': 1,
          'aiMetadata.starsMetadata.gender': 1,
          'aiMetadata.starsMetadata.archetype': 1
        },
        options: { background: true, sparse: true }
      },
      {
        name: 'looks_metadata_search',
        key: { 
          'aiMetadata.looksMetadata.styleCategory': 1,
          'aiMetadata.looksMetadata.colorScheme': 1,
          'aiMetadata.looksMetadata.formality': 1
        },
        options: { background: true, sparse: true }
      },
      {
        name: 'moves_metadata_search',
        key: { 
          'aiMetadata.movesMetadata.danceStyle': 1,
          'aiMetadata.movesMetadata.energy': 1,
          'aiMetadata.movesMetadata.complexity': 1
        },
        options: { background: true, sparse: true }
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const requiredIndex of requiredIndexes) {
      // Check if an index with the same key pattern already exists
      const keyExists = existingIndexes.some(existing => 
        JSON.stringify(existing.key) === JSON.stringify(requiredIndex.key)
      );

      if (keyExists) {
        console.log(`⏭️  Skipping ${requiredIndex.name} - key pattern already exists`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`📊 Creating index: ${requiredIndex.name}...`);
        await assetsCollection.createIndex(requiredIndex.key, {
          name: requiredIndex.name,
          ...requiredIndex.options
        });
        console.log(`✅ Created: ${requiredIndex.name}`);
        createdCount++;
      } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
          console.log(`⏭️  Skipping ${requiredIndex.name} - conflict with existing index`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating ${requiredIndex.name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Index creation summary:`);
    console.log(`  ✅ Created: ${createdCount} indexes`);
    console.log(`  ⏭️  Skipped: ${skippedCount} indexes`);
  }

  async analyzeQueryPerformance() {
    console.log('\n📊 Analyzing query performance...');
    
    const assetsCollection = this.db.collection('assets');
    
    // Test common query patterns
    const testQueries = [
      {
        name: 'Layer/Category/Subcategory Filter',
        query: { layer: 'S', category: 'GRL', subcategory: 'YOU' }
      },
      {
        name: 'Text Search',
        query: { $text: { $search: 'Tatiana' } }
      },
      {
        name: 'Recent Assets',
        query: {},
        sort: { createdAt: -1 }
      },
      {
        name: 'NNA Address Lookup',
        query: { nna_address: 'S.GRL.YOU.001' }
      },
      {
        name: 'Star Variants',
        query: { 
          layer: 'S', 
          'aiMetadata.starsMetadata.baseStarId': { $exists: true } 
        }
      }
    ];
    
    for (const testQuery of testQueries) {
      console.log(`\n🧪 Testing: ${testQuery.name}`);
      
      try {
        const startTime = Date.now();
        const explainResult = await assetsCollection.find(testQuery.query)
          .sort(testQuery.sort || {})
          .limit(10)
          .explain('executionStats');
        
        const duration = Date.now() - startTime;
        const executionStats = explainResult.executionStats;
        
        console.log(`  ⏱️  Duration: ${duration}ms`);
        console.log(`  📊 Documents Examined: ${executionStats.totalDocsExamined}`);
        console.log(`  📊 Documents Returned: ${executionStats.totalDocsReturned}`);
        
        // Find the index used
        let indexUsed = 'Collection Scan';
        if (executionStats.executionStages && executionStats.executionStages.indexName) {
          indexUsed = executionStats.executionStages.indexName;
        } else if (executionStats.executionStages && executionStats.executionStages.inputStage) {
          indexUsed = executionStats.executionStages.inputStage.indexName || 'Collection Scan';
        }
        
        console.log(`  🎯 Index Used: ${indexUsed}`);
        
        if (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 2) {
          console.log(`  ⚠️  Inefficient query - examining too many documents`);
        } else {
          console.log(`  ✅ Query appears optimized`);
        }
      } catch (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
      }
    }
  }

  async run() {
    try {
      console.log('🚀 MongoDB Missing Index Checker and Creator');
      console.log('============================================');
      
      await this.connect();
      await this.createMissingIndexes();
      await this.analyzeQueryPerformance();
      
      console.log('\n🎉 Missing index analysis completed!');
      
    } catch (error) {
      console.error('❌ Error during index analysis:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the script
const manager = new MissingIndexManager();
manager.run().catch(console.error);
