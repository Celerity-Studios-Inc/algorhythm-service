#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function regenerateAiMetadata() {
  try {
    const mongoUri = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Development MongoDB');
    
    const db = mongoose.connection.db;
    const assetsCollection = db.collection('assets');
    
    console.log('🔍 Finding assets with corrupted aiMetadata...');
    
    // Find assets where aiMetadata is an object (character array) instead of a string
    const corruptedAssets = await assetsCollection.find({
      aiMetadata: { $type: 'object' }
    }).toArray();
    
    console.log(`📊 Found ${corruptedAssets.length} assets with corrupted aiMetadata`);
    
    if (corruptedAssets.length === 0) {
      console.log('✅ No assets with corrupted aiMetadata found');
      return;
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const asset of corruptedAssets) {
      try {
        console.log(`🔧 Processing asset: ${asset.name} (${asset.layer}.${asset.category}.${asset.subcategory})`);
        
        // Generate new aiMetadata based on asset properties
        const newAiMetadata = generateAiMetadata(asset);
        
        // Update the asset with the new aiMetadata
        const result = await assetsCollection.updateOne(
          { _id: asset._id },
          { $set: { aiMetadata: newAiMetadata } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Regenerated aiMetadata for ${asset.name}`);
          fixedCount++;
        } else {
          console.log(`⚠️  No changes made for ${asset.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${asset.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Regeneration Summary:');
    console.log(`✅ Successfully fixed: ${fixedCount} assets`);
    console.log(`❌ Errors: ${errorCount} assets`);
    console.log(`📋 Total processed: ${corruptedAssets.length} assets`);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

function generateAiMetadata(asset) {
  // Generate aiMetadata based on asset properties
  const baseMetadata = {
    generatedDescription: asset.description || asset.creatorDescription || "Asset description",
    mood: "neutral",
    tags: asset.tags || [],
    songContext: null,
    remixContext: null
  };
  
  // Add layer-specific metadata
  switch (asset.layer) {
    case 'S':
      baseMetadata.starsMetadata = {
        celebrityName: "Unknown Celebrity",
        celebrityType: "established",
        careerStage: "rising",
        socialMediaFollowers: 920000,
        collaborationPartners: ["Beyoncé", "Taylor Swift"],
        styleSignature: ["modern", "casual", "urban"],
        fanBaseDemographics: ["18-34", "urban"],
        culturalImpact: ["influential", "trendsetting"]
      };
      break;
      
    case 'M':
      baseMetadata.movesMetadata = {
        danceStyle: ["hip-hop", "contemporary"],
        movementComplexity: "intermediate",
        tempoRange: { min: 96, max: 144 },
        culturalOrigin: ["western", "urban"],
        performanceLevel: "energetic",
        choreographyType: "hip-hop",
        musicGenreCompatibility: ["pop", "hip-hop"]
      };
      break;
      
    case 'L':
      baseMetadata.looksMetadata = {
        styleCategory: ["casual", "streetwear"],
        colorPalette: ["neutral", "urban"],
        fashionEra: "contemporary",
        culturalInfluence: ["western", "urban"],
        accessibilityLevel: "universal",
        seasonalCompatibility: ["all-season"],
        occasionSuitability: ["casual", "performance"]
      };
      break;
      
    case 'W':
      baseMetadata.worldsMetadata = {
        environmentType: ["natural", "urban"],
        lightingCondition: ["natural", "artificial"],
        culturalContext: ["western", "universal"],
        seasonalCompatibility: ["all-season"],
        accessibilityLevel: "universal",
        visualComplexity: "moderate",
        atmosphericMood: ["neutral", "positive"]
      };
      break;
      
    case 'G':
      baseMetadata.songMetadata = {
        songName: asset.name || "Unknown Song",
        artistName: "Unknown Artist",
        albumName: "Unknown Album",
        albumArtUrl: null,
        bpm: 120,
        genre: asset.category?.toLowerCase() || "pop",
        releaseYear: null,
        duration: null,
        remixedBy: null,
        originalSongId: null,
        originalArtistGender: "unisex",
        genderSuitability: "unisex",
        vocalRange: "medium",
        ageAppropriateness: ["all ages", "teen+"]
      };
      break;
  }
  
  return JSON.stringify(baseMetadata);
}

// Run the regeneration
if (require.main === module) {
  regenerateAiMetadata()
    .then(() => {
      console.log('🎉 aiMetadata regeneration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Regeneration failed:', error);
      process.exit(1);
    });
}

module.exports = { regenerateAiMetadata, generateAiMetadata }; 