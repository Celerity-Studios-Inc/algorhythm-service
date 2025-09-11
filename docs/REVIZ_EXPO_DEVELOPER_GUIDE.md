# ReViz Expo - AlgoRhythm Integration Guide
*Complete developer guide for integrating with AlgoRhythm AI Recommendation Engine*

**Version**: 1.0  
**Release Date**: September 2025  
**Target Team**: ReViz Expo Mobile Development Team  
**Status**: ✅ **LIVE AND READY FOR INTEGRATION**

---

## 🚀 **Quick Start**

### **1. Service Status**
- ✅ **AlgoRhythm Service**: Deployed and running
- ✅ **Authentication**: JWT-based auth working
- ✅ **Database**: Connected and healthy
- ✅ **NNA Registry**: Connected and accessible
- ⚠️ **Songs Layer**: In development (you're creating these)

### **2. Canonical URLs & Endpoints**

#### **Canonical URLs**
```typescript
// Canonical URLs for AlgoRhythm Service
const ALGORHYTHM_URLS = {
  development: 'https://dev.algorhythm.media',         // Planned custom domain
  staging: 'https://stg.algorhythm.media',             // Planned custom domain  
  production: 'https://prod.algorhythm.media',         // Planned custom domain
  
  // Current Active URLs (use these for now)
  development_active: 'https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app',
  staging_active: 'https://algorhythm-service-staging-xxx-uc.a.run.app',    // TBD
  production_active: 'https://algorhythm-service-xxx-uc.a.run.app'          // TBD
};
```

#### **Current Endpoints**
```typescript
// Development Environment (Currently Active)
const ALGORHYTHM_API = 'https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app';

// Available Endpoints
const ENDPOINTS = {
  health: `${ALGORHYTHM_API}/api/v1/health`,
  docs: `${ALGORHYTHM_API}/api/docs`,
  recommendTemplate: `${ALGORHYTHM_API}/api/v1/recommend/template`,
  recommendVariations: `${ALGORHYTHM_API}/api/v1/recommend/variations`,
  analytics: `${ALGORHYTHM_API}/api/v1/analytics/popular/templates`
};
```

---

## 🔐 **Authentication Setup**

### **JWT Token Generation**
AlgoRhythm uses its own JWT secret. Generate tokens using:

```typescript
// Node.js example for generating JWT tokens
const jwt = require('jsonwebtoken');

const generateAlgoRhythmToken = (userId: string, email: string, role: string = 'user') => {
  const secret = 'algorhythm-dev-jwt-secret-key'; // Development secret
  const payload = {
    userId,
    email,
    role, // 'user', 'admin', 'analyst'
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  return jwt.sign(payload, secret);
};

// Example usage
const token = generateAlgoRhythmToken(
  '68c1f0d6d36816c3b22e0e36',
  'ajay@celerity.studio',
  'user'
);
```

### **Token Usage in Requests**
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${algoRhythmToken}`
};
```

---

## 🎵 **Core Integration Patterns**

### **1. Template Recommendation**

When user selects a song, get the perfect template:

```typescript
interface TemplateRecommendationRequest {
  song_id: string;
  user_context: {
    user_id: string;
    preferences: {
      energy_preference: 'low' | 'medium' | 'high';
      style_preference: string;
    };
  };
}

interface TemplateRecommendationResponse {
  success: boolean;
  data: {
    recommended_template: {
      template_id: string;
      compatibility_score: number;
      preview_url: string;
    };
    alternatives: Array<{
      template_id: string;
      compatibility_score: number;
      preview_url: string;
    }>;
  };
}

const recommendTemplate = async (songId: string, userId: string): Promise<TemplateRecommendationResponse> => {
  const response = await fetch(`${ALGORHYTHM_API}/api/v1/recommend/template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${algoRhythmToken}`
    },
    body: JSON.stringify({
      song_id: songId,
      user_context: {
        user_id: userId,
        preferences: {
          energy_preference: 'high',
          style_preference: 'pop'
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AlgoRhythm API error: ${response.status}`);
  }

  return response.json();
};
```

### **2. Layer Variations**

Get alternative options for specific layers:

```typescript
interface LayerVariationRequest {
  current_template_id: string;
  vary_layer: 'star' | 'look' | 'moves' | 'world';
  song_id: string;
  limit?: number;
}

const getLayerVariations = async (
  templateId: string, 
  layer: string, 
  songId: string,
  limit: number = 6
) => {
  const response = await fetch(`${ALGORHYTHM_API}/api/v1/recommend/variations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${algoRhythmToken}`
    },
    body: JSON.stringify({
      current_template_id: templateId,
      vary_layer: layer,
      song_id: songId,
      limit
    })
  });

  return response.json();
};
```

### **3. Analytics Integration**

Track user interactions and get insights:

```typescript
interface AnalyticsEvent {
  user_id: string;
  session_id: string;
  selection_event: {
    type: 'template_selected' | 'layer_changed' | 'remix_completed' | 'shared';
    template_id: string;
    song_id: string;
    timestamp: string;
    context: {
      selection_index: number;
      selection_time_ms: number;
      previous_template_id?: string;
    };
  };
}

const trackUserInteraction = async (event: AnalyticsEvent) => {
  const response = await fetch(`${ALGORHYTHM_API}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${algoRhythmToken}`
    },
    body: JSON.stringify(event)
  });

  return response.json();
};
```

---

## 🏗️ **Current System Architecture**

### **Data Flow**
```
ReViz Expo App
    ↓ (JWT Auth)
