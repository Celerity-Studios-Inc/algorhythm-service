#!/usr/bin/env ts-node

/**
 * 🔧 V2.0: Verification Script
 * Verify all assets have GCP URLs
 */

import { connect, connection, model } from 'mongoose';
import { Asset, AssetSchema } from '../src/models/asset.schema';
import { Composite, CompositeSchema } from '../src/models/composite.schema';

async function verifyGCPURLs() {
  try {
    console.log('🔍 Verifying GCP URL migration...');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await connect(mongoUri);
    console.log('✓ Connected to database');
    
    // Create models
    const AssetModel = model('Asset', AssetSchema);
    const CompositeModel = model('Composite', CompositeSchema);
    
    // Check assets
    const totalAssets = await AssetModel.countDocuments({});
    const assetsWithURLs = await AssetModel.countDocuments({
      gcpStorageUrl: { $exists: true },
      thumbnailUrl: { $exists: true },
      previewUrl: { $exists: true }
    });
    
    console.log(`\n📊 Asset Statistics:`);
    console.log(`Total assets: ${totalAssets}`);
    console.log(`With GCP URLs: ${assetsWithURLs}`);
    console.log(`Missing URLs: ${totalAssets - assetsWithURLs}`);
    
    if (totalAssets === assetsWithURLs) {
      console.log('✅ All assets have GCP URLs');
    } else {
      console.log('❌ Some assets missing GCP URLs - run migration');
    }
    
    // Check composites
    const totalComposites = await CompositeModel.countDocuments({});
    const compositesWithURLs = await CompositeModel.countDocuments({
      gcpStorageUrl: { $exists: true },
      fullVideoUrl: { $exists: true }
    });
    
    console.log(`\n📊 Composite Statistics:`);
    console.log(`Total composites: ${totalComposites}`);
    console.log(`With GCP URLs: ${compositesWithURLs}`);
    console.log(`Missing URLs: ${totalComposites - compositesWithURLs}`);
    
    if (totalComposites === compositesWithURLs) {
      console.log('✅ All composites have GCP URLs');
    } else {
      console.log('❌ Some composites missing GCP URLs - run migration');
    }
    
    // Sample some URLs to verify format
    console.log(`\n🔗 Sample GCP URLs:`);
    const sampleAsset = await AssetModel.findOne({ gcpStorageUrl: { $exists: true } });
    if (sampleAsset) {
      console.log(`Asset: ${sampleAsset.name}`);
      console.log(`  Thumbnail: ${sampleAsset.thumbnailUrl}`);
      console.log(`  Preview: ${sampleAsset.previewUrl}`);
      console.log(`  Full: ${sampleAsset.gcpStorageUrl}`);
    }
    
    const sampleComposite = await CompositeModel.findOne({ gcpStorageUrl: { $exists: true } });
    if (sampleComposite) {
      console.log(`Composite: ${sampleComposite.name}`);
      console.log(`  Thumbnail: ${sampleComposite.thumbnailUrl}`);
      console.log(`  Preview: ${sampleComposite.previewVideoUrl}`);
      console.log(`  Full: ${sampleComposite.gcpStorageUrl}`);
    }
    
    // Overall status
    const allGood = (totalAssets === assetsWithURLs) && (totalComposites === compositesWithURLs);
    if (allGood) {
      console.log('\n🎉 All assets and composites have GCP URLs!');
      console.log('✅ V2.0 migration is complete and ready for deployment');
    } else {
      console.log('\n⚠️  Migration incomplete - some assets/composites missing URLs');
      console.log('Run: npm run ts-node scripts/migrate-to-gcp-urls.ts');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run verification
verifyGCPURLs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
