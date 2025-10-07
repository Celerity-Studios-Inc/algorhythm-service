const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

async function debugScoring() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔍 Debugging Scoring Issues');
    console.log('============================');
    
    const db = client.db('nna-registry-service-dev');
    const assets = db.collection('assets');
    
    // Get the song G.HIP.WCO.001
    const song = await assets.findOne({ 
      nna_address: '1.013.017.001',
      layer: 'G'
    });
    
    if (!song) {
      console.log('❌ Song G.HIP.WCO.001 not found');
      return;
    }
    
    console.log(`🎵 Song: ${song.name} (${song.nna_address})`);
    console.log(`📊 Song Metadata:`, {
      bpm: song.songMetadata?.bpm,
      genre: song.songMetadata?.genre,
      energy: song.aiMetadata?.energy,
      mood: song.aiMetadata?.mood
    });
    
    // Get all templates (composites)
    const templates = await assets.find({ layer: 'C' }).toArray();
    console.log(`\n📋 Found ${templates.length} templates`);
    
    // Get compatibility scores for this song
    const compatibilityScores = await db.collection('compatibility-scores').find({
      song_id: song.nna_address
    }).toArray();
    
    console.log(`\n🎯 Compatibility Scores for ${song.nna_address}:`);
    console.log('================================================');
    
    if (compatibilityScores.length === 0) {
      console.log('❌ No compatibility scores found for this song');
      console.log('💡 This explains why alternatives are empty!');
      console.log('🔧 Need to run score computation for this song');
    } else {
      compatibilityScores.forEach((score, index) => {
        console.log(`${index + 1}. Template: ${score.template_id}`);
        console.log(`   Base Score: ${score.base_score?.toFixed(3) || 'N/A'}`);
        console.log(`   Final Score: ${score.final_score?.toFixed(3) || 'N/A'}`);
        console.log(`   Above Threshold (0.6): ${(score.final_score || 0) >= 0.6 ? '✅' : '❌'}`);
        console.log(`   Score Breakdown:`, score.score_breakdown || 'N/A');
        console.log('');
      });
      
      const aboveThreshold = compatibilityScores.filter(s => (s.final_score || 0) >= 0.6);
      console.log(`📊 Summary:`);
      console.log(`   Total Scores: ${compatibilityScores.length}`);
      console.log(`   Above Threshold (0.6): ${aboveThreshold.length}`);
      console.log(`   Below Threshold: ${compatibilityScores.length - aboveThreshold.length}`);
    }
    
    // Check if there are any templates at all
    console.log(`\n🔍 Template Analysis:`);
    console.log('====================');
    
    templates.slice(0, 5).forEach((template, index) => {
      console.log(`${index + 1}. ${template.name} (${template.nna_address})`);
      console.log(`   Created: ${template.createdAt || 'N/A'}`);
      console.log(`   Tags: ${(template.tags || []).slice(0, 3).join(', ')}${template.tags?.length > 3 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugScoring();
