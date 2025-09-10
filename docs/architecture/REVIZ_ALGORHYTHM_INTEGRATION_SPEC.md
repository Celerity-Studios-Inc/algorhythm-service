# ReViz Expo AlgoRhythm Integration Specification v3.1
## NNA Registry Service + AlgoRhythm Compatibility Engine

**Version**: 3.1 Ultra-Simplified  
**Date**: July 27, 2025  
**Status**: Implementation Phase 1 (Songs Layer)

---

## 🎯 **Overview**

This specification defines the integration between the NNA Registry Service and the AlgoRhythm AI recommendation engine for ReViz Expo. The system enables intelligent cross-layer asset recommendations and real-time template generation using an ultra-simplified, iterative approach.

---

## 🏗️ **Architecture: Independent Layers with Compatibility Metadata**

### **Core Principle**
Each layer (Songs, Stars, Looks, Moves, Worlds) maintains independence while using rich compatibility metadata to enable intelligent cross-layer recommendations. Implementation follows an ultra-simplified, one-layer-at-a-time approach.

### **Implementation Strategy**
- **Phase 1**: Ultra-simplified Songs Layer (essential gender information only)
- **Phase 2**: Stars Layer enhancement (after Songs is complete)
- **Phase 3**: Looks Layer enhancement (after Stars is complete)
- **Phase 4**: Moves Layer enhancement (after Looks is complete)
- **Phase 5**: Worlds Layer enhancement (after Moves is complete)

---

## 📊 **Ultra-Simplified Metadata Schema (Phase 1)**

### **Song Asset Metadata (Ultra-Simplified)**
```typescript
interface SongAsset {
  // NNA Core (unchanged)
  nna_address: string; // G.POP.VIN.001
  human_friendly_name: string;
  
  // Basic Metadata (manual input)
  title: string;
  artist: string;
  album?: string;
  year_released: number;
  duration_seconds: number;
  bpm: number;
  genre: string;
  
  // Ultra-Simplified Gender Information (AI-generated)
  originalArtistGender: 'male' | 'female' | 'group' | 'unknown';
  genderSuitability: 'male' | 'female' | 'unisex';
  vocalRange: 'low' | 'medium' | 'high';
  ageAppropriateness: string[];
  
  // Legacy fields for backward compatibility
  remixedBy?: string;
  originalSongId?: string;
}
```

### **Star Asset Metadata (Future Phase 2)**
```typescript
interface StarAsset {
  // NNA Core (unchanged)
  nna_address: string; // S.POP.IDF.001
  human_friendly_name: string;
  
  // Character Identity (enhanced)
  star_name: string; // "Kimmy"
  archetype: string; // "pop_idol"
  personality_traits: string[]; // ["confident", "energetic", "friendly"]
  
  // Physical Characteristics (enhanced)
  gender: 'male' | 'female' | 'non_binary';
  apparent_age_range: string; // "young_adult"
  ethnicity: string;
  body_type: string;
  
  // Style Profile (enhanced)
  primary_style: string; // "modern_pop"
  style_compatibility: string[]; // ["modern", "casual", "pop"]
  energy_profile: 'low' | 'moderate' | 'high';
  
  // Performance Characteristics (enhanced)
  vocal_compatibility: string[]; // ["pop", "contemporary"]
  dance_ability: 'beginner' | 'intermediate' | 'advanced';
  
  // Cultural Context (enhanced)
  cultural_background: string[]; // ["asian", "contemporary"]
  language_affinity: string[]; // ["english", "korean"]
  
  // Variant System (enhanced)
  variant_type?: 'base' | 'hair_variant' | 'makeup_variant' | 'style_variant';
  base_star?: string; // If variant, points to base
  
  // Compatibility with Other Layers (enhanced)
  preferred_look_categories: string[]; // ["casual", "performance"]
  avoid_look_categories: string[]; // ["formal", "vintage"]
  move_compatibility: string[]; // ["pop_dance", "contemporary"]
  world_compatibility: string[]; // ["indoor", "performance"]
  
  // Song Compatibility (enhanced)
  song_genre_affinity: string[]; // ["pop", "kpop", "contemporary"]
  song_energy_range: string[]; // ["moderate", "high"]
  
  // Generation Metadata (unchanged)
  generation_prompt: string;
  reference_images: string[];
  ai_model_used: string;
  
  // Curator Metadata (enhanced)
  curator_notes: string;
  creator_description: string;
  ai_generated_description: string;
  ai_generated_tags: string[];
  
  // Usage Analytics (enhanced)
  selection_count: number;
  completion_rate: number;
  user_satisfaction_score: number;
}
```

