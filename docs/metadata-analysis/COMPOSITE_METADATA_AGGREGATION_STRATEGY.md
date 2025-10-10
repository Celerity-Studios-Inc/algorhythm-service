# Composite Metadata Aggregation Strategy

**Date**: October 10, 2025
**Priority**: 🚨 **CRITICAL** - 49 Composite Assets (37% of database) Have 0% Metadata
**Status**: 🔧 **IMPLEMENTATION REQUIRED**

---

## 🎯 **PROBLEM STATEMENT**

### **Current State** (From Real Data Analysis):
```
Composites: 49 assets (37.1% of entire database)
├── AI Metadata: 0% ❌ COMPLETELY BROKEN
├── Creator Descriptions: 93.9% ✅ Users providing input
├── Component References: 100% ✅ All have valid components
└── Aggregated Metadata: 0% ❌ NOT IMPLEMENTED
```

### **Sample Composite Asset Structure**:
```json
{
  "layer": "C",
  "name": "C.FUL.ALL.047",
  "description": "Sam in multicolor hair wearing a cat print shirt dancing pretty little baby in a sunset themed living room",

  // ✅ Component references exist
  "components": [
    { "id": "...", "name": "G.POP.TEE.002", "layer": "G", "nna_address": "1.018.003.002" },
    { "id": "...", "name": "S.TEN.YOU.031", "layer": "S", "nna_address": "2.020.001.031" },
    { "id": "...", "name": "L.CAS.COM.001", "layer": "L", "nna_address": "3.003.002.001" },
    { "id": "...", "name": "M.TIK.CHA.003", "layer": "M", "nna_address": "4.022.002.003" },
    { "id": "...", "name": "W.HOM.LIV.003", "layer": "W", "nna_address": "5.015.001.003" }
  ],

  // ❌ All metadata arrays EMPTY (should be aggregated from components)
  "performanceContext": [],
  "musicalStyle": [],
  "genre": [],
  "mood": [],
  "accessories": [],
  "primaryColors": [],
  "primaryMoves": [],
  "worldColorPalette": [],

  // ❌ No AI metadata at all
  "aiMetadata": null,

  // ❌ No aggregated metadata structure
  "aggregatedMetadata": null,
  "synergyScore": null
}
```

### **What Should Happen**:
The Composite should automatically aggregate metadata from its 5 components:
- **Song (G)**: genre, mood, tempo, musicalStyle, energy
- **Star (S)**: gender, age, cultural context, performanceContext
- **Look (L)**: colors, style, accessories, fashionStyle
- **Move (M)**: dance style, energy, primaryMoves
- **World (W)**: environment, atmosphere, colors, mood

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Why Composites Have 0% Metadata**:

1. **Backend AI Service**: Does NOT have a Composite extraction strategy
   - AI works for S, L, G, M, W layers (100% success)
   - AI completely fails for C layer (0% success)
   - No logic to aggregate from components

2. **Frontend Registration**: Does NOT aggregate during creation
   - User selects 5 components
   - Composite created with component references
   - But metadata NOT aggregated from components

3. **Missing Service**: No `aggregateCompositeMetadata()` function exists
   - Backend doesn't aggregate
   - Frontend doesn't aggregate
   - Result: Empty metadata arrays

---

## 🎯 **SOLUTION: 3-Tier Aggregation Strategy**

### **Tier 1: Frontend Real-Time Aggregation** (During Registration)
**When**: User is registering a new Composite
**Where**: Frontend registration form
**Purpose**: Show user what metadata will be aggregated BEFORE saving

```typescript
// In CompositeRegisterAssetPage.tsx
const [selectedComponents, setSelectedComponents] = useState({
  song: null,
  star: null,
  look: null,
  move: null,
  world: null,
});

const [aggregatedMetadata, setAggregatedMetadata] = useState(null);
const [synergyScore, setSynergyScore] = useState(null);

// Real-time aggregation as user selects components
useEffect(() => {
  if (allComponentsSelected(selectedComponents)) {
    const metadata = aggregateMetadataFromComponents(selectedComponents);
    const synergy = calculateSynergyScore(selectedComponents);

    setAggregatedMetadata(metadata);
    setSynergyScore(synergy);
  }
}, [selectedComponents]);

// Show preview to user BEFORE saving
<Box className="aggregation-preview">
  <Typography variant="h6">Aggregated Metadata Preview</Typography>

  <Chip label={`Synergy Score: ${synergyScore}%`}
        color={synergyScore >= 80 ? 'success' : 'warning'} />

  <Typography>Performance Context: {aggregatedMetadata.performanceContext.join(', ')}</Typography>
  <Typography>Musical Style: {aggregatedMetadata.musicalStyle.join(', ')}</Typography>
  <Typography>Target Audience: {aggregatedMetadata.targetAudience.join(', ')}</Typography>
  // ... etc
</Box>
```

