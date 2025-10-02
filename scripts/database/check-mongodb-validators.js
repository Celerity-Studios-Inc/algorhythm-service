#!/usr/bin/env node

/**
 * Check MongoDB collection validators to find the root cause
 * This will show us what validation rules are actually enforced at the database level
 */

const { MongoClient } = require('mongodb');

// Development MongoDB connection
const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function checkMongoDBValidators() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nna-registry-service-dev');
    
    console.log('🔍 Checking collection validators...');
    
    // Get collection info including validators
    const collections = await db.listCollections({ name: 'assets' }).toArray();
    console.log('📊 Collection info:', JSON.stringify(collections, null, 2));
    
    // Try to get validator info
    try {
      const validatorInfo = await db.command({ collStats: 'assets' });
      console.log('📊 Collection stats:', JSON.stringify(validatorInfo, null, 2));
    } catch (error) {
      console.log('⚠️ Could not get collection stats:', error.message);
    }
    
    // Try to get validation info
    try {
      const validationInfo = await db.command({ 
        listCollections: 1, 
        filter: { name: 'assets' },
        nameOnly: false
      });
      console.log('📊 Validation info:', JSON.stringify(validationInfo, null, 2));
    } catch (error) {
      console.log('⚠️ Could not get validation info:', error.message);
    }
    
    // Check if there are any indexes that might be causing issues
    try {
      const indexes = await db.collection('assets').indexes();
      console.log('📊 Indexes:', JSON.stringify(indexes, null, 2));
    } catch (error) {
      console.log('⚠️ Could not get indexes:', error.message);
    }
    
    console.log('🎯 Next steps:');
    console.log('1. Look for any validator rules in the collection info');
    console.log('2. If found, we need to remove or update them');
    console.log('3. The validator is likely enforcing string type for language field');
    
  } catch (error) {
    console.error('❌ Error checking validators:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkMongoDBValidators()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
