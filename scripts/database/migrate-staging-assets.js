#!/usr/bin/env node

/**
 * Staging Assets Migration Script
 * 
 * This script migrates staging assets from the old schema to the new Phase 2C schema,
 * preserving all existing data while adding new required fields with appropriate defaults.
 * 
 * Usage: node scripts/migrate-staging-assets.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  backupFile: `./backups/staging-assets-${new Date().toISOString().split('T')[0]}.json`,
  batchSize: 100,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

/**
 * Generate MFA from HFN
 */
function generateMfaFromHfn(hfn) {
  if (!hfn) return null;
  
  // Simple conversion logic - can be enhanced
  const parts = hfn.split('.');
  if (parts.length >= 3) {
    return parts.join('.');
  }
  return hfn;
}

/**
 * Generate HFN from MFA
 */
function generateHfnFromMfa(mfa) {
  if (!mfa) return null;
  
  // Simple conversion logic - can be enhanced
  const parts = mfa.split('.');
  if (parts.length >= 3) {
    return parts.join('.');
  }
  return mfa;
}

/**
 * Transform asset to new schema
 */
function transformAsset(asset) {
  const transformed = {
    ...asset,
    
    // Preserve existing fields
    _id: asset._id,
    layer: asset.layer,
    name: asset.name || generateHfnFromMfa(asset.address),
    address: asset.address || generateMfaFromHfn(asset.name),
    description: asset.description || '',
    
    // New Phase 2C fields with defaults
    songMetadata: asset.songMetadata || null,
    creatorDescription: asset.creatorDescription || asset.description || '',
    albumArt: asset.albumArt || null,
    aiMetadata: asset.aiMetadata || {
      description: asset.description || '',
      tags: asset.tags || []
    },
    
    // Ensure required fields
    tags: asset.tags || [],
    metadata: asset.metadata || {},
    
    // Timestamps
    createdAt: asset.createdAt || new Date(),
    updatedAt: new Date()
  };
  
  // Handle ObjectId conversion if needed
  if (asset._id && typeof asset._id === 'string') {
    transformed._id = asset._id;
  }
  
  return transformed;
}

/**
 * Main migration function
 */
async function migrateStagingAssets() {
  console.log('🚀 Starting Staging Assets Migration...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔧 Dry Run: ${CONFIG.dryRun}`);
  console.log(`📊 Verbose: ${CONFIG.verbose}`);
  
  // Check if backup file exists
  if (!fs.existsSync(CONFIG.backupFile)) {
    console.error(`❌ Backup file not found: ${CONFIG.backupFile}`);
    console.log('💡 Please run the backup script first:');
    console.log('   mongoexport --uri="mongodb+srv://staging-connection-string" --collection=assets --out=./backups/staging-assets-$(date +%Y%m%d).json');
    process.exit(1);
  }
  
  // Read backup data
  console.log(`📖 Reading backup file: ${CONFIG.backupFile}`);
  const backupData = JSON.parse(fs.readFileSync(CONFIG.backupFile, 'utf8'));
  console.log(`📊 Found ${backupData.length} assets in backup`);
  
  if (CONFIG.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
    console.log('📋 Sample transformed asset:');
    console.log(JSON.stringify(transformAsset(backupData[0]), null, 2));
    return;
  }
  
  // Connect to staging MongoDB
  const client = new MongoClient(process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to staging MongoDB...');
    await client.connect();
    const db = client.db();
    
    // Verify connection
    const collections = await db.listCollections().toArray();
    console.log(`📚 Available collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Transform assets
    console.log('🔄 Transforming assets to new schema...');
    const transformedAssets = backupData.map(transformAsset);
    
    // Validate transformations
    const validationErrors = [];
    transformedAssets.forEach((asset, index) => {
      if (!asset.layer) {
        validationErrors.push(`Asset ${index}: Missing layer`);
      }
      if (!asset.name && !asset.address) {
        validationErrors.push(`Asset ${index}: Missing both name and address`);
      }
    });
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors found:');
      validationErrors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }
    
    // Clear existing assets
    console.log('🗑️  Clearing existing assets collection...');
    await db.collection('assets').drop();
    console.log('✅ Assets collection cleared');
    
    // Insert migrated assets in batches
    console.log(`📤 Inserting ${transformedAssets.length} assets in batches of ${CONFIG.batchSize}...`);
    
    let insertedCount = 0;
    for (let i = 0; i < transformedAssets.length; i += CONFIG.batchSize) {
      const batch = transformedAssets.slice(i, i + CONFIG.batchSize);
      
      try {
        const result = await db.collection('assets').insertMany(batch);
        insertedCount += result.insertedCount;
        
        if (CONFIG.verbose) {
          console.log(`   ✅ Batch ${Math.floor(i / CONFIG.batchSize) + 1}: ${result.insertedCount} assets`);
        }
      } catch (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / CONFIG.batchSize) + 1}:`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ Successfully migrated ${insertedCount} assets`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const finalCount = await db.collection('assets').countDocuments();
    console.log(`📊 Final asset count: ${finalCount}`);
    
    if (finalCount !== insertedCount) {
      console.warn(`⚠️  Count mismatch: Expected ${insertedCount}, got ${finalCount}`);
    }
    
    // Layer distribution
    console.log('📈 Layer distribution:');
    const layerStats = await db.collection('assets').aggregate([
      { $group: { _id: '$layer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    layerStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} assets`);
    });
    
    // Sample assets for verification
    console.log('🔍 Sample migrated assets:');
    const samples = await db.collection('assets').find().limit(3).toArray();
    samples.forEach((asset, index) => {
      console.log(`   ${index + 1}. ${asset.layer} - ${asset.name || asset.address}`);
      if (CONFIG.verbose) {
        console.log(`      songMetadata: ${asset.songMetadata ? 'Present' : 'Null'}`);
        console.log(`      creatorDescription: ${asset.creatorDescription ? 'Present' : 'Empty'}`);
        console.log(`      albumArt: ${asset.albumArt ? 'Present' : 'Null'}`);
      }
    });
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Command line interface
 */
function showHelp() {
  console.log(`
Staging Assets Migration Script

Usage: node scripts/migrate-staging-assets.js [options]

Options:
  --dry-run     Show what would be migrated without making changes
  --verbose     Show detailed information during migration
  --help        Show this help message

Environment Variables:
  STAGING_MONGODB_URI    MongoDB connection string for staging
  MONGODB_URI           Fallback MongoDB connection string

Examples:
  node scripts/migrate-staging-assets.js --dry-run
  node scripts/migrate-staging-assets.js --verbose
  STAGING_MONGODB_URI="mongodb+srv://..." node scripts/migrate-staging-assets.js
`);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Run migration
migrateStagingAssets().catch(error => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
}); 