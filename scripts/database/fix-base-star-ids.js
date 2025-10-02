#!/usr/bin/env node

/**
 * Fix Base Star IDs from MFA to HFN Format
 * 
 * This script finds all Star layer assets with MFA format baseStarId
 * and converts them to HFN format by looking up the base star's name.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Asset Schema (simplified for this script)
const assetSchema = new mongoose.Schema({
  name: String,
  nna_address: String,
  layer: String,
  aiMetadata: {
    starsMetadata: {
      baseStarId: String,
      assetType: String,
      variantType: String
    }
  },
  starMetadata: {
    baseStarId: String,
    assetType: String,
    variantType: String
  }
});

const Asset = mongoose.model('Asset', assetSchema);

async function fixBaseStarIds() {
  try {
    console.log('🔧 Starting Base Star ID MFA to HFN migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nna-registry-dev');
    console.log('✅ Connected to MongoDB');

    // Find all variant assets with MFA in baseStarId (both locations)
    const variantAssets = await Asset.find({
      layer: 'S',
      $or: [
        {
          'aiMetadata.starsMetadata.baseStarId': { 
            $exists: true, 
            $ne: null,
            $regex: /^\d+\.\d+\.\d+\.\d+$/ // MFA format
          }
        },
        {
          'starMetadata.baseStarId': { 
            $exists: true, 
            $ne: null,
            $regex: /^\d+\.\d+\.\d+\.\d+$/ // MFA format
          }
        }
      ]
    });

    console.log(`📊 Found ${variantAssets.length} variant assets with MFA in baseStarId`);

    if (variantAssets.length === 0) {
      console.log('✅ No assets need migration - all baseStarId fields are already in HFN format');
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const variant of variantAssets) {
      try {
        console.log(`\n🔍 Processing variant: ${variant.name}`);
        
        // Check both metadata locations
        const aiMfaId = variant.aiMetadata?.starsMetadata?.baseStarId;
        const starMfaId = variant.starMetadata?.baseStarId;
        
        const mfaId = aiMfaId || starMfaId;
        const metadataPath = aiMfaId ? 'aiMetadata.starsMetadata.baseStarId' : 'starMetadata.baseStarId';
        
        console.log(`🔍 AI MFA ID: ${aiMfaId}`);
        console.log(`🔍 Star MFA ID: ${starMfaId}`);
        console.log(`🔍 Using MFA ID: ${mfaId}`);
        console.log(`🔍 Metadata path: ${metadataPath}`);
        
        if (!mfaId) {
          console.warn(`⚠️  No baseStarId found for variant: ${variant.name}`);
          errorCount++;
          continue;
        }

        console.log(`📍 MFA baseStarId: ${mfaId}`);

        // Find the base star by MFA
        const baseStar = await Asset.findOne({
          nna_address: mfaId,
          layer: 'S'
        });

        if (!baseStar) {
          console.warn(`❌ Base star not found for MFA: ${mfaId}`);
          errorCount++;
          results.push({
            variant: variant.name,
            mfaId,
            status: 'ERROR',
            message: 'Base star not found'
          });
          continue;
        }

        const hfnBaseStarId = baseStar.name;
        console.log(`✅ Found base star: ${hfnBaseStarId} (MFA: ${mfaId})`);

        // Update the variant with HFN
        const updateResult = await Asset.updateOne(
          { _id: variant._id },
          { 
            $set: { 
              [metadataPath]: hfnBaseStarId 
            } 
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Updated ${variant.name}: ${mfaId} -> ${hfnBaseStarId}`);
          fixedCount++;
          results.push({
            variant: variant.name,
            mfaId,
            hfnId: hfnBaseStarId,
            status: 'SUCCESS'
          });
        } else {
          console.warn(`⚠️  No update made for ${variant.name}`);
          errorCount++;
          results.push({
            variant: variant.name,
            mfaId,
            status: 'ERROR',
            message: 'No update made'
          });
        }

      } catch (error) {
        console.error(`❌ Error processing ${variant.name}:`, error.message);
        errorCount++;
        results.push({
          variant: variant.name,
          status: 'ERROR',
          message: error.message
        });
      }
    }

    // Summary
    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully fixed: ${fixedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${variantAssets.length}`);

    if (results.length > 0) {
      console.log('\n📝 Detailed Results:');
      results.forEach(result => {
        if (result.status === 'SUCCESS') {
          console.log(`✅ ${result.variant}: ${result.mfaId} -> ${result.hfnId}`);
        } else {
          console.log(`❌ ${result.variant}: ${result.message}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  fixBaseStarIds()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBaseStarIds };
