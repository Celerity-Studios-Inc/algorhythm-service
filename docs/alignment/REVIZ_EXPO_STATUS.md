# AlgoRhythm Service - ReViz Expo Integration Status
*Current status and ready-to-use information for ReViz Expo developers*

**Last Updated**: September 11, 2025  
**Status**: ✅ **READY FOR INTEGRATION**

---

## 🚀 **Service Status**

### **✅ What's Working**
- **Service URL**: `https://dev.algorhythm.media` (Canonical URL - LIVE!)
- **Health Check**: `/api/v1/health` - Service is running
- **Authentication**: JWT-based auth working
- **Database**: MongoDB connected and healthy
- **NNA Registry**: Connected and accessible
- **API Documentation**: Available at `/api/docs`

### **⚠️ Current Limitations**
- **Video Templates**: No pre-generated templates available yet
- **Cache**: Redis cache has issues (not critical for functionality)

### **✅ Recent Improvements**
- **JWT Compatibility**: ✅ **FIXED** - Can now use NNA Registry tokens directly!

---

## 🔐 **Authentication**

### **✅ JWT Token Compatibility - FIXED!**
**Great news!** ReViz Expo developers can now use **NNA Registry JWT tokens directly** with AlgoRhythm! 

The service now supports **dual JWT verification**:
1. **Primary**: AlgoRhythm JWT tokens (if you have them)
2. **Fallback**: NNA Registry JWT tokens (automatic fallback)

### **How It Works**
```typescript
// ✅ This now works! Use your existing NNA Registry JWT token
const nnaRegistryToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Your NNA token

// Make API calls directly with NNA Registry token
const response = await fetch('https://dev.algorhythm.media/api/v1/recommend/template', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${nnaRegistryToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    song_id: "1.018.001.001"
  })
});
```

### **Alternative: Generate AlgoRhythm JWT Token** (if needed)
```typescript
const jwt = require('jsonwebtoken');

const generateAlgoRhythmToken = (userId: string, email: string) => {
  const secret = 'algorhythm-dev-jwt-secret-key';
  const payload = {
    userId,
    email,
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  return jwt.sign(payload, secret);
};
```

### **Working JWT Token** (24h validity)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMxZjBkNmQzNjgxNmMzYjIyZTBlMzYiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTc2MTIxMDcsImV4cCI6MTc1NzY5ODUwN30.ND_KOv4vOzkpqlc64RUV7ebtTAwEOCW5J0ve7RvJf-4
```

---

## 🎵 **Available Data**

### **Songs Layer (G) - ✅ Available**
- **"Try Everything" by Shakira**
  - **NNA Address**: `1.018.001.001`
  - **MongoDB ID**: `68c30009d634c261d50ec610`
  - **Genre**: Pop
  - **BPM**: 120
  - **Energy**: High
  - **Status**: ✅ Ready for recommendations

### **Stars Layer (S) - ✅ Available**
- **Base Gigi**: `68c1f147d36816c3b22e0e3a` (Brown hair, brown eyes)
- **Variant 1**: `68c1f19ed36816c3b22e0e42` (Brown hair, blue eyes)
- **Variant 2**: `68c1fd6054937bc693d46618` (Pink hair, brown eyes)

---

## 🧪 **Testing the Service**

### **1. Health Check**
```bash
curl "https://dev.algorhythm.media/api/v1/health"
```

**Expected Response**:
```json
{
  "status": "degraded",
  "version": "1.0.0",
  "services": {
    "database": {"status": "healthy"},
    "nna_registry": {"status": "healthy"},
    "cache": {"status": "unhealthy"}
  }
}
```

### **2. Template Recommendation Test**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{
       "song_id": "1.018.001.001",
       "user_context": {
         "user_id": "test-user",
         "preferences": {
           "energy_preference": "high",
           "style_preference": "pop"
         }
       }
     }' \
     "https://dev.algorhythm.media/api/v1/recommend/template"
```

**Expected Response** (Current):
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "No templates available for song: 1.018.001.001"
  }
}
```

**This is expected** - the service is working correctly, but no video templates exist yet.

---

## 📚 **Integration Resources**

### **Documentation**
- **Main Guide**: [REVIZ_EXPO_DEVELOPER_GUIDE.md](./REVIZ_EXPO_DEVELOPER_GUIDE.md)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Code Examples**: [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)
- **API Specification**: [algorhythm-api-spec.md](./architecture/algorhythm-api-spec.md)

### **Key Endpoints**
- **Health**: `https://dev.algorhythm.media/api/v1/health`
- **API Docs**: `https://dev.algorhythm.media/api/docs`
- **Recommendations**: `https://dev.algorhythm.media/api/v1/recommend/template`
- **Analytics**: `https://dev.algorhythm.media/api/v1/analytics/popular/templates`

---

## 🎯 **Next Steps for ReViz Expo**

### **Immediate Integration (Ready Now)**
1. **Set up JWT token generation** for AlgoRhythm
2. **Implement health check** monitoring
3. **Test authentication** with the service
4. **Prepare recommendation UI** components

### **Future Integration (When Templates Available)**
1. **Template recommendation** flow
2. **Layer variation** selection
3. **Analytics tracking** integration
4. **Error handling** for missing templates

---

## 🚨 **Important Notes**

1. **JWT Tokens**: Must generate AlgoRhythm-specific tokens
2. **Templates**: Currently no video templates exist (expected)
3. **Error Handling**: 404 errors for missing templates are normal
4. **Service Status**: "Degraded" status is due to Redis cache issues (non-critical)

---

## 📞 **Support**

- **Service URL**: `https://dev.algorhythm.media`
- **Health Check**: `https://dev.algorhythm.media/api/v1/health`
- **API Documentation**: `https://dev.algorhythm.media/api/docs`

**The AlgoRhythm service is fully deployed and ready for ReViz Expo integration!** 🚀

