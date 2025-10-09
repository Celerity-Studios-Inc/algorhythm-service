#!/usr/bin/env node

/**
 * Asset Metadata Monitor & Index Manager
 * - Monitors new asset metadata quality
 * - Creates/updates search indices every 10 minutes
 * - Tracks AlgoRhythm field completion rates
 * - Reports on canonical pattern usage
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';
const MONITOR_INTERVAL = 10 * 60 * 1000; // 10 minutes
const LOG_FILE = path.join(__dirname, '..', 'asset-metadata-monitor.log');

// AlgoRhythm required fields by layer
const ALGORHYTHM_FIELDS = {
  'S': ['performanceContext', 'targetAudience', 'culturalContext', 'musicalStyle', 'energyLevel'],
  'L': ['performanceContext', 'targetAudience', 'culturalContext', 'style', 'occasion', 'colorScheme'],
  'M': ['performanceContext', 'targetAudience', 'culturalContext', 'danceStyle', 'complexity', 'energyLevel'],
  'W': ['performanceContext', 'targetAudience', 'culturalContext', 'environment', 'atmosphere', 'mood'],
  'G': ['genre', 'mood', 'musicalStyle', 'songCulturalOrigin', 'ageAppropriateness'],
  'C': ['components', 'componentAssets', 'synergyScore']
};

class AssetMetadataMonitor {
  constructor() {
    this.client = null;
    this.db = null;
    this.isRunning = false;
    this.stats = {
      totalAssets: 0,
      layerStats: {},
      algorhythmCompletion: {},
      lastUpdate: null,
      indexUpdates: 0
    };
  }

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  }

  async analyzeAssetMetadata() {
    this.log('🔍 Analyzing asset metadata...');
    
    const assets = this.db.collection('assets');
    const totalCount = await assets.countDocuments();
    
    this.stats.totalAssets = totalCount;
    this.stats.lastUpdate = new Date();
    
    // Get assets by layer
    const layerStats = await assets.aggregate([
      { $group: { _id: '$layer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    this.stats.layerStats = {};
    layerStats.forEach(stat => {
      this.stats.layerStats[stat._id] = stat.count;
    });
    
    // Analyze AlgoRhythm field completion
    this.stats.algorhythmCompletion = {};
    
    for (const [layer, fields] of Object.entries(ALGORHYTHM_FIELDS)) {
      const layerAssets = await assets.find({ layer }).toArray();
      const completionStats = {};
      
      fields.forEach(field => {
        const completed = layerAssets.filter(asset => {
          // Check various possible field locations
          return asset[field] || 
                 asset.aiMetadata?.[field] || 
                 asset.starMetadata?.[field] ||
                 asset.lookMetadata?.[field] ||
                 asset.moveMetadata?.[field] ||
                 asset.worldMetadata?.[field] ||
                 asset.songMetadata?.[field] ||
                 asset.compositeMetadata?.[field];
        }).length;
        
        completionStats[field] = {
          completed,
          total: layerAssets.length,
          percentage: layerAssets.length > 0 ? Math.round((completed / layerAssets.length) * 100) : 0
        };
      });
      
      this.stats.algorhythmCompletion[layer] = completionStats;
    }
    
    return this.stats;
  }

  async createSearchIndices() {
    this.log('🔧 Creating/updating search indices...');
    
    const assets = this.db.collection('assets');
    
    try {
      // Create text search index
      await assets.createIndex({
        name: 'text',
        friendlyName: 'text',
        description: 'text',
        'aiMetadata.description': 'text'
      }, {
        name: 'asset_text_search',
        weights: {
          name: 10,
          friendlyName: 8,
          description: 5,
          'aiMetadata.description': 3
        }
      });
      
      // Create layer index
      await assets.createIndex({ layer: 1, category: 1, subcategory: 1 });
      
      // Create NNA address index
      await assets.createIndex({ nna_address: 1 }, { unique: true, sparse: true });
      
      // Create metadata indices for AlgoRhythm fields
      for (const [layer, fields] of Object.entries(ALGORHYTHM_FIELDS)) {
        for (const field of fields) {
          try {
            await assets.createIndex({ [field]: 1 }, { sparse: true });
            await assets.createIndex({ [`aiMetadata.${field}`]: 1 }, { sparse: true });
            await assets.createIndex({ [`${layer.toLowerCase()}Metadata.${field}`]: 1 }, { sparse: true });
          } catch (error) {
            // Index might already exist, continue
          }
        }
      }
      
      this.stats.indexUpdates++;
      this.log('✅ Search indices updated successfully');
      
    } catch (error) {
      this.log(`❌ Index creation failed: ${error.message}`);
    }
  }

  async checkCanonicalPatternUsage() {
    this.log('📊 Checking canonical pattern usage...');
    
    const assets = this.db.collection('assets');
    
    // Check for canonical pattern indicators in descriptions
    const patternIndicators = {
      performanceFocused: ['performer specializing in', 'concert performer', 'studio performer'],
      styleFocused: ['with streetwear style', 'haute couture fashion', 'style and'],
      culturalFocused: ['from Japanese background', 'in K-Pop style', 'in Hip-Hop style'],
      structuredSongs: [' by ', ' in '] // Artist by Song in Album format
    };
    
    const patternStats = {};
    
    for (const [pattern, indicators] of Object.entries(patternIndicators)) {
      const count = await assets.countDocuments({
        $or: indicators.map(indicator => ({
          $or: [
            { description: { $regex: indicator, $options: 'i' } },
            { 'aiMetadata.description': { $regex: indicator, $options: 'i' } }
          ]
        }))
      });
      
      patternStats[pattern] = count;
    }
    
    return patternStats;
  }

  generateReport() {
    const report = {
      timestamp: this.stats.lastUpdate,
      totalAssets: this.stats.totalAssets,
      layerBreakdown: this.stats.layerStats,
      algorhythmCompletion: this.stats.algorhythmCompletion,
      indexUpdates: this.stats.indexUpdates
    };
    
    // Calculate overall AlgoRhythm completion
    let totalFields = 0;
    let completedFields = 0;
    
    Object.values(this.stats.algorhythmCompletion).forEach(layerStats => {
      Object.values(layerStats).forEach(fieldStats => {
        totalFields += fieldStats.total;
        completedFields += fieldStats.completed;
      });
    });
    
    report.overallAlgorhythmCompletion = totalFields > 0 ? 
      Math.round((completedFields / totalFields) * 100) : 0;
    
    return report;
  }

  printReport() {
    console.log('\n📊 ASSET METADATA MONITOR REPORT');
    console.log('================================');
    console.log(`🕐 Last Update: ${this.stats.lastUpdate?.toISOString()}`);
    console.log(`📦 Total Assets: ${this.stats.totalAssets}`);
    console.log(`🔧 Index Updates: ${this.stats.indexUpdates}`);
    
    console.log('\n📋 Assets by Layer:');
    Object.entries(this.stats.layerStats).forEach(([layer, count]) => {
      console.log(`  ${layer}: ${count} assets`);
    });
    
    console.log('\n🎯 AlgoRhythm Field Completion:');
    Object.entries(this.stats.algorhythmCompletion).forEach(([layer, fields]) => {
      console.log(`\n  ${layer} Layer:`);
      Object.entries(fields).forEach(([field, stats]) => {
        const status = stats.percentage >= 80 ? '✅' : stats.percentage >= 50 ? '⚠️' : '❌';
        console.log(`    ${status} ${field}: ${stats.completed}/${stats.total} (${stats.percentage}%)`);
      });
    });
    
    // Overall completion
    let totalFields = 0;
    let completedFields = 0;
    
    Object.values(this.stats.algorhythmCompletion).forEach(layerStats => {
      Object.values(layerStats).forEach(fieldStats => {
        totalFields += fieldStats.total;
        completedFields += fieldStats.completed;
      });
    });
    
    const overallCompletion = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    const overallStatus = overallCompletion >= 80 ? '✅' : overallCompletion >= 50 ? '⚠️' : '❌';
    
    console.log(`\n🎯 Overall AlgoRhythm Completion: ${overallStatus} ${overallCompletion}%`);
    
    if (overallCompletion < 50) {
      console.log('\n🚨 CRITICAL: AlgoRhythm field completion is below 50%');
      console.log('   Recommendation: Implement guided forms with canonical patterns');
    } else if (overallCompletion < 80) {
      console.log('\n⚠️  WARNING: AlgoRhythm field completion needs improvement');
      console.log('   Recommendation: Continue implementing canonical patterns');
    } else {
      console.log('\n✅ EXCELLENT: AlgoRhythm field completion is above 80%');
      console.log('   Status: Ready for production recommendations');
    }
  }

  async runMonitoringCycle() {
    try {
      await this.analyzeAssetMetadata();
      await this.createSearchIndices();
      await this.checkCanonicalPatternUsage();
      
      this.printReport();
      
      // Save report to file
      const report = this.generateReport();
      const reportFile = path.join(__dirname, '..', 'asset-metadata-report.json');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
    } catch (error) {
      this.log(`❌ Monitoring cycle failed: ${error.message}`);
    }
  }

  async start() {
    if (this.isRunning) {
      this.log('⚠️  Monitor is already running');
      return;
    }
    
    const connected = await this.connect();
    if (!connected) {
      return;
    }
    
    this.isRunning = true;
    this.log('🚀 Starting asset metadata monitor...');
    
    // Run initial cycle
    await this.runMonitoringCycle();
    
    // Set up interval
    this.interval = setInterval(async () => {
      await this.runMonitoringCycle();
    }, MONITOR_INTERVAL);
    
    this.log(`⏰ Monitor running every ${MONITOR_INTERVAL / 1000 / 60} minutes`);
  }

  async stop() {
    if (!this.isRunning) {
      this.log('⚠️  Monitor is not running');
      return;
    }
    
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    await this.disconnect();
    this.log('🛑 Asset metadata monitor stopped');
  }
}

// CLI interface
async function main() {
  const monitor = new AssetMetadataMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
  });
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      await monitor.start();
      // Keep the process running
      setInterval(() => {}, 1000);
      break;
      
    case 'run-once':
      await monitor.connect();
      await monitor.runMonitoringCycle();
      await monitor.disconnect();
      break;
      
    case 'status':
      await monitor.connect();
      await monitor.analyzeAssetMetadata();
      monitor.printReport();
      await monitor.disconnect();
      break;
      
    default:
      console.log('Usage: node monitor-asset-metadata.js [start|run-once|status]');
      console.log('  start     - Start continuous monitoring (every 10 minutes)');
      console.log('  run-once  - Run monitoring cycle once');
      console.log('  status    - Show current status');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitor failed:', error.message);
    process.exit(1);
  });
}

module.exports = AssetMetadataMonitor;

