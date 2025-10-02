#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function fixAiMetadata() {
  try {
    const mongoUri = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Development MongoDB');
    
    const db = mongoose.connection.db;
    const assetsCollection = db.collection('assets');
    
    console.log('🔍 Finding assets with character array aiMetadata...');
    
    // Find assets where aiMetadata is an object (character array) instead of a string
    const assetsWithCharArrays = await assetsCollection.find({
      aiMetadata: { $type: 'object' }
    }).toArray();
    
    console.log(`📊 Found ${assetsWithCharArrays.length} assets with character array aiMetadata`);
    
    if (assetsWithCharArrays.length === 0) {
      console.log('✅ No assets with character array aiMetadata found');
      return;
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const asset of assetsWithCharArrays) {
      try {
        console.log(`🔧 Processing asset: ${asset.name} (${asset.layer}.${asset.category}.${asset.subcategory})`);
        
        // Convert character array back to string
        const charArray = asset.aiMetadata;
        const jsonString = convertCharArrayToString(charArray);
        
        // Validate the JSON string
        try {
          JSON.parse(jsonString);
          console.log(`✅ Valid JSON reconstructed for ${asset.name}`);
        } catch (parseError) {
          console.log(`❌ Invalid JSON for ${asset.name}: ${parseError.message}`);
          errorCount++;
          continue;
        }
        
        // Update the asset with the fixed aiMetadata
        const result = await assetsCollection.updateOne(
          { _id: asset._id },
          { $set: { aiMetadata: jsonString } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Fixed aiMetadata for ${asset.name}`);
          fixedCount++;
        } else {
          console.log(`⚠️  No changes made for ${asset.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${asset.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Fix Summary:');
    console.log(`✅ Successfully fixed: ${fixedCount} assets`);
    console.log(`❌ Errors: ${errorCount} assets`);
    console.log(`📋 Total processed: ${assetsWithCharArrays.length} assets`);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

function convertCharArrayToString(charArray) {
  // Convert character array object back to string
  const chars = [];
  const keys = Object.keys(charArray).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const key of keys) {
    chars.push(charArray[key]);
  }
  
  return chars.join('');
}

// Run the fix
if (require.main === module) {
  fixAiMetadata()
    .then(() => {
      console.log('🎉 aiMetadata fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAiMetadata, convertCharArrayToString }; 