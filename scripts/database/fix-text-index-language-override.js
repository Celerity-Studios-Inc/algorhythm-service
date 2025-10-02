#!/usr/bin/env node

/**
 * Fix the text search index language_override issue
 * The text index has "language_override": "language" which expects a string,
 * but we're sending language as an array, causing the validation error.
 */

const { MongoClient } = require('mongodb');

// Development MongoDB connection
const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function fixTextIndexLanguageOverride() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nna-registry-service-dev');
    const collection = db.collection('assets');
    
    console.log('🔍 Current text indexes:');
    const indexes = await collection.indexes();
    const textIndexes = indexes.filter(idx => idx.textIndexVersion);
    
    for (const index of textIndexes) {
      console.log(`📊 Text Index: ${index.name}`);
      console.log(`   - language_override: ${index.language_override}`);
      console.log(`   - default_language: ${index.default_language}`);
    }
    
    console.log('🚨 PROBLEM IDENTIFIED:');
    console.log('   The text search index has "language_override": "language"');
    console.log('   This expects the language field to be a STRING for text search');
    console.log('   But our application sends language as an ARRAY');
    console.log('   This mismatch causes the validation error!');
    
    console.log('🔧 SOLUTION: Remove the language_override from the text index');
    
    // Drop the existing text index
    const textIndexName = 'text_search_index';
    
    console.log(`🗑️ Dropping text index: ${textIndexName}`);
    await collection.dropIndex(textIndexName);
    console.log('✅ Text index dropped');
    
    // Recreate the text index WITHOUT language_override
    console.log('🔨 Recreating text index without language_override...');
    await collection.createIndex(
      {
        name: 'text',
        description: 'text',
        tags: 'text',
        creatorDescription: 'text',
        'aiMetadata.generatedDescription': 'text',
        'aiMetadata.mood': 'text',
        'aiMetadata.genre': 'text',
        'songMetadata.songName': 'text',
        'songMetadata.artistName': 'text',
        'songMetadata.albumName': 'text'
      },
      {
        name: 'text_search_index',
        default_language: 'english'
        // NO language_override - this was the problem!
      }
    );
    console.log('✅ Text index recreated without language_override');
    
    console.log('🎉 Fix completed!');
    console.log('📊 Summary:');
    console.log('   - Removed language_override from text search index');
    console.log('   - Text search will now use default_language: "english"');
    console.log('   - Language field can now be an array without validation errors');
    console.log('✅ The system should now work with array language fields');
    
  } catch (error) {
    console.error('❌ Error fixing text index:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixTextIndexLanguageOverride()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
