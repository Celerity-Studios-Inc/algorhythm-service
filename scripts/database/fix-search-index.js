#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function fixSearchIndex() {
  try {
    const mongoUri = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Development MongoDB');
    
    const db = mongoose.connection.db;
    const assetsCollection = db.collection('assets');
    
    console.log('🔍 Checking existing indexes...');
    
    // Get all indexes
    const indexes = await assetsCollection.indexes();
    console.log(`Found ${indexes.length} indexes:`);
    
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Check if text index exists
    const textIndex = indexes.find(index => index.name === 'name_text_description_text_tags_text_creatorDescription_text_aiMetadata.generatedDescription_text_aiMetadata.mood_text_aiMetadata.genre_text_aiMetadata.contentAnalysis.celebrityRecognition_text_aiMetadata.contentAnalysis.movementClassification_text_aiMetadata.contentAnalysis.danceStyleRecognition_text_aiMetadata.visualAnalysis.styleClassification_text_aiMetadata.visualAnalysis.brandRecognition_text_aiMetadata.worldsMetadata.locationType_text_aiMetadata.worldsMetadata.atmosphereMood_text_songMetadata.songName_text_songMetadata.artistName_text_songMetadata.albumName_text');
    
    if (textIndex) {
      console.log('✅ Text search index exists');
    } else {
      console.log('❌ Text search index missing - creating...');
      
      // Drop any existing text indexes first (MongoDB only allows one text index per collection)
      const existingTextIndexes = indexes.filter(index => index.textIndexVersion);
      if (existingTextIndexes.length > 0) {
        console.log('⚠️  Found existing text indexes, dropping them first...');
        for (const index of existingTextIndexes) {
          await assetsCollection.dropIndex(index.name);
          console.log(`  Dropped index: ${index.name}`);
        }
      }
      
      // Create the comprehensive text index
      await assetsCollection.createIndex({
        name: 'text',
        description: 'text',
        tags: 'text',
        creatorDescription: 'text',
        'aiMetadata.generatedDescription': 'text',
        'aiMetadata.mood': 'text',
        'aiMetadata.genre': 'text',
        'aiMetadata.contentAnalysis.celebrityRecognition': 'text',
        'aiMetadata.contentAnalysis.movementClassification': 'text',
        'aiMetadata.contentAnalysis.danceStyleRecognition': 'text',
        'aiMetadata.visualAnalysis.styleClassification': 'text',
        'aiMetadata.visualAnalysis.brandRecognition': 'text',
        'aiMetadata.worldsMetadata.locationType': 'text',
        'aiMetadata.worldsMetadata.atmosphereMood': 'text',
        'songMetadata.songName': 'text',
        'songMetadata.artistName': 'text',
        'songMetadata.albumName': 'text',
      });
      
      console.log('✅ Created comprehensive text search index');
    }
    
    // Test the search index
    console.log('\n🧪 Testing search index...');
    
    const assetCount = await assetsCollection.countDocuments();
    console.log(`Total assets in database: ${assetCount}`);
    
    if (assetCount > 0) {
      // Test text search
      const searchResult = await assetsCollection.find({ $text: { $search: "test" } }).limit(1).toArray();
      console.log(`Text search test result: ${searchResult.length} documents found`);
      
      // Test with a real search term
      const realSearchResult = await assetsCollection.find({ $text: { $search: "pop" } }).limit(5).toArray();
      console.log(`Real search test ("pop"): ${realSearchResult.length} documents found`);
      
      if (realSearchResult.length > 0) {
        console.log('✅ Search index is working!');
        console.log('Sample results:');
        realSearchResult.forEach((asset, i) => {
          console.log(`  ${i + 1}. ${asset.name} - ${asset.description?.substring(0, 50)}...`);
        });
      } else {
        console.log('⚠️  No results found for "pop" search - this might be normal if no assets contain "pop"');
      }
    } else {
      console.log('ℹ️  No assets in database yet - search index will work when assets are added');
    }
    
    console.log('\n🎉 Search index check completed!');
    
  } catch (error) {
    console.error('❌ Error fixing search index:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

fixSearchIndex(); 