# 🚀 **ALGORHYTHM QUICK START GUIDE**

**Status**: 🚨 **CRITICAL** - Ready for immediate deployment  
**Issue**: Docker build dependency resolution failures  
**Solution**: Pre-built deployment strategy

---

## 🎯 **IMMEDIATE DEPLOYMENT OPTIONS**

### **CRITICAL FIXES: Architecture & Dockerignore Issues**
```bash
# Fix the .dockerignore issue first
./fix-dockerignore.sh

# Use architecture-aware deployment (RECOMMENDED)
./deploy-architecture-fix.sh
```

### **Option 1: Automated Pre-built Deployment**
```bash
cd /Users/ajaymadhok/algorhythm-service
./deploy-prebuilt.sh
```

### **Option 2: Cloud Build with Pre-built Strategy**
```bash
gcloud builds submit --config cloudbuild-prebuilt.yaml
```

### **Option 3: Manual Pre-built Deployment**
```bash
# Build locally first
npm install --legacy-peer-deps
npm run build

# Build Docker image with pre-built code
docker build -f Dockerfile.prebuilt -t gcr.io/revize-453014/algorhythm-service-dev .

# Push to registry
docker push gcr.io/revize-453014/algorhythm-service-dev

# Deploy to Cloud Run
gcloud run deploy algorhythm-service-dev \
  --region us-central1 \
  --image gcr.io/revize-453014/algorhythm-service-dev \
  --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-dev:latest,NNA_API_KEY=algorhythm-nna-api-key-dev:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-dev:latest,NODE_ENV=algorhythm-node-env-dev:latest"
```

---

## 📋 **AVAILABLE FILES**

### **Documentation:**
- `ALGORHYTHM_CRITICAL_DOCKER_FIX.md` - Complete solution guide
- `ALGORHYTHM_DOCKER_BUILD_FIX.md` - Docker build optimization
- `ALGORHYTHM_DEPLOYMENT_FIX.md` - NODE_ENV conflict resolution
- `ALGORHYTHM_ENVIRONMENT_VARIABLES_FIXED.md` - Environment variable fixes
- `ALGORHYTHM_INTEGRATION.md` - NNA Registry integration guide

### **Scripts:**
- `deploy-prebuilt.sh` - Automated pre-built deployment
- `scripts/fix-algorhythm-secrets-*.sh` - Secret Manager configuration

### **Configuration:**
- `Dockerfile.prebuilt` - Pre-built deployment Dockerfile
- `cloudbuild-prebuilt.yaml` - Cloud Build configuration

---

## 🧪 **TESTING COMMANDS**

### **Test Health Endpoint:**
```bash
curl https://dev.algorhythm.media/health
```

### **Test Template Endpoint (CRITICAL):**
```bash
curl -X POST https://dev.algorhythm.media/api/v1/recommend/template \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test-user-123"}}' \
  -w "\n\nResponse time: %{time_total}s\n" \
  --max-time 35
```

### **Test Composite Endpoint:**
```bash
curl -X POST https://dev.algorhythm.media/api/v1/reviz/composite/complete-experience \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -H "Content-Type: application/json" \
  -d '{"composite_id": "9.002.025.073", "user_context": {"user_id": "test-user-123"}}' \
  -w "\n\nResponse time: %{time_total}s\n" \
  --max-time 35
```

---

## 🎯 **EXPECTED RESULTS**

| Test | Expected Result | Status |
|------|----------------|--------|
| **Health Check** | 200 OK, < 1 second | ✅ |
| **Template Endpoint** | 200 OK, < 1 second | ✅ |
| **Composite Endpoint** | 200 OK, < 1 second | ✅ |
| **NNA Registry Integration** | Real data, 30s timeout | ✅ |

---

## 🚨 **TROUBLESHOOTING**

### **If deployment fails:**
1. Check local build: `npm run build`
2. Check Docker image: `docker build -f Dockerfile.prebuilt -t test .`
3. Check Cloud Run logs: `gcloud run services logs algorhythm-service-dev --region us-central1`

### **If performance is slow:**
1. Check NNA Registry connectivity
2. Verify environment variables are set
3. Check Secret Manager configuration

---

## 🎉 **SUCCESS CRITERIA**

- ✅ **Deployment succeeds** without Docker build issues
- ✅ **Service starts** and runs on port 8080
- ✅ **Template endpoint** responds in < 1 second
- ✅ **NNA Registry integration** works with real data
- ✅ **All performance optimizations** are preserved

**Ready for immediate deployment! 🚀**
