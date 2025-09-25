# JWT Sharing Guide for AlgoRhythm Service

## 🎯 **Objective**
Share JWT authentication between ReViz Expo App and AlgoRhythm Service using the same JWT secret from NNA Registry.

## 🔐 **JWT Secret Configuration**

### **NNA Registry JWT Secret (Development)**
```
JWT_SECRET = "dev-jwt-secret-key"
```

### **JWT Token for Testing**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzc3MDEsImV4cCI6MTc1ODMyNDEwMX0.uqnbe5erZqMOKTzECUIhLJVPsUo23B-XuzGKq7HvvCA
```

**Token Details:**
- **User ID:** `68c82c41928bbc0b14297755`
- **Email:** `ajay@celerity.studio`
- **Role:** `user`
- **Expires:** `2025-09-19T23:21:41.000Z` (24 hours from generation)

## 🚀 **Implementation Steps for AlgoRhythm**

### **1. Add NNA Registry JWT Secret to Environment**
```bash
# Add to your .env file
NNA_REGISTRY_JWT_SECRET=dev-jwt-secret-key
```

### **2. Update JWT Strategy with Fallback**
```typescript
// In your JWT strategy
const jwtSecret = process.env.JWT_SECRET || 'default-secret';
const nnaRegistrySecret = process.env.NNA_REGISTRY_JWT_SECRET;

// Try primary secret first, then fallback to NNA Registry secret
let decoded;
try {
  decoded = jwt.verify(token, jwtSecret);
} catch (error) {
  try {
    decoded = jwt.verify(token, nnaRegistrySecret);
  } catch (fallbackError) {
    throw new UnauthorizedException('Invalid token');
  }
}
```

### **3. Test with Generated Token**
```bash
curl -X POST "https://your-algorhythm-api.com/api/v1/recommend/template" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzc3MDEsImV4cCI6MTc1ODMyNDEwMX0.uqnbe5erZqMOKTzECUIhLJVPsUo23B-XuzGKq7HvvCA" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "1.018.001.001",
    "user_context": { "user_id": "68c82c41928bbc0b14297755" }
  }'
```

## 🔄 **ReViz Expo Integration**

### **Using NNA Registry Token Directly**
```typescript
// In ReViz Expo app
const nnaRegistryToken = await getNNARegistryToken(); // Your existing token

// Use directly with AlgoRhythm
const response = await fetch('https://algorhythm-api.com/api/v1/recommend/template', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${nnaRegistryToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    song_id: "1.018.001.001",
    user_context: { user_id: userId }
  })
});
```

## 🛠️ **Environment-Specific Secrets**

### **Development**
- **NNA Registry Secret:** `dev-jwt-secret-key`
- **AlgoRhythm Secret:** Your existing development secret

### **Staging**
- **NNA Registry Secret:** `stg-jwt-secret-key`
- **AlgoRhythm Secret:** Your existing staging secret

### **Production**
- **NNA Registry Secret:** `prod-jwt-secret-key`
- **AlgoRhythm Secret:** Your existing production secret

## ✅ **Benefits**

1. **Seamless Integration:** ReViz Expo can use existing NNA Registry tokens
2. **No Token Exchange:** No need for additional API calls
3. **Backward Compatibility:** Existing AlgoRhythm tokens still work
4. **Unified Authentication:** Single source of truth for user authentication

## 🔧 **Troubleshooting**

### **Token Verification Fails**
1. Check if JWT secret matches exactly
2. Verify token hasn't expired
3. Ensure token format is correct

### **Environment Issues**
1. Verify `NNA_REGISTRY_JWT_SECRET` is set in environment
2. Check if secret matches the environment (dev/staging/prod)
3. Restart service after environment changes

## 📞 **Support**

If you need help with implementation or have questions, please reach out to the NNA Registry team.

---

**Generated:** 2025-09-18T23:21:41.000Z  
**Token Expires:** 2025-09-19T23:21:41.000Z  
**Environment:** Development
