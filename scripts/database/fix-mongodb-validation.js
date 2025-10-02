#!/usr/bin/env node

/**
 * Fix MongoDB validation for language field
 * This script disables validation temporarily and converts existing string values to arrays
 */

const { MongoClient } = require('mongodb');

// Development MongoDB connection
const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function fixMongoDBValidation() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nna-registry-service-dev');
    const collection = db.collection('assets');
    
    console.log('🔍 Checking current validation rules...');
    const collectionInfo = await db.listCollections({ name: 'assets' }).toArray();
    console.log('Current collection info:', JSON.stringify(collectionInfo, null, 2));
    
    console.log('🚨 STEP 1: Temporarily disabling MongoDB validation...');
    await db.command({
      collMod: 'assets',
      validator: {},
      validationLevel: 'off'
    });
    console.log('✅ Validation disabled');
    
    console.log('🔍 STEP 2: Finding documents with string language fields...');
    const documentsToFix = await collection.find({
      $or: [
        { 'songMetadata.language': { $type: 'string' } },
        { 'aiMetadata.songMetadata.language': { $type: 'string' } },
        { 'layerMetadata.language': { $type: 'string' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${documentsToFix.length} documents with string language fields`);
    
    if (documentsToFix.length > 0) {
      console.log('🔧 STEP 3: Converting string language fields to arrays...');
      
      for (const doc of documentsToFix) {
        const updateFields = {};
        
        // Fix songMetadata.language
        if (doc.songMetadata?.language && typeof doc.songMetadata.language === 'string') {
          updateFields['songMetadata.language'] = [doc.songMetadata.language];
        }
        
        // Fix aiMetadata.songMetadata.language
        if (doc.aiMetadata?.songMetadata?.language && typeof doc.aiMetadata.songMetadata.language === 'string') {
          updateFields['aiMetadata.songMetadata.language'] = [doc.aiMetadata.songMetadata.language];
        }
        
        // Fix layerMetadata.language
        if (doc.layerMetadata?.language && typeof doc.layerMetadata.language === 'string') {
          updateFields['layerMetadata.language'] = [doc.layerMetadata.language];
        }
        
        if (Object.keys(updateFields).length > 0) {
          await collection.updateOne(
            { _id: doc._id },
            { $set: updateFields }
          );
          console.log(`✅ Fixed document: ${doc.name || doc._id}`);
        }
      }
    }
    
    console.log('🎯 STEP 4: Setting up new validation rules (accepting arrays)...');
    await db.command({
      collMod: 'assets',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          properties: {
            songMetadata: {
              bsonType: 'object',
              properties: {
                language: {
                  bsonType: ['array', 'string'],
                  items: {
                    bsonType: 'string'
                  }
                }
              }
            },
            'aiMetadata.songMetadata.language': {
              bsonType: ['array', 'string'],
              items: {
                bsonType: 'string'
              }
            },
            'layerMetadata.language': {
              bsonType: ['array', 'string'],
              items: {
                bsonType: 'string'
              }
            }
          }
        }
      },
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    console.log('✅ New validation rules applied');
    
    console.log('🎉 MongoDB validation fix completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Disabled old validation rules`);
    console.log(`   - Fixed ${documentsToFix.length} documents`);
    console.log(`   - Applied new validation rules (accepting arrays)`);
    
  } catch (error) {
    console.error('❌ Error fixing MongoDB validation:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixMongoDBValidation()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
