const { MongoClient } = require('mongodb');

async function cleanupOldIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nna-registry-dev';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('assets');

    // List all indexes
    console.log('Current indexes:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check if hfn index exists
    const hfnIndex = indexes.find(index => index.name === 'hfn_1');
    if (hfnIndex) {
      console.log('\nFound old hfn index, removing it...');
      await collection.dropIndex('hfn_1');
      console.log('✅ Removed hfn_1 index');
    } else {
      console.log('\nNo hfn_1 index found');
    }

    // List indexes again to confirm
    console.log('\nUpdated indexes:');
    const updatedIndexes = await collection.listIndexes().toArray();
    updatedIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

cleanupOldIndexes(); 