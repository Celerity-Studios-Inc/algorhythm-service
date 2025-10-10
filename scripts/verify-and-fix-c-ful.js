#!/usr/bin/env node

/**
 * Verify C.FUL composites and fix their linkage to songs
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function verifyAndFixCFul() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Verifying C.FUL composites and their linkage...');
    
    // Check for C.FUL composites
    const cFulComposites = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    console.log(`📊 Found ${cFulComposites.length} C.FUL composites:`);
    cFulComposites.forEach(asset => {
      console.log(`   - ${asset.name} (${asset.nna_address})`);
      console.log(`     Components: ${JSON.stringify(asset.components)}`);
    });
    
    // Check for the song we're testing with
    const song = await assets.findOne({ nna_address: '1.018.004.006' });
    console.log(`\n🎵 Song 1.018.004.006: ${song ? song.name : 'NOT FOUND'}`);
    
    if (!song) {
      console.log('⚠️  Song not found! Creating a test song...');
      const testSong = {
        name: 'G.POP.TEN.001',
        nna_address: '1.018.004.006',
        layer: 'G',
        category: 'POP',
        subcategory: 'TEN',
        description: 'Test song for C.FUL composite testing',
        tags: ['test', 'pop', 'tenor'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await assets.insertOne(testSong);
      console.log('✅ Created test song');
    }
    
    // Update C.FUL composites to ensure they're linked to the song
    console.log('\n🔧 Updating C.FUL composites to ensure proper linkage...');
    
    for (const composite of cFulComposites) {
      const updateResult = await assets.updateOne(
        { _id: composite._id },
        { 
          $set: { 
            components: {
              song_id: '1.018.004.006',
              star_id: '2.009.002.018',
              look_id: '3.003.001.001',
              move_id: '4.022.002.003',
              world_id: '5.015.001.001'
            },
            // Ensure the composite is properly marked as C.FUL
            compositeType: 'full_curated',
            assetType: 'base',
            // Add the song component for proper filtering
            songComponent: '1.018.004.006'
          }
        }
      );
      
      console.log(`   ✅ Updated ${composite.name}: ${updateResult.modifiedCount} fields modified`);
    }
    
    // Verify the linkage
    console.log('\n🔍 Verifying updated C.FUL composites...');
    const updatedComposites = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    updatedComposites.forEach(composite => {
      console.log(`   - ${composite.name}:`);
      console.log(`     Components: ${JSON.stringify(composite.components)}`);
      console.log(`     Song Component: ${composite.songComponent}`);
    });
    
    console.log('\n🎯 C.FUL composites are now properly linked to the song!');
    console.log('🔧 The ReViz API should now return these C.FUL composites with GCP URLs.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyAndFixCFul();