### **Tier 2: Backend Aggregation Service** (On Save)
**When**: Composite is saved to database
**Where**: Backend `composites.service.ts`
**Purpose**: Server-side source of truth, ensure consistency

```typescript
// composites.service.ts
async createComposite(createCompositeDto: CreateCompositeDto): Promise<Asset> {
  // 1. Fetch all component assets
  const [song, star, look, move, world] = await Promise.all([
    this.assetsService.findOne(createCompositeDto.songId),
    this.assetsService.findOne(createCompositeDto.starId),
    this.assetsService.findOne(createCompositeDto.lookId),
    this.assetsService.findOne(createCompositeDto.moveId),
    this.assetsService.findOne(createCompositeDto.worldId),
  ]);

  // 2. Aggregate metadata
  const aggregatedMetadata = this.aggregateMetadata({
    song,
    star,
    look,
    move,
    world,
  });

  // 3. Calculate synergy
  const synergyScore = this.calculateSynergy({
    song,
    star,
    look,
    move,
    world,
  });

  // 4. Create composite with aggregated metadata
  const composite = await this.assetsRepository.create({
    ...createCompositeDto,
    layer: 'C',

    // Aggregated Algorhythm fields
    performanceContext: aggregatedMetadata.performanceContext,
    musicalStyle: aggregatedMetadata.musicalStyle,
    targetAudience: aggregatedMetadata.targetAudience,
    culturalContext: aggregatedMetadata.culturalContext,
    energyLevel: aggregatedMetadata.energyLevel,

    // Aggregated layer-specific metadata
    genre: aggregatedMetadata.genre,              // From song
    mood: aggregatedMetadata.mood,                // From song + world
    accessories: aggregatedMetadata.accessories,   // From look
    primaryColors: aggregatedMetadata.primaryColors, // From look + world
    primaryMoves: aggregatedMetadata.primaryMoves,  // From move

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

    // Component references
    components: [
      { id: song._id, name: song.name, layer: 'G', nna_address: song.nna_address },
      { id: star._id, name: star.name, layer: 'S', nna_address: star.nna_address },
      { id: look._id, name: look.name, layer: 'L', nna_address: look.nna_address },
      { id: move._id, name: move.name, layer: 'M', nna_address: move.nna_address },
      { id: world._id, name: world.name, layer: 'W', nna_address: world.nna_address },
    ],
  });

  return composite;
}
```

### **Tier 3: Backfill Script** (For Existing 49 Assets)
**When**: One-time migration for existing Composites
**Where**: Backend migration script
**Purpose**: Add metadata to 49 existing Composites with 0% metadata

```typescript
// scripts/backfill-composite-metadata.ts
async function backfillCompositeMetadata() {
  const composites = await db.collection('assets').find({ layer: 'C' }).toArray();

  console.log(`Found ${composites.length} Composite assets to backfill`);

  for (const composite of composites) {
    try {
      // Fetch component assets
      const components = await fetchComponentAssets(composite.components);

      // Aggregate metadata
      const aggregatedMetadata = aggregateMetadata(components);
      const synergyScore = calculateSynergy(components);

      // Update composite
      await db.collection('assets').updateOne(
        { _id: composite._id },
        {
          $set: {
            performanceContext: aggregatedMetadata.performanceContext,
            musicalStyle: aggregatedMetadata.musicalStyle,
            targetAudience: aggregatedMetadata.targetAudience,
            culturalContext: aggregatedMetadata.culturalContext,
            energyLevel: aggregatedMetadata.energyLevel,
            genre: aggregatedMetadata.genre,
            mood: aggregatedMetadata.mood,
            accessories: aggregatedMetadata.accessories,
            primaryColors: aggregatedMetadata.primaryColors,
            primaryMoves: aggregatedMetadata.primaryMoves,
            worldColorPalette: aggregatedMetadata.worldColorPalette,
            aggregatedMetadata: {
              synergyScore,
              ...aggregatedMetadata,
            },
          },
        }
      );

      console.log(`✅ Backfilled ${composite.name}`);
    } catch (error) {
      console.error(`❌ Failed to backfill ${composite.name}:`, error);
    }
  }

  console.log(`Backfill complete!`);
}
```

