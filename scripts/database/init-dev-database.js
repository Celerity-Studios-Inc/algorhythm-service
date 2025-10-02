#!/usr/bin/env node

/**
 * Development Database Initialization Script
 * 
 * TARGET DATABASE: nna-registry-service-dev
 * 
 * This script initializes a fresh development database with:
 * - Asset collection clearing (DEFAULT BEHAVIOR)
 * - Taxonomy seeding
 * - Collection setup
 * - Indexes creation
 * - Basic configuration
 * 
 * Usage:
 * node scripts/database/init-dev-database.js [options]
 * 
 * Options:
 * --force               Force initialization even if data exists
 * --clear-assets        Clear existing assets (keep taxonomy) [DEFAULT]
 * --keep-assets         Keep existing assets (don't clear)
 * --clear-all           Clear all data (assets + taxonomy)
 * --dry-run             Show what would be done without executing
 * 
 * DEFAULT BEHAVIOR: Clears assets, preserves users, rebuilds taxonomy and indexes
 * 
 * IMPORTANT: This script targets 'nna-registry-service-dev' database specifically
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Taxonomy will be loaded from local v1.5.3 JSON files in src/taxonomy-data/
// This ensures we use the correct, validated taxonomy structure

class DevDatabaseInitializer {
  constructor(options) {
    this.options = options;
    this.client = null;
    this.db = null;
  }

  async connect() {
    // Use development MongoDB URI from env first, else optional file fallback
    let MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      const uriFile = 'mongodb-uri-dev.value';
      if (fs.existsSync(uriFile)) {
        MONGODB_URI = fs.readFileSync(uriFile, 'utf8').trim();
      } else {
        throw new Error(
          "MONGODB_URI not set and fallback file 'mongodb-uri-dev.value' not found. Set env MONGODB_URI or create the file."
        );
      }
    }
    
    // Ensure we're connecting to the correct development database
    const DB_NAME = 'nna-registry-service-dev';
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db(DB_NAME);
    console.log(`✅ Connected to Development MongoDB: ${DB_NAME}`);
    console.log(`🔗 Connection URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  async clearData() {
    if (this.options.clearAll) {
      console.log('🗑️  Clearing all collections...');
      await this.db.collection('assets').deleteMany({});
      await this.db.collection('taxonomy').deleteMany({});
      await this.db.collection('users').deleteMany({});
      console.log('✅ Cleared all data');
    } else if (this.options.clearAssets) {
      console.log('🗑️  Clearing assets collection (default behavior)...');
      await this.db.collection('assets').deleteMany({});
      console.log('✅ Cleared assets data (users preserved)');
    } else {
      console.log('ℹ️  Keeping existing assets (--keep-assets flag used)');
    }
  }

  async createCollections() {
    console.log('📋 Creating collections...');
    
    // Ensure collections exist
    const collections = ['assets', 'taxonomy', 'users', 'migrations'];
    for (const collectionName of collections) {
      const exists = await this.db.listCollections({ name: collectionName }).hasNext();
      if (!exists) {
        await this.db.createCollection(collectionName);
        console.log(`  ✅ Created collection: ${collectionName}`);
      } else {
        console.log(`  ℹ️  Collection exists: ${collectionName}`);
      }
    }
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    // Assets indexes
    await this.db.collection('assets').createIndex({ hfn: 1 }, { unique: true, sparse: true });
    await this.db.collection('assets').createIndex({ nna_address: 1 }, { unique: true });
    await this.db.collection('assets').createIndex({ layer: 1, category: 1, subcategory: 1 });
    await this.db.collection('assets').createIndex({ 'starMetadata.starName': 1 });
    await this.db.collection('assets').createIndex({ createdAt: -1 });
    await this.db.collection('assets').createIndex({ updatedAt: -1 });
    
    // Taxonomy indexes
    await this.db.collection('taxonomy').createIndex({ layer: 1, category: 1 });
    await this.db.collection('taxonomy').createIndex({ layer: 1, category: 1, subcategory: 1 });
    
    // Users indexes
    await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
    
    console.log('✅ Created all indexes');
  }

  async generateTaxonomyNodes() {
    const nodes = [];
    const now = new Date();
    console.log('🔍 Generating taxonomy nodes from local v1.5.3 files...');

    const LAYERS = ['G', 'S', 'L', 'M', 'W', 'B', 'P', 'T', 'R', 'C'];
    const LAYER_NAMES = {
      G: 'Songs',
      S: 'Stars', 
      L: 'Looks',
      M: 'Moves',
      W: 'Worlds',
      B: 'Branded',
      P: 'Personalize',
      T: 'Training_Data',
      R: 'Rights',
      C: 'Composites'
    };

    for (const layerCode of LAYERS) {
      console.log(`  Processing layer: ${layerCode} (${LAYER_NAMES[layerCode]})`);
      
      const layerFilePath = path.join(__dirname, `../../src/taxonomy-data/${layerCode.toLowerCase()}_layer_v1_5_3.json`);
      
      if (!fs.existsSync(layerFilePath)) {
        console.log(`❌ ERROR: Layer file not found: ${layerFilePath}`);
        continue;
      }

      try {
        const layerData = JSON.parse(fs.readFileSync(layerFilePath, 'utf8'));
        const layerKey = Object.keys(layerData)[0]; // Get the layer key (e.g., 'G', 'S', etc.)
        
        if (layerData[layerKey] && layerData[layerKey].categories) {
          const categories = layerData[layerKey].categories;
          
          for (const categoryKey in categories) {
            const category = categories[categoryKey];
            const categoryCode = category.code;
            const categoryName = category.name;

            // create category node
            nodes.push({
              layer: layerCode,
              category: categoryCode,
              numericCode: categoryKey,
              name: categoryName,
              createdAt: now,
              updatedAt: now,
            });

            // process subcategories
            if (category.subcategories) {
              for (const subcategoryKey in category.subcategories) {
                const subcategory = category.subcategories[subcategoryKey];
                const subcategoryCode = subcategory.code;
                const subcategoryName = subcategory.name;

                nodes.push({
                  layer: layerCode,
                  category: categoryCode,
                  subcategory: subcategoryCode,
                  numericCode: subcategoryKey,
                  name: subcategoryName,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ ERROR loading layer ${layerCode}: ${error.message}`);
      }
    }

    console.log(`✅ Generated ${nodes.length} taxonomy nodes from local v1.5.3 files`);
    return nodes;
  }

  async seedTaxonomy(nodes) {
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN - Would seed taxonomy nodes');
      return;
    }

    console.log('🌱 Seeding taxonomy collection...');
    
    // Clear existing taxonomy if force flag is set
    if (this.options.force || this.options.clearAll) {
      await this.db.collection('taxonomy').deleteMany({});
      console.log('🗑️  Cleared existing taxonomy data');
    }

    // Insert new nodes
    if (nodes.length > 0) {
      const result = await this.db.collection('taxonomy').insertMany(nodes);
      console.log(`✅ Seeded ${result.insertedCount} taxonomy nodes`);
    }
  }

  async verifySetup() {
    console.log('🔍 Verifying database setup...');
    
    const assetCount = await this.db.collection('assets').countDocuments();
    const taxonomyCount = await this.db.collection('taxonomy').countDocuments();
    const userCount = await this.db.collection('users').countDocuments();
    
    console.log(`📊 Collection counts:`);
    console.log(`  Assets: ${assetCount}`);
    console.log(`  Taxonomy: ${taxonomyCount}`);
    console.log(`  Users: ${userCount}`);
    
    // Verify indexes
    const assetIndexes = await this.db.collection('assets').indexes();
    const taxonomyIndexes = await this.db.collection('taxonomy').indexes();
    
    console.log(`📊 Indexes:`);
    console.log(`  Assets: ${assetIndexes.length} indexes`);
    console.log(`  Taxonomy: ${taxonomyIndexes.length} indexes`);
    
    console.log('✅ Database setup verification complete');
  }

  async run() {
    try {
      console.log('🚀 Initializing Development Database...');
      console.log('=====================================');
      
      await this.connect();
      
      if (this.options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
      }
      
      // Clear data if requested
      await this.clearData();
      
      // Create collections and indexes
      await this.createCollections();
      await this.createIndexes();
      
      // Seed taxonomy
      const taxonomyNodes = await this.generateTaxonomyNodes();
      await this.seedTaxonomy(taxonomyNodes);
      
      // Verify setup
      await this.verifySetup();
      
      console.log('\n🎉 Development database initialization completed!');
      console.log('\n📋 Next steps:');
      console.log('  1. Start the development server: npm run start:dev');
      console.log('  2. Test the API endpoints');
      console.log('  3. Create test assets as needed');
      
    } catch (error) {
      console.error('❌ Error during database initialization:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

function parseOptions() {
  const options = {
    force: false,
    clearAssets: true, // DEFAULT: Always clear assets when initializing
    clearAll: false,
    dryRun: false,
  };

  const args = process.argv.slice(2);
  
  for (const arg of args) {
    if (arg === '--force') options.force = true;
    if (arg === '--clear-assets') options.clearAssets = true;
    if (arg === '--keep-assets') options.clearAssets = false; // New flag to keep assets
    if (arg === '--clear-all') options.clearAll = true;
    if (arg === '--dry-run') options.dryRun = true;
  }

  return options;
}

async function main() {
  const options = parseOptions();
  
  if (options.clearAssets && options.clearAll) {
    console.error('❌ Cannot use both --clear-assets and --clear-all');
    process.exit(1);
  }
  
  const initializer = new DevDatabaseInitializer(options);
  await initializer.run();
}

main().catch(console.error); 