### **Look Asset Metadata (Future Phase 3)**
```typescript
interface LookAsset {
  // NNA Core (unchanged)
  nna_address: string; // L.CAS.TEE.001
  human_friendly_name: string;
  
  // Outfit Information (enhanced)
  outfit_name: string; // "Peach T-shirt"
  outfit_type: string; // "crop_top"
  style_category: string; // "casual"
  formality_level: 'casual' | 'semi_formal' | 'formal' | 'performance';
  
  // Style Characteristics (enhanced)
  color_scheme: string[]; // ["peach", "neutral"]
  seasonal_context: string[]; // ["spring", "summer"]
  compatibility_tags: string[]; // ["modern", "casual", "pop"]
  
  // Star Compatibility (enhanced)
  star_compatibility: {
    body_type: string[]; // ["slim", "average"]
    gender: string[]; // ["female"]
    age_range: string; // "young_adult"
    style_affinity: string[]; // ["modern", "casual"]
  };
  
  // Cultural Context (enhanced)
  cultural_appropriateness: string[]; // ["universal", "western"]
  
  // Generation Metadata (unchanged)
  generation_prompt: string;
  reference_images: string[];
  ai_model_used: string;
  
  // Curator Metadata (enhanced)
  curator_notes: string;
  creator_description: string;
  ai_generated_description: string;
  ai_generated_tags: string[];
  
  // Usage Analytics (enhanced)
  selection_count: number;
  completion_rate: number;
  user_satisfaction_score: number;
}
```

### **Move Asset Metadata (Future Phase 4)**
```typescript
interface MoveAsset {
  // NNA Core (unchanged)
  nna_address: string; // M.POP.DNC.001
  human_friendly_name: string;
  
  // Dance Information (enhanced)
  move_name: string; // "Pop Dance Basic"
  dance_style: string; // "contemporary_pop"
  tempo_range: [number, number]; // [90, 130] BPM
  energy_level: 'low' | 'moderate' | 'high';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  
  // Style Compatibility (enhanced)
  style_compatibility: string[]; // ["modern", "pop", "casual"]
  outfit_compatibility: string[]; // ["casual", "performance"]
  mood_alignment: string[]; // ["energetic", "confident", "fun"]
  
  // Choreography Details (enhanced)
  choreography_details: {
    arm_movements: string; // "expressive"
    hip_movements: string; // "rhythmic"
    footwork: string; // "dynamic"
    facial_expressions: string; // "confident"
  };
  
  // Generation Metadata (unchanged)
  generation_prompt: string;
  reference_videos: string[];
  ai_model_used: string;
  
  // Curator Metadata (enhanced)
  curator_notes: string;
  creator_description: string;
  ai_generated_description: string;
  ai_generated_tags: string[];
  
  // Usage Analytics (enhanced)
  selection_count: number;
  completion_rate: number;
  user_satisfaction_score: number;
}
```

### **World Asset Metadata (Future Phase 5)**
```typescript
interface WorldAsset {
  // NNA Core (unchanged)
  nna_address: string; // W.IND.LIV.001
  human_friendly_name: string;
  
  // Environment Information (enhanced)
  world_name: string; // "Living Room"
  environment_type: string; // "indoor_domestic"
  atmosphere: string[]; // ["intimate", "warm", "comfortable"]
  intimacy_level: 'intimate' | 'public' | 'performance';
  
  // Visual Characteristics (enhanced)
  lighting_style: string; // "natural_warm"
  style_compatibility: string[]; // ["casual", "modern", "domestic"]
  mood_enhancement: string[]; // ["relaxed", "intimate", "nostalgic"]
  
  // Cultural Context (enhanced)
  cultural_context: string[]; // ["western", "contemporary"]
  visual_characteristics: {
    color_palette: string[]; // ["warm", "neutral"]
    texture_style: string; // "soft"
    spatial_scale: string; // "intimate"
  };
  
  // Generation Metadata (unchanged)
  generation_prompt: string;
  reference_images: string[];
  ai_model_used: string;
  
  // Curator Metadata (enhanced)
  curator_notes: string;
  creator_description: string;
  ai_generated_description: string;
  ai_generated_tags: string[];
  
  // Usage Analytics (enhanced)
  selection_count: number;
  completion_rate: number;
  user_satisfaction_score: number;
}
```

