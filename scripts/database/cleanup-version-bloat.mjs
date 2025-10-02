#!/usr/bin/env node

/**
 * Cleanup Version Bloat - Remove Assets with Version Suffixes
 * 
 * This script removes assets created by the old problematic approach:
 * - Assets with _vN suffixes in name
 * - Assets with _vN suffixes in nna_address
 * - Fixes version field issues
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function cleanupVersionBloat() {
  console.log('🧹 NNA Architecture Cleanup - Removing Version Bloat');
  console.log('='.repeat(60));
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const assetsCollection = db.collection('assets');
    
    // Get assets with version suffixes
    const versionSuffixAssets = await assetsCollection.find({
      name: { $regex: /_v\d+$/ }
    }).toArray();
    
    console.log(`🔍 Found ${versionSuffixAssets.length} assets with version suffixes to remove:`);
    versionSuffixAssets.forEach(asset => {
      console.log(`   - ${asset.name} (version: ${asset.version}, isLatest: ${asset.isLatestVersion})`);
    });
    
    if (versionSuffixAssets.length > 0) {
      console.log('\n🗑️  Removing version suffix assets...');
      const deleteResult = await assetsCollection.deleteMany({
        name: { $regex: /_v\d+$/ }
      });
      console.log(`✅ Removed ${deleteResult.deletedCount} version suffix assets`);
    }
    
    // Fix assets with undefined version fields
    console.log('\n🔧 Fixing assets with undefined version fields...');
    const versionIssues = await assetsCollection.find({
      $or: [
        { version: { $exists: false } },
        { version: null },
        { isLatestVersion: { $exists: false } },
        { isLatestVersion: null }
      ]
    }).toArray();
    
    if (versionIssues.length > 0) {
      console.log(`🔍 Found ${versionIssues.length} assets with version issues:`);
      versionIssues.forEach(asset => {
        console.log(`   - ${asset.name}: version=${asset.version}, isLatest=${asset.isLatestVersion}`);
      });
      
      console.log('🔧 Fixing version fields...');
      const updateResult = await assetsCollection.updateMany(
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
            versionCreatedBy: 'system-cleanup',
            versionNotes: 'Version field cleanup - legacy asset migration'
          }
        }
      );
      console.log(`✅ Fixed ${updateResult.modifiedCount} assets with version issues`);
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingVersionSuffixes = await assetsCollection.find({
      name: { $regex: /_v\d+$/ }
    }).count();
    
    const remainingNnaAddressSuffixes = await assetsCollection.find({
      nna_address: { $regex: /_v\d+$/ }
    }).count();
    
    const remainingVersionIssues = await assetsCollection.find({
      $or: [
        { version: { $exists: false } },
        { version: null },
        { isLatestVersion: { $exists: false } },
        { isLatestVersion: null }
      ]
    }).count();
    
    const totalAssets = await assetsCollection.countDocuments();
    
    console.log('\n📋 CLEANUP SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ Remaining version suffix assets: ${remainingVersionSuffixes}`);
    console.log(`✅ Remaining nna_address suffix assets: ${remainingNnaAddressSuffixes}`);
    console.log(`✅ Remaining version issues: ${remainingVersionIssues}`);
    console.log(`📊 Total assets after cleanup: ${totalAssets}`);
    
    if (remainingVersionSuffixes === 0 && remainingNnaAddressSuffixes === 0 && remainingVersionIssues === 0) {
      console.log('\n🎉 CLEANUP SUCCESSFUL!');
      console.log('   - All version suffix bloat removed');
      console.log('   - All version field issues fixed');
      console.log('   - NNA architecture compliance restored');
    } else {
      console.log('\n⚠️  CLEANUP INCOMPLETE');
      console.log('   - Some issues may remain');
      console.log('   - Manual review may be required');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the cleanup
cleanupVersionBloat().catch(console.error);
