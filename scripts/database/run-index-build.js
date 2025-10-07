#!/usr/bin/env node

/**
 * Manual Index Build Script
 * - Runs the index build process manually
 * - Can be scheduled to run every 5 minutes
 */

const { MongoClient } = require('mongodb');

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  throw new Error("MONGODB_URI not set");
}

async function runIndexBuild() {
  console.log('🚀 Starting manual index build...');
  console.log('================================');

  const uri = await getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('nna-registry-service-dev');
  console.log('✅ Connected to MongoDB: nna-registry-service-dev');

  try {
    const assets = db.collection('assets');
    
    // 1. Check current asset count
    const totalAssets = await assets.countDocuments();
    console.log(`📊 Total assets in database: ${totalAssets}`);
    
    // 2. Update tags_normalized for any new assets
    console.log('🔄 Updating tags_normalized for new assets...');
    const assetsWithoutNormalized = await assets.find({ 
      tags_normalized: { $exists: false } 
    }).toArray();
    
    if (assetsWithoutNormalized.length > 0) {
      console.log(`📝 Found ${assetsWithoutNormalized.length} assets without normalized tags`);
      
      // Load canonical mapping
      const fs = require('fs');
      const path = require('path');
      const canonicalPath = path.join(__dirname, 'tag-canonical-map.json');
      const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
      
      for (const asset of assetsWithoutNormalized) {
        const allTags = [];
        
        // Collect all tags from all fields
        const tagFields = [
          'tags','aiMetadata.tags','aiMetadata.generatedTags','aiMetadata.enrichment.tags','aiMetadata.enrichment.topics','aiMetadata.enrichment.keywords','aiMetadata.contentAnalysis.keywords','aiMetadata.contentAnalysis.topics','songMetadata.tags','looksMetadata.tags','starsMetadata.tags','movesMetadata.tags','worldsMetadata.tags'
        ];
        
        for (const field of tagFields) {
          const parts = field.split('.');
          let value = asset;
          for (const p of parts) value = value?.[p];
          if (Array.isArray(value)) {
            for (const tag of value) {
              if (typeof tag === 'string') allTags.push(tag);
            }
          }
        }
        
        // Normalize and deduplicate
        const normalized = [];
        const seen = new Set();
        for (const raw of allTags) {
          let norm = raw.trim().replace(/\s+/g, ' ').toLowerCase();
          if (canonical.synonyms[norm]) {
            norm = canonical.synonyms[norm];
          }
          const words = norm.split(' ');
          const filtered = words.filter(w => !canonical.stopwords.includes(w));
          norm = filtered.join(' ');
          if (norm && !seen.has(norm)) {
            normalized.push(norm);
            seen.add(norm);
          }
        }
        
        // Update document with tags_normalized
        if (normalized.length > 0) {
          await assets.updateOne(
            { _id: asset._id },
            { $set: { tags_normalized: normalized } }
          );
        }
      }
      console.log(`✅ Updated ${assetsWithoutNormalized.length} assets with normalized tags`);
    } else {
      console.log('✅ All assets already have normalized tags');
    }
    
    // 3. Check and create missing indexes
    console.log('📊 Checking for missing indexes...');
    const existingIndexes = await assets.indexes();
    const indexNames = existingIndexes.map(idx => idx.name);
    
    const requiredIndexes = [
      'tags_normalized_index',
      'layer_tags_normalized_compound',
      'layer_category_subcategory_compound',
      'createdAt_desc',
      'nna_address_unique'
    ];
    
    const missingIndexes = requiredIndexes.filter(name => !indexNames.includes(name));
    
    if (missingIndexes.length > 0) {
      console.log(`📝 Creating ${missingIndexes.length} missing indexes...`);
      
      for (const indexName of missingIndexes) {
        try {
          switch (indexName) {
            case 'tags_normalized_index':
              await assets.createIndex({ tags_normalized: 1 }, { name: 'tags_normalized_index', background: true });
              break;
            case 'layer_tags_normalized_compound':
              await assets.createIndex({ layer: 1, tags_normalized: 1 }, { name: 'layer_tags_normalized_compound', background: true });
              break;
            case 'layer_category_subcategory_compound':
              await assets.createIndex({ layer: 1, category: 1, subcategory: 1 }, { name: 'layer_category_subcategory_compound', background: true });
              break;
            case 'createdAt_desc':
              await assets.createIndex({ createdAt: -1 }, { name: 'createdAt_desc', background: true });
              break;
            case 'nna_address_unique':
              await assets.createIndex({ nna_address: 1 }, { name: 'nna_address_unique', background: true, unique: true });
              break;
          }
          console.log(`✅ Created index: ${indexName}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️  Index already exists: ${indexName}`);
          } else {
            console.log(`⚠️  Failed to create ${indexName}: ${error.message}`);
          }
        }
      }
    } else {
      console.log('✅ All required indexes are present');
    }
    
    // 4. Update statistics
    const finalCount = await assets.countDocuments();
    const withNormalized = await assets.countDocuments({ tags_normalized: { $exists: true } });
    
    console.log('\n📊 Index Build Summary:');
    console.log(`  Total Assets: ${finalCount}`);
    console.log(`  With Normalized Tags: ${withNormalized}`);
    console.log(`  Index Count: ${existingIndexes.length}`);
    
    console.log('\n✅ Index build completed successfully!');
    
  } catch (error) {
    console.error('❌ Index build failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run immediately
runIndexBuild().catch(err => { 
  console.error(err); 
  process.exit(1); 
});
