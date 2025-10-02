#!/usr/bin/env node

/**
 * Star Variants Database Migration Script
 * 
 * This script migrates existing Star assets to use the new Asset Type field
 * and sets default values for the enhanced variant system.
 * 
 * Usage: node scripts/database/migrate-star-variants.js
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nna-registry-dev';
const DATABASE_NAME = process.env.DATABASE_NAME || 'nna-registry-dev';

async function migrateStarVariants() {
  let client;
  
  try {
    console.log('🚀 Starting Star Variants migration...');
    console.log(`📊 Connecting to database: ${DATABASE_NAME}`);
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const assetsCollection = db.collection('assets');
    
    console.log('✅ Connected to database successfully');
    
    // Step 1: Find all Star assets that need migration
    const starAssets = await assetsCollection.find({
      layer: 'S',
      $or: [
        { 'aiMetadata.starsMetadata.assetType': { $exists: false } },
        { 'aiMetadata.starsMetadata.assetType': null },
        { 'aiMetadata.starsMetadata.variantType': { $exists: true } }
      ]
    }).toArray();
    
    console.log(`📋 Found ${starAssets.length} Star assets to migrate`);
    
    if (starAssets.length === 0) {
      console.log('✅ No assets need migration - all Star assets already have assetType field');
      return;
    }
    
    // Step 2: Update existing assets to use new assetType field
    const updateResult = await assetsCollection.updateMany(
      {
        layer: 'S',
        $or: [
          { 'aiMetadata.starsMetadata.assetType': { $exists: false } },
          { 'aiMetadata.starsMetadata.assetType': null },
          { 'aiMetadata.starsMetadata.variantType': { $exists: true } }
        ]
      },
      [
        {
          $set: {
            'aiMetadata.starsMetadata.assetType': {
              $cond: {
                if: { $eq: ['$aiMetadata.starsMetadata.variantType', 'variant'] },
                then: 'variant',
                else: 'base'
              }
            }
          }
        },
        {
          $unset: 'aiMetadata.starsMetadata.variantType'
        }
      ]
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} Star assets`);
    
    // Step 3: Set default values for missing fields
    const defaultUpdateResult = await assetsCollection.updateMany(
      {
        layer: 'S',
        $or: [
          { 'aiMetadata.starsMetadata.starName': { $exists: false } },
          { 'aiMetadata.starsMetadata.starName': null }
        ]
      },
      {
        $set: {
          'aiMetadata.starsMetadata.starName': '$aiMetadata.starsMetadata.celebrityName'
        }
      }
    );
    
    console.log(`✅ Set default starName for ${defaultUpdateResult.modifiedCount} assets`);
    
    // Step 4: Create database indexes for efficient variant queries
    console.log('🔧 Creating database indexes for variant queries...');
    
    try {
      await assetsCollection.createIndex({ 
        'aiMetadata.starsMetadata.baseStarId': 1 
      });
      console.log('✅ Created index on aiMetadata.starsMetadata.baseStarId');
    } catch (error) {
      console.log('ℹ️  Index on baseStarId already exists');
    }
    
    try {
      await assetsCollection.createIndex({ 
        'aiMetadata.starsMetadata.assetType': 1 
      });
      console.log('✅ Created index on aiMetadata.starsMetadata.assetType');
    } catch (error) {
      console.log('ℹ️  Index on assetType already exists');
    }
    
    try {
      await assetsCollection.createIndex({ 
        layer: 1, 
        'aiMetadata.starsMetadata.assetType': 1 
      });
      console.log('✅ Created compound index on layer + assetType');
    } catch (error) {
      console.log('ℹ️  Compound index on layer + assetType already exists');
    }
    
    try {
      await assetsCollection.createIndex({ 
        layer: 1, 
        'aiMetadata.starsMetadata.assetType': 1,
        'aiMetadata.starsMetadata.baseStarId': 1 
      });
      console.log('✅ Created compound index on layer + assetType + baseStarId');
    } catch (error) {
      console.log('ℹ️  Compound index on layer + assetType + baseStarId already exists');
    }
    
    try {
      await assetsCollection.createIndex({ 
        createdAt: -1,
        layer: 1,
        'aiMetadata.starsMetadata.assetType': 1
      });
      console.log('✅ Created index for recent stars queries');
    } catch (error) {
      console.log('ℹ️  Index for recent stars queries already exists');
    }
    
    // Step 5: Validate migration results
    console.log('🔍 Validating migration results...');
    
    const baseAssets = await assetsCollection.countDocuments({
      layer: 'S',
      'aiMetadata.starsMetadata.assetType': 'base'
    });
    
    const variantAssets = await assetsCollection.countDocuments({
      layer: 'S',
      'aiMetadata.starsMetadata.assetType': 'variant'
    });
    
    const assetsWithoutAssetType = await assetsCollection.countDocuments({
      layer: 'S',
      $or: [
        { 'aiMetadata.starsMetadata.assetType': { $exists: false } },
        { 'aiMetadata.starsMetadata.assetType': null }
      ]
    });
    
    console.log('📊 Migration Results:');
    console.log(`   - Base assets: ${baseAssets}`);
    console.log(`   - Variant assets: ${variantAssets}`);
    console.log(`   - Assets without assetType: ${assetsWithoutAssetType}`);
    
    if (assetsWithoutAssetType > 0) {
      console.warn('⚠️  Warning: Some assets still missing assetType field');
    } else {
      console.log('✅ All Star assets have assetType field');
    }
    
    // Step 6: Check for orphaned variants
    console.log('🔍 Checking for orphaned variants...');
    
    const orphanedVariants = await assetsCollection.find({
      layer: 'S',
      'aiMetadata.starsMetadata.assetType': 'variant',
      'aiMetadata.starsMetadata.baseStarId': { $exists: true, $ne: null }
    }).toArray();
    
    const orphanedCount = orphanedVariants.filter(variant => {
      // Check if base star exists
      return !assetsCollection.findOne({
        name: variant.aiMetadata.starsMetadata.baseStarId
      });
    }).length;
    
    if (orphanedCount > 0) {
      console.warn(`⚠️  Warning: Found ${orphanedCount} orphaned variants`);
    } else {
      console.log('✅ No orphaned variants found');
    }
    
    console.log('🎉 Star Variants migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateStarVariants()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateStarVariants };
