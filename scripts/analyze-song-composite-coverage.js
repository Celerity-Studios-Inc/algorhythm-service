#!/usr/bin/env node

/**
 * Analyze Song-Composite Coverage
 * Identifies which songs have composite assets available
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function analyzeSongCompositeCoverage() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🎵 Song-Composite Coverage Analysis');
    console.log('=' .repeat(60));
    
    // 1. Get all songs (G layer)
    const songs = await assets.find({ layer: 'G' }).toArray();
    console.log(`📊 Total Songs: ${songs.length}`);
    
    // 2. Get all composite assets
    const composites = await assets.find({ layer: 'C' }).toArray();
    console.log(`🎬 Total Composite Assets: ${composites.length}`);
    
    // 3. Analyze C.FUL vs C.PAR
    const cFulComposites = composites.filter(c => c.name.startsWith('C.FUL.'));
    const cParComposites = composites.filter(c => c.name.startsWith('C.PAR.'));
    
    console.log(`   C.FUL (Full) Composites: ${cFulComposites.length}`);
    console.log(`   C.PAR (Partial) Composites: ${cParComposites.length}`);
    
    // 4. Extract song IDs from composite names
    console.log('\n🔍 Analyzing Song Coverage from Composite Names...');
    
    const songCoverage = new Map();
    
    // Extract song IDs from C.FUL composite names
    cFulComposites.forEach(composite => {
      // C.FUL.ALL.XXX:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003
      const nameParts = composite.name.split(':');
      if (nameParts.length > 1) {
        const componentIds = nameParts[1].split('+');
        const songId = componentIds[0]; // First component is usually the song
        
        if (!songCoverage.has(songId)) {
          songCoverage.set(songId, {
            songId,
            cFulComposites: [],
            cParComposites: [],
            totalComposites: 0
          });
        }
        
        songCoverage.get(songId).cFulComposites.push(composite);
        songCoverage.get(songId).totalComposites++;
      }
    });
    
    // Extract song IDs from C.PAR composite names
    cParComposites.forEach(composite => {
      const nameParts = composite.name.split(':');
      if (nameParts.length > 1) {
        const componentIds = nameParts[1].split('+');
        const songId = componentIds[0];
        
        if (!songCoverage.has(songId)) {
          songCoverage.set(songId, {
            songId,
            cFulComposites: [],
            cParComposites: [],
            totalComposites: 0
          });
        }
        
        songCoverage.get(songId).cParComposites.push(composite);
        songCoverage.get(songId).totalComposites++;
      }
    });
    
    // 5. Display coverage analysis
    console.log('\n📈 Song Coverage Analysis:');
    console.log(`Songs with Composite Assets: ${songCoverage.size}/${songs.length} (${((songCoverage.size/songs.length)*100).toFixed(1)}%)`);
    
    // Sort by total composites
    const sortedCoverage = Array.from(songCoverage.values())
      .sort((a, b) => b.totalComposites - a.totalComposites);
    
    console.log('\n🎯 Songs with Most Composite Assets:');
    sortedCoverage.slice(0, 10).forEach((coverage, index) => {
      console.log(`   ${index + 1}. ${coverage.songId}: ${coverage.totalComposites} composites (${coverage.cFulComposites.length} C.FUL, ${coverage.cParComposites.length} C.PAR)`);
    });
    
    // 6. Find songs without composite assets
    const songsWithComposites = new Set(songCoverage.keys());
    const songsWithoutComposites = songs.filter(song => !songsWithComposites.has(song.nna_address));
    
    console.log('\n❌ Songs WITHOUT Composite Assets:');
    if (songsWithoutComposites.length > 0) {
      songsWithoutComposites.forEach(song => {
        console.log(`   - ${song.name} (${song.nna_address})`);
      });
    } else {
      console.log('   ✅ All songs have composite assets!');
    }
    
    // 7. Coverage statistics
    console.log('\n📊 Coverage Statistics:');
    const songsWithCFul = Array.from(songCoverage.values()).filter(c => c.cFulComposites.length > 0);
    const songsWithCPar = Array.from(songCoverage.values()).filter(c => c.cParComposites.length > 0);
    
    console.log(`   Songs with C.FUL composites: ${songsWithCFul.length}/${songs.length} (${((songsWithCFul.length/songs.length)*100).toFixed(1)}%)`);
    console.log(`   Songs with C.PAR composites: ${songsWithCPar.length}/${songs.length} (${((songsWithCPar.length/songs.length)*100).toFixed(1)}%)`);
    
    // 8. ReViz API readiness
    console.log('\n🎯 ReViz API Readiness:');
    const revizReadySongs = songsWithCFul.length;
    console.log(`   Songs ready for ReViz developers: ${revizReadySongs}/${songs.length} (${((revizReadySongs/songs.length)*100).toFixed(1)}%)`);
    
    if (revizReadySongs > 0) {
      console.log('\n✅ Songs with C.FUL composites (ReViz Ready):');
      songsWithCFul.forEach(coverage => {
        console.log(`   - ${coverage.songId}: ${coverage.cFulComposites.length} C.FUL composites`);
      });
    }
    
    // 9. Recent activity analysis
    console.log('\n⏰ Recent Composite Activity:');
    const recentComposites = composites
      .filter(c => c.createdAt && new Date(c.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`   New composites in last 24h: ${recentComposites.length}`);
    if (recentComposites.length > 0) {
      console.log('   Recent composites:');
      recentComposites.slice(0, 5).forEach(composite => {
        const songId = composite.name.split(':')[1]?.split('+')[0] || 'Unknown';
        console.log(`     - ${composite.name} (Song: ${songId})`);
      });
    }
    
    console.log('\n🎉 Song-Composite Coverage Analysis Complete!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await client.close();
  }
}

analyzeSongCompositeCoverage();
