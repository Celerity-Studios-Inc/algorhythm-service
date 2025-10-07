#!/usr/bin/env node

/**
 * Backfill tags_normalized and Create Tag Indexes
 * - Computes normalized tags for all assets using canonical mapping
 * - Creates indexes for fast tag queries
 * - Adds TTL indexes for cache/analytics cleanup
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const fallback = path.join(__dirname, '..', '..', 'mongodb-uri-dev.value');
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8').trim();
  throw new Error("MONGODB_URI not set and fallback file 'mongodb-uri-dev.value' not found.");
}

function normalizeTag(raw, canonical) {
  if (typeof raw !== 'string') return null;
  let normalized = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Apply canonical mapping
  if (canonical.synonyms[normalized]) {
    normalized = canonical.synonyms[normalized];
  }
  
  // Remove stopwords
  const words = normalized.split(' ');
  const filtered = words.filter(w => !canonical.stopwords.includes(w));
  normalized = filtered.join(' ');
  
  return normalized || null;
}

async function run() {
  console.log('🚀 Backfilling tags_normalized and creating indexes');
  console.log('==================================================');

  const canonicalPath = path.join(__dirname, 'tag-canonical-map.json');
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

  const uri = await getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('nna-registry-service-dev');
  console.log('✅ Connected to MongoDB: nna-registry-service-dev');

  try {
    const assets = db.collection('assets');
    const tagFields = [
      'tags','aiMetadata.tags','aiMetadata.generatedTags','aiMetadata.enrichment.tags','aiMetadata.enrichment.topics','aiMetadata.enrichment.keywords','aiMetadata.contentAnalysis.keywords','aiMetadata.contentAnalysis.topics','songMetadata.tags','looksMetadata.tags','starsMetadata.tags','movesMetadata.tags','worldsMetadata.tags'
    ];

    // 1. Backfill tags_normalized for all assets
    console.log('📊 Backfilling tags_normalized...');
    const cursor = assets.find({}, { projection: { _id: 1, name: 1 } });
    let processed = 0;
    let updated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const allTags = [];

      // Collect all tags from all fields
      const fullDoc = await assets.findOne({ _id: doc._id });
      for (const field of tagFields) {
        const parts = field.split('.');
        let value = fullDoc;
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
        const norm = normalizeTag(raw, canonical);
        if (norm && !seen.has(norm)) {
          normalized.push(norm);
          seen.add(norm);
        }
      }

      // Update document with tags_normalized
      if (normalized.length > 0) {
        await assets.updateOne(
          { _id: doc._id },
          { $set: { tags_normalized: normalized } }
        );
        updated++;
      }
      processed++;
    }

    console.log(`✅ Processed ${processed} assets, updated ${updated} with tags_normalized`);

    // 2. Create tag indexes
    console.log('📊 Creating tag indexes...');
    
    // Main tag query index
    await assets.createIndex(
      { tags_normalized: 1 },
      { 
        name: 'tags_normalized_index',
        background: true 
      }
    );
    console.log('✅ Created tags_normalized index');

    // Compound index for layer + tags
    await assets.createIndex(
      { layer: 1, tags_normalized: 1 },
      { 
        name: 'layer_tags_normalized_compound',
        background: true 
      }
    );
    console.log('✅ Created layer + tags_normalized compound index');

    // Text search index for tags (skip if comprehensive text index exists)
    try {
      await assets.createIndex(
        { tags_normalized: 'text' },
        { 
          name: 'tags_normalized_text',
          background: true 
        }
      );
      console.log('✅ Created tags_normalized text index');
    } catch (e) {
      if (e.code === 85) { // IndexOptionsConflict
        console.log('ℹ️  Skipping tags_normalized text index - comprehensive text index already exists');
      } else {
        throw e;
      }
    }

    // 3. Add TTL indexes for cache/analytics cleanup
    console.log('📊 Creating TTL indexes...');
    
    // Recommendation cache TTL (7 days)
    try {
      await db.collection('recommendation_cache').createIndex(
        { created_at: 1 },
        { 
          name: 'recommendation_cache_ttl',
          expireAfterSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      );
      console.log('✅ Created recommendation cache TTL index (7 days)');
    } catch (e) {
      console.log('ℹ️  Recommendation cache collection not found, skipping TTL');
    }

    // Analytics events TTL (60 days)
    try {
      await db.collection('analytics_events').createIndex(
        { timestamp: 1 },
        { 
          name: 'analytics_events_ttl',
          expireAfterSeconds: 60 * 24 * 60 * 60 // 60 days
        }
      );
      console.log('✅ Created analytics events TTL index (60 days)');
    } catch (e) {
      console.log('ℹ️  Analytics events collection not found, skipping TTL');
    }

    console.log('\n🎉 Backfill and indexing completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run tag analysis to verify normalization');
    console.log('  2. Run tag linter to check for violations');
    console.log('  3. Test tag queries with new indexes');

  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
