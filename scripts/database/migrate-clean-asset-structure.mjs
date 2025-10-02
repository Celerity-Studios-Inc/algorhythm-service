#!/usr/bin/env node

/**
 * Clean Asset Structure Migration
 * 
 * This migration removes all data duplication from existing assets:
 * - Removes layerMetadata entirely (100% redundant)
 * - Removes duplicate fields from songMetadata
 * - Cleans aiMetadata to only contain raw AI response
 * - Fixes version field issues
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function migrateCleanAssetStructure() {
  console.log('🧹 Asset Structure Cleanup Migration');
  console.log('='.repeat(60));
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const assetsCollection = db.collection('assets');
    
    // Get total asset count
    const totalAssets = await assetsCollection.countDocuments();
    console.log(`📊 Total assets to process: ${totalAssets}`);
    
    // Step 1: Remove layerMetadata entirely (100% redundant)
    console.log('\n🗑️  Removing layerMetadata (100% redundant)...');
    const layerMetadataResult = await assetsCollection.updateMany(
      { layerMetadata: { $exists: true } },
      { $unset: { layerMetadata: 1 } }
    );
    console.log(`✅ Removed layerMetadata from ${layerMetadataResult.modifiedCount} assets`);
    
    // Step 2: Remove duplicate fields from songMetadata
    console.log('\n🧹 Cleaning duplicate fields from songMetadata...');
    
    // Remove duplicate songName from songMetadata
    const songNameResult = await assetsCollection.updateMany(
      { 'songMetadata.songName': { $exists: true } },
      { $unset: { 'songMetadata.songName': 1 } }
    );
    console.log(`✅ Removed duplicate songName from ${songNameResult.modifiedCount} assets`);
    
    // Remove duplicate artistName from songMetadata
    const artistNameResult = await assetsCollection.updateMany(
      { 'songMetadata.artistName': { $exists: true } },
      { $unset: { 'songMetadata.artistName': 1 } }
    );
    console.log(`✅ Removed duplicate artistName from ${artistNameResult.modifiedCount} assets`);
    
    // Remove duplicate albumArt from songMetadata
    const albumArtResult = await assetsCollection.updateMany(
      { 'songMetadata.albumArt': { $exists: true } },
      { $unset: { 'songMetadata.albumArt': 1 } }
    );
    console.log(`✅ Removed duplicate albumArt from ${albumArtResult.modifiedCount} assets`);
    
    // Remove duplicate description from songMetadata
    const descriptionResult = await assetsCollection.updateMany(
      { 'songMetadata.description': { $exists: true } },
      { $unset: { 'songMetadata.description': 1 } }
    );
    console.log(`✅ Removed duplicate description from ${descriptionResult.modifiedCount} assets`);
    
    // Remove duplicate tags from songMetadata
    const tagsResult = await assetsCollection.updateMany(
      { 'songMetadata.tags': { $exists: true } },
      { $unset: { 'songMetadata.tags': 1 } }
    );
    console.log(`✅ Removed duplicate tags from ${tagsResult.modifiedCount} assets`);
    
    // Step 3: Clean aiMetadata to only contain raw AI response
    console.log('\n🧹 Cleaning aiMetadata structure...');
    
    // Remove processed songMetadata from aiMetadata
    const aiSongMetadataResult = await assetsCollection.updateMany(
      { 'aiMetadata.songMetadata': { $exists: true } },
      { $unset: { 'aiMetadata.songMetadata': 1 } }
    );
    console.log(`✅ Removed processed songMetadata from aiMetadata in ${aiSongMetadataResult.modifiedCount} assets`);
    
    // Remove layerMetadata from aiMetadata
    const aiLayerMetadataResult = await assetsCollection.updateMany(
      { 'aiMetadata.layerMetadata': { $exists: true } },
      { $unset: { 'aiMetadata.layerMetadata': 1 } }
    );
    console.log(`✅ Removed layerMetadata from aiMetadata in ${aiLayerMetadataResult.modifiedCount} assets`);
    
    // Step 4: Fix version field issues
    console.log('\n🔧 Fixing version field issues...');
    const versionResult = await assetsCollection.updateMany(
      {
        $or: [
          { version: { $exists: false } },
          { version: null },
          { isLatestVersion: { $exists: false } },
          { isLatestVersion: null }
        ]
      },
      {
        $set: {
          version: 1,
          isLatestVersion: true,
          versionCreatedAt: new Date(),
          versionCreatedBy: 'system-migration',
          versionNotes: 'Version field cleanup - legacy asset migration'
        }
      }
    );
    console.log(`✅ Fixed version fields in ${versionResult.modifiedCount} assets`);
    
    // Step 5: Remove any remaining version suffix bloat
    console.log('\n🗑️  Removing any remaining version suffix bloat...');
    const versionSuffixResult = await assetsCollection.deleteMany({
      name: { $regex: /_v\d+$/ }
    });
    console.log(`✅ Removed ${versionSuffixResult.deletedCount} assets with version suffixes`);
    
    // Step 6: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const remainingLayerMetadata = await assetsCollection.find({
      layerMetadata: { $exists: true }
    }).count();
    
    const remainingDuplicates = await assetsCollection.find({
      $or: [
        { 'songMetadata.songName': { $exists: true } },
        { 'songMetadata.artistName': { $exists: true } },
        { 'songMetadata.albumArt': { $exists: true } },
        { 'songMetadata.description': { $exists: true } },
        { 'songMetadata.tags': { $exists: true } }
      ]
    }).count();
    
    const remainingVersionIssues = await assetsCollection.find({
      $or: [
        { version: { $exists: false } },
        { version: null },
        { isLatestVersion: { $exists: false } },
        { isLatestVersion: null }
      ]
    }).count();
    
    const finalAssetCount = await assetsCollection.countDocuments();
    
    console.log('\n📋 MIGRATION SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ Remaining layerMetadata: ${remainingLayerMetadata}`);
    console.log(`✅ Remaining duplicate fields: ${remainingDuplicates}`);
    console.log(`✅ Remaining version issues: ${remainingVersionIssues}`);
    console.log(`📊 Final asset count: ${finalAssetCount}`);
    
    if (remainingLayerMetadata === 0 && remainingDuplicates === 0 && remainingVersionIssues === 0) {
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log('   - All data duplication removed');
      console.log('   - All version field issues fixed');
      console.log('   - Asset structure cleaned and optimized');
    } else {
      console.log('\n⚠️  MIGRATION INCOMPLETE');
      console.log('   - Some issues may remain');
      console.log('   - Manual review may be required');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
migrateCleanAssetStructure().catch(console.error);