---

## 📋 **AGGREGATION ALGORITHMS**

### **1. Algorhythm Required Fields Aggregation**

```typescript
function aggregateAlgorhythmFields(components: Components): AlgorhythmFields {
  const { song, star, look, move, world } = components;

  return {
    // UNION: Combine all unique values from all components
    performanceContext: unique([
      ...song.performanceContext || [],
      ...star.performanceContext || [],
      ...look.performanceContext || [],
      ...move.performanceContext || [],
      ...world.performanceContext || [],
    ]),

    // INTERSECTION: Only values present in ALL components (or majority)
    targetAudience: intersectionOrMajority([
      song.targetAudience || [],
      star.targetAudience || [],
      look.targetAudience || [],
      move.targetAudience || [],
      world.targetAudience || [],
    ]),

    // PRIMARY: Song + Star take precedence
    culturalContext: unique([
      ...song.culturalContext || [],  // PRIMARY
      ...star.culturalContext || [],  // SECONDARY
      // Look, Move, World are tertiary
    ]),

    // PRIMARY: Song determines musical style
    musicalStyle: song.musicalStyle || [],

    // AVERAGE/DOMINANT: Most common energy level across components
    energyLevel: calculateDominantEnergy([
      song.energyLevel,
      star.energyLevel,
      move.energyLevel,
      // Look and World contribute less to energy
    ]),
  };
}
```

### **2. Layer-Specific Metadata Aggregation**

```typescript
function aggregateLayerMetadata(components: Components): LayerMetadata {
  const { song, star, look, move, world } = components;

  return {
    // From Song
    genre: song.genre || [],
    songMood: song.mood || [],
    tempo: song.songMetadata?.bpm || null,
    key: song.songMetadata?.key || null,

    // From Star
    gender: star.starMetadata?.gender || null,
    ageGroup: star.starMetadata?.ageGroup || null,
    starEnergy: star.starMetadata?.energy || null,

    // From Look
    accessories: look.accessories || [],
    primaryColors: look.primaryColors || [],
    fashionStyle: look.fashionStyle || [],

    // From Move
    primaryMoves: move.primaryMoves || [],
    danceStyle: move.moveMetadata?.danceStyle || null,
    complexity: move.moveMetadata?.complexity || null,

    // From World
    environment: world.worldMetadata?.environment || null,
    atmosphere: world.worldMetadata?.atmosphere || null,
    worldMood: world.mood || [],
    worldColorPalette: world.worldColorPalette || [],

    // Combined/Derived
    mood: unique([
      ...song.mood || [],
      ...world.mood || [],
    ]),

    colorPalette: unique([
      ...look.primaryColors || [],
      ...world.worldColorPalette || [],
    ]),
  };
}
```

### **3. Synergy Score Calculation**

