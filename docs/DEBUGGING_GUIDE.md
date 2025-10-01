# 🐛 AlgoRhythm Service Debugging Guide

## 📋 **Current Issue: JWT Fallback Authentication**

**Status**: JWT fallback implementation is complete but not working in deployed service  
**Last Updated**: September 19, 2025

## 🎯 **Problem Summary**

The JWT fallback authentication mechanism is fully implemented but the deployed AlgoRhythm service is not loading the `NNA_REGISTRY_JWT_SECRET` environment variable correctly, causing JWT verification to fail.

## 🔍 **Debugging Steps**

### **Step 1: Verify JWT Token Validity**

**Test Token**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8
```

**Local Verification**:
```bash
node -e "
const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8';
const nnaSecret = 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39';

try {
  const decoded = jwt.verify(token, nnaSecret);
  console.log('✅ SUCCESS: Token verified with NNA Registry secret!');
  console.log('User ID:', decoded.userId);
  console.log('Email:', decoded.email);
  console.log('Role:', decoded.role);
} catch (error) {
  console.log('❌ FAILED: Token verification failed with NNA Registry secret');
  console.log('Error:', error.message);
}
"
```

**Expected Output**:
```
✅ SUCCESS: Token verified with NNA Registry secret!
User ID: 68c82c41928bbc0b14297755
Email: ajay@celerity.studio
Role: user
```

### **Step 2: Test Deployed Service**

**Test Request**:
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.001.001", "user_context": {"user_id": "68c82c41928bbc0b14297755"}}' | jq .
```

**Current Response** (FAILING):
```json
{
  "success": false,
  "error": {
    "status": 401,
    "message": "Invalid token from both AlgoRhythm and NNA Registry",
    "error": "Unauthorized",
    "statusCode": 401
  },
  "timestamp": "2025-09-19T00:36:33.066Z",
  "path": "/api/v1/recommend/template",
  "method": "POST",
  "requestId": "unknown"
}
```

**Expected Response** (SUCCESS):
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "user": {
      "userId": "68c82c41928bbc0b14297755",
      "email": "ajay@celerity.studio",
      "role": "user",
      "tokenSource": "nna_registry"
    }
  }
}
```

### **Step 3: Check Environment Variables**

**Check Cloud Run Service Configuration**:
1. Go to Google Cloud Console
2. Navigate to Cloud Run
3. Select `algorhythm-service-dev`
4. Check Environment Variables tab
5. Verify `NNA_REGISTRY_JWT_SECRET` is listed

**Check Secret Manager**:
1. Go to Secret Manager in Google Cloud Console
2. Verify secret exists: `algorhythm-nna-jwt-secret-dev`
3. Check secret value matches: `a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39`

### **Step 4: Check Service Account Permissions**

**Required Roles**:
- `secretmanager.secretAccessor`
- `cloudrun.admin`
- `iam.serviceAccountUser`

**Check Permissions**:
```bash
gcloud projects get-iam-policy revize-453014 \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:algorhythm-service@revize-453014.iam.gserviceaccount.com"
```

### **Step 5: Check Service Logs**

**View Logs**:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=algorhythm-service-dev" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)" \
  --project=revize-453014
```

**Look for**:
- Environment variable loading errors
- JWT verification errors
- Secret Manager access errors

## 🔧 **Potential Solutions**

### **Solution 1: Verify Secret Configuration**

**Check if secret is properly configured in Cloud Run**:
```bash
gcloud run services describe algorhythm-service-dev \
  --region=us-central1 \
  --project=revize-453014 \
  --format="export" | grep -A 10 -B 10 "NNA_REGISTRY_JWT_SECRET"
```

### **Solution 2: Force Secret Refresh**

**Update secret in Secret Manager**:
```bash
echo -n "a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39" | \
gcloud secrets versions add algorhythm-nna-jwt-secret-dev \
  --data-file=- \
  --project=revize-453014
```

### **Solution 3: Redeploy Service**

**Force fresh deployment**:
```bash
git commit --allow-empty -m "🔄 Force fresh deployment to load NNA Registry JWT secret" && git push origin dev
```

### **Solution 4: Check Service Account**

**Verify service account has correct permissions**:
```bash
gcloud projects add-iam-policy-binding revize-453014 \
  --member="serviceAccount:algorhythm-service@revize-453014.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: Secret Not Found**
**Error**: `Secret projects/***/secrets/algorhythm-nna-jwt-secret-dev/versions/latest was not found`

**Solution**:
1. Verify secret exists in Secret Manager
2. Check secret name spelling
3. Ensure secret has a version

### **Issue 2: Permission Denied**
**Error**: `Permission denied on resource`

**Solution**:
1. Check service account permissions
2. Verify IAM roles are properly assigned
3. Check project ID is correct

### **Issue 3: Environment Variable Not Loaded**
**Error**: `NNA Registry JWT secret not configured`

**Solution**:
1. Check Cloud Run service configuration
2. Verify secret is properly referenced
3. Check service account has access to secret

## 📊 **Debugging Checklist**

- [ ] JWT token is valid and not expired
- [ ] Token verifies correctly with NNA Registry secret locally
- [ ] Secret exists in Google Cloud Secret Manager
- [ ] Secret name matches configuration
- [ ] Secret value is correct
- [ ] Service account has `secretmanager.secretAccessor` role
- [ ] Cloud Run service is configured to use the secret
- [ ] Service logs show no environment variable loading errors
- [ ] Fresh deployment has been triggered

## 🎯 **Next Steps**

1. **Check Cloud Run service configuration** for environment variables
2. **Verify secret exists and is accessible** in Secret Manager
3. **Check service account permissions** for Secret Manager access
4. **Review service logs** for environment variable loading errors
5. **Test with fresh deployment** if configuration issues are found

## 📝 **Debugging Commands**

**Check service status**:
```bash
curl -s "https://dev.algorhythm.media/api/v1/health" | jq .
```

**Test JWT verification locally**:
```bash
node -e "
const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8';
const nnaSecret = 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39';
try { const decoded = jwt.verify(token, nnaSecret); console.log('✅ SUCCESS:', decoded.userId); } catch(e) { console.log('❌ FAILED:', e.message); }
"
```

**Test deployed service**:
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.001.001", "user_context": {"user_id": "68c82c41928bbc0b14297755"}}' | jq .
```

---

**Last Updated**: September 19, 2025  
**Status**: Ready for debugging environment variable loading issue

