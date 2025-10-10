#!/usr/bin/env node

/**
 * Comprehensive Analysis of 132 Assets in Development Database
 * Provides detailed insights on asset distribution, quality, and performance
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function analyze132Assets() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Comprehensive Analysis of 132 Assets in Development Database');
    console.log('=' .repeat(70));
    
    // 1. Total Asset Count
    const totalAssets = await assets.countDocuments();
    console.log(`📊 Total Assets: ${totalAssets}`);
    
    // 2. Asset Distribution by Layer
    console.log('\n📈 Asset Distribution by Layer:');
    const layerDistribution = await assets.aggregate([
      { $group: { _id: '$layer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    layerDistribution.forEach(layer => {
      const percentage = ((layer.count / totalAssets) * 100).toFixed(1);
      console.log(`   ${layer._id}: ${layer.count} assets (${percentage}%)`);
    });
    
    // 3. Composite Assets Analysis
    console.log('\n🎬 Composite Assets Analysis:');
    const cFulComposites = await assets.find({ name: { $regex: /^C\.FUL\./ } }).toArray();
    const cParComposites = await assets.find({ name: { $regex: /^C\.PAR\./ } }).toArray();
    const otherComposites = await assets.find({ 
      layer: 'C', 
      name: { $not: { $regex: /^C\.(FUL|PAR)\./ } } 
    }).toArray();
    
    console.log(`   C.FUL (Full) Composites: ${cFulComposites.length}`);
    console.log(`   C.PAR (Partial) Composites: ${cParComposites.length}`);
    console.log(`   Other Composite Assets: ${otherComposites.length}`);
    
    // 4. GCP URL Analysis
    console.log('\n🌐 GCP URL Analysis:');
    const assetsWithGcpUrls = await assets.find({ 
      gcpStorageUrl: { $exists: true, $ne: null } 
    }).toArray();
    
    const cFulWithGcpUrls = cFulComposites.filter(asset => 
      asset.gcpStorageUrl && asset.gcpStorageUrl.includes('storage.googleapis.com')
    );
    
    console.log(`   Total Assets with GCP URLs: ${assetsWithGcpUrls.length}`);
    console.log(`   C.FUL Composites with GCP URLs: ${cFulWithGcpUrls.length}/${cFulComposites.length}`);
    
    // 5. Recent Assets (last 24 hours)
    console.log('\n⏰ Recent Activity (Last 24 Hours):');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAssets = await assets.find({ 
      createdAt: { $gte: oneDayAgo } 
    }).toArray();
    
    console.log(`   New Assets (24h): ${recentAssets.length}`);
    
    if (recentAssets.length > 0) {
      console.log('   Recent Assets:');
      recentAssets.slice(0, 5).forEach(asset => {
        console.log(`     - ${asset.name} (${asset.layer}) - ${asset.createdAt}`);
      });
    }
    
    // 6. Quality Analysis
    console.log('\n✅ Quality Analysis:');
    const assetsWithTags = await assets.find({ 
      tags: { $exists: true, $not: { $size: 0 } } 
    }).toArray();
    
    const assetsWithDescriptions = await assets.find({ 
      description: { $exists: true, $ne: null, $ne: '' } 
    }).toArray();
    
    console.log(`   Assets with Tags: ${assetsWithTags.length}/${totalAssets} (${((assetsWithTags.length/totalAssets)*100).toFixed(1)}%)`);
    console.log(`   Assets with Descriptions: ${assetsWithDescriptions.length}/${totalAssets} (${((assetsWithDescriptions.length/totalAssets)*100).toFixed(1)}%)`);
    
    // 7. NNA Address Analysis
    console.log('\n🔗 NNA Address Analysis:');
    const assetsWithNnaAddress = await assets.find({ 
      nna_address: { $exists: true, $ne: null } 
    }).toArray();
    
    console.log(`   Assets with NNA Addresses: ${assetsWithNnaAddress.length}/${totalAssets} (${((assetsWithNnaAddress.length/totalAssets)*100).toFixed(1)}%)`);
    
    // 8. Performance Metrics
    console.log('\n⚡ Performance Metrics:');
    const startTime = Date.now();
    
    // Test API performance
    const testStart = Date.now();
    const testAssets = await assets.find({ layer: 'C' }).limit(10).toArray();
    const testEnd = Date.now();
    
    console.log(`   Database Query Time: ${testEnd - testStart}ms`);
    console.log(`   Total Analysis Time: ${Date.now() - startTime}ms`);
    
    // 9. Recommendations for ReViz API
    console.log('\n🎯 ReViz API Recommendations:');
    console.log(`   ✅ ${cFulComposites.length} C.FUL composites ready for ReViz developers`);
    console.log(`   ✅ ${cFulWithGcpUrls.length} C.FUL composites have GCP URLs`);
    console.log(`   ⚠️  ${cFulComposites.length - cFulWithGcpUrls.length} C.FUL composites missing GCP URLs`);
    
    if (cFulComposites.length - cFulWithGcpUrls.length > 0) {
      console.log('   Missing GCP URLs:');
      cFulComposites.filter(asset => !asset.gcpStorageUrl).forEach(asset => {
        console.log(`     - ${asset.name} (${asset.nna_address})`);
      });
    }
    
    // 10. Growth Analysis
    console.log('\n📈 Growth Analysis:');
    const assetsByDate = await assets.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]).toArray();
    
    console.log('   Daily Asset Creation:');
    assetsByDate.slice(-7).forEach(day => {
      console.log(`     ${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}: ${day.count} assets`);
    });
    
    console.log('\n🎉 Analysis Complete!');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await client.close();
  }
}

analyze132Assets();
