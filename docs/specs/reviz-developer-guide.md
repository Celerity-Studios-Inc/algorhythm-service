# ReViz Complete Experience API - Developer Integration Guide

## Quick Start

### 1. Installation
```bash
npm install @algorhythm/reviz-sdk
# or
yarn add @algorhythm/reviz-sdk
```

### 2. Basic Usage
```javascript
import { AlgoRhythm } from '@algorhythm/reviz-sdk';

const algo = new AlgoRhythm({ 
  apiKey: 'your-api-key',
  environment: 'production' // or 'development'
});

// Single API call for complete experience
const experience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  experience_config: {
    max_composites: 5,
    max_assets_per_layer: 6,
    include_variants: true,
    variant_depth: 6
  }
});
```

### 3. Response Structure
```javascript
// You now have access to:
const { data } = experience;

// Song information
console.log(data.song_metadata.song_name); // "Party in the USA"

// Composite videos (5)
data.composite_videos.forEach(composite => {
  console.log(composite.composite_name);
  console.log(composite.compatibility_score);
  console.log(composite.media.preview_video_url);
});

// Layer assets with variants
console.log(data.layer_assets.stars.assets.length); // 6 base stars
console.log(data.layer_assets.stars.assets[0].variants.length); // 6 variants

// Total components available
const totalComponents = data.performance_metrics.total_assets_loaded;
console.log(`Total components: ${totalComponents}`); // ~150 components
```

## Advanced Usage

### Device-Optimized Requests
```javascript
// Mobile optimization
const mobileExperience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  user_context: {
    device_info: {
      type: 'mobile',
      connection_speed: 'medium'
    }
  },
  experience_config: {
    max_composites: 3,
    max_assets_per_layer: 4,
    variant_depth: 4
  },
  performance_optimization: {
    compression: true,
    cache_strategy: 'aggressive'
  }
});

// Desktop full experience
const desktopExperience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  user_context: {
    device_info: {
      type: 'desktop',
      connection_speed: 'fast'
    }
  },
  experience_config: {
    max_composites: 10,
    max_assets_per_layer: 8,
    variant_depth: 8
  },
  performance_optimization: {
    preload_assets: true,
    cache_strategy: 'balanced'
  }
});
```

### User Preferences
```javascript
const personalizedExperience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  user_context: {
    user_id: 'user123',
    preferences: {
      preferred_genres: ['pop', 'dance'],
      favorite_styles: ['vibrant', 'energetic'],
      excluded_assets: ['S.GRL.TEE.005'] // Exclude specific assets
    }
  }
});
```

### Streaming Large Responses
```javascript
// For very large responses (>50MB)
const streamingExperience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  experience_config: {
    max_composites: 10,
    max_assets_per_layer: 10,
    include_variants: true,
    variant_depth: 10
  },
  performance_optimization: {
    streaming: true
  }
});

// Handle streaming response
streamingExperience.on('data', (chunk) => {
  // Process chunk of data
});

streamingExperience.on('end', () => {
  // All data received
});
```

## Working with the Response

### Accessing Composite Components
```javascript
const firstComposite = data.composite_videos[0];

// Get all component IDs for this composite
const componentIds = [
  firstComposite.components.star.asset_id,
  firstComposite.components.look.asset_id,
  firstComposite.components.move.asset_id,
  firstComposite.components.world.asset_id
];

// Find the actual assets in layer_assets
const starAsset = data.layer_assets.stars.assets.find(asset => 
  asset.base_asset.asset_id === firstComposite.components.star.asset_id ||
  asset.variants.some(v => v.asset_id === firstComposite.components.star.asset_id)
);
```

### Working with Variants
```javascript
// Get all variants for a base asset
const baseStarId = data.layer_assets.stars.assets[0].base_asset.asset_id;
const variants = data.asset_relationships.base_to_variants[baseStarId];

console.log(`Base star ${baseStarId} has ${variants.length} variants`);

// Access variant details
const firstVariant = data.layer_assets.stars.assets[0].variants[0];
console.log(firstVariant.variant_name);
console.log(firstVariant.media.thumbnail_url);
```

### Using Compatibility Matrix
```javascript
// Check compatibility between two assets
const asset1 = 'S.GRL.TEE.001';
const asset2 = 'L.DRS.CAS.003';

const compatibilityScore = data.asset_relationships.compatibility_matrix[asset1][asset2];
console.log(`Compatibility between ${asset1} and ${asset2}: ${compatibilityScore}/100`);

// Find best matching look for a star
const starId = 'S.GRL.TEE.001';
const lookCompatibilities = data.layer_assets.looks.assets.map(lookAsset => ({
  look: lookAsset.base_asset,
  score: data.asset_relationships.compatibility_matrix[starId][lookAsset.base_asset.asset_id]
}));

const bestLook = lookCompatibilities.sort((a, b) => b.score - a.score)[0];
console.log(`Best look for ${starId}: ${bestLook.look.asset_name} (score: ${bestLook.score})`);
```

## Performance Tips

### 1. Use Appropriate Configuration
```javascript
// Don't request more than needed
const config = {
  max_composites: userWillBrowse ? 10 : 5,
  max_assets_per_layer: showingAlternatives ? 6 : 3,
  include_variants: userCanCustomize ? true : false
};
```

### 2. Leverage Caching
```javascript
// Popular songs are cached for better performance
// Include request_id for cache key consistency
const request_id = `user-${userId}-song-${songId}`;

const cachedExperience = await algo.getCompleteExperience({
  song_id: 'G.POP.TEN.003',
  request_id: request_id,
  performance_optimization: {
    cache_strategy: 'aggressive'
  }
});
```

### 3. Progressive Enhancement
```javascript
// Start with minimal data
const quickPreview = await algo.getCompleteExperience({
  song_id: songId,
  experience_config: {
    max_composites: 1,
    max_assets_per_layer: 3,
    include_variants: false
  }
});

// Load more as user engages
if (userEngaged) {
  const fullExperience = await algo.getCompleteExperience({
    song_id: songId,
    experience_config: {
      max_composites: 5,
      max_assets_per_layer: 6,
      include_variants: true
    }
  });
}
```

## Error Handling
```javascript
try {
  const experience = await algo.getCompleteExperience(request);
} catch (error) {
  if (error.code === 'SONG_NOT_FOUND') {
    // Handle missing song
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

## Support
- Documentation: https://docs.algorhythm.com/reviz
- Support: support@algorhythm.com
- Status: https://status.algorhythm.com