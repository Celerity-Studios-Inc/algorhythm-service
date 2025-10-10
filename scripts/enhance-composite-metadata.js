#!/usr/bin/env node

/**
 * Enhance Composite Metadata by Aggregating from Component Assets
 * 
 * This script addresses the critical issue where 49 composite assets (37% of database)
 * have 0% AI metadata. It aggregates metadata from their component assets (S, L, G, M, W)
 * to create rich, comprehensive metadata for composite assets.
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function enhanceCompositeMetadata() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🎬 Composite Metadata Enhancement');
    console.log('=' .repeat(60));
    
    // 1. Get all composite assets
    const composites = await assets.find({ layer: 'C' }).toArray();
    console.log(`📊 Found ${composites.length} Composite assets to enhance`);
    
    if (composites.length === 0) {
      console.log('❌ No composite assets found');
      return;
    }
    
    // 2. Process each composite
    let successCount = 0;
    let errorCount = 0;
    
    for (const composite of composites) {
      try {
        console.log(`\n🎬 Processing: ${composite.name} (${composite.nna_address})`);
        
        // Get component assets
        const components = await getComponentAssets(composite, assets);
        if (!components) {
          console.log(`⚠️  Skipping ${composite.name} - missing components`);
          continue;
        }
        
        // Aggregate metadata from components
        const aggregatedMetadata = aggregateMetadataFromComponents(components);
        
        // Calculate synergy score
        const synergyScore = calculateSynergyScore(components);
        
        // Update composite with aggregated metadata
        const updateResult = await assets.updateOne(
          { _id: composite._id },
          {
            $set: {
              // Algorhythm required fields (aggregated)
              performanceContext: aggregatedMetadata.performanceContext,
              targetAudience: aggregatedMetadata.targetAudience,
              culturalContext: aggregatedMetadata.culturalContext,
              musicalStyle: aggregatedMetadata.musicalStyle,
              energyLevel: aggregatedMetadata.energyLevel,
              
              // Layer-specific metadata
              genre: aggregatedMetadata.genre,
              mood: aggregatedMetadata.mood,
              accessories: aggregatedMetadata.accessories,
              primaryColors: aggregatedMetadata.primaryColors,
              primaryMoves: aggregatedMetadata.primaryMoves,
              worldColorPalette: aggregatedMetadata.worldColorPalette,
              
              // Aggregated metadata object
              aggregatedMetadata: {
                synergyScore,
                visualCohesion: aggregatedMetadata.visualCohesion,
                culturalAlignment: aggregatedMetadata.culturalAlignment,
                energyBalance: aggregatedMetadata.energyBalance,
                audienceMatch: aggregatedMetadata.audienceMatch,
                dominantColors: aggregatedMetadata.dominantColors,
                dominantMood: aggregatedMetadata.dominantMood,
                thematicCoherence: aggregatedMetadata.thematicCoherence,
              },
              
              // Enhanced AI metadata
              aiMetadata: {
                ...composite.aiMetadata,
                aggregated: true,
                componentCount: components.length,
                synergyScore,
                lastAggregated: new Date().toISOString(),
              },
            },
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Enhanced ${composite.name} with aggregated metadata`);
          console.log(`   Synergy Score: ${synergyScore}%`);
          console.log(`   Performance Context: ${aggregatedMetadata.performanceContext.join(', ')}`);
          console.log(`   Target Audience: ${aggregatedMetadata.targetAudience.join(', ')}`);
          console.log(`   Musical Style: ${aggregatedMetadata.musicalStyle.join(', ')}`);
          successCount++;
        } else {
          console.log(`⚠️  No changes made to ${composite.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to enhance ${composite.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    // 3. Summary
    console.log('\n🎉 Enhancement Complete!');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully enhanced: ${successCount}/${composites.length} composites`);
    console.log(`❌ Errors: ${errorCount}/${composites.length} composites`);
    console.log(`📊 Success rate: ${((successCount/composites.length)*100).toFixed(1)}%`);
    
    // 4. Verify enhancement
    console.log('\n🔍 Verification:');
    const enhancedComposites = await assets.find({ 
      layer: 'C', 
      'aggregatedMetadata.synergyScore': { $exists: true } 
    }).toArray();
    console.log(`📈 Composites with synergy scores: ${enhancedComposites.length}/${composites.length}`);
    
    const algorhythmComposites = await assets.find({ 
      layer: 'C', 
      'performanceContext': { $exists: true, $ne: [] } 
    }).toArray();
    console.log(`🎯 Composites with Algorhythm fields: ${algorhythmComposites.length}/${composites.length}`);
    
  } catch (error) {
    console.error('❌ Enhancement error:', error.message);
  } finally {
    await client.close();
  }
}

async function getComponentAssets(composite, assets) {
  try {
    const components = [];
    
    // Get components from composite.components array
    if (composite.components && Array.isArray(composite.components)) {
      for (const comp of composite.components) {
        const asset = await assets.findOne({ 
          $or: [
            { _id: comp.id },
            { nna_address: comp.nna_address },
            { name: comp.name }
          ]
        });
        
        if (asset) {
          components.push({
            ...asset,
            layer: comp.layer || asset.layer,
            role: comp.layer || asset.layer,
          });
        }
      }
    }
    
    // If no components array, try to extract from name (fallback)
    if (components.length === 0 && composite.name) {
      console.log(`⚠️  No components array found for ${composite.name}, attempting name extraction`);
      // This is a fallback - ideally all composites should have components array
      return null;
    }
    
    return components.length > 0 ? components : null;
  } catch (error) {
    console.error(`❌ Error getting components for ${composite.name}: ${error.message}`);
    return null;
  }
}

function aggregateMetadataFromComponents(components) {
  const { song, star, look, move, world } = categorizeComponents(components);
  
  return {
    // Algorhythm required fields (aggregated)
    performanceContext: unique([
      ...(song?.performanceContext || []),
      ...(star?.performanceContext || []),
      ...(look?.performanceContext || []),
      ...(move?.performanceContext || []),
      ...(world?.performanceContext || []),
    ]),
    
    targetAudience: intersection([
      song?.targetAudience || [],
      star?.targetAudience || [],
      look?.targetAudience || [],
      move?.targetAudience || [],
      world?.targetAudience || [],
    ]),
    
    culturalContext: unique([
      ...(song?.culturalContext || []),
      ...(star?.culturalContext || []),
    ]),
    
    musicalStyle: song?.musicalStyle || song?.genre || [],
    
    energyLevel: calculateDominantEnergy([
      song?.energyLevel,
      star?.energyLevel,
      move?.energyLevel,
    ]),
    
    // Layer-specific metadata
    genre: song?.genre || [],
    mood: unique([
      ...(song?.mood || []),
      ...(world?.mood || []),
    ]),
    accessories: look?.accessories || [],
    primaryColors: unique([
      ...(look?.primaryColors || []),
      ...(world?.worldColorPalette || []),
    ]),
    primaryMoves: move?.primaryMoves || [],
    worldColorPalette: world?.worldColorPalette || [],
    
    // Aggregated analysis
    visualCohesion: calculateVisualCohesion(look, world),
    culturalAlignment: calculateCulturalAlignment(components),
    energyBalance: calculateEnergyBalance([song, star, move]),
    audienceMatch: calculateAudienceMatch(components),
    dominantColors: getDominantColors(look, world),
    dominantMood: getDominantMood(song, world),
    thematicCoherence: calculateThematicCoherence(song, world),
  };
}

function categorizeComponents(components) {
  const categorized = { song: null, star: null, look: null, move: null, world: null };
  
  components.forEach(comp => {
    const layer = comp.layer || comp.role;
    if (layer === 'G' || layer === 'song') categorized.song = comp;
    else if (layer === 'S' || layer === 'star') categorized.star = comp;
    else if (layer === 'L' || layer === 'look') categorized.look = comp;
    else if (layer === 'M' || layer === 'move') categorized.move = comp;
    else if (layer === 'W' || layer === 'world') categorized.world = comp;
  });
  
  return categorized;
}

function calculateSynergyScore(components) {
  const { song, star, look, move, world } = categorizeComponents(components);
  
  // 1. Visual Cohesion (20%): Do colors and styles match?
  const visualCohesion = calculateVisualCohesion(look, world);
  
  // 2. Cultural Alignment (25%): Are all components from same culture?
  const culturalAlignment = calculateCulturalAlignment(components);
  
  // 3. Energy Balance (25%): Are energy levels compatible?
  const energyBalance = calculateEnergyBalance([song, star, move]);
  
  // 4. Audience Match (15%): Do target audiences overlap?
  const audienceMatch = calculateAudienceMatch(components);
  
  // 5. Thematic Coherence (15%): Do moods and themes align?
  const thematicCoherence = calculateThematicCoherence(song, world);
  
  // Weighted average
  const synergyScore = 
    (visualCohesion * 0.20) +
    (culturalAlignment * 0.25) +
    (energyBalance * 0.25) +
    (audienceMatch * 0.15) +
    (thematicCoherence * 0.15);
  
  return Math.round(synergyScore * 100); // 0-100 scale
}

// Helper functions
function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function intersection(arrs) {
  if (arrs.length === 0) return [];
  return arrs.reduce((acc, curr) => acc.filter(x => curr.includes(x)));
}

function calculateVisualCohesion(look, world) {
  if (!look || !world) return 0.5;
  
  const lookColors = look.primaryColors || [];
  const worldColors = world.worldColorPalette || [];
  
  if (lookColors.length === 0 || worldColors.length === 0) return 0.5;
  
  const colorOverlap = intersection([lookColors, worldColors]).length;
  const maxPossible = Math.max(lookColors.length, worldColors.length);
  
  return maxPossible > 0 ? colorOverlap / maxPossible : 0.5;
}

function calculateCulturalAlignment(components) {
  const cultures = components
    .map(comp => comp.culturalContext || [])
    .filter(c => c.length > 0);
  
  if (cultures.length === 0) return 0.5;
  
  const allCultures = cultures.flat();
  const mostCommon = mode(allCultures);
  const matchCount = cultures.filter(c => c.includes(mostCommon)).length;
  
  return matchCount / cultures.length;
}

function calculateEnergyBalance(energyComponents) {
  const energyLevels = energyComponents
    .filter(comp => comp && comp.energyLevel)
    .map(comp => comp.energyLevel);
  
  if (energyLevels.length === 0) return 0.5;
  
  const energyMap = { 'low': 1, 'medium': 2, 'high': 3, 'extreme': 4 };
  const numericLevels = energyLevels
    .filter(e => energyMap[e])
    .map(e => energyMap[e]);
  
  if (numericLevels.length === 0) return 0.5;
  
  const mean = numericLevels.reduce((a, b) => a + b, 0) / numericLevels.length;
  const variance = numericLevels.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericLevels.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, 1 - (stdDev / 1.5));
}

function calculateAudienceMatch(components) {
  const audiences = components
    .map(comp => comp.targetAudience || [])
    .filter(a => a.length > 0);
  
  if (audiences.length === 0) return 0.5;
  
  const commonAudiences = audiences.reduce((acc, curr) => intersection([acc, curr]));
  return commonAudiences.length > 0 ? 1.0 : 0.3;
}

function calculateThematicCoherence(song, world) {
  if (!song || !world) return 0.5;
  
  const moods = [
    ...(song.mood || []),
    ...(world.mood || []),
  ];
  
  if (moods.length === 0) return 0.5;
  
  const mostCommonMood = mode(moods);
  const moodCount = moods.filter(m => m === mostCommonMood).length;
  
  return moodCount / moods.length;
}

function calculateDominantEnergy(energyLevels) {
  const validLevels = energyLevels.filter(Boolean);
  if (validLevels.length === 0) return 'medium';
  
  return mode(validLevels) || 'medium';
}

function getDominantColors(look, world) {
  const colors = [
    ...(look?.primaryColors || []),
    ...(world?.worldColorPalette || []),
  ];
  
  return unique(colors);
}

function getDominantMood(song, world) {
  const moods = [
    ...(song?.mood || []),
    ...(world?.mood || []),
  ];
  
  return mode(moods) || 'neutral';
}

function mode(arr) {
  if (arr.length === 0) return null;
  
  const frequency = {};
  let maxFreq = 0;
  let mode = null;
  
  for (const item of arr) {
    frequency[item] = (frequency[item] || 0) + 1;
    if (frequency[item] > maxFreq) {
      maxFreq = frequency[item];
      mode = item;
    }
  }
  
  return mode;
}

// Run the enhancement
enhanceCompositeMetadata();
