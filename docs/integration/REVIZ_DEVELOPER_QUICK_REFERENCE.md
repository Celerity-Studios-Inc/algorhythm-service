# 🚀 **ReViz Developer Quick Reference Card**
## **V2.0 API - Essential Information**

---

## 🔑 **Authentication**
```javascript
// Get JWT from NNA Registry Service
const token = await getJWTFromNNARegistry();
```

## 📡 **Primary Endpoint**
```javascript
POST https://dev.algorhythm.media/api/v1/reviz/complete-experience
```

## 💻 **Basic Request**
```javascript
const request = {
  song_id: 'G.POP.TEN.003',
  user_context: {
    user_id: 'user_123',
    device_info: { type: 'mobile', connection_speed: 'medium' }
  },
  experience_config: {
    max_composites: 5,
    max_assets_per_layer: 6,
    include_variants: true,
    variant_depth: 4
  }
};

const response = await fetch('/api/v1/reviz/complete-experience', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
});
```

## 📊 **Expected Performance**
- **Response Time:** <50ms (cached)
- **Response Size:** 2-5MB (95% smaller than V1.0)
- **Cache Hit Rate:** 90%+
- **Error Rate:** <0.1%

## 🎯 **Key Features**
- ✅ GCP URL-based architecture
- ✅ Sub-50ms response times
- ✅ Complete experience in single call
- ✅ Mobile optimization
- ✅ Hierarchical caching

## 🛠️ **Error Handling**
```javascript
if (!response.ok) {
  switch(response.status) {
    case 401: // Invalid JWT token
    case 400: // Invalid request
    case 404: // Song not found
    case 500: // Server error
  }
}
```

## 📚 **Documentation**
- **Full Guide:** `REVIZ_DEVELOPER_COMPREHENSIVE_GUIDE.md`
- **API Docs:** `/api/docs`
- **Health Check:** `/api/v1/health`

---
*Quick Reference - V2.0 - Production Ready*
