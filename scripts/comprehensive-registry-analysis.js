#!/usr/bin/env node

/**
 * Comprehensive NNA Registry Analysis Script
 * Builds fresh indexes with all new assets
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';
const OUTPUT_DIR = 'reports';
const ANALYSIS_DATE = new Date().toISOString().split('T')[0];

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Make HTTP request to NNA Registry
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Get all assets with pagination
 */
async function getAllAssets() {
  console.log('🔍 Fetching all assets from NNA Registry...');
  
  const allAssets = [];
  let page = 1;
  let hasMore = true;
  const limit = 1000; // Maximum per request
  
  while (hasMore) {
    try {
      console.log(`📄 Fetching page ${page} (limit: ${limit})...`);
      
      const response = await makeRequest(`${NNA_REGISTRY_BASE_URL}/api/v1/assets?limit=${limit}&page=${page}`, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.statusCode === 200 && response.data?.data) {
        const assets = response.data.data;
        allAssets.push(...assets);
        
        console.log(`✅ Page ${page}: ${assets.length} assets (Total: ${allAssets.length})`);
        
        // Check if there are more pages
        if (assets.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        console.log(`❌ Page ${page} failed: ${response.statusCode}`);
        hasMore = false;
      }
    } catch (error) {
      console.log(`❌ Error fetching page ${page}: ${error.message}`);
      hasMore = false;
    }
  }
  
  console.log(`📊 Total assets fetched: ${allAssets.length}`);
  return allAssets;
}

/**
 * Analyze assets by layer
 */
function analyzeByLayer(assets) {
  console.log('📊 Analyzing assets by layer...');
  
  const layerAnalysis = {};
  
  assets.forEach(asset => {
    const layer = asset.layer || 'Unknown';
    if (!layerAnalysis[layer]) {
      layerAnalysis[layer] = {
        count: 0,
        categories: {},
        subcategories: {},
        assets: []
      };
    }
    
    layerAnalysis[layer].count++;
    layerAnalysis[layer].assets.push(asset);
    
    // Category analysis
    const category = asset.category || 'Unknown';
    if (!layerAnalysis[layer].categories[category]) {
      layerAnalysis[layer].categories[category] = 0;
    }
    layerAnalysis[layer].categories[category]++;
    
    // Subcategory analysis
    const subcategory = asset.subcategory || 'Unknown';
    if (!layerAnalysis[layer].subcategories[subcategory]) {
      layerAnalysis[layer].subcategories[subcategory] = 0;
    }
    layerAnalysis[layer].subcategories[subcategory]++;
  });
  
  return layerAnalysis;
}

/**
 * Analyze composite assets specifically
 */
function analyzeComposites(assets) {
  console.log('🎵 Analyzing composite assets...');
  
  const composites = assets.filter(asset => asset.layer === 'C');
  const fullComposites = composites.filter(asset => asset.category === 'FUL');
  const partialComposites = composites.filter(asset => asset.category === 'PAR');
  
  const compositeAnalysis = {
    total: composites.length,
    full: fullComposites.length,
    partial: partialComposites.length,
    byType: {},
    bySong: {},
    metadata: {
      hasGcpUrls: 0,
      hasThumbnails: 0,
      hasPreviews: 0,
      hasMetadata: 0
    }
  };
  
  // Analyze by composite type
  composites.forEach(composite => {
    const type = composite.compositeType || 'Unknown';
    if (!compositeAnalysis.byType[type]) {
      compositeAnalysis.byType[type] = 0;
    }
    compositeAnalysis.byType[type]++;
    
    // Check for metadata completeness
    if (composite.gcpStorageUrl) compositeAnalysis.metadata.hasGcpUrls++;
    if (composite.thumbnailUrl) compositeAnalysis.metadata.hasThumbnails++;
    if (composite.previewUrl) compositeAnalysis.metadata.hasPreviews++;
    if (composite.metadata) compositeAnalysis.metadata.hasMetadata++;
    
    // Group by song (if available)
    if (composite.songId) {
      if (!compositeAnalysis.bySong[composite.songId]) {
        compositeAnalysis.bySong[composite.songId] = 0;
      }
      compositeAnalysis.bySong[composite.songId]++;
    }
  });
  
  return compositeAnalysis;
}

/**
 * Analyze song assets
 */
function analyzeSongs(assets) {
  console.log('🎶 Analyzing song assets...');
  
  const songs = assets.filter(asset => asset.layer === 'G');
  
  const songAnalysis = {
    total: songs.length,
    byCategory: {},
    bySubcategory: {},
    metadata: {
      hasGcpUrls: 0,
      hasMetadata: 0,
      hasTags: 0
    }
  };
  
  songs.forEach(song => {
    const category = song.category || 'Unknown';
    if (!songAnalysis.byCategory[category]) {
      songAnalysis.byCategory[category] = 0;
    }
    songAnalysis.byCategory[category]++;
    
    const subcategory = song.subcategory || 'Unknown';
    if (!songAnalysis.bySubcategory[subcategory]) {
      songAnalysis.bySubcategory[subcategory] = 0;
    }
    songAnalysis.bySubcategory[subcategory]++;
    
    // Check metadata completeness
    if (song.gcpStorageUrl) songAnalysis.metadata.hasGcpUrls++;
    if (song.metadata) songAnalysis.metadata.hasMetadata++;
    if (song.tags && song.tags.length > 0) songAnalysis.metadata.hasTags++;
  });
  
  return songAnalysis;
}

/**
 * Generate comprehensive report
 */
function generateReport(layerAnalysis, compositeAnalysis, songAnalysis, totalAssets) {
  const report = {
    analysisDate: ANALYSIS_DATE,
    summary: {
      totalAssets: totalAssets,
      layers: Object.keys(layerAnalysis).length,
      composites: compositeAnalysis.total,
      songs: songAnalysis.total
    },
    layerAnalysis,
    compositeAnalysis,
    songAnalysis,
    recommendations: []
  };
  
  // Generate recommendations
  if (compositeAnalysis.full < 10) {
    report.recommendations.push('⚠️ Low number of full composites - consider creating more C.FUL assets');
  }
  
  if (compositeAnalysis.metadata.hasGcpUrls < compositeAnalysis.total * 0.8) {
    report.recommendations.push('⚠️ Many composites missing GCP URLs - check storage configuration');
  }
  
  if (songAnalysis.metadata.hasGcpUrls < songAnalysis.total * 0.8) {
    report.recommendations.push('⚠️ Many songs missing GCP URLs - check storage configuration');
  }
  
  if (compositeAnalysis.bySong && Object.keys(compositeAnalysis.bySong).length < 5) {
    report.recommendations.push('⚠️ Limited song coverage - consider adding more songs with composites');
  }
  
  return report;
}

/**
 * Save report to file
 */
function saveReport(report) {
  const filename = `registry-analysis-${ANALYSIS_DATE}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${filepath}`);
  
  // Also save a summary markdown file
  const summaryFilename = `registry-analysis-summary-${ANALYSIS_DATE}.md`;
  const summaryFilepath = path.join(OUTPUT_DIR, summaryFilename);
  
  const summaryContent = `# NNA Registry Analysis Summary - ${ANALYSIS_DATE}

## 📊 Overview
- **Total Assets**: ${report.summary.totalAssets}
- **Layers**: ${report.summary.layers}
- **Composites**: ${report.summary.composites}
- **Songs**: ${report.summary.songs}

## 🎵 Composite Analysis
- **Full Composites (C.FUL)**: ${report.compositeAnalysis.full}
- **Partial Composites (C.PAR)**: ${report.compositeAnalysis.partial}
- **With GCP URLs**: ${report.compositeAnalysis.metadata.hasGcpUrls}
- **With Thumbnails**: ${report.compositeAnalysis.metadata.hasThumbnails}
- **With Previews**: ${report.compositeAnalysis.metadata.hasPreviews}

## 🎶 Song Analysis
- **Total Songs**: ${report.songAnalysis.total}
- **With GCP URLs**: ${report.songAnalysis.metadata.hasGcpUrls}
- **With Metadata**: ${report.songAnalysis.metadata.hasMetadata}
- **With Tags**: ${report.songAnalysis.metadata.hasTags}

## 📋 Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🔗 Full Report
See \`${filename}\` for complete analysis data.
`;
  
  fs.writeFileSync(summaryFilepath, summaryContent);
  console.log(`📄 Summary saved to: ${summaryFilepath}`);
}

