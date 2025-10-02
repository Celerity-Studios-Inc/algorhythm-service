const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load MongoDB URI from secrets
const mongodbUriPath = path.join(__dirname, '../../secrets/mongodb-uri-dev.value');
const mongodbUri = fs.readFileSync(mongodbUriPath, 'utf8').trim();

const DATABASE_NAME = 'nna-registry-service-dev';
const COLLECTION_NAME = 'assets';

async function clearDatabase() {
  const client = new MongoClient(mongodbUri);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Check current state
    console.log('📊 Checking current database state...');
    const currentCount = await collection.countDocuments({});
    console.log(`📈 Current assets in database: ${currentCount}`);
    
    if (currentCount > 0) {
      console.log('🧹 Clearing all assets from database...');
      const deleteResult = await collection.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} assets`);
    } else {
      console.log('✅ Database is already empty');
    }
    
    // Verify database is empty
    const finalCount = await collection.countDocuments({});
    console.log(`📊 Final asset count: ${finalCount}`);
    
    if (finalCount === 0) {
      console.log('✅ Database successfully cleared!');
      console.log('🎯 Ready for frontend to create real assets!');
    } else {
      console.log('⚠️  Warning: Database still contains assets');
    }
    
  } catch (error) {
    console.error('❌ Database clearing failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the clearing
if (require.main === module) {
  clearDatabase()
    .then(() => {
      console.log('🎉 Database clearing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database clearing failed:', error);
      process.exit(1);
    });
}

module.exports = { clearDatabase }; 