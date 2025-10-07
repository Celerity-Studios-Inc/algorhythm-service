const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

// Simplified scoring algorithm
function computeCompatibilityScore(song, template) {
  let totalScore = 0;
  let factors = 0;
  
  // 1. Genre compatibility (25% weight)
  if (song.songMetadata?.genre && template.tags) {
    const songGenres = song.songMetadata.genre.map(g => g.toLowerCase());
    const templateGenres = template.tags.filter(tag => 
      tag.includes('genre-') || tag.includes('music-')
    ).map(tag => tag.replace('genre-', '').replace('music-', '').toLowerCase());
    
    if (templateGenres.length > 0) {
      const genreMatch = songGenres.some(sg => 
        templateGenres.some(tg => tg.includes(sg) || sg.includes(tg))
      );
      totalScore += genreMatch ? 0.25 : 0.1; // 25% if match, 10% if no match
      factors++;
    }
  }
  
  // 2. Energy compatibility (20% weight)
  if (song.aiMetadata?.energy && template.tags) {
    const songEnergy = song.aiMetadata.energy.toLowerCase();
    const templateEnergy = template.tags.find(tag => 
      tag.includes('energy-')
    )?.replace('energy-', '').toLowerCase();
    
    if (templateEnergy) {
      const energyMatch = songEnergy === templateEnergy;
      totalScore += energyMatch ? 0.20 : 0.1; // 20% if match, 10% if no match
      factors++;
    }
  }
  
  // 3. BPM compatibility (30% weight)
  if (song.songMetadata?.bpm && template.tags) {
    const songBPM = song.songMetadata.bpm;
    const templateBPM = template.tags.find(tag => 
      tag.includes('bpm-')
    )?.replace('bpm-', '');
    
    if (templateBPM) {
      const templateBPMNum = parseInt(templateBPM);
      const bpmDiff = Math.abs(songBPM - templateBPMNum);
      const bpmScore = Math.max(0, 0.30 - (bpmDiff / 20) * 0.30); // 30% max, decreases with BPM difference
      totalScore += bpmScore;
      factors++;
    }
  }
  
  // 4. Style compatibility (15% weight)
  if (template.tags) {
    const hasStyleTags = template.tags.some(tag => 
      tag.includes('style-') || tag.includes('aesthetic-')
    );
    totalScore += hasStyleTags ? 0.15 : 0.05; // 15% if has style tags, 5% if not
    factors++;
  }
  
  // 5. Mood compatibility (10% weight)
  if (song.aiMetadata?.mood && template.tags) {
    const songMood = song.aiMetadata.mood.toLowerCase();
    const templateMood = template.tags.find(tag => 
      tag.includes('mood-')
    )?.replace('mood-', '').toLowerCase();
    
    if (templateMood) {
      const moodMatch = songMood === templateMood;
      totalScore += moodMatch ? 0.10 : 0.05; // 10% if match, 5% if no match
      factors++;
    }
  }
  
  // If no factors were evaluated, give a base score
  if (factors === 0) {
    totalScore = 0.3; // 30% base score
  }
  
  return Math.min(totalScore, 1.0); // Cap at 100%
}

async function computeScores() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔧 Computing Compatibility Scores');
    console.log('=================================');
    
    const db = client.db('nna-registry-service-dev');
    const assets = db.collection('assets');
    const compatibilityScores = db.collection('compatibility-scores');
    
    // Get the song G.HIP.WCO.001
    const song = await assets.findOne({ 
      nna_address: '1.013.017.001',
      layer: 'G'
    });
    
    if (!song) {
      console.log('❌ Song G.HIP.WCO.001 not found');
      return;
    }
    
    console.log(`🎵 Computing scores for: ${song.name} (${song.nna_address})`);
    
    // Get all templates
    const templates = await assets.find({ layer: 'C' }).toArray();
    console.log(`📋 Found ${templates.length} templates to score`);
    
    const scores = [];
    
    for (const template of templates) {
      const score = computeCompatibilityScore(song, template);
      scores.push({
        song_id: song.nna_address,
        template_id: template.nna_address,
        base_score: score,
        final_score: score,
        score_breakdown: {
          genre_score: 0.25,
          energy_score: 0.20,
          bpm_score: 0.30,
          style_score: 0.15,
          mood_score: 0.10
        },
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    // Clear existing scores for this song
    await compatibilityScores.deleteMany({ song_id: song.nna_address });
    console.log(`🗑️  Cleared existing scores for ${song.nna_address}`);
    
    // Insert new scores
    await compatibilityScores.insertMany(scores);
    console.log(`✅ Inserted ${scores.length} compatibility scores`);
    
    // Show summary
    const aboveThreshold = scores.filter(s => s.final_score >= 0.6);
    console.log(`\n📊 Score Summary:`);
    console.log(`   Total Scores: ${scores.length}`);
    console.log(`   Above Threshold (0.6): ${aboveThreshold.length}`);
    console.log(`   Below Threshold: ${scores.length - aboveThreshold.length}`);
    
    if (aboveThreshold.length > 0) {
      console.log(`\n🎯 Templates Above Threshold:`);
      aboveThreshold.slice(0, 5).forEach((score, index) => {
        console.log(`   ${index + 1}. ${score.template_id} - Score: ${score.final_score.toFixed(3)}`);
      });
    } else {
      console.log(`\n⚠️  No templates above 0.6 threshold`);
      console.log(`💡 Consider lowering the threshold or improving scoring algorithm`);
      
      // Show top 5 scores anyway
      const topScores = scores.sort((a, b) => b.final_score - a.final_score).slice(0, 5);
      console.log(`\n🏆 Top 5 Scores:`);
      topScores.forEach((score, index) => {
        console.log(`   ${index + 1}. ${score.template_id} - Score: ${score.final_score.toFixed(3)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

computeScores();
