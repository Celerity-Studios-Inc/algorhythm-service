const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load MongoDB URI from secrets
const mongodbUriPath = path.join(__dirname, '../../secrets/mongodb-uri-dev.value');
const mongodbUri = fs.readFileSync(mongodbUriPath, 'utf8').trim();

const DATABASE_NAME = 'nna-registry-service-dev';
const COLLECTION_NAME = 'assets';

async function initializeDatabase() {
  const client = new MongoClient(mongodbUri);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Clear existing data
    console.log('🧹 Clearing existing assets...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing assets`);
    
    // Test Songs assets with ultra-simplified gender information
    // Using VALID subcategories from the taxonomy
    const testSongs = [
      {
        layer: 'G',
        category: 'POP',
        subcategory: 'TSW', // Valid: POP.TSW exists in taxonomy
        name: 'G.POP.TSW.001',
        nna_address: 'G.POP.TSW.001',
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/G/POP/TSW/G.POP.TSW.001.mp3',
        source: 'ReViz',
        tags: ['pop', 'taylor swift', 'female vocal'],
        description: 'A catchy pop song by Taylor Swift',
        creatorDescription: 'Taylor Swift is a renowned pop artist known for her storytelling lyrics and catchy melodies',
        albumArt: 'https://example.com/album-art-1.jpg',
        aiMetadata: {
          generatedDescription: 'An upbeat pop song with catchy melodies and relatable lyrics',
          mood: 'upbeat',
          genre: 'pop',
          tempo: 'moderate',
          key: 'C major',
          duration: 219,
          bpm: 160,
          tags: ['upbeat', 'catchy', 'pop', 'female vocal']
        },
        songMetadata: {
          songName: 'Shake it Off',
          artistName: 'Taylor Swift',
          albumName: "1989 (Taylor's Version)",
          albumArtUrl: 'https://example.com/album-art-1.jpg',
          bpm: 160,
          genre: 'pop',
          releaseYear: 2014,
          duration: 219,
          // Ultra-Simplified Gender Information
          originalArtistGender: 'female',
          genderSuitability: 'unisex',
          vocalRange: 'medium',
          ageAppropriateness: ['all ages', 'teen+']
        },
        trainingData: {
          prompts: ['pop song', 'female vocal', 'catchy melody'],
          images: [],
          videos: []
        },
        rights: {
          source: 'ReViz',
          rights_split: '50/50'
        },
        components: [],
        registeredBy: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        layer: 'G',
        category: 'RCK',
        subcategory: 'CLS', // Valid: RCK.CLS exists in taxonomy (Classic Rock)
        name: 'G.RCK.CLS.001',
        nna_address: 'G.RCK.CLS.001',
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/G/RCK/CLS/G.RCK.CLS.001.mp3',
        source: 'ReViz',
        tags: ['rock', 'led zeppelin', 'male vocal', 'classic rock'],
        description: 'A classic rock song by Led Zeppelin',
        creatorDescription: 'Led Zeppelin is a legendary rock band known for their innovative sound and powerful performances',
        albumArt: 'https://example.com/album-art-2.jpg',
        aiMetadata: {
          generatedDescription: 'A powerful rock anthem with driving guitar riffs and strong vocals',
          mood: 'energetic',
          genre: 'rock',
          tempo: 'fast',
          key: 'A minor',
          duration: 180,
          bpm: 140,
          tags: ['energetic', 'rock', 'male vocal', 'guitar', 'classic rock']
        },
        songMetadata: {
          songName: 'Stairway to Heaven',
          artistName: 'Led Zeppelin',
          albumName: 'Led Zeppelin IV',
          albumArtUrl: 'https://example.com/album-art-2.jpg',
          bpm: 140,
          genre: 'rock',
          releaseYear: 1971,
          duration: 180,
          // Ultra-Simplified Gender Information
          originalArtistGender: 'male',
          genderSuitability: 'male',
          vocalRange: 'high',
          ageAppropriateness: ['teen+', 'young adult', 'adult']
        },
        trainingData: {
          prompts: ['rock song', 'male vocal', 'guitar solo', 'classic rock'],
          images: [],
          videos: []
        },
        rights: {
          source: 'ReViz',
          rights_split: '50/50'
        },
        components: [],
        registeredBy: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        layer: 'G',
        category: 'KPO',
        subcategory: 'IBG', // Valid: KPO.IBG exists in taxonomy (Idol Boy Group)
        name: 'G.KPO.IBG.001',
        nna_address: 'G.KPO.IBG.001',
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/G/KPO/IBG/G.KPO.IBG.001.mp3',
        source: 'ReViz',
        tags: ['k-pop', 'bts', 'boy group', 'idol'],
        description: 'A K-pop song by BTS',
        creatorDescription: 'BTS is a global K-pop sensation known for their energetic performances and meaningful lyrics',
        albumArt: 'https://example.com/album-art-3.jpg',
        aiMetadata: {
          generatedDescription: 'An energetic K-pop song with synchronized vocals and dynamic choreography',
          mood: 'energetic',
          genre: 'k-pop',
          tempo: 'fast',
          key: 'D major',
          duration: 200,
          bpm: 128,
          tags: ['energetic', 'k-pop', 'boy group', 'idol', 'dance']
        },
        songMetadata: {
          songName: 'Dynamite',
          artistName: 'BTS',
          albumName: 'Dynamite (DayTime Version)',
          albumArtUrl: 'https://example.com/album-art-3.jpg',
          bpm: 128,
          genre: 'k-pop',
          releaseYear: 2020,
          duration: 200,
          // Ultra-Simplified Gender Information
          originalArtistGender: 'group',
          genderSuitability: 'unisex',
          vocalRange: 'medium',
          ageAppropriateness: ['all ages', 'teen+']
        },
        trainingData: {
          prompts: ['k-pop song', 'boy group', 'idol music', 'dance'],
          images: [],
          videos: []
        },
        rights: {
          source: 'ReViz',
          rights_split: '50/50'
        },
        components: [],
        registeredBy: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('📝 Inserting test Songs assets with gender information...');
    console.log('✅ Using VALID subcategories from taxonomy:');
    console.log('   - G.POP.TSW (Swift Inspired)');
    console.log('   - G.RCK.CLS (Classic Rock)');
    console.log('   - G.KPO.IBG (Idol Boy Group)');
    
    const insertResult = await collection.insertMany(testSongs);
    console.log(`✅ Inserted ${insertResult.insertedCount} Songs assets`);
    
    // Verify the data
    console.log('🔍 Verifying inserted data...');
    const allAssets = await collection.find({}).toArray();
    console.log(`📊 Total assets in database: ${allAssets.length}`);
    
    // Show Songs assets with gender information
    const songsAssets = await collection.find({ layer: 'G' }).toArray();
    console.log(`🎵 Songs assets: ${songsAssets.length}`);
    
    songsAssets.forEach((asset, index) => {
      console.log(`\n🎵 Song ${index + 1}:`);
      console.log(`   Name: ${asset.songMetadata?.songName}`);
      console.log(`   Artist: ${asset.songMetadata?.artistName}`);
      console.log(`   Category: ${asset.layer}.${asset.category}.${asset.subcategory}`);
      console.log(`   Original Artist Gender: ${asset.songMetadata?.originalArtistGender}`);
      console.log(`   Gender Suitability: ${asset.songMetadata?.genderSuitability}`);
      console.log(`   Vocal Range: ${asset.songMetadata?.vocalRange}`);
      console.log(`   Age Appropriateness: ${asset.songMetadata?.ageAppropriateness?.join(', ')}`);
    });
    
    // Test search functionality
    console.log('\n🔍 Testing search functionality...');
    
    // Test search by original artist gender
    const femaleSongs = await collection.find({ 'songMetadata.originalArtistGender': 'female' }).toArray();
    console.log(`👩 Female artist songs: ${femaleSongs.length}`);
    
    // Test search by gender suitability
    const unisexSongs = await collection.find({ 'songMetadata.genderSuitability': 'unisex' }).toArray();
    console.log(`👥 Unisex songs: ${unisexSongs.length}`);
    
    // Test search by vocal range
    const highVocalSongs = await collection.find({ 'songMetadata.vocalRange': 'high' }).toArray();
    console.log(`🎤 High vocal range songs: ${highVocalSongs.length}`);
    
    // Test search by age appropriateness
    const allAgesSongs = await collection.find({ 'songMetadata.ageAppropriateness': { $in: ['all ages'] } }).toArray();
    console.log(`👶 All ages songs: ${allAgesSongs.length}`);
    
    console.log('\n✅ Database initialization completed successfully!');
    console.log('🎯 Ready for frontend integration testing!');
    console.log('✅ No taxonomy errors expected - using valid subcategories!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase }; 