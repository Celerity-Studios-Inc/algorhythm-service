# ReViz Expo - AlgoRhythm Integration Guide v2.0
*Updated guide for integrating with AlgoRhythm AI Recommendation Engine*

**Version**: 2.0  
**Release Date**: August 2025  
**Target Team**: ReViz Expo Mobile Development Team  
**Previous Version**: reviz_expo_api_guide.md (NNA-only version)

---

## 🚀 What's New in v2.0

This guide shows how to integrate with **AlgoRhythm** - ReViz's AI recommendation engine that powers the magical "Start with a Song" experience. Instead of manually querying NNA assets, the app now uses AlgoRhythm's intelligent APIs to get perfect video templates instantly.

### **Key Changes from v1.0**
- ✅ **No more manual asset filtering** - AlgoRhythm handles all compatibility logic
- ✅ **Pre-generated templates** - Instant access to complete video composites
- ✅ **Smart recommendations** - AI-powered template selection
- ✅ **Simplified integration** - Fewer API calls, better performance

---

## 📱 Core User Flow Integration

### **1. Song Selection → Template Recommendation**

When user selects a song, get the perfect template instantly:

```typescript
// When user selects "Pretty Little Baby" by Connie Francis
const recommendTemplate = async (songId: string): Promise<VideoTemplate> => {
  const response = await fetch(`${ALGORHYTHM_API}/recommend/template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      song_id: songId, // e.g., "G.POP.VIN.001"
      user_context: {
        user_id: currentUser.id,
        preferences: {
          energy_preference: userProfile.energyPreference || 'high',
          style_preference: userProfile.stylePreference || 'modern'
        },
        device_info: {
          platform: Platform.OS,
          version: Platform.Version
        }
      }
    })
  });

  const data = await response.json();
  
  // AlgoRhythm returns complete template with all components
  return {
    templateId: data.recommendation.template_id,
    previewUrl: data.recommendation.template_metadata.preview_url,
    thumbnailUrl: data.recommendation.template_metadata.thumbnail_url,
    components: data.recommendation.components,
    confidenceScore: data.recommendation.confidence_score
  };
};

// Usage in your component
const handleSongSelection = async (song: Song) => {
  setLoading(true);
  try {
    const template = await recommendTemplate(song.nna_address);
    
    // Navigate to preview screen with recommended template
    navigation.navigate('TemplatePreview', {
      template,
      song,
      alternatives: template.alternatives // Other high-scoring options
    });
  } catch (error) {
    console.error('Failed to get recommendation:', error);
    // Fallback to first available template
  } finally {
    setLoading(false);
  }
};
```

### **2. Layer Customization UI**

When user wants to change a specific layer (Star, Look, Moves, World):

```typescript
// Get variations for a specific layer
const getLayerVariations = async (
  currentTemplateId: string,
  layer: 'star' | 'look' | 'moves' | 'world',
  songId: string
): Promise<LayerVariation[]> => {
  const response = await fetch(`${ALGORHYTHM_API}/recommend/variations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      current_template_id: currentTemplateId,
      vary_layer: layer,
      song_id: songId,
      limit: 6 // Number of variations to show
    })
  });

  const data = await response.json();
  return data.variations;
};

// UI Component for layer selection
const LayerCustomizer = ({ 
  currentTemplate, 
  layer, 
  onVariantSelected 
}: LayerCustomizerProps) => {
  const [variations, setVariations] = useState<LayerVariation[]>([]);
  
  useEffect(() => {
    loadVariations();
  }, [currentTemplate, layer]);

  const loadVariations = async () => {
    const variants = await getLayerVariations(
      currentTemplate.id,
      layer,
      currentTemplate.songId
    );
    setVariations(variants);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {variations.map((variant) => (
        <TouchableOpacity
          key={variant.template_id}
          onPress={() => onVariantSelected(variant)}
          style={styles.variantCard}
        >
          <Image 
            source={{ uri: variant.variant_component.thumbnail_url }}
            style={styles.variantThumbnail}
          />
          <Text style={styles.variantName}>
            {variant.variant_component.name}
          </Text>
          <CompatibilityBadge score={variant.compatibility_score} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
```

### **3. Category-Based Selection (Square Cards)**

For the category selection UI shown in the mockups:

```typescript
// Get recommended categories for a layer
const getCategoryRecommendations = async (
  songId: string,
  layer: LayerType,
  currentTemplateId: string
): Promise<CategoryRecommendation[]> => {
  const response = await fetch(`${ALGORHYTHM_API}/recommend/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      song_id: songId,
      layer: layer,
      current_template_id: currentTemplateId
    })
  });

  return response.json().then(data => data.recommended_categories);
};

