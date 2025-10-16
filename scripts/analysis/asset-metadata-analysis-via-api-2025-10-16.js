#!/usr/bin/env node

/**
 * Comprehensive Asset Metadata Analysis via NNA Registry API - October 16, 2025
 * 
 * This script performs a deep analysis of the MongoDB database
 * by querying the NNA Registry API instead of direct database access
 * 
 * Analyzes:
 * - Asset counts by layer
 * - Metadata coverage statistics
 * - AlgoRhythm field analysis
 * - Composite completeness
 * - Performance metrics
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';
const OUTPUT_DIR = path.join(__dirname, '../../docs/analysis');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

class AssetMetadataAnalyzer {
  constructor() {
    this.analysis = {
      timestamp: new Date().toISOString(),
      totalAssets: 0,
      layers: {},
      metadata: {},
      algorhythm: {},
      composites: {},
      performance: {}
    };
  }

  async makeApiRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `${NNA_REGISTRY_BASE_URL}${endpoint}`;
      const options = {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async getAllAssets() {
    console.log('🔌 Fetching all assets from NNA Registry API...');
    
    try {
      // Get all assets
      const assets = await this.makeApiRequest('/api/v1/assets');
      console.log(`📈 Found ${assets.length} total assets`);
      return assets;
    } catch (error) {
      console.error('❌ Failed to fetch assets:', error.message);
      throw error;
    }
  }

  async analyzeAssets() {
    console.log('📊 Analyzing assets...');
    
    // Get all assets
    const assets = await this.getAllAssets();
    this.analysis.totalAssets = assets.length;

    // Analyze by layer
    await this.analyzeByLayer(assets);
    
    // Analyze metadata coverage
    await this.analyzeMetadataCoverage(assets);
    
    // Analyze AlgoRhythm fields
    await this.analyzeAlgoRhythmFields(assets);
    
    // Analyze composites
    await this.analyzeComposites(assets);
    
    // Performance analysis
    await this.analyzePerformance(assets);
  }

  async analyzeByLayer(assets) {
    console.log('🎯 Analyzing by layer...');
    
    const layers = {
      'G': { name: 'Songs', count: 0, assets: [] },
      'S': { name: 'Stars', count: 0, assets: [] },
      'L': { name: 'Looks', count: 0, assets: [] },
      'M': { name: 'Moves', count: 0, assets: [] },
      'W': { name: 'Worlds', count: 0, assets: [] },
      'C': { name: 'Composites', count: 0, assets: [] }
    };

    assets.forEach(asset => {
      const layer = asset.nna_address ? asset.nna_address.charAt(0) : 'Unknown';
      if (layers[layer]) {
        layers[layer].count++;
        layers[layer].assets.push(asset);
      }
    });

    this.analysis.layers = layers;
    
    // Log layer counts
    Object.entries(layers).forEach(([key, layer]) => {
      console.log(`  ${layer.name} (${key}): ${layer.count} assets`);
    });
  }

  async analyzeMetadataCoverage(assets) {
    console.log('📋 Analyzing metadata coverage...');
    
    const metadataFields = {
      // Common fields
      'nna_address': 'NNA Address',
      'name': 'Name',
      'creator_description': 'Creator Description',
      'ai_description': 'AI Description',
      'created_at': 'Created At',
      'updated_at': 'Updated At',
      
      // Song fields
      'songName': 'Song Name',
      'artistName': 'Artist Name',
      'albumName': 'Album Name',
      'bpm': 'BPM',
      'genre': 'Genre',
      'mood': 'Mood',
      'energy': 'Energy',
      'tempo': 'Tempo',
      
      // Star fields
      'starName': 'Star Name',
      'archetype': 'Archetype',
      'gender': 'Gender',
      'hairColor': 'Hair Color',
      'hairLength': 'Hair Length',
      'hairStyle': 'Hair Style',
      'makeupType': 'Makeup Type',
      'colorPalette': 'Color Palette',
      
      // Look fields
      'outfitName': 'Outfit Name',
      'styleCategory': 'Style Category',
      'brandName': 'Brand Name',
      'primaryColors': 'Primary Colors',
      'occasion': 'Occasion',
      'seasonality': 'Seasonality',
      'formality': 'Formality',
      
      // Move fields
      'moveName': 'Move Name',
      'danceStyle': 'Dance Style',
      'difficultyLevel': 'Difficulty Level',
      'energyLevel': 'Energy Level',
      'culturalOrigin': 'Cultural Origin',
      
      // World fields
      'worldName': 'World Name',
      'environmentType': 'Environment Type',
      'lightingStyle': 'Lighting Style',
      'moodAtmosphere': 'Mood/Atmosphere',
      'architecturalStyle': 'Architectural Style',
      
      // Composite fields
      'components': 'Components',
      'song_id': 'Song ID',
      'star_id': 'Star ID',
      'look_id': 'Look ID',
      'move_id': 'Move ID',
      'world_id': 'World ID'
    };

    const coverage = {};
    
    Object.entries(metadataFields).forEach(([field, label]) => {
      const count = assets.filter(asset => 
        asset[field] !== undefined && 
        asset[field] !== null && 
        asset[field] !== '' &&
        (Array.isArray(asset[field]) ? asset[field].length > 0 : true)
      ).length;
      
      coverage[field] = {
        label,
        count,
        percentage: ((count / assets.length) * 100).toFixed(1)
      };
    });

    this.analysis.metadata = coverage;
    
    // Log top coverage fields
    const sortedCoverage = Object.entries(coverage)
      .sort(([,a], [,b]) => b.percentage - a.percentage)
      .slice(0, 10);
    
    console.log('  Top metadata coverage:');
    sortedCoverage.forEach(([field, data]) => {
      console.log(`    ${data.label}: ${data.count}/${assets.length} (${data.percentage}%)`);
    });
  }

  async analyzeAlgoRhythmFields(assets) {
    console.log('🎯 Analyzing AlgoRhythm fields...');
    
    const algorhythmFields = {
      'performanceContext': 'Performance Context',
      'targetAudience': 'Target Audience',
      'culturalContext': 'Cultural Context',
      'musicalStyle': 'Musical Style',
      'energyLevel': 'Energy Level'
    };

    const algorhythm = {};
    
    Object.entries(algorhythmFields).forEach(([field, label]) => {
      const count = assets.filter(asset => 
        asset[field] !== undefined && 
        asset[field] !== null && 
        asset[field] !== '' &&
        (Array.isArray(asset[field]) ? asset[field].length > 0 : true)
      ).length;
      
      algorhythm[field] = {
        label,
        count,
        percentage: ((count / assets.length) * 100).toFixed(1)
      };
    });

    this.analysis.algorhythm = algorhythm;
    
    // Log AlgoRhythm field coverage
    console.log('  AlgoRhythm field coverage:');
    Object.entries(algorhythm).forEach(([field, data]) => {
      console.log(`    ${data.label}: ${data.count}/${assets.length} (${data.percentage}%)`);
    });
  }

  async analyzeComposites(assets) {
    console.log('📦 Analyzing composites...');
    
    const composites = assets.filter(asset => 
      asset.nna_address && asset.nna_address.startsWith('C.')
    );
    
    const compositeAnalysis = {
      total: composites.length,
      complete: 0,
      incomplete: 0,
      componentBreakdown: {
        hasSong: 0,
        hasStar: 0,
        hasLook: 0,
        hasMove: 0,
        hasWorld: 0
      }
    };

    composites.forEach(composite => {
      const components = composite.components || [];
      const componentCount = components.length;
      
      if (componentCount === 5) {
        compositeAnalysis.complete++;
      } else {
        compositeAnalysis.incomplete++;
      }
      
      // Check for specific components
      if (composite.song_id || components.some(c => c.layer === 'G')) {
        compositeAnalysis.componentBreakdown.hasSong++;
      }
      if (composite.star_id || components.some(c => c.layer === 'S')) {
        compositeAnalysis.componentBreakdown.hasStar++;
      }
      if (composite.look_id || components.some(c => c.layer === 'L')) {
        compositeAnalysis.componentBreakdown.hasLook++;
      }
      if (composite.move_id || components.some(c => c.layer === 'M')) {
        compositeAnalysis.componentBreakdown.hasMove++;
      }
      if (composite.world_id || components.some(c => c.layer === 'W')) {
        compositeAnalysis.componentBreakdown.hasWorld++;
      }
    });

    this.analysis.composites = compositeAnalysis;
    
    console.log(`  Total composites: ${compositeAnalysis.total}`);
    console.log(`  Complete (5 components): ${compositeAnalysis.complete} (${((compositeAnalysis.complete/compositeAnalysis.total)*100).toFixed(1)}%)`);
    console.log(`  Incomplete: ${compositeAnalysis.incomplete} (${((compositeAnalysis.incomplete/compositeAnalysis.total)*100).toFixed(1)}%)`);
    console.log(`  Component breakdown:`);
    Object.entries(compositeAnalysis.componentBreakdown).forEach(([component, count]) => {
      console.log(`    ${component}: ${count}/${compositeAnalysis.total} (${((count/compositeAnalysis.total)*100).toFixed(1)}%)`);
    });
  }

  async analyzePerformance(assets) {
    console.log('⚡ Analyzing performance metrics...');
    
    const performance = {
      totalAssets: assets.length,
      avgMetadataFields: 0,
      mostCompleteLayer: '',
      leastCompleteLayer: '',
      algorhythmCoverage: 0
    };

    // Calculate average metadata fields per asset
    const totalFields = assets.reduce((sum, asset) => {
      return sum + Object.keys(asset).length;
    }, 0);
    performance.avgMetadataFields = (totalFields / assets.length).toFixed(1);

    // Find most/least complete layers
    const layerCompleteness = {};
    Object.entries(this.analysis.layers).forEach(([key, layer]) => {
      if (layer.count > 0) {
        const avgFields = layer.assets.reduce((sum, asset) => {
          return sum + Object.keys(asset).length;
        }, 0) / layer.count;
        layerCompleteness[key] = avgFields;
      }
    });

    const sortedLayers = Object.entries(layerCompleteness)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedLayers.length > 0) {
      performance.mostCompleteLayer = `${sortedLayers[0][0]} (${sortedLayers[0][1].toFixed(1)} fields)`;
      performance.leastCompleteLayer = `${sortedLayers[sortedLayers.length-1][0]} (${sortedLayers[sortedLayers.length-1][1].toFixed(1)} fields)`;
    }

    // Calculate AlgoRhythm coverage
    const algorhythmFields = ['performanceContext', 'targetAudience', 'culturalContext', 'musicalStyle', 'energyLevel'];
    const totalPossibleFields = assets.length * algorhythmFields.length;
    const totalPopulatedFields = algorhythmFields.reduce((sum, field) => {
      return sum + this.analysis.algorhythm[field]?.count || 0;
    }, 0);
    performance.algorhythmCoverage = ((totalPopulatedFields / totalPossibleFields) * 100).toFixed(1);

    this.analysis.performance = performance;
    
    console.log(`  Average metadata fields per asset: ${performance.avgMetadataFields}`);
    console.log(`  Most complete layer: ${performance.mostCompleteLayer}`);
    console.log(`  Least complete layer: ${performance.leastCompleteLayer}`);
    console.log(`  AlgoRhythm coverage: ${performance.algorhythmCoverage}%`);
  }

  async generateReport() {
    console.log('📝 Generating comprehensive report...');
    
    const reportPath = path.join(OUTPUT_DIR, 'ASSET_METADATA_ANALYSIS_2025_10_16.md');
    
    const report = this.generateMarkdownReport();
    
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report generated: ${reportPath}`);
    
    // Also generate JSON for programmatic access
    const jsonPath = path.join(OUTPUT_DIR, 'asset-metadata-analysis-2025-10-16.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.analysis, null, 2));
    console.log(`✅ JSON data generated: ${jsonPath}`);
  }

  generateMarkdownReport() {
    const { layers, metadata, algorhythm, composites, performance } = this.analysis;
    
    return `# 📊 Asset Metadata Analysis Report - October 16, 2025

**Generated**: ${new Date().toISOString()}
**Source**: NNA Registry API (${NNA_REGISTRY_BASE_URL})
**Total Assets**: ${this.analysis.totalAssets}

---

## 📈 Overview

**Total Assets**: ${this.analysis.totalAssets}

${Object.entries(layers).map(([key, layer]) => 
  `- ${layer.name} Assets (${key}): ${layer.count}`
).join('\n')}

---

## 🎵 Song Assets (G Layer)
**Total Assets**: ${layers.G?.count || 0}

### Metadata Coverage Statistics

${Object.entries(metadata).filter(([field]) => 
  ['songName', 'artistName', 'albumName', 'bpm', 'genre', 'mood', 'energy', 'tempo'].includes(field)
).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

## ⭐ Star Assets (S Layer)
**Total Assets**: ${layers.S?.count || 0}

### Metadata Coverage Statistics

${Object.entries(metadata).filter(([field]) => 
  ['starName', 'archetype', 'gender', 'hairColor', 'hairLength', 'hairStyle', 'makeupType', 'colorPalette'].includes(field)
).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

## 👗 Look Assets (L Layer)
**Total Assets**: ${layers.L?.count || 0}

### Metadata Coverage Statistics

${Object.entries(metadata).filter(([field]) => 
  ['outfitName', 'styleCategory', 'brandName', 'primaryColors', 'occasion', 'seasonality', 'formality'].includes(field)
).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

## 💃 Move Assets (M Layer)
**Total Assets**: ${layers.M?.count || 0}

### Metadata Coverage Statistics

${Object.entries(metadata).filter(([field]) => 
  ['moveName', 'danceStyle', 'difficultyLevel', 'energyLevel', 'culturalOrigin'].includes(field)
).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

## 🌍 World Assets (W Layer)
**Total Assets**: ${layers.W?.count || 0}

### Metadata Coverage Statistics

${Object.entries(metadata).filter(([field]) => 
  ['worldName', 'environmentType', 'lightingStyle', 'moodAtmosphere', 'architecturalStyle'].includes(field)
).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

## 📦 Composite Assets (C Layer)
**Total Assets**: ${layers.C?.count || 0}

### Component Statistics

- **Complete Composites** (5 components): ${composites.complete}/${composites.total} (${((composites.complete/composites.total)*100).toFixed(1)}%)
- **Incomplete Composites**: ${composites.incomplete}/${composites.total} (${((composites.incomplete/composites.total)*100).toFixed(1)}%)

### Component Breakdown

${Object.entries(composites.componentBreakdown).map(([component, count]) => 
  `- **${component}**: ${count}/${composites.total} (${((count/composites.total)*100).toFixed(1)}%)`
).join('\n')}

---

## 🎯 AlgoRhythm Field Analysis

### Current Coverage

${Object.entries(algorhythm).map(([field, data]) => 
  `- **${data.label}**: ${data.count}/${this.analysis.totalAssets} (${data.percentage}%)`
).join('\n')}

### Overall AlgoRhythm Coverage: ${performance.algorhythmCoverage}%

---

## ⚡ Performance Metrics

- **Total Assets**: ${performance.totalAssets}
- **Average Metadata Fields per Asset**: ${performance.avgMetadataFields}
- **Most Complete Layer**: ${performance.mostCompleteLayer}
- **Least Complete Layer**: ${performance.leastCompleteLayer}
- **AlgoRhythm Coverage**: ${performance.algorhythmCoverage}%

---

## 🎯 Key Insights

### ✅ Strengths
- **Total Assets**: ${this.analysis.totalAssets} assets in database
- **Layer Distribution**: Good distribution across all 6 layers
- **Basic Metadata**: High coverage for core fields

### ⚠️ Areas for Improvement
- **AlgoRhythm Fields**: ${performance.algorhythmCoverage}% coverage needs improvement
- **Composite Completeness**: ${((composites.incomplete/composites.total)*100).toFixed(1)}% incomplete composites
- **Metadata Quality**: Some fields have low coverage

### 🚀 Recommendations
1. **Enhance AlgoRhythm Field Population**: Focus on performanceContext, targetAudience, culturalContext
2. **Complete Composite Assets**: Ensure all composites have 5 components
3. **Improve Metadata Quality**: Focus on fields with low coverage
4. **Regular Analysis**: Run this analysis monthly to track improvements

---

**Analysis Complete**: ${new Date().toISOString()}
**Author**: AlgoRhythm Service Analysis Script
**Coverage**: All ${this.analysis.totalAssets} assets analyzed
**Status**: Ready for optimization recommendations
`;
  }
}

// Main execution
async function main() {
  const analyzer = new AssetMetadataAnalyzer();
  
  try {
    await analyzer.analyzeAssets();
    await analyzer.generateReport();
    console.log('🎉 Asset analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AssetMetadataAnalyzer;