AlgoRhythm Service
    ↓ (Fetch Songs)
NNA Registry Service
    ↓ (Fetch Assets)
MongoDB (Songs + Stars + Looks + Moves + Worlds)
```

### **Current Asset Status**
- ✅ **Stars Layer (S)**: 3 assets (1 base + 2 variants of "Gigi")
- 🚧 **Songs Layer (G)**: In development (you're creating these)
- ⏳ **Looks Layer (L)**: Planned
- ⏳ **Moves Layer (M)**: Planned  
- ⏳ **Worlds Layer (W)**: Planned

---

## 🧪 **Testing & Development**

### **Health Check**
```typescript
const checkAlgoRhythmHealth = async () => {
  const response = await fetch(`${ALGORHYTHM_API}/api/v1/health`);
  const health = await response.json();
  
  console.log('AlgoRhythm Status:', health.status);
  console.log('Database:', health.services.database.status);
  console.log('NNA Registry:', health.services.nna_registry.status);
  
  return health;
};
```

### **API Documentation**
Visit: `https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/docs`

### **Test with Current Data**
```typescript
// Test with existing Star assets (while Songs Layer is being created)
const testWithStarAssets = async () => {
  // These are the current Star asset IDs
  const starAssets = [
    '68c1f147d36816c3b22e0e3a', // Base Gigi
    '68c1f19ed36816c3b22e0e42', // Blue eyes variant
    '68c1fd6054937bc693d46618'  // Pink hair variant
  ];

  // Once you create songs, you can test recommendations
  for (const songId of ['song-001', 'song-002']) {
    try {
      const recommendation = await recommendTemplate(songId, 'test-user');
      console.log(`Recommendation for ${songId}:`, recommendation);
    } catch (error) {
      console.log(`Song ${songId} not found yet - this is expected`);
    }
  }
};
```

---

## 🚨 **Error Handling**

### **Common Error Responses**
```typescript
interface AlgoRhythmError {
  success: false;
  error: {
    status: number;
    message: string;
    error: string;
    statusCode: number;
  };
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
}

// Common error codes:
// 401 - Unauthorized (invalid/missing JWT)
// 404 - Song not found (expected until Songs Layer is created)
// 400 - Bad request (invalid parameters)
```

### **Error Handling Pattern**
```typescript
const handleAlgoRhythmError = (error: AlgoRhythmError) => {
  switch (error.error.status) {
    case 401:
      // Refresh JWT token
      console.log('Authentication required');
      break;
    case 404:
      // Song not found - expected during development
      console.log('Song not found - Songs Layer still being created');
      break;
    case 400:
      // Invalid request parameters
      console.log('Invalid request:', error.error.message);
      break;
    default:
      console.log('Unexpected error:', error);
  }
};
```

---

## 📊 **Monitoring & Analytics**

### **Service Monitoring**
```typescript
const monitorAlgoRhythm = async () => {
  const health = await checkAlgoRhythmHealth();
  
  if (health.status === 'degraded') {
    console.warn('AlgoRhythm is degraded:', health.services);
  }
  
  return health;
};
```

### **Performance Metrics**
```typescript
const getPerformanceMetrics = async () => {
  const response = await fetch(`${ALGORHYTHM_API}/api/v1/analytics/metrics/performance`, {
    headers: {
      'Authorization': `Bearer ${adminToken}` // Requires admin role
    }
  });
  
  return response.json();
};
```

---

## 🔄 **Development Workflow**

### **1. Current Phase: Songs Layer Creation**
- ✅ AlgoRhythm service is deployed and ready
- ✅ Authentication is working
- ✅ Star assets are available
- 🚧 **You're creating Songs Layer assets**

### **2. Next Steps**
1. **Create Songs**: Add song assets to NNA Registry
2. **Test Recommendations**: Use the integration patterns above
3. **Add More Layers**: Looks, Moves, Worlds as needed
4. **Optimize**: Fine-tune recommendation algorithms

### **3. Integration Checklist**
- [ ] Generate AlgoRhythm JWT tokens
- [ ] Implement template recommendation flow
- [ ] Add error handling
- [ ] Set up analytics tracking
- [ ] Test with real song data (once available)
- [ ] Deploy to staging/production

---

## 📞 **Support & Resources**

### **API Documentation**
- **Swagger UI**: `https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/docs`
- **Health Check**: `https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/health`

### **Current Working JWT Token** (Development)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMxZjBkNmQzNjgxNmMzYjIyZTBlMzYiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTc1NDM0MjgsImV4cCI6MTc1NzYyOTgyOH0.znTO_i_gmHnhD2Ti2fdbTIVJGOHh2SjC0mQO2ao2OLU
```

### **Available Star Assets**
- **Base**: `68c1f147d36816c3b22e0e3a` (Gigi - Brown hair, brown eyes)
- **Variant 1**: `68c1f19ed36816c3b22e0e42` (Gigi - Brown hair, blue eyes)
- **Variant 2**: `68c1fd6054937bc693d46618` (Gigi - Pink hair, brown eyes)

---

## 🎯 **Ready for Integration!**

The AlgoRhythm service is **fully deployed and ready** for ReViz Expo integration. The system is waiting for the Songs Layer to be created, after which it will provide intelligent template recommendations for the "Start with a Song" experience.

**Next Action**: Create Songs Layer assets in the NNA Registry, then test the integration patterns above! 🚀
