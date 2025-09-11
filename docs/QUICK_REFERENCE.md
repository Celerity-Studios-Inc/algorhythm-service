# AlgoRhythm Quick Reference Card
*For ReViz Expo Developers*

## 🚀 **Canonical URLs & Service URLs**

### **Canonical URLs (Planned)**
```typescript
const ALGORHYTHM_CANONICAL = {
  development: 'https://dev.algorhythm.media',
  staging: 'https://stg.algorhythm.media', 
  production: 'https://prod.algorhythm.media'
};
```

### **Current Active URLs**
```typescript
// Development (Currently Active)
const ALGORHYTHM_API = 'https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app';

// Health Check
const HEALTH_URL = `${ALGORHYTHM_API}/api/v1/health`;

// API Documentation
const DOCS_URL = `${ALGORHYTHM_API}/api/docs`;
```

## 🔐 **Authentication**
```typescript
// JWT Secret (Development)
const JWT_SECRET = 'algorhythm-dev-jwt-secret-key';

// Generate Token
const token = jwt.sign({
  userId: 'user-id',
  email: 'user@email.com',
  role: 'user', // or 'admin', 'analyst'
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
}, JWT_SECRET);

// Use in Requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## 🎵 **Core Endpoints**

### **Template Recommendation**
```typescript
POST /api/v1/recommend/template
{
  "song_id": "song-123",
  "user_context": {
    "user_id": "user-456",
    "preferences": {
      "energy_preference": "high",
      "style_preference": "pop"
    }
  }
}
```

### **Layer Variations**
```typescript
POST /api/v1/recommend/variations
{
  "current_template_id": "template-123",
  "vary_layer": "star", // "star", "look", "moves", "world"
  "song_id": "song-123",
  "limit": 6
}
```

### **Analytics**
```typescript
GET /api/v1/analytics/popular/templates
POST /api/v1/analytics/events
```

## 🧪 **Test Data**

### **Current Star Assets**
- Base: `68c1f147d36816c3b22e0e3a` (Gigi - Brown hair, brown eyes)
- Variant 1: `68c1f19ed36816c3b22e0e42` (Gigi - Brown hair, blue eyes)  
- Variant 2: `68c1fd6054937bc693d46618` (Gigi - Pink hair, brown eyes)

### **Working JWT Token** (24h validity)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMxZjBkNmQzNjgxNmMzYjIyZTBlMzYiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTc1NDM0MjgsImV4cCI6MTc1NzYyOTgyOH0.znTO_i_gmHnhD2Ti2fdbTIVJGOHh2SjC0mQO2ao2OLU
```

## 🚨 **Error Codes**
- `401` - Unauthorized (invalid JWT)
- `404` - Song not found (expected until Songs Layer created)
- `400` - Bad request (invalid parameters)

## 📊 **Service Status**
- ✅ **AlgoRhythm**: Running
- ✅ **Database**: Healthy
- ✅ **NNA Registry**: Connected
- ⚠️ **Cache**: Unhealthy (Redis issue)
- 🚧 **Songs Layer**: In development

## 🔄 **Current Status**
- **Ready for Integration**: ✅
- **Waiting for**: Songs Layer assets
- **Next Step**: Create songs in NNA Registry
