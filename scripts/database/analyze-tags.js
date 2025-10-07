#!/usr/bin/env node

/**
 * Asset Tag Analysis Script (Development DB)
 *
 * What it does:
 * - Scans the `assets` collection for tag fields and computes:
 *   - Tag distribution (frequency, per-layer/category breakdown)
 *   - Data quality issues (non-array tags, empty strings, whitespace, casing variants, duplicates)
 *   - Co-occurrence pairs (top N pairs that frequently occur together)
 * - Outputs a human-readable summary and writes a JSON report to disk
 * - Adds developer-style tests: top tag samples, counts per tag, and pair samples
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://.../algorhythm-service-dev?..." node scripts/database/analyze-tags.js
 *
 * Environment fallback:
 * - If MONGODB_URI is not set, reads from local file `mongodb-uri-dev.value` (repo root)
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
const REPORT_PATH = path.join(REPORT_DIR, `tag-analysis-dev-${new Date().toISOString().split('T')[0]}.json`);

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const fallback = path.join(__dirname, '..', '..', 'mongodb-uri-dev.value');
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8').trim();
  throw new Error("MONGODB_URI not set and fallback file 'mongodb-uri-dev.value' not found.");
}

function normalizeTag(raw) {
  if (typeof raw !== 'string') return raw;
  // Trim, collapse internal whitespace, and lowercase for canonical analysis
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function increment(map, key, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

function pairKey(a, b) {
  return a <= b ? `${a}||${b}` : `${b}||${a}`;
}

async function run() {
  console.log('🚀 Asset Tag Analysis (dev)');
  console.log('============================');

  const uri = await getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('nna-registry-service-dev');
  console.log('✅ Connected to MongoDB: nna-registry-service-dev');

  try {
    const assets = db.collection('assets');

    // Fields to inspect for tags-like data
    const tagFieldCandidates = [
      'tags',
      'aiMetadata.tags',
      'aiMetadata.generatedTags',
      'aiMetadata.enrichment.tags',
      'aiMetadata.enrichment.topics',
      'aiMetadata.enrichment.keywords',
      'aiMetadata.contentAnalysis.keywords',
      'aiMetadata.contentAnalysis.topics',
      'songMetadata.tags',
      'looksMetadata.tags',
      'starsMetadata.tags',
      'movesMetadata.tags',
      'worldsMetadata.tags',
    ];

    // Full scan with minimal projection to reduce payload volume while including tag-like fields
    const projection = { layer: 1, category: 1, subcategory: 1, name: 1, friendlyName: 1 };
    for (const f of tagFieldCandidates) projection[f] = 1;
    const cursor = assets.find({}, { projection });

    const tagFrequency = new Map(); // normalized tag -> count
    const tagRawVariants = new Map(); // normalized tag -> Set of raw variants
    const perLayerFrequency = new Map(); // layer -> Map(tag -> count)
    const perCategoryFrequency = new Map(); // `${layer}.${category}` -> Map(tag -> count)
    const issues = {
      nonArrayFields: 0,
      emptyStrings: 0,
      whitespaceOnly: 0,
      duplicateWithinAsset: 0,
      nullOrUndefined: 0,
    };
    const coOccurrence = new Map(); // pairKey(tagA, tagB) -> count
    const sampleDocsByTag = new Map(); // tag -> up to N sample doc names

    let scanned = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      scanned += 1;

      const allTagsRaw = [];
      for (const field of tagFieldCandidates) {
        const parts = field.split('.');
        let value = doc;
        for (const p of parts) value = value?.[p];

        if (value == null) {
          issues.nullOrUndefined += 1;
          continue;
        }
        if (!Array.isArray(value)) {
          issues.nonArrayFields += 1;
          continue;
        }
        for (const t of value) allTagsRaw.push(t);
      }

      // Normalize and check per-asset duplicates
      const normalized = [];
      const seenInAsset = new Set();
      for (const raw of allTagsRaw) {
        if (raw == null) {
          issues.nullOrUndefined += 1;
          continue;
        }
        if (typeof raw !== 'string') continue; // ignore non-strings
        if (raw === '') { issues.emptyStrings += 1; continue; }
        if (/^\s+$/.test(raw)) { issues.whitespaceOnly += 1; continue; }
        const norm = normalizeTag(raw);
        normalized.push(norm);
        if (seenInAsset.has(norm)) issues.duplicateWithinAsset += 1;
        seenInAsset.add(norm);

        // Track raw variants per normalized form
        if (!tagRawVariants.has(norm)) tagRawVariants.set(norm, new Set());
        tagRawVariants.get(norm).add(raw);
      }

      // Update global frequencies and breakdowns
      const layerKey = doc.layer || 'unknown';
      const catKey = `${doc.layer || 'unknown'}.${doc.category || 'unknown'}`;
      if (!perLayerFrequency.has(layerKey)) perLayerFrequency.set(layerKey, new Map());
      if (!perCategoryFrequency.has(catKey)) perCategoryFrequency.set(catKey, new Map());

      // Unique normalized list for co-occurrence
      const uniqueNorm = Array.from(new Set(normalized));

      for (const tag of uniqueNorm) {
        increment(tagFrequency, tag);
        increment(perLayerFrequency.get(layerKey), tag);
        increment(perCategoryFrequency.get(catKey), tag);
        // Capture small sample set per tag for developer-style testing
        if (!sampleDocsByTag.has(tag)) sampleDocsByTag.set(tag, []);
        const arr = sampleDocsByTag.get(tag);
        if (arr.length < 5) {
          arr.push(doc.name || doc.friendlyName || doc._id?.toString?.() || 'unknown');
        }
      }

      // Co-occurrence pairs (limit combinations to avoid explosion)
      const MAX_TAGS_FOR_PAIRS = 30; // guardrail per asset
      const listForPairs = uniqueNorm.slice(0, MAX_TAGS_FOR_PAIRS);
      for (let i = 0; i < listForPairs.length; i++) {
        for (let j = i + 1; j < listForPairs.length; j++) {
          const key = pairKey(listForPairs[i], listForPairs[j]);
          increment(coOccurrence, key);
        }
      }
    }

    // Prepare top lists
    function topEntriesFromMap(map, limit = 50) {
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([k, v]) => ({ tag: k, count: v }));
    }

    function topPairsFromMap(map, limit = 50) {
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([k, v]) => {
          const [a, b] = k.split('||');
          return { tagA: a, tagB: b, count: v };
        });
    }

    const topTags = topEntriesFromMap(tagFrequency, 100);
    const topPairs = topPairsFromMap(coOccurrence, 100);

    // Identify likely normalization candidates (many distinct raw variants per normalized tag)
    const normalizationCandidates = [];
    for (const [norm, variantsSet] of tagRawVariants.entries()) {
      const variants = Array.from(variantsSet);
      if (variants.length >= 3) {
        normalizationCandidates.push({ normalized: norm, variants: variants.slice(0, 10), totalVariants: variants.length });
      }
    }
    normalizationCandidates.sort((a, b) => b.totalVariants - a.totalVariants);

    // Build per-layer summaries (top 20 per layer)
    const perLayerSummary = {};
    for (const [layer, map] of perLayerFrequency.entries()) {
      perLayerSummary[layer] = topEntriesFromMap(map, 20);
    }

    // Build per-category summaries (top 15 per layer.category)
    const perCategorySummary = {};
    for (const [cat, map] of perCategoryFrequency.entries()) {
      perCategorySummary[cat] = topEntriesFromMap(map, 15);
    }

    // Build developer-style samples for top tags and pairs
    const topTagSamples = topTags.slice(0, 20).map(t => ({
      tag: t.tag,
      count: t.count,
      sampleAssets: sampleDocsByTag.get(t.tag) || []
    }));
    const topPairSamples = topPairs.slice(0, 20).map(p => ({
      tagA: p.tagA,
      tagB: p.tagB,
      count: p.count,
    }));

    // Write report
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    const report = {
      generatedAt: new Date().toISOString(),
      environment: 'development',
      database: 'nna-registry-service-dev',
      scannedDocuments: scanned,
      totals: {
        uniqueTags: tagFrequency.size,
      },
      issues,
      topTags,
      topPairs,
      topTagSamples,
      topPairSamples,
      normalizationCandidates: normalizationCandidates.slice(0, 100),
      perLayerSummary,
      perCategorySummary,
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

    // Console summary
    console.log(`\n📊 Scanned documents: ${scanned}`);
    console.log(`🏷️  Unique normalized tags: ${tagFrequency.size}`);
    console.log(`⚠️  Issues:`, issues);
    console.log(`🏆 Top 10 tags:`);
    topTags.slice(0, 10).forEach((t, i) => console.log(`  ${i + 1}. ${t.tag} (${t.count})`));
    console.log(`\n🔗 Top 10 co-occurring tag pairs:`);
    topPairs.slice(0, 10).forEach((p, i) => console.log(`  ${i + 1}. ${p.tagA} + ${p.tagB} (${p.count})`));
    console.log(`\n🧭 Report written to: ${REPORT_PATH}`);

  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


