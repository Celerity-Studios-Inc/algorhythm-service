const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migratePhase2B() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const assetsCollection = db.collection('assets');

    // Get all assets that don't have the new fields
    const assetsToUpdate = await assetsCollection.find({
      $or: [
        { creatorDescription: { $exists: false } },
        { albumArt: { $exists: false } },
        { aiMetadata: { $exists: false } }
      ]
    }).toArray();

    console.log(`Found ${assetsToUpdate.length} assets to migrate`);

    if (assetsToUpdate.length === 0) {
      console.log('No assets need migration. All assets already have Phase 2B fields.');
      return;
    }

    // Update each asset with default values for new fields
    const updatePromises = assetsToUpdate.map(asset => {
      return assetsCollection.updateOne(
        { _id: asset._id },
        {
          $set: {
            creatorDescription: asset.creatorDescription || null,
            albumArt: asset.albumArt || null,
            aiMetadata: asset.aiMetadata || null
          }
        }
      );
    });

    await Promise.all(updatePromises);
    console.log(`Successfully migrated ${assetsToUpdate.length} assets`);

    // Verify migration
    const remainingAssets = await assetsCollection.find({
      $or: [
        { creatorDescription: { $exists: false } },
        { albumArt: { $exists: false } },
        { aiMetadata: { $exists: false } }
      ]
    }).toArray();

    if (remainingAssets.length === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️  Warning: ${remainingAssets.length} assets still missing Phase 2B fields`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migratePhase2B()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePhase2B }; 