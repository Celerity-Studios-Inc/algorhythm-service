#!/usr/bin/env node

/**
 * Check Assets in MongoDB Database
 * - Lists available assets with their IDs and names
 * - Shows sample assets for testing
 */

const { MongoClient } = require('mongodb');

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  throw new Error("MONGODB_URI not set");
}

async function run() {
  console.log('🔍 Checking Assets in MongoDB Database');
  console.log('=====================================');

  const uri = await getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('nna-registry-service-dev');
  console.log('✅ Connected to MongoDB: nna-registry-service-dev');

  try {
    const assets = db.collection('assets');
    
    // Get total count
    const totalCount = await assets.countDocuments();
    console.log(`\n📊 Total Assets: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('❌ No assets found in database');
      return;
    }

    // Get sample assets
    console.log('\n📋 Sample Assets:');
    const sampleAssets = await assets.find({}, { 
      projection: { 
        _id: 1, 
        name: 1, 
        friendlyName: 1, 
        layer: 1, 
        category: 1, 
        subcategory: 1,
        nna_address: 1
      } 
    }).limit(10).toArray();
    
    sampleAssets.forEach((asset, i) => {
      console.log(`  ${i + 1}. ${asset.name || asset.friendlyName || asset._id}`);
      console.log(`     Layer: ${asset.layer}, Category: ${asset.category}, Subcategory: ${asset.subcategory}`);
      console.log(`     NNA Address: ${asset.nna_address || 'N/A'}`);
      console.log('');
    });

    // Get assets by layer
    console.log('\n📊 Assets by Layer:');
    const layerStats = await assets.aggregate([
      { $group: { _id: '$layer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    layerStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} assets`);
    });

    // Get songs specifically
    console.log('\n🎵 Songs (Layer G):');
    const songs = await assets.find({ layer: 'G' }, { 
      projection: { name: 1, friendlyName: 1, nna_address: 1 } 
    }).limit(5).toArray();
    
    if (songs.length > 0) {
      songs.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.name || song.friendlyName}`);
        console.log(`     NNA Address: ${song.nna_address}`);
      });
    } else {
      console.log('  No songs found');
    }

    // Get composites (templates)
    console.log('\n🎬 Composites/Templates (Layer C):');
    const composites = await assets.find({ layer: 'C' }, { 
      projection: { name: 1, friendlyName: 1, nna_address: 1 } 
    }).limit(5).toArray();
    
    if (composites.length > 0) {
      composites.forEach((composite, i) => {
        console.log(`  ${i + 1}. ${composite.name || composite.friendlyName}`);
        console.log(`     NNA Address: ${composite.nna_address}`);
      });
    } else {
      console.log('  No composites found');
    }

    console.log('\n✅ Asset check completed!');
    console.log('\n💡 Use these asset IDs for testing:');
    if (songs.length > 0) {
      console.log(`   Song ID: ${songs[0].nna_address || songs[0].name}`);
    }
    if (composites.length > 0) {
      console.log(`   Template ID: ${composites[0].nna_address || composites[0].name}`);
    }

  } catch (error) {
    console.error('❌ Error checking assets:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
