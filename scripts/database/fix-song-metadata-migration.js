#!/usr/bin/env node

/**
 * Fixed Song Metadata Migration
 * 
 * This script properly migrates song metadata from existing assets
 * with better error handling and MongoDB document structure awareness.
 */

const mongoose = require('mongoose');

// Asset Schema (simplified for this script)
const assetSchema = new mongoose.Schema({
  name: String,
  layer: String,
  category: String,
  subcategory: String,
  description: String,
  source: String,
  createdAt: Date,
  creatorDescription: String,
  albumArt: String,
  aiMetadata: Object,
  tags: [String],
  components: [String],
  songMetadata: Object // New field
});

const Asset = mongoose.model('Asset', assetSchema);

// Song metadata extraction functions
const extractSongMetadata = (creatorDescription) => {
  if (!creatorDescription) return null;
  
  const patterns = [
    /^(.+?)\s+by\s+(.+?)\s+(?:in|from)\s+(.+)$/i,  // "Song by Artist in Album"
    /^(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/i,             // "Song - Artist - Album"
    /^(.+?)\s+by\s+(.+)$/i,                        // "Song by Artist"
    /^Song\s*=\s*"(.+?)",\s*Artist\s*=\s*"(.+?)",\s*Album\s*=\s*"(.+?)"/i, // "Song = "X", Artist = "Y", Album = "Z""
  ];
  
  for (const pattern of patterns) {
    const match = creatorDescription.match(pattern);
    if (match) {
      return {
        songName: match[1].trim(),
        artistName: match[2].trim(),
        albumName: match[3]?.trim(),
      };
    }
  }
  
  return null;
};

const extractBPM = (tags) => {
  if (!tags || !Array.isArray(tags)) return undefined;
  
  const bpmTag = tags.find(tag => /\d+bpm/i.test(tag));
  if (bpmTag) {
    const bpm = parseInt(bpmTag.match(/(\d+)bpm/i)?.[1] || '0');
    return bpm > 0 ? bpm : undefined;
  }
  return undefined;
};

const extractGenre = (tags) => {
  if (!tags || !Array.isArray(tags)) return undefined;
  
  const genres = ['pop', 'hip-hop', 'rock', 'electronic', 'latin', 'country', 'jazz', 'dance'];
  return tags.find(tag => genres.includes(tag.toLowerCase()));
};

async function fixSongMetadataMigration() {
  try {
    console.log('🔧 Starting Fixed Song Metadata Migration...');
    
    // Connect to development database
    const devUrl = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(devUrl);
    console.log('✅ Connected to development database');
    
    // Get all G and C layer assets
    const assets = await Asset.find({
      $or: [{ layer: 'G' }, { layer: 'C' }]
    });
    
    console.log(`📊 Found ${assets.length} assets to migrate (${assets.filter(a => a.layer === 'G').length} songs, ${assets.filter(a => a.layer === 'C').length} composites)`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each asset
    for (const asset of assets) {
      console.log(`\n🔄 Processing: ${asset.name} (${asset.layer})`);
      
      const songMetadata = {};
      let hasMetadata = false;
      
      // Extract from creator description
      if (asset.creatorDescription) {
        const extracted = extractSongMetadata(asset.creatorDescription);
        if (extracted) {
          songMetadata.songName = extracted.songName;
          songMetadata.artistName = extracted.artistName;
          songMetadata.albumName = extracted.albumName;
          hasMetadata = true;
          console.log(`  ✅ Extracted: ${extracted.songName} by ${extracted.artistName}`);
        }
      }
      
      // Extract from album art
      if (asset.albumArt) {
        songMetadata.albumArtUrl = asset.albumArt;
        hasMetadata = true;
        console.log(`  ✅ Album art: ${asset.albumArt.substring(0, 50)}...`);
      }
      
      // Extract from tags
      if (asset.tags && asset.tags.length > 0) {
        const bpm = extractBPM(asset.tags);
        const genre = extractGenre(asset.tags);
        
        if (bpm) {
          songMetadata.bpm = bpm;
          hasMetadata = true;
          console.log(`  ✅ BPM: ${bpm}`);
        }
        
        if (genre) {
          songMetadata.genre = genre;
          hasMetadata = true;
          console.log(`  ✅ Genre: ${genre}`);
        }
      }
      
      // Update the asset if we have metadata
      if (hasMetadata) {
        try {
          // Use the document's _id directly
          const result = await Asset.findByIdAndUpdate(
            asset._id,
            { $set: { songMetadata } },
            { new: true }
          );
          
          if (result) {
            migratedCount++;
            console.log(`  ✅ Updated asset with song metadata`);
          } else {
            errorCount++;
            console.log(`  ❌ Failed to update asset - no result returned`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Failed to update asset:`, error.message);
        }
      } else {
        skippedCount++;
        console.log(`  ⏭️  No song metadata found, skipping`);
      }
    }
    
    console.log(`\n🎉 Migration Complete!`);
    console.log(`📊 Results:`);
    console.log(`  - Total assets processed: ${assets.length}`);
    console.log(`  - Assets migrated: ${migratedCount}`);
    console.log(`  - Assets skipped: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    // Verify the migration worked
    console.log(`\n🔍 Verification:`);
    const assetsWithSongMetadata = await Asset.countDocuments({
      songMetadata: { $exists: true }
    });
    console.log(`  - Assets with songMetadata field: ${assetsWithSongMetadata}`);
    
    // Show some examples
    if (assetsWithSongMetadata > 0) {
      console.log(`\n📋 Examples of migrated song metadata:`);
      const examples = await Asset.find({ songMetadata: { $exists: true } }).limit(3);
      
      examples.forEach((asset, i) => {
        console.log(`\n${i + 1}. ${asset.name} (${asset.layer}):`);
        console.log(`   Song: ${asset.songMetadata.songName || 'N/A'}`);
        console.log(`   Artist: ${asset.songMetadata.artistName || 'N/A'}`);
        console.log(`   Album: ${asset.songMetadata.albumName || 'N/A'}`);
        console.log(`   BPM: ${asset.songMetadata.bpm || 'N/A'}`);
        console.log(`   Genre: ${asset.songMetadata.genre || 'N/A'}`);
        if (asset.songMetadata.remixedBy) {
          console.log(`   Remixed by: ${asset.songMetadata.remixedBy}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the migration
fixSongMetadataMigration(); 