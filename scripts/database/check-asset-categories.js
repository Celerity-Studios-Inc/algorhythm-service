#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function checkAssetCategories() {
  try {
    const mongoUri = 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Development MongoDB');
    
    const db = mongoose.connection.db;
    const assetsCollection = db.collection('assets');
    
    console.log('🔍 Analyzing asset categories...');
    
    // Get all assets
    const assets = await assetsCollection.find({}).toArray();
    console.log(`📊 Found ${assets.length} assets in database`);
    
    // Extract unique layer/category/subcategory combinations
    const categoryUsage = {};
    const invalidCategories = [];
    
    assets.forEach(asset => {
      const layer = asset.layer;
      const category = asset.category;
      const subcategory = asset.subcategory;
      
      if (!categoryUsage[layer]) {
        categoryUsage[layer] = {};
      }
      if (!categoryUsage[layer][category]) {
        categoryUsage[layer][category] = new Set();
      }
      categoryUsage[layer][category].add(subcategory);
      
      console.log(`📋 Asset: ${asset.name}`);
      console.log(`   Layer: ${layer}, Category: ${category}, Subcategory: ${subcategory}`);
    });
    
    console.log('\n📊 Category Usage Summary:');
    console.log('==========================');
    
    Object.keys(categoryUsage).forEach(layer => {
      console.log(`\n🔸 Layer: ${layer}`);
      Object.keys(categoryUsage[layer]).forEach(category => {
        const subcategories = Array.from(categoryUsage[layer][category]);
        console.log(`  📁 Category: ${category}`);
        console.log(`    Subcategories: ${subcategories.join(', ')}`);
      });
    });
    
    // Check against current taxonomy v1.4.1
    console.log('\n🔍 Checking against Taxonomy v1.4.1...');
    
    // Load current taxonomy
    const fs = require('fs');
    const path = require('path');
    
    const taxonomyPath = path.join(__dirname, '../../docs/taxonomy/v1.4.1/taxonomy_v1_4_1_merged.json');
    
    if (!fs.existsSync(taxonomyPath)) {
      console.log('❌ Taxonomy v1.4.1 file not found');
      return;
    }
    
    const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
    
    console.log('\n🔍 Validating categories against taxonomy...');
    
    Object.keys(categoryUsage).forEach(layer => {
      console.log(`\n🔸 Layer: ${layer}`);
      
      if (!taxonomyData[layer]) {
        console.log(`  ❌ Layer ${layer} not found in taxonomy!`);
        return;
      }
      
      Object.keys(categoryUsage[layer]).forEach(category => {
        if (!taxonomyData[layer][category]) {
          console.log(`  ❌ Category ${category} not found in layer ${layer}!`);
          invalidCategories.push({ layer, category, subcategories: Array.from(categoryUsage[layer][category]) });
        } else {
          console.log(`  ✅ Category ${category} found in layer ${layer}`);
          
          // Check subcategories
          const subcategories = Array.from(categoryUsage[layer][category]);
          subcategories.forEach(subcategory => {
            if (!taxonomyData[layer][category][subcategory]) {
              console.log(`    ❌ Subcategory ${subcategory} not found in ${layer}/${category}!`);
              invalidCategories.push({ layer, category, subcategory });
            } else {
              console.log(`    ✅ Subcategory ${subcategory} found`);
            }
          });
        }
      });
    });
    
    if (invalidCategories.length > 0) {
      console.log('\n❌ INVALID CATEGORIES FOUND:');
      console.log('============================');
      invalidCategories.forEach(invalid => {
        console.log(`Layer: ${invalid.layer}, Category: ${invalid.category}${invalid.subcategory ? `, Subcategory: ${invalid.subcategory}` : ''}`);
      });
      
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('==================');
      console.log('1. Check if frontend is using outdated taxonomy data');
      console.log('2. Verify that assets were created with correct taxonomy version');
      console.log('3. Consider updating frontend to use current taxonomy v1.4.1');
      console.log('4. Or migrate to taxonomy v1.5.0 if ready');
    } else {
      console.log('\n✅ All categories are valid in current taxonomy!');
    }
    
  } catch (error) {
    console.error('💥 Error checking asset categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  checkAssetCategories();
} 