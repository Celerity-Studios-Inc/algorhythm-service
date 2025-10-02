#!/usr/bin/env node

/**
 * Fix existing documents with string language fields
 * This script converts string language values to arrays without modifying validation
 */

const { MongoClient } = require('mongodb');

// Development MongoDB connection
const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function fixLanguageFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nna-registry-service-dev');
    const collection = db.collection('assets');
    
    console.log('🔍 Finding documents with string language fields...');
    const documentsToFix = await collection.find({
      $or: [
        { 'songMetadata.language': { $type: 'string' } },
        { 'aiMetadata.songMetadata.language': { $type: 'string' } },
        { 'layerMetadata.language': { $type: 'string' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${documentsToFix.length} documents with string language fields`);
    
    if (documentsToFix.length === 0) {
      console.log('✅ No documents need fixing - all language fields are already arrays!');
      return;
    }
    
    console.log('🔧 Converting string language fields to arrays...');
    
    for (const doc of documentsToFix) {
      const updateFields = {};
      
      // Fix songMetadata.language
      if (doc.songMetadata?.language && typeof doc.songMetadata.language === 'string') {
        updateFields['songMetadata.language'] = [doc.songMetadata.language];
        console.log(`   - songMetadata.language: "${doc.songMetadata.language}" → ["${doc.songMetadata.language}"]`);
      }
      
      // Fix aiMetadata.songMetadata.language
      if (doc.aiMetadata?.songMetadata?.language && typeof doc.aiMetadata.songMetadata.language === 'string') {
        updateFields['aiMetadata.songMetadata.language'] = [doc.aiMetadata.songMetadata.language];
        console.log(`   - aiMetadata.songMetadata.language: "${doc.aiMetadata.songMetadata.language}" → ["${doc.aiMetadata.songMetadata.language}"]`);
      }
      
      // Fix layerMetadata.language
      if (doc.layerMetadata?.language && typeof doc.layerMetadata.language === 'string') {
        updateFields['layerMetadata.language'] = [doc.layerMetadata.language];
        console.log(`   - layerMetadata.language: "${doc.layerMetadata.language}" → ["${doc.layerMetadata.language}"]`);
      }
      
      if (Object.keys(updateFields).length > 0) {
        try {
          await collection.updateOne(
            { _id: doc._id },
            { $set: updateFields }
          );
          console.log(`✅ Fixed document: ${doc.name || doc._id}`);
        } catch (error) {
          console.error(`❌ Failed to fix document ${doc.name || doc._id}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Language field fix completed!');
    console.log('📊 Summary:');
    console.log(`   - Processed ${documentsToFix.length} documents`);
    console.log(`   - Converted string language fields to arrays`);
    console.log('✅ The system should now work with array language fields');
    
  } catch (error) {
    console.error('❌ Error fixing language fields:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixLanguageFields()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