---

## 🧠 **AlgoRhythm Integration Points (Ultra-Simplified)**

### **1. Template Generation API (Phase 1)**
```typescript
// POST /api/algorhythm/template
interface TemplateGenerationRequest {
  song_nna_address: string; // G.POP.VIN.001
  user_preferences?: {
    preferred_energy?: 'low' | 'moderate' | 'high';
    style_preferences?: string[];
    complexity_level?: 'beginner' | 'intermediate' | 'advanced';
  };
}

interface TemplateGenerationResponse {
  template: {
    song: SongAsset;
    star?: StarAsset; // Available after Phase 2
    look?: LookAsset; // Available after Phase 3
    moves?: MoveAsset; // Available after Phase 4
    world?: WorldAsset; // Available after Phase 5
    compatibility_score: number;
  };
  alternatives: {
    stars?: StarAsset[]; // Available after Phase 2
    looks?: LookAsset[]; // Available after Phase 3
    moves?: MoveAsset[]; // Available after Phase 4
    worlds?: WorldAsset[]; // Available after Phase 5
  };
}
```

### **2. Real-Time Recommendation Updates (Phase 1)**
```typescript
// POST /api/algorhythm/recommendations
interface RecommendationUpdateRequest {
  current_selection: {
    song: string;
    star?: string; // Available after Phase 2
    look?: string; // Available after Phase 3
    moves?: string; // Available after Phase 4
    world?: string; // Available after Phase 5
  };
  changed_layer: 'song' | 'star' | 'look' | 'moves' | 'world';
}

interface RecommendationUpdateResponse {
  recommendations: {
    stars?: StarAsset[]; // Available after Phase 2
    looks?: LookAsset[]; // Available after Phase 3
    moves?: MoveAsset[]; // Available after Phase 4
    worlds?: WorldAsset[]; // Available after Phase 5
  };
  compatibility_scores: {
    [asset_id: string]: number;
  };
}
```

### **3. Compatibility Scoring API (Phase 1)**
```typescript
// POST /api/algorhythm/compatibility
interface CompatibilityRequest {
  assets: {
    song?: string;
    star?: string; // Available after Phase 2
    look?: string; // Available after Phase 3
    moves?: string; // Available after Phase 4
    world?: string; // Available after Phase 5
  };
}

interface CompatibilityResponse {
  overall_score: number;
  layer_scores: {
    song_star?: number; // Available after Phase 2
    star_look?: number; // Available after Phase 3
    song_moves?: number; // Available after Phase 4
    aesthetic_harmony?: number; // Available after Phase 5
  };
  feedback: {
    strengths: string[];
    suggestions: string[];
    warnings?: string[];
  };
}
```

---

## 🔄 **User Experience Flow (Phase 1)**

### **1. Song Selection**
```
User selects "Pretty Little Baby" (G.POP.VIN.001)
↓
AlgoRhythm analyzes song metadata:
- Genre: Pop
- BPM: 110
- Original Artist Gender: Female
- Gender Suitability: Unisex
- Vocal Range: Medium
- Age Appropriateness: ["all ages", "teen+"]
↓
Generate initial template (Songs layer only)
```

### **2. Template Generation (Phase 1)**
```
AlgoRhythm generates Songs-focused template:
- Song: G.POP.VIN.001 (Pretty Little Baby)
- Compatibility Score: 100% (songs layer only)
- Note: Other layers will be added in future phases
```

