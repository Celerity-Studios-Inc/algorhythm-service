#!/usr/bin/env node

/**
 * Migrate Staging Schema to Development Compatibility
 * 
 * This script migrates the staging database schema to be compatible with development:
 * - Adds missing Phase 2B fields (creatorDescription, albumArt, aiMetadata)
 * - Sets appropriate default values
 * - Ensures zero data loss
 * - Creates backup before migration
 */

const { MongoClient } = require('mongodb');

const STAGING_MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-staging?retryWrites=true&w=majority&appName=registryService';

async function migrateStagingSchema() {
  let client;

  try {
    console.log('🔄 Migrating Staging Schema to Development Compatibility');
    console.log('========================================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to staging MongoDB...');
    client = new MongoClient(STAGING_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to staging MongoDB\n');

    const db = client.db();
    const assetsCollection = db.collection('assets');

    // 1. Create backup collection
    console.log('💾 Creating backup collection...');
    const backupCollectionName = `assets_backup_${new Date().toISOString().split('T')[0]}`;
    const backupCollection = db.collection(backupCollectionName);
    
    const totalAssets = await assetsCollection.countDocuments();
    console.log(`Total assets to backup: ${totalAssets}`);
    
    // Create backup
    const backupResult = await db.command({
      cloneCollection: `${db.databaseName}.assets`,
      to: backupCollectionName
    });
    console.log('✅ Backup created successfully\n');

    // 2. Analyze current state
    console.log('🔍 Analyzing current schema state...');
    const assetsWithoutCreatorDesc = await assetsCollection.countDocuments({
      creatorDescription: { $exists: false }
    });
    const assetsWithoutAlbumArt = await assetsCollection.countDocuments({
      albumArt: { $exists: false }
    });
    const assetsWithoutAiMetadata = await assetsCollection.countDocuments({
      aiMetadata: { $exists: false }
    });
    
    console.log(`Assets missing creatorDescription: ${assetsWithoutCreatorDesc}`);
    console.log(`Assets missing albumArt: ${assetsWithoutAlbumArt}`);
    console.log(`Assets missing aiMetadata: ${assetsWithoutAiMetadata}\n`);

    // 3. Migration strategy
    console.log('📋 Migration Strategy:');
    console.log('=====================');
    console.log('1. Add creatorDescription: Set to description if available, otherwise empty string');
    console.log('2. Add albumArt: Set to null (will be populated by frontend when needed)');
    console.log('3. Add aiMetadata: Set to null (will be populated by AI enhancement service)');
    console.log('4. Preserve all existing data');
    console.log('5. Update timestamps\n');

    // 4. Execute migration
    console.log('🔄 Executing schema migration...');
    
    const updateOperations = [];
    
    // Add creatorDescription field
    if (assetsWithoutCreatorDesc > 0) {
      console.log(`Adding creatorDescription to ${assetsWithoutCreatorDesc} assets...`);
      const creatorDescResult = await assetsCollection.updateMany(
        { creatorDescription: { $exists: false } },
        [
          {
            $set: {
              creatorDescription: {
                $cond: {
                  if: { $and: [{ $ne: ['$description', null] }, { $ne: ['$description', ''] }] },
                  then: '$description',
                  else: ''
                }
              }
            }
          }
        ]
      );
      console.log(`✅ Updated ${creatorDescResult.modifiedCount} assets with creatorDescription`);
    }

    // Add albumArt field
    if (assetsWithoutAlbumArt > 0) {
      console.log(`Adding albumArt to ${assetsWithoutAlbumArt} assets...`);
      const albumArtResult = await assetsCollection.updateMany(
        { albumArt: { $exists: false } },
        { $set: { albumArt: null } }
      );
      console.log(`✅ Updated ${albumArtResult.modifiedCount} assets with albumArt`);
    }

    // Add aiMetadata field
    if (assetsWithoutAiMetadata > 0) {
      console.log(`Adding aiMetadata to ${assetsWithoutAiMetadata} assets...`);
      const aiMetadataResult = await assetsCollection.updateMany(
        { aiMetadata: { $exists: false } },
        { $set: { aiMetadata: null } }
      );
      console.log(`✅ Updated ${aiMetadataResult.modifiedCount} assets with aiMetadata`);
    }

    // Update timestamps
    console.log('🕒 Updating migration timestamps...');
    const timestampResult = await assetsCollection.updateMany(
      {},
      { $set: { updatedAt: new Date() } }
    );
    console.log(`✅ Updated timestamps for ${timestampResult.modifiedCount} assets\n`);

    // 5. Verify migration
    console.log('🔍 Verifying migration...');
    const assetsWithCreatorDesc = await assetsCollection.countDocuments({
      creatorDescription: { $exists: true }
    });
    const assetsWithAlbumArt = await assetsCollection.countDocuments({
      albumArt: { $exists: true }
    });
    const assetsWithAiMetadata = await assetsCollection.countDocuments({
      aiMetadata: { $exists: true }
    });
    
    console.log(`✅ Assets with creatorDescription: ${assetsWithCreatorDesc}/${totalAssets}`);
    console.log(`✅ Assets with albumArt: ${assetsWithAlbumArt}/${totalAssets}`);
    console.log(`✅ Assets with aiMetadata: ${assetsWithAiMetadata}/${totalAssets}`);

    // 6. Sample verification
    console.log('\n🔍 Sample migrated asset:');
    const sampleAsset = await assetsCollection.findOne();
    if (sampleAsset) {
      console.log(`   Name: ${sampleAsset.name}`);
      console.log(`   creatorDescription: ${sampleAsset.creatorDescription || 'null'}`);
      console.log(`   albumArt: ${sampleAsset.albumArt || 'null'}`);
      console.log(`   aiMetadata: ${sampleAsset.aiMetadata || 'null'}`);
    }

    console.log('\n🎉 Schema migration completed successfully!');
    console.log(`📁 Backup collection: ${backupCollectionName}`);
    console.log('📋 Next steps:');
    console.log('   1. Test the migrated schema in staging');
    console.log('   2. Verify frontend compatibility');
    console.log('   3. Deploy development code to staging');
    console.log('   4. Test asset creation and retrieval');

  } catch (error) {
    console.error('❌ Error during schema migration:', error);
    console.log('\n🔄 Rollback instructions:');
    console.log('   If migration failed, you can restore from the backup collection');
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

migrateStagingSchema(); 