// Category Grid Component
const CategoryGrid = ({ 
  songId, 
  layer, 
  currentTemplate,
  onCategorySelected 
}: CategoryGridProps) => {
  const [categories, setCategories] = useState<CategoryRecommendation[]>([]);

  useEffect(() => {
    loadCategories();
  }, [songId, layer]);

  const loadCategories = async () => {
    const cats = await getCategoryRecommendations(
      songId, 
      layer, 
      currentTemplate.id
    );
    setCategories(cats);
  };

  return (
    <View style={styles.categoryGrid}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.category_id}
          style={styles.categoryCard}
          onPress={() => onCategorySelected(category)}
        >
          <Image 
            source={{ uri: category.thumbnail_url }}
            style={styles.categoryImage}
          />
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryName}>{category.category_name}</Text>
            <Text style={styles.categoryCount}>
              {category.available_variants} options
            </Text>
          </View>
          <CompatibilityIndicator score={category.compatibility_score} />
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### **4. Variant Selection (Circle Options)**

When user selects a category, show specific variants:

```typescript
// Get variants within a category
const getCategoryVariants = async (
  songId: string,
  layer: LayerType,
  categoryId: string,
  currentTemplateId: string
): Promise<VariantOption[]> => {
  const response = await fetch(`${ALGORHYTHM_API}/recommend/category-variants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      song_id: songId,
      layer: layer,
      category_id: categoryId,
      current_template_id: currentTemplateId,
      limit: 8
    })
  });

  return response.json().then(data => data.variants);
};

