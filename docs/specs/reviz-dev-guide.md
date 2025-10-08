# 🎯 ReViz Complete Experience API - Developer Guide v2.0

**Version**: 2.0  
**Last Updated**: October 7, 2025  
**API Version**: Enhanced Implementation  
**Base URL**: `https://registry.{env}.reviz.dev/api/v1/reviz`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Complete Experience Endpoint](#complete-experience-endpoint)
4. [Request Configuration](#request-configuration)
5. [Response Structure](#response-structure)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Integration Examples](#integration-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **ReViz Complete Experience API** provides a single endpoint that returns everything needed for a complete video remixing experience:

- 🎵 **Song metadata** with full track information
- 🎬 **Composite video templates** (pre-matched combinations)
- ⭐ **Layer assets** (Stars, Looks, Moves, Worlds) with variants
- 🔗 **Asset relationships** and compatibility scores
- 📊 **Performance metrics** for monitoring

### URL-First Architecture

**All assets are returned as GCP Storage URLs** instead of embedded data. This provides:

✅ **95% Smaller API Responses** - 5MB instead of 50-100MB  
✅ **Global CDN Performance** - Assets cached at edge locations worldwide  
✅ **Parallel Loading** - Load multiple assets concurrently from CDN  
✅ **Progressive Experience** - Show thumbnails instantly, load full assets on-demand  
✅ **Bandwidth Efficiency** - Only download assets the user actually views  
✅ **Better Mobile Performance** - Optimized for cellular connections

```
Traditional Approach (Old):           URL-Based Approach (New):
─────────────────────────────        ─────────────────────────────
API Response: 100MB (all data)       API Response: 5MB (URLs only)
Response Time: 3-5 seconds           Response Time: 200ms
Loading Strategy: Sequential         Loading Strategy: Parallel
Network Usage: All at once           Network Usage: On-demand
CDN Caching: Not possible            CDN Caching: Global edge
Mobile Experience: Poor              Mobile Experience: Excellent
```

### What's New in v2.0

✅ **Single API Call** - Complete experience in one request  
✅ **Base/Variant Architecture** - Access up to 112,500 components efficiently  
✅ **Smart Caching** - L1/L2/L3 hierarchical caching (90%+ hit rate)  
✅ **Streaming Support** - Handle large responses (50MB+)  
✅ **Error Resilience** - Graceful degradation with fallbacks  
✅ **Performance Optimized** - <200ms API response + <400ms asset loading

---

## 🚀 Quick Start

### Installation

```bash
npm install @reviz/api-client
# or
yarn add @reviz/api-client
```

### Basic Usage

```typescript
import { ReVizClient } from '@reviz/api-client';

// Initialize client
const client = new ReVizClient({
  apiUrl: 'https://registry.dev.reviz.dev',
  authToken: 'your-jwt-token'
});

// Get complete experience for a song
const experience = await client.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  user_context: {
    user_id: 'user_123',
    preferences: {
      energy_preference: 'high',
      style_preference: 'modern'
    }
  },
  experience_config: {
    max_composites: 5,
    max_assets_per_layer: 6,
    include_variants: true,
    variant_depth: 6
  }
});

// Access data
console.log('Song:', experience.data.song_metadata.title);
console.log('Composites:', experience.data.composite_videos.length);
console.log('Stars:', experience.data.layer_assets.stars.assets.length);
```

---

## 📡 Complete Experience Endpoint

### Endpoint

```
POST /api/v1/reviz/complete-experience
```

### Authentication

All requests require JWT authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

### Request Body

```typescript
interface ReVizCompleteRequest {
  song_id: string;                    // Required: NNA address (e.g., "G.POP.TEN.003")
  request_id?: string;                // Optional: For request tracking
  
  user_context?: {
    user_id?: string;
    preferences?: {
      preferred_genres?: string[];
      excluded_assets?: string[];
      favorite_styles?: string[];
      energy_preference?: 'low' | 'medium' | 'high';
      style_preference?: 'classic' | 'modern' | 'trendy';
    };
    device_info?: {
      type: 'mobile' | 'tablet' | 'desktop' | 'tv';
      connection_speed?: 'slow' | 'medium' | 'fast';
      screen_resolution?: string;
    };
  };
  
  experience_config: {
    max_composites?: number;          // Default: 5, Range: 1-20
    max_assets_per_layer?: number;    // Default: 6, Range: 1-20
    include_variants?: boolean;       // Default: true
    variant_depth?: number;           // Default: 6, Range: 1-20
    layers?: Array<'stars' | 'looks' | 'moves' | 'worlds'>;  // Default: all
  };
  
  performance_optimization?: {
    preload_assets?: boolean;         // Default: true
    cache_strategy?: 'aggressive' | 'balanced' | 'minimal';  // Default: 'balanced'
    compression?: boolean;            // Default: true
    streaming?: boolean;              // Default: false (auto-detected)
  };
}
```

### Response Structure

```typescript
interface ReVizCompleteResponse {
  success: boolean;
  data: {
    song_metadata: SongMetadata;
    composite_videos: CompositeVideo[];
    layer_assets: {
      stars: LayerData;
      looks: LayerData;
      moves: LayerData;
      worlds: LayerData;
    };
    asset_relationships: {
      compatibility_matrix: Record<string, Record<string, number>>;
      base_to_variants: Record<string, string[]>;
      layer_dependencies: Record<string, string[]>;
    };
    performance_metrics: {
      total_assets_loaded: number;
      response_time_ms: number;
      cache_hit_rate: number;
      compression_ratio: number;
    };
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
    partial_response: boolean;
  };
}
```

**Key Point:** All asset data includes **GCP Storage URLs** instead of embedded media. This dramatically reduces response size and enables efficient parallel loading from CDN.

---

## ⚙️ Request Configuration

### Experience Config Options

#### Max Composites (Recommended: 5-10)

```typescript
experience_config: {
  max_composites: 5  // Number of pre-matched video templates
}
```

**Guidelines:**
- Mobile: 3-5 composites
- Desktop: 5-10 composites
- Tablet: 5-7 composites

#### Max Assets Per Layer (Recommended: 4-6)

```typescript
experience_config: {
  max_assets_per_layer: 6  // Base assets per layer (Stars, Looks, etc.)
}
```

**Impact:**
- 4 assets × 6 variants = 24 options per layer
- 6 assets × 6 variants = 36 options per layer

#### Include Variants (Recommended: true)

```typescript
experience_config: {
  include_variants: true,  // Include base + variants
  variant_depth: 6         // Number of variants per base asset
}
```

**Total Components Calculation:**
```
Total = max_composites 
      + (max_assets_per_layer × variant_depth × 4 layers)

Example: 5 + (6 × 6 × 4) = 149 total components
```

#### Layer Selection

```typescript
experience_config: {
  layers: ['stars', 'looks']  // Only load specific layers
}
```

**Use Cases:**
- All layers: Complete customization
- Specific layers: Faster loading for focused experiences

### User Context Configuration

#### Preferences

```typescript
user_context: {
  preferences: {
    energy_preference: 'high',        // 'low' | 'medium' | 'high'
    style_preference: 'modern',       // 'classic' | 'modern' | 'trendy'
    preferred_genres: ['pop', 'hip-hop'],
    excluded_assets: ['S.001.001.001']  // Assets to exclude
  }
}
```

#### Device Info

```typescript
user_context: {
  device_info: {
    type: 'mobile',                   // Optimize response for device
    connection_speed: 'fast',         // Affects preloading strategy
    screen_resolution: '1920x1080'    // Affects asset quality selection
  }
}
```

### Performance Optimization

#### Cache Strategy

```typescript
performance_optimization: {
  cache_strategy: 'aggressive'  // 'aggressive' | 'balanced' | 'minimal'
}
```

**Strategies:**
- **Aggressive**: Maximize cache usage, best for popular songs
- **Balanced**: Default, good for most use cases
- **Minimal**: Fresh data, best for testing/admin

#### Preloading

```typescript
performance_optimization: {
  preload_assets: true  // Preload thumbnails and previews
}
```

#### Streaming

```typescript
performance_optimization: {
  streaming: true  // Enable for large responses (>50MB)
}
```

**Auto-Detection:**
The API automatically enables streaming for responses >50MB.

---

## 📊 Response Structure Details

### Song Metadata

```typescript
interface SongMetadata {
  song_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;
  bpm: number;
  genre: string;
  energy_level: number;          // 0-1
  mood_tags: string[];
  release_date?: string;
  cover_art_url: string;
  preview_url: string;
  audio_features: {
    tempo: number;
    key: string;
    mode: 'major' | 'minor';
    time_signature: string;
    loudness: number;
    valence: number;             // 0-1 (sad to happy)
    danceability: number;        // 0-1
  };
}
```

### Composite Videos

```typescript
interface CompositeVideo {
  composite_id: string;
  composite_name: string;
  compatibility_score: number;    // 0-1
  components: {
    star: ComponentDetail;
    look: ComponentDetail;
    moves: ComponentDetail;
    world: ComponentDetail;
  };
  metadata: {
    name: string;
    description: string;
    tags: string[];
    created_by: string;
    created_at: string;
  };
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_video_url: string;
  };
  analytics: {
    view_count: number;
    like_count: number;
    remix_count: number;
    trending_score: number;
  };
}
```

### Layer Assets

```typescript
interface LayerData {
  layer_type: 'stars' | 'looks' | 'moves' | 'worlds';
  total_assets: number;
  assets: Array<{
    base_asset: AssetDetail;
    variants: AssetDetail[];
    compatibility: {
      song_score: number;
      cross_layer_scores: Record<string, number>;
    };
  }>;
}

interface AssetDetail {
  asset_id: string;
  name: string;
  asset_type: 'base' | 'variant';
  base_asset_id?: string;        // For variants only
  metadata: {
    description: string;
    tags: string[];
    attributes: Record<string, any>;
  };
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_asset_url: string;
    file_size_mb: number;
  };
  compatibility_score: number;
  trending_score: number;
}
```

### Asset Relationships

```typescript
interface AssetRelationships {
  compatibility_matrix: Record<string, Record<string, number>>;
  base_to_variants: Record<string, string[]>;
  layer_dependencies: Record<string, string[]>;
}
```

**Example Usage:**
```typescript
// Get compatibility between two assets
const score = response.data.asset_relationships
  .compatibility_matrix['S.001.001.001']['L.003.005.001'];

// Get all variants for a base asset
const variants = response.data.asset_relationships
  .base_to_variants['S.001.001.001'];
```

---

## 🌐 GCP URLs & CDN Architecture

### Why GCP URLs Are Better

Instead of embedding full asset data in the API response, the API returns **GCP Storage URLs** for all media assets. This provides:

✅ **Smaller API Responses** - Response size reduced by 80-90%  
✅ **Parallel Loading** - Load assets concurrently from CDN  
✅ **Global CDN Caching** - Assets cached at edge locations worldwide  
✅ **Progressive Loading** - Load thumbnails first, full assets on-demand  
✅ **Bandwidth Efficiency** - Only download assets user actually views  
✅ **Better Mobile Experience** - Faster load times on cellular connections

### Asset URL Structure

All assets include these URL fields:

```typescript
interface AssetMediaURLs {
  // Thumbnail (optimized, small size)
  thumbnail_url: string;      // e.g., "https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/thumb.jpg"
  
  // Preview (medium quality, web optimized)
  preview_url: string;        // e.g., "https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/preview.mp4"
  
  // Full asset (high quality, original)
  full_asset_url: string;     // e.g., "https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/full.mp4"
  
  // Optional: Different quality levels
  qualities?: {
    '720p': string;
    '1080p': string;
    '4k': string;
  };
}
```

### Loading Strategy Examples

#### Progressive Loading Pattern

```typescript
// 1. Load thumbnails immediately (fast, small)
const loadThumbnails = async (assets: AssetDetail[]) => {
  return Promise.all(
    assets.map(asset => 
      Image.prefetch(asset.media.thumbnail_url)
    )
  );
};

// 2. Load previews for visible assets (medium size)
const loadVisiblePreviews = async (visibleAssets: AssetDetail[]) => {
  return Promise.all(
    visibleAssets.map(asset =>
      Video.prefetch(asset.media.preview_url)
    )
  );
};

// 3. Load full asset only when selected
const loadFullAsset = async (asset: AssetDetail) => {
  return Video.load(asset.media.full_asset_url);
};

// Usage
const experience = await client.getCompleteExperience(config);

// Step 1: Show thumbnails immediately
await loadThumbnails(experience.data.layer_assets.stars.assets);
renderThumbnails();

// Step 2: Load previews for first 6 visible assets
await loadVisiblePreviews(
  experience.data.layer_assets.stars.assets.slice(0, 6)
);

// Step 3: Load full asset when user selects
onAssetSelect(async (asset) => {
  await loadFullAsset(asset);
  playFullAsset(asset);
});
```

#### Parallel Loading with Priority

```typescript
// Load assets with priority queue
const loadAssetsWithPriority = async (experience: ReVizCompleteResponse) => {
  // Priority 1: Current composite thumbnail (highest priority)
  const compositeThumb = experience.data.composite_videos[0].media.thumbnail_url;
  await Image.prefetch(compositeThumb);
  
  // Priority 2: All thumbnails in parallel (fast)
  const allThumbnails = [
    ...experience.data.layer_assets.stars.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.looks.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.moves.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.worlds.assets.map(a => a.media.thumbnail_url),
  ];
  await Promise.all(allThumbnails.map(url => Image.prefetch(url)));
  
  // Priority 3: Composite preview (background load)
  const compositePreview = experience.data.composite_videos[0].media.preview_url;
  Video.prefetch(compositePreview).catch(err => console.warn('Preview prefetch failed:', err));
  
  // Priority 4: Visible asset previews (lazy load)
  // Load as user scrolls
};
```

#### Connection-Aware Loading

```typescript
import NetInfo from '@react-native-community/netinfo';

const loadBasedOnConnection = async (experience: ReVizCompleteResponse) => {
  const netInfo = await NetInfo.fetch();
  
  if (netInfo.type === 'wifi') {
    // WiFi: Preload everything
    await loadAllPreviews(experience);
  } else if (netInfo.type === 'cellular') {
    // Cellular: Only load thumbnails and selected asset
    await loadThumbnailsOnly(experience);
    // Load previews on-demand as user taps
  } else {
    // Poor connection: Minimal loading
    await loadCurrentCompositeOnly(experience);
  }
};
```

### CDN Caching Benefits

GCP Storage URLs are automatically cached by Google's global CDN:

```
User Request Flow:
─────────────────────────────────────────────────────
1. User requests: https://storage.googleapis.com/...
   ↓
2. CDN Edge Server (closest to user)
   • Cache Hit? → Return immediately (< 50ms)
   • Cache Miss? → Fetch from origin, cache, return
   ↓
3. Subsequent requests: Served from edge (< 20ms)
```

**Performance Impact:**
- First request: ~200-500ms (origin fetch)
- Cached requests: ~20-50ms (edge server)
- Global edge locations ensure low latency worldwide

### URL Prefetching Pattern

```typescript
// Prefetch URLs in background
const prefetchAssetURLs = async (assets: AssetDetail[]) => {
  // Prefetch in batches to avoid overwhelming the device
  const batchSize = 10;
  
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(asset => 
        Image.prefetch(asset.media.thumbnail_url)
      )
    );
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

// Usage
const experience = await client.getCompleteExperience(config);
prefetchAssetURLs(experience.data.layer_assets.stars.assets);
```

### Quality Selection Based on Device

```typescript
const getOptimalAssetURL = (asset: AssetDetail, deviceInfo: DeviceInfo): string => {
  const { screen_resolution, connection_speed } = deviceInfo;
  
  // Parse resolution
  const [width] = screen_resolution.split('x').map(Number);
  
  // Select quality based on screen and connection
  if (connection_speed === 'slow') {
    return asset.media.preview_url;  // Lower quality for slow connections
  }
  
  if (width <= 720) {
    return asset.media.qualities?.['720p'] || asset.media.preview_url;
  }
  
  if (width <= 1920) {
    return asset.media.qualities?.['1080p'] || asset.media.full_asset_url;
  }
  
  return asset.media.full_asset_url;  // 4K for large screens
};
```

---

## 🚀 Performance Optimization

### Performance Targets

The API is optimized for minimal response size by returning URLs instead of full asset data:

```
Response Size Analysis:
─────────────────────────────────────────────────────
Without URLs (full data):    50-100MB per request
With URLs only:              2-5MB per request
Reduction:                   95% smaller responses

Response Time Targets:
─────────────────────────────────────────────────────
API Response (<5MB):         < 200ms (L2 cache)
Asset Loading (parallel):    < 500ms (CDN cached)
Total Time to Render:        < 700ms (complete)
```

### Asset Loading Performance

```typescript
// Performance metrics for different loading strategies
interface LoadingPerformance {
  strategy: string;
  apiResponseTime: number;
  assetLoadTime: number;
  totalTime: number;
}

const performanceComparison = [
  {
    strategy: 'All assets embedded',
    apiResponseTime: 3000,  // Large response
    assetLoadTime: 0,        // Already in response
    totalTime: 3000
  },
  {
    strategy: 'URLs + Sequential loading',
    apiResponseTime: 200,    // Small response
    assetLoadTime: 2000,     // Loading one by one
    totalTime: 2200
  },
  {
    strategy: 'URLs + Parallel loading',  // ✅ RECOMMENDED
    apiResponseTime: 200,    // Small response
    assetLoadTime: 400,      // Parallel from CDN
    totalTime: 600          // Best performance
  }
];
```

### Optimal Loading Pattern

```typescript
const loadExperienceOptimally = async (songId: string) => {
  const startTime = performance.now();
  
  // Step 1: Get API response with URLs (< 200ms)
  const experience = await client.getCompleteExperience({
    song_id: songId,
    // ... config
  });
  console.log(`API response: ${performance.now() - startTime}ms`);
  
  // Step 2: Load critical thumbnails in parallel (< 100ms)
  const criticalThumbsStart = performance.now();
  await Promise.all([
    Image.prefetch(experience.data.composite_videos[0].media.thumbnail_url),
    ...experience.data.layer_assets.stars.assets
      .slice(0, 6)
      .map(a => Image.prefetch(a.media.thumbnail_url))
  ]);
  console.log(`Critical thumbnails: ${performance.now() - criticalThumbsStart}ms`);
  
  // Step 3: Show UI immediately
  renderUI(experience);
  console.log(`Total time to interactive: ${performance.now() - startTime}ms`);
  
  // Step 4: Background load remaining assets
  loadRemainingAssets(experience);
};
```

---

## 🛠️ Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    recovery_suggestions?: string[];
  };
  metadata: {
    timestamp: string;
    request_id: string;
  };
}
```

### Common Error Codes

| Code | HTTP Status | Description | Recovery |
|------|-------------|-------------|----------|
| `SONG_NOT_FOUND` | 404 | Song ID doesn't exist | Verify song ID format |
| `INVALID_CONFIG` | 400 | Invalid configuration | Check config parameters |
| `CACHE_MISS` | 200 | Data not cached | Normal, will compute |
| `PARTIAL_FAILURE` | 200 | Some data failed | Check `partial_response` flag |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry with backoff |
| `TIMEOUT` | 504 | Request timeout | Reduce config complexity |
| `INTERNAL_ERROR` | 500 | Server error | Retry with exponential backoff |

### Graceful Degradation

The API handles partial failures gracefully:

```typescript
// Example: If variants fail to load, base assets are still returned
{
  "success": true,
  "data": {
    "layer_assets": {
      "stars": {
        "assets": [...],  // Base assets loaded
        "variants": []    // Variants failed, empty array
      }
    }
  },
  "metadata": {
    "partial_response": true  // Indicates some data missing
  }
}
```

### Error Handling Best Practices

```typescript
try {
  const experience = await client.getCompleteExperience(request);
  
  // Check for partial response
  if (experience.metadata.partial_response) {
    console.warn('Some data missing, showing available content');
  }
  
  // Use available data
  renderExperience(experience.data);
  
} catch (error) {
  if (error.code === 'SONG_NOT_FOUND') {
    showMessage('Song not available');
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Exponential backoff retry
    await retryWithBackoff(() => client.getCompleteExperience(request));
  } else {
    // Fallback to basic experience
    const fallback = await client.getBasicExperience(songId);
    renderExperience(fallback);
  }
}
```

---

## 💻 Integration Examples

### React/React Native Example

```typescript
import React, { useEffect, useState } from 'react';
import { ReVizClient } from '@reviz/api-client';
import { Image } from 'react-native';  // or from 'react-native'

interface Props {
  songId: string;
  userId: string;
}

export const ReVizExperience: React.FC<Props> = ({ songId, userId }) => {
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadExperience();
  }, [songId]);
  
  const loadExperience = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new ReVizClient({
        apiUrl: process.env.REVIZ_API_URL,
        authToken: await getAuthToken()
      });
      
      // Step 1: Get API response with URLs (fast, ~200ms)
      const result = await client.getCompleteExperience({
        song_id: songId,
        user_context: {
          user_id: userId,
          preferences: getUserPreferences(),
          device_info: getDeviceInfo()
        },
        experience_config: {
          max_composites: 5,
          max_assets_per_layer: 6,
          include_variants: true,
          variant_depth: 6
        }
      });
      
      setExperience(result.data);
      setLoading(false);
      
      // Step 2: Load critical thumbnails in parallel (fast, ~100ms)
      await loadCriticalThumbnails(result.data);
      
      // Step 3: Show UI immediately
      setLoadingAssets(false);
      
      // Step 4: Background load remaining assets
      loadRemainingAssets(result.data);
      
      // Track analytics
      trackExperienceLoad({
        songId,
        responseTime: result.data.performance_metrics.response_time_ms,
        cacheHit: result.data.performance_metrics.cache_hit_rate > 0
      });
      
    } catch (err) {
      setError(err);
      setLoading(false);
      logError('Experience load failed', err);
    }
  };
  
  // Load critical thumbnails for immediate display
  const loadCriticalThumbnails = async (data) => {
    const criticalUrls = [
      // First composite thumbnail
      data.composite_videos[0]?.media.thumbnail_url,
      // First 6 stars thumbnails
      ...data.layer_assets.stars.assets.slice(0, 6).map(a => a.media.thumbnail_url),
      // Song cover art
      data.song_metadata.cover_art_url
    ].filter(Boolean);
    
    // Load in parallel from CDN
    await Promise.all(
      criticalUrls.map(url => Image.prefetch(url))
    );
  };
  
  // Background load remaining assets
  const loadRemainingAssets = async (data) => {
    // Load all thumbnails
    const allThumbs = [
      ...data.composite_videos.map(c => c.media.thumbnail_url),
      ...data.layer_assets.stars.assets.map(a => a.media.thumbnail_url),
      ...data.layer_assets.looks.assets.map(a => a.media.thumbnail_url),
      ...data.layer_assets.moves.assets.map(a => a.media.thumbnail_url),
      ...data.layer_assets.worlds.assets.map(a => a.media.thumbnail_url)
    ].filter(Boolean);
    
    // Load in batches to avoid overwhelming device
    const batchSize = 10;
    for (let i = 0; i < allThumbs.length; i += batchSize) {
      const batch = allThumbs.slice(i, i + batchSize);
      await Promise.all(batch.map(url => Image.prefetch(url)));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorView error={error} onRetry={loadExperience} />;
  if (!experience) return null;
  
  return (
    <div>
      {/* Song Info */}
      <SongHeader 
        song={experience.song_metadata}
        coverArtUrl={experience.song_metadata.cover_art_url}
      />
      
      {/* Composite Videos - using URLs */}
      <CompositeGrid 
        composites={experience.composite_videos}
        onSelect={(composite) => {
          // Load preview video when selected
          loadCompositePreview(composite.media.preview_url);
          handleCompositeSelect(composite);
        }}
        renderThumbnail={(composite) => (
          <Image source={{ uri: composite.media.thumbnail_url }} />
        )}
      />
      
      {/* Layer Customization - using URLs */}
      <LayerPanel
        layers={experience.layer_assets}
        relationships={experience.asset_relationships}
        onAssetChange={(layer, asset) => {
          // Load asset preview when changed
          loadAssetPreview(asset.media.preview_url);
          handleAssetChange(layer, asset);
        }}
        renderAsset={(asset) => (
          <Image source={{ uri: asset.media.thumbnail_url }} />
        )}
      />
      
      {loadingAssets && <AssetLoadingIndicator />}
      
      {/* Performance Metrics (dev mode) */}
      {isDevelopment && (
        <PerformanceMetrics metrics={experience.performance_metrics} />
      )}
    </div>
  );
};
```

### Expo Mobile Example

```typescript
import { ReVizClient } from '@reviz/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Mobile-optimized configuration based on connection
const getMobileConfig = async () => {
  const netInfo = await NetInfo.fetch();
  const connectionSpeed = netInfo.type === 'wifi' ? 'fast' : 
                          netInfo.type === 'cellular' ? 'medium' : 'slow';
  
  return {
    max_composites: connectionSpeed === 'fast' ? 5 : 3,
    max_assets_per_layer: connectionSpeed === 'fast' ? 6 : 4,
    include_variants: connectionSpeed !== 'slow',
    variant_depth: connectionSpeed === 'fast' ? 6 : 3,
    connectionSpeed
  };
};

// Smart asset loading based on connection
const loadAssetsForConnection = async (
  experience: any, 
  connectionSpeed: string
) => {
  if (connectionSpeed === 'wifi') {
    // WiFi: Preload all thumbnails aggressively
    return loadAllThumbnails(experience);
  } else if (connectionSpeed === 'cellular') {
    // Cellular: Load only critical thumbnails
    return loadCriticalThumbnails(experience);
  } else {
    // Slow connection: Load minimal assets
    return loadMinimalAssets(experience);
  }
};

// Load all thumbnails for WiFi
const loadAllThumbnails = async (experience: any) => {
  const allUrls = [
    experience.data.song_metadata.cover_art_url,
    ...experience.data.composite_videos.map(c => c.media.thumbnail_url),
    ...experience.data.layer_assets.stars.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.looks.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.moves.assets.map(a => a.media.thumbnail_url),
    ...experience.data.layer_assets.worlds.assets.map(a => a.media.thumbnail_url)
  ].filter(Boolean);
  
  // Load in parallel from CDN
  await Promise.all(
    allUrls.map(url => Image.prefetch(url))
  );
};

// Load only critical thumbnails for cellular
const loadCriticalThumbnails = async (experience: any) => {
  const criticalUrls = [
    experience.data.song_metadata.cover_art_url,
    experience.data.composite_videos[0]?.media.thumbnail_url,
    ...experience.data.layer_assets.stars.assets
      .slice(0, 3)
      .map(a => a.media.thumbnail_url)
  ].filter(Boolean);
  
  await Promise.all(
    criticalUrls.map(url => Image.prefetch(url))
  );
};

// Load minimal assets for slow connections
const loadMinimalAssets = async (experience: any) => {
  // Only load current composite thumbnail
  const url = experience.data.composite_videos[0]?.media.thumbnail_url;
  if (url) {
    await Image.prefetch(url);
  }
};

// Local caching for offline support
const cacheExperienceLocally = async (songId: string, experience: any) => {
  try {
    await AsyncStorage.setItem(
      `experience_${songId}`,
      JSON.stringify({
        data: experience,
        timestamp: Date.now(),
        version: '2.0'
      })
    );
  } catch (error) {
    console.warn('Failed to cache experience:', error);
  }
};

// Main loading function with local cache
const loadMobileExperience = async (songId: string) => {
  const client = new ReVizClient({
    apiUrl: 'https://registry.reviz.dev',
    authToken: await AsyncStorage.getItem('authToken')
  });
  
  // Check local cache first
  const cacheKey = `experience_${songId}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 1 hour old
      if (Date.now() - timestamp < 3600000) {
        console.log('Using cached experience');
        return data;
      }
    } catch (error) {
      console.warn('Failed to parse cached data:', error);
    }
  }
  
  // Fetch fresh data from API
  const config = await getMobileConfig();
  const experience = await client.getCompleteExperience({
    song_id: songId,
    user_context: {
      device_info: {
        type: Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'tablet',
        connection_speed: config.connectionSpeed,
        platform: Platform.OS
      }
    },
    experience_config: config
  });
  
  // Cache the experience locally
  await cacheExperienceLocally(songId, experience);
  
  // Load assets based on connection
  await loadAssetsForConnection(experience, config.connectionSpeed);
  
  return experience;
};

// Download asset for offline use
const downloadAssetForOffline = async (asset: any) => {
  const localUri = `${FileSystem.documentDirectory}${asset.asset_id}.mp4`;
  
  try {
    // Check if already downloaded
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      return localUri;
    }
    
    // Download from GCP URL
    const downloadResult = await FileSystem.downloadAsync(
      asset.media.full_asset_url,
      localUri
    );
    
    return downloadResult.uri;
  } catch (error) {
    console.error('Failed to download asset:', error);
    return asset.media.full_asset_url; // Fallback to streaming
  }
};

// Usage in React Native component
const ReVizMobileExperience = ({ songId }) => {
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const load = async () => {
      try {
        const exp = await loadMobileExperience(songId);
        setExperience(exp);
      } catch (error) {
        console.error('Failed to load experience:', error);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [songId]);
  
  if (loading) return <LoadingView />;
  
  return (
    <View>
      {/* Render using URLs from experience */}
      <Image 
        source={{ uri: experience.data.song_metadata.cover_art_url }}
        style={styles.coverArt}
      />
      {/* ... render other components */}
    </View>
  );
};
```

### Node.js Backend Example

```typescript
import express from 'express';
import { ReVizClient } from '@reviz/api-client';

const app = express();
const client = new ReVizClient({
  apiUrl: process.env.REVIZ_API_URL,
  authToken: process.env.REVIZ_API_KEY
});

// Proxy endpoint with caching
app.post('/api/remix/experience', async (req, res) => {
  const { songId, userId } = req.body;
  
  try {
    const experience = await client.getCompleteExperience({
      song_id: songId,
      user_context: {
        user_id: userId,
        preferences: await getUserPreferences(userId)
      },
      experience_config: {
        max_composites: 10,  // Server can handle more
        max_assets_per_layer: 8,
        include_variants: true,
        variant_depth: 6
      },
      performance_optimization: {
        cache_strategy: 'aggressive',
        compression: true
      }
    });
    
    // Add server-side enhancements
    const enhanced = await enhanceExperience(experience, userId);
    
    res.json(enhanced);
    
  } catch (error) {
    console.error('Experience load failed:', error);
    
    // Return fallback experience
    const fallback = await getFallbackExperience(songId);
    res.status(error.statusCode || 500).json(fallback);
  }
});
```

---

## ✅ Best Practices

### 1. Configuration Optimization

```typescript
// ✅ GOOD: Appropriate for mobile
{
  max_composites: 3,
  max_assets_per_layer: 4,
  include_variants: true,
  variant_depth: 4
}

// ❌ BAD: Too much data for mobile
{
  max_composites: 20,
  max_assets_per_layer: 20,
  include_variants: true,
  variant_depth: 20
}
```

### 2. Error Handling

```typescript
// ✅ GOOD: Graceful degradation
try {
  const experience = await client.getCompleteExperience(config);
  if (experience.metadata.partial_response) {
    // Show what we have, note missing data
    showPartialExperience(experience);
  } else {
    showFullExperience(experience);
  }
} catch (error) {
  showFallbackExperience();
}

// ❌ BAD: No fallback
const experience = await client.getCompleteExperience(config);
showExperience(experience);  // Crashes on error
```

### 3. Caching Strategy

```typescript
// ✅ GOOD: Multi-level caching
// 1. Check memory cache
let experience = memoryCache.get(songId);

if (!experience) {
  // 2. Check local storage
  experience = await localStorage.get(songId);
}

if (!experience) {
  // 3. Fetch from API (will use server cache)
  experience = await client.getCompleteExperience(config);
  
  // Cache locally
  await localStorage.set(songId, experience, { ttl: 3600 });
  memoryCache.set(songId, experience);
}

// ❌ BAD: Always fetch from API
const experience = await client.getCompleteExperience(config);
```

### 4. Progressive Loading

```typescript
// ✅ GOOD: Load essential data first
// Step 1: Load minimal data
const minimal = await client.getCompleteExperience({
  ...config,
  include_variants: false
});
showBasicUI(minimal);

// Step 2: Load variants in background
const full = await client.getCompleteExperience({
  ...config,
  include_variants: true
});
updateUI(full);

// ❌ BAD: Block UI waiting for everything
const full = await client.getCompleteExperience(config);
showUI(full);  // User waits for all data
```

### 5. Analytics Tracking

```typescript
// ✅ GOOD: Track performance metrics
const startTime = Date.now();

const experience = await client.getCompleteExperience(config);

analytics.track('experience_loaded', {
  song_id: config.song_id,
  load_time_ms: Date.now() - startTime,
  cache_hit: experience.data.performance_metrics.cache_hit_rate > 0,
  total_assets: experience.data.performance_metrics.total_assets_loaded,
  partial_response: experience.metadata.partial_response
});

// ❌ BAD: No tracking
await client.getCompleteExperience(config);
```

---

## 🔧 Troubleshooting

### Slow Response Times

**Symptom:** API responses taking >3 seconds

**Diagnosis:**
1. Check response size
2. Verify cache hit rate
3. Review configuration

**Solutions:**
```typescript
// Reduce data requested
experience_config: {
  max_composites: 3,          // Reduced from 10
  max_assets_per_layer: 4,    // Reduced from 6
  variant_depth: 4            // Reduced from 6
}

// Enable aggressive caching
performance_optimization: {
  cache_strategy: 'aggressive',
  compression: true,
  streaming: true
}
```

### Partial Response Issues

**Symptom:** `partial_response: true` in metadata

**Diagnosis:**
Check which data is missing:
```typescript
if (response.metadata.partial_response) {
  // Check what's missing
  const hasComposites = response.data.composite_videos.length > 0;
  const hasStars = response.data.layer_assets.stars.assets.length > 0;
  const hasLooks = response.data.layer_assets.looks.assets.length > 0;
  
  console.log('Missing data:', {
    composites: !hasComposites,
    stars: !hasStars,
    looks: !hasLooks
  });
}
```

**Solutions:**
1. Retry request with reduced configuration
2. Use available data and notify user
3. Load missing data separately

### Rate Limiting

**Symptom:** `RATE_LIMIT_EXCEEDED` errors

**Diagnosis:**
Check request frequency and caching

**Solutions:**
```typescript
// Implement exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code !== 'RATE_LIMIT_EXCEEDED' || i === maxRetries - 1) {
        throw error;
      }
      // Wait with exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    }
  }
};

// Use client-side caching
const cachedFetch = async (config) => {
  const cacheKey = JSON.stringify(config);
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  const result = await retryWithBackoff(() =>
    client.getCompleteExperience(config)
  );
  
  cache.set(cacheKey, result, { ttl: 3600 });
  return result;
};
```

### Memory Issues

**Symptom:** App crashes or out of memory errors

**Diagnosis:**
Check response size and asset loading

**Solutions:**
```typescript
// Use streaming for large responses
performance_optimization: {
  streaming: true
}

// Load variants on-demand
experience_config: {
  include_variants: false  // Load base assets only initially
}

// Then load variants as needed
const loadVariants = async (baseAssetId) => {
  const variants = await client.getAssetVariants(baseAssetId);
  return variants;
};

// Clean up unused data
const cleanupMemory = () => {
  // Remove unused assets from memory
  cache.clear();
  
  // Force garbage collection (if available)
  if (global.gc) global.gc();
};
```

---

## 📚 Additional Resources

### API Documentation
- [Complete API Reference](https://docs.reviz.dev/api)
- [TypeScript Types](https://docs.reviz.dev/types)
- [Error Codes](https://docs.reviz.dev/errors)

### Integration Guides
- [React Integration Guide](https://docs.reviz.dev/react)
- [React Native Integration Guide](https://docs.reviz.dev/react-native)
- [Expo Integration Guide](https://docs.reviz.dev/expo)

### Support
- Email: support@celerity.studio
- Discord: [ReViz Developers](https://discord.gg/reviz)
- GitHub: [ReViz SDK](https://github.com/celerity-studios/reviz-sdk)

---

## 🎯 Quick Reference

### URL-Based Architecture Benefits

```
┌─────────────────────────────────────────────────────────────┐
│         WHY GCP URLS ARE BETTER THAN EMBEDDED DATA          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ Response Size:        95% smaller (5MB vs 100MB)        │
│ ✅ API Response Time:    200ms (vs 3-5s with embedded)     │
│ ✅ Asset Load Time:      400ms parallel (vs 2s sequential) │
│ ✅ CDN Caching:          Global edge locations             │
│ ✅ Bandwidth Usage:      Only what user views              │
│ ✅ Mobile Performance:   Excellent (vs poor)               │
│ ✅ Loading Strategy:     Progressive & parallel            │
│ ✅ Network Efficiency:   Optimal for cellular              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Configurations

#### Mobile (3G/4G)
```typescript
{
  max_composites: 3,
  max_assets_per_layer: 4,
  include_variants: true,
  variant_depth: 4,
  // Load only critical thumbnails initially
  loadingStrategy: 'minimal'
}
```

#### Mobile (WiFi)
```typescript
{
  max_composites: 5,
  max_assets_per_layer: 6,
  include_variants: true,
  variant_depth: 6,
  // Preload all thumbnails aggressively
  loadingStrategy: 'aggressive'
}
```

#### Desktop
```typescript
{
  max_composites: 10,
  max_assets_per_layer: 8,
  include_variants: true,
  variant_depth: 6,
  // Preload thumbnails and previews
  loadingStrategy: 'balanced'
}
```

### Asset URL Patterns

All assets follow this URL structure:

```
Thumbnails:  https://storage.googleapis.com/reviz-assets/{layer}/{id}/thumb.jpg
Previews:    https://storage.googleapis.com/reviz-assets/{layer}/{id}/preview.mp4
Full:        https://storage.googleapis.com/reviz-assets/{layer}/{id}/full.mp4
Composites:  https://storage.googleapis.com/reviz-composites/{id}/preview.mp4
```

**CDN Features:**
- Automatic global distribution
- Edge caching (20-50ms response)
- HTTPS/SSL enabled
- CORS configured for web/mobile
- Bandwidth optimization

### Performance Targets

```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETE EXPERIENCE TIMELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 0ms      User taps song                                     │
│ 200ms    API response received (URLs only)                  │
│ 300ms    Critical thumbnails loaded (parallel CDN)          │
│ 300ms    UI renders with thumbnails                         │
│ 600ms    All thumbnails loaded (background)                 │
│ 1000ms   Previews preloaded (background)                    │
│                                                             │
│ Total Time to Interactive: ~300ms                           │
│ Total Time Fully Loaded:  ~1000ms                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Essential Loading Pattern

```typescript
// 1. API Call (200ms) - Get URLs
const experience = await client.getCompleteExperience(config);

// 2. Critical Load (100ms) - Show UI immediately
await loadCriticalThumbnails(experience);
renderUI(experience);

// 3. Background Load - Don't block UI
loadRemainingAssets(experience);

// 4. On-Demand Load - When user interacts
onAssetSelect(asset => loadFullAsset(asset));
```

---

**Version History:**
- v2.0 (Oct 2025): Enhanced implementation with streaming, improved caching
- v1.0 (Aug 2025): Initial release with basic complete experience endpoint

**Last Updated:** October 7, 2025  
**Maintained By:** ReViz Engineering Team