#!/usr/bin/env node

/**
 * Clear Instant Recommendations Service Cache
 * This script clears the in-memory cache of the instant recommendations service
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService';
const DB_NAME = 'algorhythm-service-dev';

async function clearInstantCache() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🧹 Clearing instant recommendations cache...');
    
    // Clear the instant service cache by updating the cache collection
    const cacheCollection = db.collection('recommendation_cache');
    
    // Delete all cached template recommendations
    const result = await cacheCollection.deleteMany({
      cache_key: { $regex: /^template_recommendation:/ }
    });
    
    console.log(`✅ Cleared ${result.deletedCount} cached template recommendations`);
    
    // Also clear any instant service specific cache
    const instantCacheResult = await cacheCollection.deleteMany({
      cache_key: { $regex: /^instant_/ }
    });
    
    console.log(`✅ Cleared ${instantCacheResult.deletedCount} instant service cache entries`);
    
    console.log('🎯 Instant service cache cleared! New requests will use fresh data with GCP URLs.');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  } finally {
    await client.close();
  }
}

clearInstantCache();