```typescript
function calculateSynergyScore(components: Components): number {
  const { song, star, look, move, world } = components;

  // 1. Visual Cohesion (20%): Do colors and styles match?
  const visualCohesion = calculateVisualCohesion(look, world);

  // 2. Cultural Alignment (25%): Are all components from same culture?
  const culturalAlignment = calculateCulturalAlignment(components);

  // 3. Energy Balance (25%): Are energy levels compatible?
  const energyBalance = calculateEnergyBalance([
    song.energyLevel,
    star.energyLevel,
    move.energyLevel,
  ]);

  // 4. Audience Match (15%): Do target audiences overlap?
  const audienceMatch = calculateAudienceMatch(components);

  // 5. Thematic Coherence (15%): Do moods and themes align?
  const thematicCoherence = calculateThematicCoherence(components);

  // Weighted average
  const synergyScore =
    (visualCohesion * 0.20) +
    (culturalAlignment * 0.25) +
    (energyBalance * 0.25) +
    (audienceMatch * 0.15) +
    (thematicCoherence * 0.15);

  return Math.round(synergyScore * 100); // 0-100 scale
}

// Helper: Visual Cohesion
function calculateVisualCohesion(look: Asset, world: Asset): number {
  const lookColors = look.primaryColors || [];
  const worldColors = world.worldColorPalette || [];

  // How many colors overlap?
  const colorOverlap = intersection(lookColors, worldColors).length;
  const maxPossible = Math.max(lookColors.length, worldColors.length);

  return maxPossible > 0 ? colorOverlap / maxPossible : 0.5;
}

// Helper: Cultural Alignment
function calculateCulturalAlignment(components: Components): number {
  const cultures = [
    components.song.culturalContext || [],
    components.star.culturalContext || [],
    components.look.culturalContext || [],
    components.move.culturalContext || [],
    components.world.culturalContext || [],
  ].filter(c => c.length > 0);

  if (cultures.length === 0) return 0.5; // No data = neutral

  // Find most common cultural context
  const allCultures = cultures.flat();
  const mostCommon = mode(allCultures);

  // How many components share this culture?
  const matchCount = cultures.filter(c => c.includes(mostCommon)).length;

  return matchCount / cultures.length;
}

// Helper: Energy Balance
function calculateEnergyBalance(energyLevels: string[]): number {
  const energyMap = { 'low': 1, 'medium': 2, 'high': 3, 'extreme': 4 };
  const numericLevels = energyLevels
    .filter(e => e && energyMap[e])
    .map(e => energyMap[e]);

  if (numericLevels.length === 0) return 0.5; // No data = neutral

  // Calculate standard deviation (lower = more balanced)
  const mean = average(numericLevels);
  const variance = average(numericLevels.map(e => Math.pow(e - mean, 2)));
  const stdDev = Math.sqrt(variance);

  // Normalize: 0 stdDev = perfect (1.0), 1.5 stdDev = poor (0.0)
  return Math.max(0, 1 - (stdDev / 1.5));
}

// Helper: Audience Match
function calculateAudienceMatch(components: Components): number {
  const audiences = [
    components.song.targetAudience || [],
    components.star.targetAudience || [],
    components.look.targetAudience || [],
    components.move.targetAudience || [],
    components.world.targetAudience || [],
  ].filter(a => a.length > 0);

  if (audiences.length === 0) return 0.5; // No data = neutral

  // Find intersection of all audiences
  const commonAudiences = audiences.reduce((acc, curr) =>
    intersection(acc, curr)
  );

  // If there's any overlap, it's a good match
  return commonAudiences.length > 0 ? 1.0 : 0.3;
}

// Helper: Thematic Coherence
function calculateThematicCoherence(components: Components): number {
  const moods = [
    ...components.song.mood || [],
    ...components.world.mood || [],
  ];

  if (moods.length === 0) return 0.5; // No data = neutral

  // Find most common mood
  const mostCommonMood = mode(moods);
  const moodCount = moods.filter(m => m === mostCommonMood).length;

  return moodCount / moods.length;
}
```

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Frontend Real-Time Aggregation** (Week 1)

**Goal**: Show users aggregated metadata during Composite registration

**Tasks**:
1. Create `aggregateCompositeMetadata()` utility function
2. Create `calculateSynergyScore()` utility function
3. Integrate into `CompositeRegisterAssetPage.tsx`
4. Show real-time preview as user selects components
5. Validate synergy score (warn if < 50%)

**Deliverables**:
- `/src/utils/compositeMetadataAggregation.ts` (new file)
- `/src/utils/synergy ScoreCalculator.ts` (new file)
- Updated `CompositeRegisterAssetPage.tsx`

**Success Criteria**:
- ✅ Real-time aggregation works as components selected
- ✅ Synergy score displayed with color coding (red < 50%, yellow < 80%, green ≥ 80%)
- ✅ User can see preview BEFORE saving

---

### **Phase 2: Backend Aggregation Service** (Week 2)

**Goal**: Server-side aggregation as source of truth

**Tasks**:
1. Create `CompositeMetadataAggregator` service in backend
2. Integrate into `CompositesService.create()`
3. Add aggregation on Composite update (if components change)
4. Add validation (require all 5 components)
5. Return aggregated metadata in API response

