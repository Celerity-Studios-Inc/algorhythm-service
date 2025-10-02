#!/usr/bin/env node

/**
 * MongoDB Performance Index Implementation Script
 * 
 * This script implements critical indexes for optimal query performance
 * based on the MongoDB audit findings.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

class PerformanceIndexManager {
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

  async implementCriticalIndexes() {
    console.log('🚀 Implementing critical performance indexes...');
    
    const assetsCollection = this.db.collection('assets');
    
    try {
      // 1. Layer/Category/Subcategory compound index (most critical)
      console.log('📊 Creating layer/category/subcategory compound index...');
      await assetsCollection.createIndex(
        { layer: 1, category: 1, subcategory: 1 },
        { 
          name: 'layer_category_subcategory_compound',
          background: true 
        }
      );
      console.log('✅ Layer/category/subcategory index created');

      // 2. Text search index for names, descriptions, and tags
      console.log('📊 Creating text search index...');
      await assetsCollection.createIndex(
        { 
          name: 'text', 
          description: 'text', 
          tags: 'text',
          friendlyName: 'text'
        },
        { 
          name: 'text_search_index',
          background: true,
          weights: {
            name: 10,
            friendlyName: 8,
            description: 5,
            tags: 3
          }
        }
      );
      console.log('✅ Text search index created');

      // 3. CreatedAt index for sorting and pagination
      console.log('📊 Creating createdAt index...');
      await assetsCollection.createIndex(
        { createdAt: -1 },
        { 
          name: 'createdAt_desc',
          background: true 
        }
      );
      console.log('✅ CreatedAt index created');

      // 4. NNA address index for unique lookups
      console.log('📊 Creating nna_address index...');
      await assetsCollection.createIndex(
        { nna_address: 1 },
        { 
          name: 'nna_address_unique',
          background: true,
          unique: true
        }
      );
      console.log('✅ NNA address index created');

      // 5. Layer + createdAt compound index for layer-specific queries
      console.log('📊 Creating layer + createdAt compound index...');
      await assetsCollection.createIndex(
        { layer: 1, createdAt: -1 },
        { 
          name: 'layer_createdAt_compound',
          background: true 
        }
      );
      console.log('✅ Layer + createdAt index created');

      // 6. Variant query optimization index
      console.log('📊 Creating variant query optimization index...');
      await assetsCollection.createIndex(
        { 
          layer: 1, 
          'aiMetadata.starsMetadata.baseStarId': 1, 
          createdAt: -1 
        },
        { 
          name: 'variant_query_optimization',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Variant query optimization index created');

      // 7. Asset type filtering index
      console.log('📊 Creating asset type filtering index...');
      await assetsCollection.createIndex(
        { 
          layer: 1, 
          'aiMetadata.starsMetadata.assetType': 1, 
          createdAt: -1 
        },
        { 
          name: 'asset_type_filtering',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Asset type filtering index created');

      // 8. Star metadata search index
      console.log('📊 Creating star metadata search index...');
      await assetsCollection.createIndex(
        { 
          'aiMetadata.starsMetadata.starName': 1,
          'aiMetadata.starsMetadata.gender': 1,
          'aiMetadata.starsMetadata.archetype': 1
        },
        { 
          name: 'star_metadata_search',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Star metadata search index created');

      // 9. Looks metadata search index
      console.log('📊 Creating looks metadata search index...');
      await assetsCollection.createIndex(
        { 
          'aiMetadata.looksMetadata.styleCategory': 1,
          'aiMetadata.looksMetadata.colorScheme': 1,
          'aiMetadata.looksMetadata.formality': 1
        },
        { 
          name: 'looks_metadata_search',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Looks metadata search index created');

      // 10. Moves metadata search index
      console.log('📊 Creating moves metadata search index...');
      await assetsCollection.createIndex(
        { 
          'aiMetadata.movesMetadata.danceStyle': 1,
          'aiMetadata.movesMetadata.energy': 1,
          'aiMetadata.movesMetadata.complexity': 1
        },
        { 
          name: 'moves_metadata_search',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Moves metadata search index created');

      console.log('🎉 All critical indexes implemented successfully!');

    } catch (error) {
      console.error('❌ Error implementing indexes:', error);
      throw error;
    }
  }

  async verifyIndexes() {
    console.log('🔍 Verifying implemented indexes...');
    
    const assetsCollection = this.db.collection('assets');
    const indexes = await assetsCollection.indexes();
    
    console.log('📊 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    const expectedIndexes = [
      'layer_category_subcategory_compound',
      'text_search_index',
      'createdAt_desc',
      'nna_address_unique',
      'layer_createdAt_compound',
      'variant_query_optimization',
      'asset_type_filtering',
      'star_metadata_search',
      'looks_metadata_search',
      'moves_metadata_search'
    ];
    
    const implementedIndexes = indexes.map(idx => idx.name);
    const missingIndexes = expectedIndexes.filter(name => !implementedIndexes.includes(name));
    
    if (missingIndexes.length === 0) {
      console.log('✅ All expected indexes are present');
    } else {
      console.log('⚠️ Missing indexes:', missingIndexes);
    }
    
    return indexes;
  }

  async analyzeQueryPerformance() {
    console.log('📊 Analyzing query performance...');
    
    const assetsCollection = this.db.collection('assets');
    
    // Test common query patterns
    const testQueries = [
      {
        name: 'Layer/Category/Subcategory Filter',
        query: { layer: 'S', category: 'GRL', subcategory: 'YOU' },
        expectedIndex: 'layer_category_subcategory_compound'
      },
      {
        name: 'Text Search',
        query: { $text: { $search: 'Tatiana' } },
        expectedIndex: 'text_search_index'
      },
      {
        name: 'Recent Assets',
        query: {},
        sort: { createdAt: -1 },
        expectedIndex: 'createdAt_desc'
      },
      {
        name: 'NNA Address Lookup',
        query: { nna_address: 'S.GRL.YOU.001' },
        expectedIndex: 'nna_address_unique'
      }
    ];
    
    for (const testQuery of testQueries) {
      console.log(`\n🧪 Testing: ${testQuery.name}`);
      
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
      console.log(`  🎯 Index Used: ${executionStats.executionStages.indexName || 'Collection Scan'}`);
      
      if (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 2) {
        console.log(`  ⚠️  Inefficient query - examining too many documents`);
      } else {
        console.log(`  ✅ Query appears optimized`);
      }
    }
  }

  async run() {
    try {
      console.log('🚀 MongoDB Performance Index Implementation');
      console.log('==========================================');
      
      await this.connect();
      await this.implementCriticalIndexes();
      await this.verifyIndexes();
      await this.analyzeQueryPerformance();
      
      console.log('\n🎉 Performance index implementation completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('  1. Monitor query performance in application');
      console.log('  2. Implement lean queries in services');
      console.log('  3. Scale connection pool settings');
      console.log('  4. Add query performance monitoring');
      
    } catch (error) {
      console.error('❌ Error during index implementation:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the script
const manager = new PerformanceIndexManager();
manager.run().catch(console.error);
