#!/usr/bin/env node

/**
 * Tag Lint Script
 * - Scans assets and flags non-canonical tags based on tag-canonical-map.json
 * - Intended to run in CI or as a pre-ingest validation tool
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function normalizeBase(tag) {
  if (typeof tag !== 'string') return tag;
  return tag.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const fallback = path.join(__dirname, '..', '..', 'mongodb-uri-dev.value');
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8').trim();
  throw new Error("MONGODB_URI not set and fallback file 'mongodb-uri-dev.value' not found.");
}

async function run() {
  const mapPath = path.join(__dirname, 'tag-canonical-map.json');
  const canonical = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  const uri = await getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('nna-registry-service-dev');

  try {
    const assets = db.collection('assets');
    const tagFields = [
      'tags','aiMetadata.tags','aiMetadata.generatedTags','aiMetadata.enrichment.tags','aiMetadata.enrichment.topics','aiMetadata.enrichment.keywords','aiMetadata.contentAnalysis.keywords','aiMetadata.contentAnalysis.topics','songMetadata.tags','looksMetadata.tags','starsMetadata.tags','movesMetadata.tags','worldsMetadata.tags'
    ];

    const projection = { name: 1, friendlyName: 1 };
    for (const f of tagFields) projection[f] = 1;

    const cursor = assets.find({}, { projection });
    const findings = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const violations = [];

      for (const field of tagFields) {
        const parts = field.split('.');
        let value = doc;
        for (const p of parts) value = value?.[p];
        if (!Array.isArray(value)) continue;

        for (const raw of value) {
          if (typeof raw !== 'string') continue;
          const base = normalizeBase(raw);
          const synonym = canonical.synonyms[base];
          if (synonym && synonym !== base) {
            violations.push({ field, raw, suggested: synonym });
          }
        }
      }

      if (violations.length) {
        findings.push({
          asset: doc.name || doc.friendlyName || doc._id?.toString?.() || 'unknown',
          violations
        });
      }
    }

    const outDir = path.join(__dirname, '..', '..', 'reports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `tag-lint-dev-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ totalAssetsFlagged: findings.length, findings }, null, 2));
    console.log(`✅ Tag lint completed. Flagged: ${findings.length} assets`);
    console.log(`🧭 Report: ${outPath}`);
  } catch (e) {
    console.error('❌ Lint failed:', e.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });


