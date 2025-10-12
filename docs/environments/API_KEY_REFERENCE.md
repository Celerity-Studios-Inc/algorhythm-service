# 🔐 **API KEY REFERENCE - ALL ENVIRONMENTS**

**Date**: October 12, 2025  
**Status**: ✅ **CURRENT AND VERIFIED**  
**Environments**: Development, Staging, Production

---

## 🎯 **OVERVIEW**

This document provides the definitive reference for all API key values across all environments. These values are stored in Google Cloud Secret Manager and used for API key authentication.

---

## 🔑 **API KEY VALUES BY ENVIRONMENT**

### **Development Environment**
- **Secret Name**: `algorhythm-reviz-api-key-dev`
- **Current Version**: 4
- **API Key Value**: `reviz-dev-30390-13220-4896-9516-9001` ✅
- **Status**: ✅ **ACTIVE AND TESTED**

### **Staging Environment**
- **Secret Name**: `algorhythm-reviz-api-key-stg`
- **Current Version**: 3
- **API Key Value**: `reviz-stg-22280-20750-3046-22387-16913` ✅
- **Status**: ✅ **ACTIVE**

### **Production Environment**
- **Secret Name**: `algorhythm-reviz-api-key-prod`
- **Current Version**: 4
- **API Key Value**: `reviz-prod-14816-10560-14098-5656-10119` ✅
- **Status**: ✅ **ACTIVE**

---

## 🧪 **TESTING COMMANDS**

### **Development Environment**
```bash
# Test API key authentication
curl -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -X POST "https://dev.algorhythm.media/api/v1/auth/test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user"}'

# Test recommendation API
curl -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.001.003.001", "user_context": {"user_id": "test_user"}}'

# Test ReViz complete experience
curl -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.001.003.001", "user_context": {"user_id": "test_user"}, "experience_config": {"max_assets_per_layer": 4}}'
```

### **Staging Environment**
```bash
# Test API key authentication
curl -H "x-api-key: reviz-stg-22280-20750-3046-22387-16913" \
  -X POST "https://stg.algorhythm.media/api/v1/auth/test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user"}'
```

### **Production Environment**
```bash
# Test API key authentication
curl -H "x-api-key: reviz-prod-14816-10560-14098-5656-10119" \
  -X POST "https://prod.algorhythm.media/api/v1/auth/test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user"}'
```

---

## 📊 **VERSION HISTORY**

### **Development Environment**
- **Version 1**: (Initial value provided)
- **Version 2**: `reviz-dev-7f8a9b2c-4d5e-6f7g-8h9i-0j1k2l3m4n5o`
- **Version 3**: `reviz-dev-14816-10560-14098-5656-10119`
- **Version 4**: `reviz-dev-30390-13220-4896-9516-9001` ✅ **CURRENT**

### **Staging Environment**
- **Version 1**: (Initial value provided)
- **Version 2**: `reviz-stg-a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Version 3**: `reviz-stg-22280-20750-3046-22387-16913` ✅ **CURRENT**

### **Production Environment**
- **Version 1**: (Initial value provided)
- **Version 2**: `reviz-prod-7f8a9b2c-4d5e-6f7g-8h9i-0j1k2l3m4n5o`
- **Version 3**: `reviz-prod-a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Version 4**: `reviz-prod-14816-10560-14098-5656-10119` ✅ **CURRENT**

---

## 🔧 **ENVIRONMENT CONFIGURATION**

### **Development**
```typescript
// config/environment.development.ts
REVIZ_API_KEY: 'reviz-dev-30390-13220-4896-9516-9001',
```

### **Staging**
```typescript
// config/environment.staging.ts
REVIZ_API_KEY: 'reviz-stg-22280-20750-3046-22387-16913',
```

### **Production**
```typescript
// config/environment.production.ts
REVIZ_API_KEY: 'reviz-prod-14816-10560-14098-5656-10119',
```

---

## 🚨 **SECURITY NOTES**

1. **API Key Rotation**: These keys should be rotated regularly for security
2. **Environment Isolation**: Each environment has its own unique API key
3. **Secret Management**: All keys are stored in Google Cloud Secret Manager
4. **Access Control**: Only authorized services can access these keys

---

## 📞 **TROUBLESHOOTING**

### **Common Issues:
1. **Invalid API Key**: Ensure you're using the correct key for the environment
2. **Environment Mismatch**: Verify you're testing against the correct environment
3. **Secret Manager Access**: Ensure the service has access to the secret

### **Debug Commands:**
```bash
# Check debug endpoint for environment variable status
curl -s "https://dev.algorhythm.media/api/v1/auth/debug"

# Expected output should show:
# "revizApiKey": {"loaded": true, "length": 36, "preview": "reviz-de..."}
```

---

**🔧 This reference provides the complete API key configuration for all environments and is the single source of truth for API key values.**