**Deliverables**:
- `/src/services/composite-metadata-aggregator.service.ts` (new file)
- Updated `composites.service.ts`
- Updated `Asset` schema with `aggregatedMetadata` field

**Success Criteria**:
- ✅ All NEW Composites created with aggregated metadata
- ✅ API response includes `aggregatedMetadata` object
- ✅ Synergy score calculated server-side

---

### **Phase 3: Backfill Existing Composites** (Week 2)

**Goal**: Add metadata to 49 existing Composites

**Tasks**:
1. Create backfill migration script
2. Fetch all 49 Composites with `layer: 'C'`
3. For each: fetch components, aggregate metadata, update
4. Log progress and errors
5. Verify 100% completion

**Deliverables**:
- `/scripts/backfill-composite-metadata.ts` (new file)
- Migration log report

**Success Criteria**:
- ✅ 49/49 Composites backfilled successfully
- ✅ All Composites now have `performanceContext`, `musicalStyle`, etc.
- ✅ All Composites have synergy scores

---

### **Phase 4: AI Enhancement** (Week 3 - Backend Team)

**Goal**: Backend AI service to enhance Composite descriptions

**Tasks**:
1. Add Composite-specific AI prompt
2. Use aggregated metadata to generate rich description
3. Generate composite-specific tags
4. Calculate confidence score

**Deliverables**:
- Updated AI service with Composite strategy
- Composite-specific AI prompts

**Success Criteria**:
- ✅ Composites get AI-generated descriptions
- ✅ Composites get AI-generated tags
- ✅ AI metadata success rate: 100% (up from 0%)

---

## 📊 **VALIDATION RULES**

### **Composite Registration Validation**:

```typescript
// Frontend validation
function validateCompositeForRegistration(composite: CompositeInput): ValidationResult {
  const errors = [];

  // 1. All 5 components required
  if (!composite.songId) errors.push('Song component required');
  if (!composite.starId) errors.push('Star component required');
  if (!composite.lookId) errors.push('Look component required');
  if (!composite.moveId) errors.push('Move component required');
  if (!composite.worldId) errors.push('World component required');

  // 2. All components must exist and be valid
  // (checked via API calls)

  // 3. Synergy score must be reasonable
  if (composite.synergyScore !== null && composite.synergyScore < 30) {
    errors.push('Synergy score too low - components may not work well together');
  }

  // 4. At least ONE Algorhythm field must be populated
  if (!composite.performanceContext || composite.performanceContext.length === 0) {
    errors.push('Performance context required (aggregated from components)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 📊 **SUCCESS METRICS**

### **Current State** (Before Implementation):
- Composites with metadata: 0/49 (0%)
- Composites with synergy scores: 0/49 (0%)
- Composites with Algorhythm fields: 0/49 (0%)
- AI metadata success rate: 0%

### **Target State** (After Implementation):
- Composites with metadata: 49/49 (100%)
- Composites with synergy scores: 49/49 (100%)
- Composites with Algorhythm fields: 49/49 (100%)
- AI metadata success rate: 95%+
- Average synergy score: 75%+

### **User Experience Metrics**:
- Real-time aggregation: <2 seconds
- Synergy calculation: <3 seconds
- User can see preview before save: 100%
- Users understand synergy score: 90%+

---

## 🎯 **NEXT STEPS**

### **Immediate Actions** (This Week):
1. ✅ Review this strategy document with backend team
2. 🔧 Create frontend aggregation utility functions
3. 🔧 Integrate into Composite registration page
4. 🔧 Begin backend aggregation service development

### **Short-term** (Next 2 Weeks):
1. Deploy frontend real-time aggregation
2. Deploy backend aggregation service
3. Run backfill script on 49 existing Composites
4. Verify 100% metadata coverage

### **Medium-term** (Week 3-4):
1. Backend AI enhancement for Composites
2. Monitor synergy scores and user feedback
3. Refine aggregation algorithms
4. Performance optimization

---

**Document Created**: October 10, 2025
**Priority**: 🚨 **CRITICAL**
**Status**: 🔧 **READY FOR IMPLEMENTATION**
**Backend Alignment**: ✅ **REQUIRED**
