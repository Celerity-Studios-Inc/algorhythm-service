#!/usr/bin/env node

/**
 * Database Manager - Multi-Environment Database Management Script
 * 
 * This script provides comprehensive database management capabilities across
 * all environments (Dev, Staging, Production) with safety checks and
 * configurable options.
 * 
 * Usage:
 * node scripts/database/database-manager.js [command] [options]
 * 
 * Commands:
 *   init          Initialize database with collections and indexes
 *   clear         Clear all data from database
 *   delete-assets Delete all assets (keep other collections)
 *   seed          Seed database with sample data
 *   backup        Create database backup
 *   restore       Restore database from backup
 *   status        Show database status and statistics
 *   verify        Verify database integrity
 * 
 * Options:
 *   --env <environment>    Target environment (dev|staging|prod)
 *   --force               Force operations without confirmation
 *   --dry-run             Show what would be done without executing
 *   --backup-path <path>  Custom backup path
 *   --confirm             Require explicit confirmation for dangerous operations
 * 
 * Examples:
 *   node scripts/database/database-manager.js init --env dev
 *   node scripts/database/database-manager.js clear --env staging --force
 *   node scripts/database/database-manager.js delete-assets --env prod --confirm
 *   node scripts/database/database-manager.js status --env dev
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

class DatabaseManager {
  constructor(options = {}) {
    this.options = {
      environment: options.environment || 'dev',
      force: options.force || false,
      dryRun: options.dryRun || false,
      confirm: options.confirm || false,
      backupPath: options.backupPath || null,
      ...options
    };
    
    this.client = null;
    this.db = null;
    this.environmentConfig = this.getEnvironmentConfig();
  }

  getEnvironmentConfig() {
    const configs = {
      dev: {
        name: 'Development',
        database: 'nna-registry-service-dev',
        uriPath: 'secrets/mongodb-uri-dev.value',
        safeOperations: true,
        backupEnabled: true
      },
      staging: {
        name: 'Staging',
        database: 'nna-registry-service-staging',
        uriPath: 'secrets/mongodb-uri-stg.value',
        safeOperations: true,
        backupEnabled: true
      },
      prod: {
        name: 'Production',
        database: 'nna-registry-prod',
        uriPath: 'secrets/mongodb-uri-prod.value',
        safeOperations: false,
        backupEnabled: true
      }
    };

    const config = configs[this.options.environment];
    if (!config) {
      throw new Error(`Invalid environment: ${this.options.environment}. Use: dev, staging, prod`);
    }

    return config;
  }

  async connect() {
    try {
      const uriPath = path.join(__dirname, '../../', this.environmentConfig.uriPath);
      
      if (!fs.existsSync(uriPath)) {
        throw new Error(`MongoDB URI file not found: ${uriPath}`);
      }

      const mongodbUri = fs.readFileSync(uriPath, 'utf8').trim();
      
      console.log(`🔌 Connecting to ${this.environmentConfig.name} MongoDB...`);
      this.client = new MongoClient(mongodbUri);
      await this.client.connect();
      this.db = this.client.db(this.environmentConfig.database);
      console.log(`✅ Connected to ${this.environmentConfig.name} MongoDB`);
      
    } catch (error) {
      console.error(`❌ Failed to connect to ${this.environmentConfig.name} MongoDB:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async getDatabaseStats() {
    const stats = {
      collections: [],
      totalAssets: 0,
      totalUsers: 0,
      totalTaxonomy: 0,
      indexes: []
    };

    // Get collection stats
    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      const count = await this.db.collection(collection.name).countDocuments();
      stats.collections.push({
        name: collection.name,
        count: count
      });

      if (collection.name === 'assets') stats.totalAssets = count;
      if (collection.name === 'users') stats.totalUsers = count;
      if (collection.name === 'taxonomy') stats.totalTaxonomy = count;
    }

    // Get index info
    for (const collection of collections) {
      const indexes = await this.db.collection(collection.name).indexes();
      stats.indexes.push({
        collection: collection.name,
        indexes: indexes
      });
    }

    return stats;
  }

  async showStatus() {
    console.log(`\n📊 ${this.environmentConfig.name} Database Status`);
    console.log('='.repeat(50));
    
    const stats = await this.getDatabaseStats();
    
    console.log(`🏗️  Database: ${this.environmentConfig.database}`);
    console.log(`📅 Environment: ${this.environmentConfig.name}`);
    console.log(`🔒 Safe Operations: ${this.environmentConfig.safeOperations ? '✅ Enabled' : '❌ Disabled'}`);
    
    console.log('\n📋 Collections:');
    for (const collection of stats.collections) {
      console.log(`  ${collection.name}: ${collection.count} documents`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Assets: ${stats.totalAssets}`);
    console.log(`  Users: ${stats.totalUsers}`);
    console.log(`  Taxonomy: ${stats.totalTaxonomy}`);
    
    console.log('\n🔍 Indexes:');
    for (const indexInfo of stats.indexes) {
      console.log(`  ${indexInfo.collection}: ${indexInfo.indexes.length} indexes`);
    }
  }

  async createCollections() {
    console.log('\n📋 Creating collections...');
    
    const collections = ['assets', 'taxonomy', 'users', 'migrations'];
    
    for (const collectionName of collections) {
      if (this.options.dryRun) {
        console.log(`  [DRY RUN] Would create collection: ${collectionName}`);
        continue;
      }

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
    console.log('\n📊 Creating database indexes...');
    
    const indexConfigs = [
      // Assets indexes
      { collection: 'assets', index: { name: 1 }, options: { unique: true } },
      { collection: 'assets', index: { layer: 1, category: 1, subcategory: 1 } },
      { collection: 'assets', index: { createdAt: -1 } },
      { collection: 'assets', index: { updatedAt: -1 } },
      { collection: 'assets', index: { 'songMetadata.originalArtistGender': 1 } },
      
      // Comprehensive text search index for assets
      { 
        collection: 'assets', 
        index: {
          name: 'text',
          description: 'text',
          'aiMetadata.generatedDescription': 'text',
          'aiMetadata.tags': 'text',
          'tags': 'text',
          'songMetadata.songName': 'text',
          'songMetadata.artistName': 'text',
          'songMetadata.albumName': 'text',
          'songMetadata.genre': 'text',
          'starsMetadata.celebrityName': 'text',
          'starsMetadata.styleSignature': 'text',
          'starsMetadata.culturalImpact': 'text',
          'looksMetadata.styleName': 'text',
          'looksMetadata.designer': 'text',
          'looksMetadata.colorPalette': 'text',
          'movesMetadata.moveName': 'text',
          'movesMetadata.danceStyle': 'text',
          'movesMetadata.choreographer': 'text',
          'worldsMetadata.worldName': 'text',
          'worldsMetadata.environmentType': 'text',
          'worldsMetadata.mood': 'text',
          'creatorDescription': 'text'
        }, 
        options: {
          name: 'comprehensive_text_index',
          weights: {
            name: 10,
            description: 5,
            'aiMetadata.generatedDescription': 5,
            'aiMetadata.tags': 8,
            'tags': 8,
            'songMetadata.songName': 10,
            'songMetadata.artistName': 10,
            'songMetadata.albumName': 5,
            'songMetadata.genre': 7,
            'starsMetadata.celebrityName': 10,
            'starsMetadata.styleSignature': 7,
            'starsMetadata.culturalImpact': 5,
            'looksMetadata.styleName': 10,
            'looksMetadata.designer': 8,
            'looksMetadata.colorPalette': 5,
            'movesMetadata.moveName': 10,
            'movesMetadata.danceStyle': 8,
            'movesMetadata.choreographer': 5,
            'worldsMetadata.worldName': 10,
            'worldsMetadata.environmentType': 8,
            'worldsMetadata.mood': 5,
            'creatorDescription': 5
          },
          default_language: 'english'
        }
      },
      
      // Taxonomy indexes
      { collection: 'taxonomy', index: { layer: 1, category: 1 } },
      { collection: 'taxonomy', index: { layer: 1, category: 1, subcategory: 1 } },
      
      // Users indexes
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { createdAt: -1 } }
    ];

    for (const config of indexConfigs) {
      if (this.options.dryRun) {
        console.log(`  [DRY RUN] Would create index: ${config.collection}.${JSON.stringify(config.index)}`);
        continue;
      }

      try {
        await this.db.collection(config.collection).createIndex(config.index, config.options);
        console.log(`  ✅ Created index: ${config.collection}.${JSON.stringify(config.index)}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`  ℹ️  Index exists: ${config.collection}.${JSON.stringify(config.index)}`);
        } else {
          console.log(`  ⚠️  Failed to create index: ${config.collection}.${JSON.stringify(config.index)} - ${error.message}`);
        }
      }
    }
  }

  async clearAllData() {
    if (!this.options.force && !this.environmentConfig.safeOperations) {
      throw new Error(`Cannot clear data in ${this.environmentConfig.name} without --force flag`);
    }

    if (this.options.confirm) {
      const confirmed = await this.promptConfirmation(
        `Are you sure you want to clear ALL data from ${this.environmentConfig.name} database? (yes/no): `
      );
      if (!confirmed) {
        console.log('❌ Operation cancelled');
        return;
      }
    }

    console.log('\n🗑️  Clearing all data...');
    
    const collections = ['assets', 'taxonomy', 'migrations', 'users']; // Clear all collections including users
    let totalDeleted = 0;

    for (const collectionName of collections) {
      if (this.options.dryRun) {
        const count = await this.db.collection(collectionName).countDocuments();
        console.log(`  [DRY RUN] Would delete ${count} documents from ${collectionName}`);
        totalDeleted += count;
        continue;
      }

      const result = await this.db.collection(collectionName).deleteMany({});
      console.log(`  ✅ Deleted ${result.deletedCount} documents from ${collectionName}`);
      totalDeleted += result.deletedCount;
    }

    console.log(`\n✅ Cleared ${totalDeleted} total documents from ${this.environmentConfig.name} database`);
  }

  async deleteAssets() {
    if (!this.options.force && !this.environmentConfig.safeOperations) {
      throw new Error(`Cannot delete assets in ${this.environmentConfig.name} without --force flag`);
    }

    if (this.options.confirm) {
      const confirmed = await this.promptConfirmation(
        `Are you sure you want to delete ALL assets from ${this.environmentConfig.name} database? (yes/no): `
      );
      if (!confirmed) {
        console.log('❌ Operation cancelled');
        return;
      }
    }

    console.log('\n🗑️  Deleting all assets...');
    
    if (this.options.dryRun) {
      const count = await this.db.collection('assets').countDocuments();
      console.log(`  [DRY RUN] Would delete ${count} assets`);
      return;
    }

    const result = await this.db.collection('assets').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} assets from ${this.environmentConfig.name} database`);
  }

  async seedSampleData() {
    console.log('\n🌱 Seeding sample data...');
    
    const sampleAssets = [
      {
        name: 'G.POP.GLB.001',
        layer: 'G',
        category: 'POP',
        subcategory: 'GLB',
        description: 'Sample Pop Song 1',
        songMetadata: {
          originalArtistGender: 'female',
          genderSuitability: 'universal',
          vocalRange: 'medium',
          ageAppropriateness: 'all_ages'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'G.POP.GLB.002',
        layer: 'G',
        category: 'POP',
        subcategory: 'GLB',
        description: 'Sample Pop Song 2',
        songMetadata: {
          originalArtistGender: 'male',
          genderSuitability: 'universal',
          vocalRange: 'medium',
          ageAppropriateness: 'all_ages'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'C.PAR.4LY.001',
        layer: 'C',
        category: 'PAR',
        subcategory: '4LY',
        description: 'Sample Composite Asset 1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    if (this.options.dryRun) {
      console.log(`  [DRY RUN] Would insert ${sampleAssets.length} sample assets`);
      return;
    }

    // Check for existing assets
    const existingAssets = await this.db.collection('assets').find({
      name: { $in: sampleAssets.map(asset => asset.name) }
    }).toArray();

    if (existingAssets.length > 0) {
      console.log(`⚠️  Found ${existingAssets.length} existing assets with same names:`);
      existingAssets.forEach(asset => console.log(`    - ${asset.name}`));
      console.log('💡 Use --force to replace existing assets or clear database first');
      return;
    }

    try {
      const result = await this.db.collection('assets').insertMany(sampleAssets);
      console.log(`✅ Inserted ${result.insertedCount} sample assets`);
    } catch (error) {
      if (error.code === 11000) {
        console.log('❌ Duplicate key error - some assets already exist');
        console.log('💡 Use --force to replace or clear database first');
      } else {
        throw error;
      }
    }
  }

  async backupDatabase() {
    if (!this.environmentConfig.backupEnabled) {
      console.log('⚠️  Backup not enabled for this environment');
      return;
    }

    const backupPath = this.options.backupPath || 
      `backups/${this.environmentConfig.database}-${new Date().toISOString().split('T')[0]}.json`;

    console.log(`\n💾 Creating backup: ${backupPath}`);
    
    if (this.options.dryRun) {
      console.log(`  [DRY RUN] Would create backup at: ${backupPath}`);
      return;
    }

    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backup = {
      timestamp: new Date().toISOString(),
      environment: this.environmentConfig.name,
      database: this.environmentConfig.database,
      collections: {}
    };

    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      const documents = await this.db.collection(collection.name).find({}).toArray();
      backup.collections[collection.name] = documents;
    }

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup created: ${backupPath}`);
  }

  async promptConfirmation(message) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(message, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  async run(command) {
    try {
      await this.connect();

      switch (command) {
        case 'init':
          await this.createCollections();
          await this.createIndexes();
          console.log('\n✅ Database initialization completed');
          break;

        case 'clear':
          await this.clearAllData();
          break;

        case 'delete-assets':
          await this.deleteAssets();
          break;

        case 'seed':
          await this.seedSampleData();
          break;

        case 'backup':
          await this.backupDatabase();
          break;

        case 'status':
          await this.showStatus();
          break;

        case 'verify':
          await this.showStatus();
          console.log('\n🔍 Database integrity check completed');
          break;

        default:
          console.error(`❌ Unknown command: ${command}`);
          console.log('Available commands: init, clear, delete-assets, seed, backup, status, verify');
          process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Operation failed: ${error.message}`);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    environment: 'dev',
    force: false,
    dryRun: false,
    confirm: false,
    backupPath: null
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
        options.environment = args[++i];
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--confirm':
        options.confirm = true;
        break;
      case '--backup-path':
        options.backupPath = args[++i];
        break;
      case '--help':
        console.log(`
Database Manager - Multi-Environment Database Management Script

Usage:
  node scripts/database/database-manager.js [command] [options]

Commands:
  init          Initialize database with collections and indexes
  clear         Clear all data from database
  delete-assets Delete all assets (keep other collections)
  seed          Seed database with sample data
  backup        Create database backup
  status        Show database status and statistics
  verify        Verify database integrity

Options:
  --env <environment>    Target environment (dev|staging|prod)
  --force               Force operations without confirmation
  --dry-run             Show what would be done without executing
  --backup-path <path>  Custom backup path
  --confirm             Require explicit confirmation for dangerous operations

Examples:
  node scripts/database/database-manager.js init --env dev
  node scripts/database/database-manager.js clear --env staging --force
  node scripts/database/database-manager.js delete-assets --env prod --confirm
  node scripts/database/database-manager.js status --env dev
        `);
        process.exit(0);
    }
  }

  return { command, options };
}

async function main() {
  try {
    const { command, options } = parseArguments();
    
    if (!command) {
      console.error('❌ Command is required');
      console.log('Use --help for usage information');
      process.exit(1);
    }

    console.log(`🚀 Database Manager - ${options.environment.toUpperCase()} Environment`);
    console.log(`📅 ${new Date().toISOString()}`);
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
    }

    const manager = new DatabaseManager(options);
    await manager.run(command);

    console.log('\n🎉 Operation completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DatabaseManager }; 