// Circular variant selector
const VariantSelector = ({ 
  category, 
  songId, 
  layer,
  currentTemplate,
  onVariantSelected 
}: VariantSelectorProps) => {
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    loadVariants();
  }, [category]);

  const loadVariants = async () => {
    const vars = await getCategoryVariants(
      songId,
      layer,
      category.category_id,
      currentTemplate.id
    );
    setVariants(vars);
    
    // Find current variant index
    const currentIndex = vars.findIndex(v => v.is_current);
    if (currentIndex >= 0) setSelectedIndex(currentIndex);
  };

  return (
    <View style={styles.variantSelector}>
      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / VARIANT_WIDTH);
          setSelectedIndex(index);
          onVariantSelected(variants[index]);
        }}
      >
        {variants.map((variant, index) => (
          <TouchableOpacity
            key={variant.template_id}
            style={[
              styles.variantCircle,
              selectedIndex === index && styles.selectedVariant
            ]}
            onPress={() => onVariantSelected(variant)}
          >
            <Image 
              source={{ uri: variant.variant_asset.thumbnail_url }}
              style={styles.variantImage}
            />
            {variant.is_current && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Current</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
```

### **5. Analytics Integration**

Track user interactions to improve recommendations:

```typescript
// Analytics helper
const trackSelection = async (
  eventType: 'template_selected' | 'layer_changed' | 'remix_completed' | 'shared',
  templateId: string,
  songId: string,
  context?: any
) => {
  try {
    await fetch(`${ALGORHYTHM_API}/analytics/selection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        session_id: sessionId,
        selection_event: {
          type: eventType,
          template_id: templateId,
          song_id: songId,
          timestamp: new Date().toISOString(),
          context: {
            selection_time_ms: Date.now() - selectionStartTime,
            ...context
          }
        }
      })
    });
  } catch (error) {
    // Don't block UI for analytics failures
    console.warn('Analytics tracking failed:', error);
  }
};

// Usage examples
// When template is selected
await trackSelection('template_selected', template.id, song.id, {
  selection_index: 0,
  previous_template_id: null
});

// When layer is changed
await trackSelection('layer_changed', newTemplate.id, song.id, {
  changed_layer: 'look',
  previous_template_id: oldTemplate.id
});
```

---

## 🎨 UI Components

### **Compatibility Score Badge**
```typescript
const CompatibilityBadge = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score >= 0.9) return '#4CAF50'; // Green
    if (score >= 0.8) return '#FFC107'; // Amber
    return '#FF5722'; // Red
  };

  return (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.badgeText}>{Math.round(score * 100)}% Match</Text>
    </View>
  );
};
```

### **Loading States**
```typescript
const TemplateLoader = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color="#6200EE" />
    <Text style={styles.loaderText}>Finding your perfect match...</Text>
    <Text style={styles.loaderSubtext}>Powered by AlgoRhythm AI</Text>
  </View>
);
```

---

## 🔄 State Management

### **Redux/Context Setup**
```typescript
interface RemixState {
  currentSong: Song | null;
  currentTemplate: Template | null;
  originalTemplate: Template | null; // For revert functionality
  isLoading: boolean;
  error: string | null;
  history: Template[]; // For undo functionality
}

const RemixContext = createContext<{
  state: RemixState;
  actions: {
    selectSong: (song: Song) => Promise<void>;
    changeLayer: (layer: LayerType, variantId: string) => Promise<void>;
    revertToOriginal: () => void;
    undo: () => void;
    completeRemix: () => Promise<void>;
  };
}>(null);
```

---

## 🚨 Error Handling

### **Fallback Strategy**
```typescript
const getTemplateWithFallback = async (songId: string): Promise<Template> => {
  try {
    // Try AlgoRhythm first
    const recommended = await recommendTemplate(songId);
    return recommended;
  } catch (error) {
    console.error('AlgoRhythm failed, using fallback:', error);
    
    // Fallback: Get any complete composite for this song
    try {
      const composites = await fetch(
        `${NNA_API}/assets?layer=C&contains=${songId}&limit=1`
      );
      const data = await composites.json();
      
      if (data.assets.length > 0) {
        return convertNNAAssetToTemplate(data.assets[0]);
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    // Last resort: Show error UI
    throw new Error('No templates available for this song');
  }
};
```

---

## 🏃 Performance Optimization

### **Preloading Strategy**
```typescript
// Preload trending templates on app launch
const preloadTrendingTemplates = async () => {
  try {
    const trending = await fetch(`${ALGORHYTHM_API}/trending?limit=10`);
    const data = await trending.json();
    
    // Preload preview videos
    data.trending_templates.forEach(template => {
      Image.prefetch(template.thumbnail_url);
      // Video prefetch if using react-native-video
      Video.prefetch(template.preview_url);
    });
  } catch (error) {
    console.warn('Failed to preload trending:', error);
  }
};

// Call on app launch
useEffect(() => {
  preloadTrendingTemplates();
}, []);
```

### **Caching Responses**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@algorhythm_cache:';
const CACHE_TTL = 3600000; // 1 hour

const getCachedOrFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
  }

  const fresh = await fetcher();
  
  // Cache the result
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({
        data: fresh,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.warn('Cache write failed:', error);
  }

  return fresh;
};
```

---

## 🧪 Testing AlgoRhythm Integration

### **Mock AlgoRhythm Responses**
```typescript
const mockAlgoRhythmAPI = {
  '/recommend/template': {
    recommendation: {
      template_id: 'C.001.001.004',
      confidence_score: 0.95,
      components: {
        star: 'S.POP.IDF.002',
        look: 'L.MOD.POP.001',
        moves: 'M.POP.CON.001',
        song: 'G.POP.VIN.001',
        world: 'W.STG.CON.001'
      },
      template_metadata: {
        name: "Kimmy's Pop Star Energy",
        preview_url: 'https://example.com/preview.mp4',
        thumbnail_url: 'https://example.com/thumb.jpg'
      }
    }
  }
};

// Use in development
if (__DEV__) {
  global.fetch = jest.fn((url, options) => {
    const endpoint = url.replace(ALGORHYTHM_API, '');
    const mockData = mockAlgoRhythmAPI[endpoint];
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockData)
    });
  });
}
```

---

## 📊 Monitoring Integration Health

### **Health Check Component**
```typescript
const AlgoRhythmStatus = () => {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${ALGORHYTHM_API}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      setHealth({ status: 'error', message: error.message });
    }
  };

  if (!health) return null;

  return (
    <View style={styles.healthBadge}>
      <View 
        style={[
          styles.healthDot, 
          { backgroundColor: health.status === 'healthy' ? '#4CAF50' : '#F44336' }
        ]} 
      />
      <Text style={styles.healthText}>
        AlgoRhythm: {health.metrics?.avg_response_time_ms}ms
      </Text>
    </View>
  );
};
```

---

## 🚀 Migration Checklist

### **From NNA Direct to AlgoRhythm**
- [ ] Replace asset listing calls with template recommendations
- [ ] Remove manual compatibility filtering logic
- [ ] Update UI to use pre-generated templates
- [ ] Implement analytics tracking
- [ ] Add error handling with fallbacks
- [ ] Test with production data
- [ ] Monitor performance metrics

---

## 🔗 Quick Reference

### **API Endpoints**
```typescript
const ALGORHYTHM_ENDPOINTS = {
  recommendTemplate: '/recommend/template',
  getVariations: '/recommend/variations',
  getCategories: '/recommend/categories',
  getCategoryVariants: '/recommend/category-variants',
  trackSelection: '/analytics/selection',
  getTrending: '/trending',
  health: '/health'
};
```

### **TypeScript Interfaces**
```typescript
interface Template {
  id: string;
  components: {
    star: string;
    look: string;
    moves: string;
    song: string;
    world: string;
  };
  metadata: {
    name: string;
    description: string;
    preview_url: string;
    thumbnail_url: string;
  };
  compatibility_score: number;
}

interface LayerVariation {
  template_id: string;
  variant_component: {
    layer: string;
    asset_id: string;
    name: string;
    thumbnail_url: string;
  };
  compatibility_score: number;
  preview_url: string;
}

interface CategoryRecommendation {
  category_id: string;
  category_name: string;
  compatibility_score: number;
  description: string;
  thumbnail_url: string;
  available_variants: number;
}
```

---

*This guide enables the ReViz Expo team to integrate with AlgoRhythm for an intelligent, seamless video remixing experience.*