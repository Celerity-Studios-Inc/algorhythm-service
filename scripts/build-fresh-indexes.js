#!/usr/bin/env node

/**
 * Build Fresh Indexes Script
 * Creates optimized indexes based on comprehensive registry analysis
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';
const OUTPUT_DIR = 'reports';
const INDEXES_DIR = 'indexes';

// Create directories if they don't exist
[OUTPUT_DIR, INDEXES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
 * Build song index for fast lookups
 */
async function buildSongIndex() {
  console.log('🎶 Building song index...');
  
  try {
    const response = await makeRequest(`${NNA_REGISTRY_BASE_URL}/api/v1/assets?layer=G&limit=1000`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.statusCode === 200 && response.data?.data) {
      const songs = response.data.data;
      const songIndex = {};
      
      songs.forEach(song => {
        const songId = song.nna_address || song._id;
        songIndex[songId] = {
          id: songId,
          name: song.name,
          friendlyName: song.friendlyName,
          layer: song.layer,
          category: song.category,
          subcategory: song.subcategory,
          gcpStorageUrl: song.gcpStorageUrl,
          metadata: song.metadata || {},
          tags: song.tags || [],
          createdAt: song.createdAt,
          updatedAt: song.updatedAt
        };
      });
      
      const indexFile = path.join(INDEXES_DIR, 'songs-index.json');
      fs.writeFileSync(indexFile, JSON.stringify(songIndex, null, 2));
      
      console.log(`✅ Song index built: ${Object.keys(songIndex).length} songs`);
      console.log(`📄 Saved to: ${indexFile}`);
      
      return songIndex;
    } else {
      console.log('❌ Failed to fetch songs');
      return {};
    }
  } catch (error) {
    console.log(`❌ Error building song index: ${error.message}`);
    return {};
  }
}

/**
 * Build composite index with full metadata
 */
async function buildCompositeIndex() {
  console.log('🎵 Building composite index...');
  
  try {
    const response = await makeRequest(`${NNA_REGISTRY_BASE_URL}/api/v1/assets?layer=C&limit=1000`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.statusCode === 200 && response.data?.data) {
      const composites = response.data.data;
      const compositeIndex = {
        full: {},
        partial: {},
        bySong: {},
        byType: {}
      };
      
      composites.forEach(composite => {
        const compositeId = composite.nna_address || composite._id;
        const songId = composite.songId;
        const compositeType = composite.compositeType || 'Unknown';
        
        const compositeData = {
          id: compositeId,
          name: composite.name,
          friendlyName: composite.friendlyName,
          layer: composite.layer,
          category: composite.category,
          subcategory: composite.subcategory,
          gcpStorageUrl: composite.gcpStorageUrl,
          thumbnailUrl: composite.thumbnailUrl,
          previewUrl: composite.previewUrl,
          metadata: composite.metadata || {},
          tags: composite.tags || [],
          components: composite.components || [],
          componentCount: composite.componentCount || 0,
          componentLayers: composite.componentLayers || [],
          componentIds: composite.componentIds || [],
          createdAt: composite.createdAt,
          updatedAt: composite.updatedAt
        };
        
        // Index by category (FUL/PAR)
        if (composite.category === 'FUL') {
          compositeIndex.full[compositeId] = compositeData;
        } else if (composite.category === 'PAR') {
          compositeIndex.partial[compositeId] = compositeData;
        }
        
        // Index by song
        if (songId) {
          if (!compositeIndex.bySong[songId]) {
            compositeIndex.bySong[songId] = [];
          }
          compositeIndex.bySong[songId].push(compositeData);
        }
        
        // Index by type
        if (!compositeIndex.byType[compositeType]) {
          compositeIndex.byType[compositeType] = [];
        }
        compositeIndex.byType[compositeType].push(compositeData);
      });
      
      const indexFile = path.join(INDEXES_DIR, 'composites-index.json');
      fs.writeFileSync(indexFile, JSON.stringify(compositeIndex, null, 2));
      
      console.log(`✅ Composite index built:`);
      console.log(`   - Full composites: ${Object.keys(compositeIndex.full).length}`);
      console.log(`   - Partial composites: ${Object.keys(compositeIndex.partial).length}`);
      console.log(`   - Songs with composites: ${Object.keys(compositeIndex.bySong).length}`);
      console.log(`📄 Saved to: ${indexFile}`);
      
      return compositeIndex;
    } else {
      console.log('❌ Failed to fetch composites');
      return { full: {}, partial: {}, bySong: {}, byType: {} };
    }
  } catch (error) {
    console.log(`❌ Error building composite index: ${error.message}`);
    return { full: {}, partial: {}, bySong: {}, byType: {} };
  }
}

/**
 * Build recommendation index for fast template lookups
 */