### **3. Real-Time Customization (Phase 1)**
```
User changes song to different selection
↓
AlgoRhythm updates song analysis:
- New genre, BPM, gender information
- Updated compatibility score
- Note: Cross-layer recommendations available in future phases
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Ultra-Simplified Songs Layer (Current)**
- [x] Extend Songs asset schema with essential gender information
- [x] Implement AI generation for gender analysis
- [x] Create basic compatibility foundation
- [x] Frontend integration for Songs layer
- [ ] Test and validate Songs layer functionality

### **Phase 2: Stars Layer Enhancement (Future)**
- [ ] Extend Stars asset schema with personality and compatibility metadata
- [ ] Implement star-song compatibility scoring
- [ ] Add star variant system
- [ ] Create star recommendation algorithms
- [ ] Frontend integration for Stars layer

### **Phase 3: Looks Layer Enhancement (Future)**
- [ ] Extend Looks asset schema with style compatibility metadata
- [ ] Implement look-star compatibility scoring
- [ ] Add look variant system
- [ ] Create look recommendation algorithms
- [ ] Frontend integration for Looks layer

### **Phase 4: Moves Layer Enhancement (Future)**
- [ ] Extend Moves asset schema with dance compatibility metadata
- [ ] Implement moves-song compatibility scoring
- [ ] Add moves variant system
- [ ] Create moves recommendation algorithms
- [ ] Frontend integration for Moves layer

### **Phase 5: Worlds Layer Enhancement (Future)**
- [ ] Extend Worlds asset schema with environment compatibility metadata
- [ ] Implement world-aesthetic compatibility scoring
- [ ] Add world variant system
- [ ] Create world recommendation algorithms
- [ ] Frontend integration for Worlds layer

---

## 📊 **Performance Considerations (Ultra-Simplified)**

### **Phase 1 Caching Strategy**
```typescript
// Cache Songs layer analysis
const songsAnalysisCache = new Map<string, SongAnalysis>();

// Cache gender information generation
const genderInfoCache = new Map<string, GenderInfo>();

// Cache basic compatibility scores
const basicCompatibilityCache = new Map<string, number>();
```

### **Optimization Techniques (Phase 1)**
- **Songs Metadata Caching**: Cache AI-generated gender information
- **Basic Compatibility Scoring**: Simple gender-based compatibility
- **Lazy Loading**: Load detailed metadata only when needed
- **Batch Processing**: Process multiple songs in single request

---

## 🧪 **Testing Strategy (Phase 1)**

### **Unit Tests**
- Songs gender information generation
- Basic compatibility scoring
- Metadata validation

### **Integration Tests**
- Songs API endpoint functionality
- AI generation accuracy
- Performance under load

### **User Acceptance Tests**
- Songs layer quality assessment
- Gender information accuracy
- User satisfaction metrics

---

## 📈 **Success Metrics (Phase 1)**

### **Technical Metrics**
- Songs analysis speed: < 200ms
- Gender information accuracy: > 90%
- API response time: < 100ms
- Cache hit rate: > 85%

### **User Experience Metrics**
- Songs layer acceptance rate: > 80%
- Gender information relevance
- Time to complete Songs registration
- User satisfaction scores

---

## 🔮 **Future Enhancements**

### **Advanced Features (Future Phases)**
- **Cross-Layer Compatibility**: Full multi-layer recommendations
- **Trend-based Recommendations**: Use popular combinations
- **Personalization**: Learn from user preferences
- **A/B Testing**: Optimize recommendation algorithms

### **AI Improvements (Future Phases)**
- **Machine Learning**: Improve scoring algorithms
- **Content Analysis**: Analyze actual video performance
- **Predictive Modeling**: Anticipate user preferences
- **Semantic Embeddings**: Advanced similarity matching

---

## 🎯 **Current Status**

### **✅ Completed (Phase 1)**
- Ultra-simplified Songs layer schema
- Essential gender information fields
- AI generation for gender analysis
- Basic compatibility foundation
- Asset analysis framework
- Document preservation strategy

### **🔄 In Progress (Phase 1)**
- Frontend Songs layer implementation
- Testing and validation
- Performance optimization

### **📋 Next Steps**
1. Complete Phase 1 Songs layer implementation
2. Test and validate with frontend team
3. Begin Phase 2 Stars layer planning
4. Iterate and improve based on user feedback

---

**Next Steps**: Complete Phase 1 implementation with frontend team, then move to Phase 2 Stars layer enhancement. 