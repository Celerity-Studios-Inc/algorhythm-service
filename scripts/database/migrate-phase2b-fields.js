const mongoose = require('mongoose');
require('dotenv').config();

// Asset Schema
const assetSchema = new mongoose.Schema({
  _id: String,
  name: String,
  layer: String,
  category: String,
  subcategory: String,
  description: String,
  source: String,
  createdAt: Date,
  creatorDescription: String,
  albumArt: String,
  aiMetadata: String
});

const Asset = mongoose.model('Asset', assetSchema);

// Songs Layer Assets - Manual Enhancement Required
const songsLayerAssets = [
  // TODO: Add your songs layer assets here with proper creator descriptions
  // Example:
  // {
  //   _id: 'asset_id_here',
  //   name: 'G.POP.TSW.001',
  //   creatorDescription: 'Taylor Swift - "Shake It Off" from album "1989"',
  //   albumArt: 'https://example.com/1989-album-art.jpg',
  //   aiMetadata: '{"generatedDescription":"Upbeat pop song","mood":"energetic","genre":"pop"}'
  // }
];

async function migratePhase2BFields() {
  try {
    console.log('🚀 Starting Phase 2B Migration...');
    
    // Connect to staging database
    const stagingUrl = process.env.STAGING_MONGODB_URL || process.env.MONGODB_URL;
    await mongoose.connect(stagingUrl);
    console.log('✅ Connected to staging database');
    
    // Step 1: Migrate Songs Layer Assets (Manual Enhancement)
    console.log('\n📋 Step 1: Migrating Songs Layer Assets...');
    
    if (songsLayerAssets.length > 0) {
      console.log(`Found ${songsLayerAssets.length} songs layer assets to migrate`);
      
      for (const assetData of songsLayerAssets) {
        try {
          const result = await Asset.updateOne(
            { _id: assetData._id },
            {
              $set: {
                creatorDescription: assetData.creatorDescription,
                albumArt: assetData.albumArt || '',
                aiMetadata: assetData.aiMetadata || '{}'
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Updated ${assetData.name} with creator description`);
          } else {
            console.log(`⚠️ No changes made to ${assetData.name}`);
          }
        } catch (error) {
          console.error(`❌ Error updating ${assetData.name}:`, error.message);
        }
      }
    } else {
      console.log('⚠️ No songs layer assets defined for migration');
    }
    
    // Step 2: Bulk Migration for Visual Assets (Optional)
    console.log('\n📋 Step 2: Bulk Migration for Visual Assets...');
    
    const visualAssets = await Asset.find({
      layer: { $ne: 'G' }, // All layers except songs
      $or: [
        { creatorDescription: { $exists: false } },
        { creatorDescription: null },
        { creatorDescription: '' }
      ]
    });
    
    console.log(`Found ${visualAssets.length} visual assets needing Phase 2B fields`);
    
    if (visualAssets.length > 0) {
      let updatedCount = 0;
      
      for (const asset of visualAssets) {
        try {
          const result = await Asset.updateOne(
            { _id: asset._id },
            {
              $set: {
                creatorDescription: `[AUTO-MIGRATED] ${asset.name} - ${asset.description?.substring(0, 50)}...`,
                albumArt: '',
                aiMetadata: '{}'
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            updatedCount++;
          }
        } catch (error) {
          console.error(`❌ Error updating ${asset.name}:`, error.message);
        }
      }
      
      console.log(`✅ Updated ${updatedCount} visual assets with default Phase 2B fields`);
    }
    
    // Step 3: Verification
    console.log('\n📋 Step 3: Verification...');
    
    const totalAssets = await Asset.countDocuments();
    const withCreatorDesc = await Asset.countDocuments({ 
      creatorDescription: { $exists: true, $ne: null, $ne: '' } 
    });
    const withAlbumArt = await Asset.countDocuments({ 
      albumArt: { $exists: true, $ne: null, $ne: '' } 
    });
    const withAiMetadata = await Asset.countDocuments({ 
      aiMetadata: { $exists: true, $ne: null, $ne: '' } 
    });
    
    console.log('\n📊 Migration Results:');
    console.log('=' .repeat(50));
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`With Creator Description: ${withCreatorDesc} (${Math.round(withCreatorDesc/totalAssets*100)}%)`);
    console.log(`With Album Art: ${withAlbumArt} (${Math.round(withAlbumArt/totalAssets*100)}%)`);
    console.log(`With AI Metadata: ${withAiMetadata} (${Math.round(withAiMetadata/totalAssets*100)}%)`);
    
    // Step 4: Sample Verification
    console.log('\n📋 Step 4: Sample Verification...');
    
    const sampleAssets = await Asset.find().limit(5);
    console.log('\nSample Assets After Migration:');
    
    sampleAssets.forEach(asset => {
      console.log(`\n${asset.name}:`);
      console.log(`  Creator Description: ${asset.creatorDescription || 'NOT SET'}`);
      console.log(`  Album Art: ${asset.albumArt || 'NOT SET'}`);
      console.log(`  AI Metadata: ${asset.aiMetadata ? 'SET' : 'NOT SET'}`);
    });
    
    console.log('\n✅ Phase 2B Migration Complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Helper function to generate migration data for songs layer assets
async function generateSongsMigrationData() {
  try {
    console.log('🔍 Generating Songs Layer Migration Data...');
    
    const stagingUrl = process.env.STAGING_MONGODB_URL || process.env.MONGODB_URL;
    await mongoose.connect(stagingUrl);
    
    const songsAssets = await Asset.find({ layer: 'G' }).sort({ name: 1 });
    
    console.log('\n// Copy this data to the songsLayerAssets array above:');
    console.log('const songsLayerAssets = [');
    
    songsAssets.forEach(asset => {
      console.log(`  {`);
      console.log(`    _id: '${asset._id}',`);
      console.log(`    name: '${asset.name}',`);
      console.log(`    category: '${asset.category}',`);
      console.log(`    subcategory: '${asset.subcategory}',`);
      console.log(`    // TODO: Add proper creator description`);
      console.log(`    creatorDescription: '[MIGRATION NEEDED] ${asset.name}',`);
      console.log(`    albumArt: '',`);
      console.log(`    aiMetadata: '{}'`);
      console.log(`  },`);
    });
    
    console.log('];');
    
  } catch (error) {
    console.error('❌ Error generating migration data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'generate') {
  generateSongsMigrationData();
} else {
  migratePhase2BFields();
} 