/**
 * Main analysis function
 */
async function runAnalysis() {
  console.log('🚀 Starting comprehensive NNA Registry analysis...');
  console.log(`📅 Analysis Date: ${ANALYSIS_DATE}`);
  console.log(`🌐 Registry URL: ${NNA_REGISTRY_BASE_URL}`);
  
  try {
    // Fetch all assets
    const allAssets = await getAllAssets();
    
    if (allAssets.length === 0) {
      console.log('❌ No assets found in registry');
      return;
    }
    
    // Perform analysis
    const layerAnalysis = analyzeByLayer(allAssets);
    const compositeAnalysis = analyzeComposites(allAssets);
    const songAnalysis = analyzeSongs(allAssets);
    
    // Generate report
    const report = generateReport(layerAnalysis, compositeAnalysis, songAnalysis, allAssets.length);
    
    // Save report
    saveReport(report);
    
    // Display summary
    console.log('\n📊 ANALYSIS COMPLETE');
    console.log('==================');
    console.log(`Total Assets: ${report.summary.totalAssets}`);
    console.log(`Layers: ${Object.keys(layerAnalysis).join(', ')}`);
    console.log(`Full Composites: ${compositeAnalysis.full}`);
    console.log(`Partial Composites: ${compositeAnalysis.partial}`);
    console.log(`Songs: ${songAnalysis.total}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    console.log('\n✅ Analysis complete! Check the reports directory for detailed results.');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run the analysis
runAnalysis();
