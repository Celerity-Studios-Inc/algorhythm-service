#!/usr/bin/env node

/**
 * Database Migration Script: Fix Version Fields
 * 
 * This script migrates existing assets that have undefined/null version fields
 * to have proper version initialization (version: 1, isLatestVersion: true, etc.)
 * 
 * Usage: node scripts/database/migrate-version-fields.mjs
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nna-registry-dev';

async function migrateVersionFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const assetsCollection = db.collection('assets');
    
    // Find all assets with undefined/null version fields
    console.log('🔍 Finding assets with undefined/null version fields...');
    const assetsToMigrate = await assetsCollection.find({
      $or: [
        { version: { $exists: false } },
        { version: null },
        { version: undefined }
      ]
    }).toArray();
    
    console.log(`📊 Found ${assetsToMigrate.length} assets to migrate`);
    
    if (assetsToMigrate.length === 0) {
      console.log('✅ No assets need migration. All assets have proper version fields.');
      return;
    }
    
    // Show some examples of what we're migrating
    console.log('\n📋 Sample assets to migrate:');
    assetsToMigrate.slice(0, 3).forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} - version: ${asset.version}, isLatestVersion: ${asset.isLatestVersion}`);
    });
    
    console.log('\n🚀 Starting migration...');
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const asset of assetsToMigrate) {
      try {
        const updateData = {
          version: 1,
          isLatestVersion: true,
          versionCreatedAt: new Date(),
          versionCreatedBy: asset.registeredBy || 'system-migration',
          versionNotes: 'Legacy asset version migration'
        };
        
        const result = await assetsCollection.updateOne(
          { _id: asset._id },
          { $set: updateData }
        );
        
        if (result.modifiedCount === 1) {
          migratedCount++;
          console.log(`✅ Migrated: ${asset.name}`);
        } else {
          console.log(`⚠️  No changes made to: ${asset.name}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating ${asset.name}:`, error.message);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${migratedCount} assets`);
    console.log(`  ❌ Errors: ${errorCount} assets`);
    console.log(`  📋 Total processed: ${assetsToMigrate.length} assets`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingUndefined = await assetsCollection.countDocuments({
      $or: [
        { version: { $exists: false } },
        { version: null },
        { version: undefined }
      ]
    });
    
    if (remainingUndefined === 0) {
      console.log('✅ Migration successful! All assets now have proper version fields.');
    } else {
      console.log(`⚠️  ${remainingUndefined} assets still have undefined version fields.`);
    }
    
    // Show some examples of migrated assets
    console.log('\n📋 Sample migrated assets:');
    const sampleMigrated = await assetsCollection.find({
      version: 1,
      isLatestVersion: true,
      versionNotes: 'Legacy asset version migration'
    }).limit(3).toArray();
    
    sampleMigrated.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} - version: ${asset.version}, isLatestVersion: ${asset.isLatestVersion}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateVersionFields()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
