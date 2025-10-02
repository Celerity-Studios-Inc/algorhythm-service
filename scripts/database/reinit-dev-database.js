#!/usr/bin/env node

/**
 * Development Database Reinitialization Script
 * 
 * This script completely reinitializes the development database with:
 * - Phase 2B schema
 * - All taxonomy layers including Songs
 * - Proper indexes
 * - Clean slate
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function reinitDevDatabase() {
  try {
    const mongoUri = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Development MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('🗑️  Dropping existing collections...');
    
    // Drop all collections
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      console.log(`  Dropping collection: ${collection.name}`);
      await db.dropCollection(collection.name);
    }
    
    console.log('✅ All collections dropped');
    
    // Create new collections with proper schemas
    console.log('📋 Creating new collections...');
    
    // Create assets collection
    await db.createCollection('assets');
    console.log('  ✅ Created assets collection');
    
    // Create users collection
    await db.createCollection('users');
    console.log('  ✅ Created users collection');
    
    // Create taxonomy collection
    await db.createCollection('taxonomy');
    console.log('  ✅ Created taxonomy collection');
    
    // Create migrations collection
    await db.createCollection('migrations');
    console.log('  ✅ Created migrations collection');
    
    console.log('📊 Creating database indexes...');
    
    // Create indexes for assets collection
    const assetsCollection = db.collection('assets');
    
    // Text index for search
    await assetsCollection.createIndex({
      name: 'text',
      description: 'text',
      tags: 'text',
      creatorDescription: 'text',
      'aiMetadata.generatedDescription': 'text',
      'aiMetadata.mood': 'text',
      'aiMetadata.genre': 'text',
      'songMetadata.songName': 'text',
      'songMetadata.artistName': 'text',
      'songMetadata.albumName': 'text',
    });
    console.log('  ✅ Created text index for assets');
    
    // Unique index on name
    await assetsCollection.createIndex({ name: 1 }, { unique: true });
    console.log('  ✅ Created unique index on name');
    
    // Index on layer
    await assetsCollection.createIndex({ layer: 1 });
    console.log('  ✅ Created index on layer');
    
    // Index on createdAt
    await assetsCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Created index on createdAt');
    
    // Index on songMetadata fields
    await assetsCollection.createIndex({ 'songMetadata.songName': 1 });
    await assetsCollection.createIndex({ 'songMetadata.artistName': 1 });
    await assetsCollection.createIndex({ 'songMetadata.bpm': 1 });
    await assetsCollection.createIndex({ 'songMetadata.genre': 1 });
    console.log('  ✅ Created indexes on songMetadata fields');
    
    // Create indexes for users collection
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    console.log('  ✅ Created indexes for users');
    
    // Create indexes for taxonomy collection
    const taxonomyCollection = db.collection('taxonomy');
    await taxonomyCollection.createIndex({ layer: 1 });
    await taxonomyCollection.createIndex({ category: 1 });
    await taxonomyCollection.createIndex({ subcategory: 1 });
    console.log('  ✅ Created indexes for taxonomy');
    
    console.log('✅ Database initialization completed successfully!');
    
    // Verify the setup
    console.log('\n🔍 Verifying database setup...');
    const assetCount = await assetsCollection.countDocuments();
    const userCount = await usersCollection.countDocuments();
    const taxonomyCount = await taxonomyCollection.countDocuments();
    
    console.log(`  Assets: ${assetCount} documents`);
    console.log(`  Users: ${userCount} documents`);
    console.log(`  Taxonomy: ${taxonomyCount} documents`);
    
    console.log('\n🎉 Development database is ready for testing!');
    console.log('   - All collections created with new schema');
    console.log('   - Indexes created for optimal performance');
    console.log('   - Ready for frontend team to test new asset creation');
    
  } catch (error) {
    console.error('❌ Error during database reinitialization:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

reinitDevDatabase(); 