async function buildRecommendationIndex(songIndex, compositeIndex) {
  console.log('🎯 Building recommendation index...');
  
  const recommendationIndex = {
    bySong: {},
    byCategory: {},
    byTags: {},
    fullComposites: Object.keys(compositeIndex.full),
    partialComposites: Object.keys(compositeIndex.partial)
  };
  
  // Build by song recommendations
  Object.keys(compositeIndex.bySong).forEach(songId => {
    const song = songIndex[songId];
    if (song) {
      recommendationIndex.bySong[songId] = {
        song: song,
        composites: compositeIndex.bySong[songId],
        fullComposites: compositeIndex.bySong[songId].filter(c => c.category === 'FUL'),
        partialComposites: compositeIndex.bySong[songId].filter(c => c.category === 'PAR')
      };
    }
  });
  
  // Build by category recommendations
  Object.values(songIndex).forEach(song => {
    const category = song.category;
    if (!recommendationIndex.byCategory[category]) {
      recommendationIndex.byCategory[category] = [];
    }
    recommendationIndex.byCategory[category].push(song);
  });
  
  // Build by tags recommendations
  Object.values(songIndex).forEach(song => {
    song.tags.forEach(tag => {
      if (!recommendationIndex.byTags[tag]) {
        recommendationIndex.byTags[tag] = [];
      }
      recommendationIndex.byTags[tag].push(song);
    });
  });
  
  const indexFile = path.join(INDEXES_DIR, 'recommendations-index.json');
  fs.writeFileSync(indexFile, JSON.stringify(recommendationIndex, null, 2));
  
  console.log(`✅ Recommendation index built:`);
  console.log(`   - Songs with recommendations: ${Object.keys(recommendationIndex.bySong).length}`);
  console.log(`   - Categories: ${Object.keys(recommendationIndex.byCategory).length}`);
  console.log(`   - Tags: ${Object.keys(recommendationIndex.byTags).length}`);
  console.log(`📄 Saved to: ${indexFile}`);
  
  return recommendationIndex;
}

/**
 * Build performance index for monitoring
 */
function buildPerformanceIndex(songIndex, compositeIndex, recommendationIndex) {
  console.log('📊 Building performance index...');
  
  const performanceIndex = {
    stats: {
      totalSongs: Object.keys(songIndex).length,
      totalComposites: Object.keys(compositeIndex.full).length + Object.keys(compositeIndex.partial).length,
      fullComposites: Object.keys(compositeIndex.full).length,
      partialComposites: Object.keys(compositeIndex.partial).length,
      songsWithComposites: Object.keys(compositeIndex.bySong).length,
      categories: Object.keys(recommendationIndex.byCategory).length,
      tags: Object.keys(recommendationIndex.byTags).length
    },
    metadata: {
      songsWithGcpUrls: Object.values(songIndex).filter(s => s.gcpStorageUrl).length,
      compositesWithGcpUrls: Object.values(compositeIndex.full).filter(c => c.gcpStorageUrl).length,
      compositesWithThumbnails: Object.values(compositeIndex.full).filter(c => c.thumbnailUrl).length,
      compositesWithPreviews: Object.values(compositeIndex.full).filter(c => c.previewUrl).length
    },
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  };
  
  const indexFile = path.join(INDEXES_DIR, 'performance-index.json');
  fs.writeFileSync(indexFile, JSON.stringify(performanceIndex, null, 2));
  
  console.log(`✅ Performance index built:`);
  console.log(`   - Total songs: ${performanceIndex.stats.totalSongs}`);
  console.log(`   - Total composites: ${performanceIndex.stats.totalComposites}`);
  console.log(`   - Songs with GCP URLs: ${performanceIndex.metadata.songsWithGcpUrls}`);
  console.log(`   - Composites with GCP URLs: ${performanceIndex.metadata.compositesWithGcpUrls}`);
  console.log(`📄 Saved to: ${indexFile}`);
  
  return performanceIndex;
}

/**
 * Generate index summary report
 */
function generateIndexSummary(songIndex, compositeIndex, recommendationIndex, performanceIndex) {
  const summary = {
    buildDate: new Date().toISOString(),
    indexes: {
      songs: Object.keys(songIndex).length,
      fullComposites: Object.keys(compositeIndex.full).length,
      partialComposites: Object.keys(compositeIndex.partial).length,
      songsWithComposites: Object.keys(compositeIndex.bySong).length,
      categories: Object.keys(recommendationIndex.byCategory).length,
      tags: Object.keys(recommendationIndex.byTags).length
    },
    performance: performanceIndex.stats,
    metadata: performanceIndex.metadata,
    files: [
      'indexes/songs-index.json',
      'indexes/composites-index.json',
      'indexes/recommendations-index.json',
      'indexes/performance-index.json'
    ]
  };
  
  const summaryFile = path.join(OUTPUT_DIR, 'index-build-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n📊 INDEX BUILD SUMMARY');
  console.log('======================');
  console.log(`Build Date: ${summary.buildDate}`);
  console.log(`Songs: ${summary.indexes.songs}`);
  console.log(`Full Composites: ${summary.indexes.fullComposites}`);
  console.log(`Partial Composites: ${summary.indexes.partialComposites}`);
  console.log(`Songs with Composites: ${summary.indexes.songsWithComposites}`);
  console.log(`Categories: ${summary.indexes.categories}`);
  console.log(`Tags: ${summary.indexes.tags}`);
  console.log(`\n📄 Summary saved to: ${summaryFile}`);
  
  return summary;
}

/**
 * Main index building function
 */
async function buildIndexes() {
  console.log('🚀 Building fresh indexes from NNA Registry...');
  console.log(`📅 Build Date: ${new Date().toISOString()}`);
  console.log(`🌐 Registry URL: ${NNA_REGISTRY_BASE_URL}`);
  
  try {
    // Build all indexes
    const songIndex = await buildSongIndex();
    const compositeIndex = await buildCompositeIndex();
    const recommendationIndex = await buildRecommendationIndex(songIndex, compositeIndex);
    const performanceIndex = buildPerformanceIndex(songIndex, compositeIndex, recommendationIndex);
    
    // Generate summary
    const summary = generateIndexSummary(songIndex, compositeIndex, recommendationIndex, performanceIndex);
    
    console.log('\n✅ INDEX BUILD COMPLETE!');
    console.log('========================');
    console.log('All indexes have been built and saved to the indexes/ directory.');
    console.log('The Algorhythm service can now use these fresh indexes for fast lookups.');
    
  } catch (error) {
    console.error('❌ Index build failed:', error.message);
    process.exit(1);
  }
}

// Run the index building
buildIndexes();
