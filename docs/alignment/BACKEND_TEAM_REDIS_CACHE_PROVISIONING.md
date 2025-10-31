# Redis Cache Provisioning Request - Backend Team

**Date**: October 31, 2025  
**Priority**: 🟡 **MEDIUM** - Performance optimization blocker  
**Requestor**: AlgoRhythm Team  
**Target Environments**: Development (Phase 1), then Staging and Production

---

## 📋 **Executive Summary**

The AlgoRhythm service requires Redis/Memorystore provisioning to enable distributed caching and reduce response times for template recommendations and composite variations. Current response times are **10-11 seconds**, which is unacceptable for production use. Phase 1 performance optimizations (HTTP Keep-Alive, parallelization) have been implemented, but Redis caching is the critical missing piece to achieve sub-2-second response times.

**Request**: Provision Google Cloud Memorystore for Redis instances for all three environments (dev, staging, production) and configure Secret Manager secrets for the AlgoRhythm service to connect.

**Estimated Time**: 1-2 hours for all environments  
**Impact**: 30-50% reduction in P95 response times once caching is enabled

---

## 🔍 **WHY: The Performance Problem**

### **Current Performance Metrics**

Based on comprehensive testing and benchmarks:

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Template Recommendation Endpoint** (`POST /api/v1/recommend/template`) | **10.5-11.6 seconds** | <2 seconds | ❌ **CRITICAL** |
| **NNA Registry API Calls** (`GET /api/v1/assets/composites/by-song/{songId}`) | 1.5-1.7 seconds | <500ms | ⚠️ **SLOW** |
| **Composite Variations Endpoint** (`POST /api/v1/reviz/composite/variations`) | 400-600ms | <200ms | ✅ **ACCEPTABLE** |
| **Cache Hit Rate** | 0% (no Redis) | >50% | ❌ **NO CACHE** |

### **Root Cause Analysis**

1. **NNA Registry API Latency**
   - Each call to NNA Registry's `by-song` endpoint takes **1.5-1.7 seconds**
   - Template recommendations make multiple downstream calls (composites, metadata, scoring)
   - Sequential processing multiplies latency: `1.5s × N calls = 10+ seconds total`

2. **No Caching Layer**
   - Currently using **in-memory cache only** (lost on restart, not shared across instances)
   - Cloud Run can scale to 10 instances, so in-memory cache is ineffective
   - Same composite data is fetched repeatedly from NNA Registry

3. **Cold Start Penalty**
   - First request for a song must fetch from NNA Registry
   - Subsequent requests for the same song should be cached but aren't (no shared Redis)

### **Evidence from Production Traffic**

```
Request Flow (Current - No Redis):
User Request → AlgoRhythm Service → NNA Registry (1.5-1.7s) → Process (2-3s) → Score (3-4s) → Aggregate (2-3s)
Total: 8.5-11.7 seconds ❌

Request Flow (With Redis):
User Request → AlgoRhythm Service → Redis Cache (10-50ms) → Return
Total: 10-50ms ✅ (50-100x faster)
```

### **Expected Impact with Redis**

- **30-50% reduction** in P95 response times (10s → 3-5s, then → 1-2s after warmup)
- **50-70% reduction** in NNA Registry API load (cached requests don't hit NNA)
- **Lower Cloud Run costs** (fewer CPU-seconds per request)
- **Better user experience** (faster recommendations, smoother UI)

---

## 📦 **WHAT: What Needs to be Provisioned**

### **1. Google Cloud Memorystore for Redis Instances**

Three Redis instances, one per environment:

| Environment | Instance Name | Tier | Memory | Network | Purpose |
|-------------|---------------|------|--------|---------|---------|
| **Development** | `algorhythm-redis-dev` | Basic | 1GB | VPC (same as Cloud Run) | Shared cache for dev service |
| **Staging** | `algorhythm-redis-stg` | Basic | 1GB | VPC (same as Cloud Run) | Shared cache for staging service |
| **Production** | `algorhythm-redis-prod` | Standard (HA) | 2GB | VPC (same as Cloud Run) | Shared cache for production service |

**Note**: Development and staging can use Basic tier (single node). Production should use Standard tier (high availability).

### **2. Secret Manager Secrets**

Three secrets containing Redis connection strings:

| Secret Name | Secret Value Format | Environment |
|-------------|---------------------|-------------|
| `algorhythm-redis-url-dev` | `redis://<INTERNAL_IP>:6379` | Development |
| `algorhythm-redis-url-stg` | `redis://<INTERNAL_IP>:6379` | Staging |
| `algorhythm-redis-url` | `redis://<INTERNAL_IP>:6379` | Production |

**Note**: These secrets are already referenced in the AlgoRhythm Cloud Run service configurations but do not yet exist in Secret Manager.

### **3. Network Configuration**

- **VPC Network**: Memorystore instances must be in the same VPC as Cloud Run services
- **Authorized Networks**: Cloud Run service account must have access to Redis instances
- **Firewall Rules**: Ensure Redis port (6379) is accessible from Cloud Run instances

---

## 🔧 **HOW: Step-by-Step Provisioning Instructions**

### **Prerequisites**

1. **GCP Project**: `revize-453014`
2. **Permissions**: Backend team member with:
   - `roles/redis.admin` (create/manage Memorystore instances)
   - `roles/secretmanager.admin` (create/update secrets)
   - `roles/compute.networkAdmin` (VPC network access)
3. **Network**: VPC network where Cloud Run services are deployed
4. **Region**: `us-central1` (same as Cloud Run services)

### **Step 1: Provision Development Redis Instance**

```bash
# Set environment variables
export PROJECT_ID="revize-453014"
export REGION="us-central1"
export REDIS_INSTANCE_NAME="algorhythm-redis-dev"
export NETWORK="default"  # Replace with actual VPC network name

# Create Memorystore Redis instance (Basic tier for dev)
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --size=1 \
  --tier=BASIC \
  --region=$REGION \
  --redis-version=REDIS_7_0 \
  --network=projects/$PROJECT_ID/global/networks/$NETWORK \
  --reserved-ip-range=10.x.x.x/29 \
  --project=$PROJECT_ID

# Wait for instance to be created (5-10 minutes)
gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID

# Get the internal IP address
INTERNAL_IP=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(host)' \
  --project=$PROJECT_ID)

echo "Redis internal IP: $INTERNAL_IP"
```

### **Step 2: Create Secret Manager Secret for Development**

```bash
# Create or update the secret with Redis connection string
echo -n "redis://${INTERNAL_IP}:6379" | gcloud secrets create algorhythm-redis-url-dev \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic"

# Grant Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding algorhythm-redis-url-dev \
  --member="serviceAccount:116756405696741720548@revize-453014.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### **Step 3: Provision Staging Redis Instance**

```bash
# Set environment variables
export REDIS_INSTANCE_NAME="algorhythm-redis-stg"

# Create Memorystore Redis instance (Basic tier for staging)
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --size=1 \
  --tier=BASIC \
  --region=$REGION \
  --redis-version=REDIS_7_0 \
  --network=projects/$PROJECT_ID/global/networks/$NETWORK \
  --reserved-ip-range=10.x.x.x/29 \
  --project=$PROJECT_ID

# Get internal IP
INTERNAL_IP=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(host)' \
  --project=$PROJECT_ID)

# Create secret
echo -n "redis://${INTERNAL_IP}:6379" | gcloud secrets create algorhythm-redis-url-stg \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic"

# Grant access
gcloud secrets add-iam-policy-binding algorhythm-redis-url-stg \
  --member="serviceAccount:116756405696741720548@revize-453014.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### **Step 4: Provision Production Redis Instance (High Availability)**

```bash
# Set environment variables
export REDIS_INSTANCE_NAME="algorhythm-redis-prod"

# Create Memorystore Redis instance (Standard tier for production - HA)
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --size=2 \
  --tier=STANDARD_HA \
  --region=$REGION \
  --redis-version=REDIS_7_0 \
  --network=projects/$PROJECT_ID/global/networks/$NETWORK \
  --reserved-ip-range=10.x.x.x/29 \
  --project=$PROJECT_ID

# Get internal IP
INTERNAL_IP=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(host)' \
  --project=$PROJECT_ID)

# Create secret
echo -n "redis://${INTERNAL_IP}:6379" | gcloud secrets create algorhythm-redis-url \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic"

# Grant access
gcloud secrets add-iam-policy-binding algorhythm-redis-url \
  --member="serviceAccount:116756405696741720548@revize-453014.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### **Step 5: Verify Network Connectivity**

```bash
# Test connectivity from a Cloud Run instance (use Cloud Shell or Compute Engine VM in same VPC)
# This is optional but recommended to verify network access

# Get Redis internal IP
REDIS_IP=$(gcloud redis instances describe algorhythm-redis-dev \
  --region=us-central1 \
  --format='value(host)' \
  --project=revize-453014)

# Test connection (requires redis-cli installed)
redis-cli -h $REDIS_IP -p 6379 ping
# Expected output: PONG
```

### **Step 6: Verify Secret Manager Secrets**

```bash
# List all Redis-related secrets
gcloud secrets list --project=revize-453014 | grep redis

# Verify secret values (be careful - this shows the connection string)
gcloud secrets versions access latest --secret="algorhythm-redis-url-dev" --project=revize-453014
gcloud secrets versions access latest --secret="algorhythm-redis-url-stg" --project=revize-453014
gcloud secrets versions access latest --secret="algorhythm-redis-url" --project=revize-453014
```

### **Step 7: Update Cloud Run Service (Already Configured)**

**Note**: The AlgoRhythm Cloud Run services are already configured to use these secrets. No changes needed to Cloud Run configuration - just ensure the secrets exist.

**Verification**: Check that Cloud Run service has `REDIS_URL` secret bound:

```bash
# Check dev service
gcloud run services describe algorhythm-service-dev \
  --region=us-central1 \
  --format='yaml(spec.template.spec.containers[0].env)' \
  --project=revize-453014 | grep REDIS_URL
```

---

## ✅ **Verification Checklist**

After provisioning, verify the following:

### **Infrastructure Verification**

- [ ] Development Redis instance created and healthy
- [ ] Staging Redis instance created and healthy
- [ ] Production Redis instance created and healthy (HA mode)
- [ ] All Redis instances accessible from Cloud Run VPC
- [ ] Secret Manager secrets created for all three environments
- [ ] Service account has `secretAccessor` role for all secrets

### **Integration Verification**

- [ ] AlgoRhythm dev service can connect to Redis (check health endpoint)
- [ ] AlgoRhythm staging service can connect to Redis
- [ ] AlgoRhythm production service can connect to Redis
- [ ] Cache operations work (check service logs for "Redis cache hit" messages)

### **Performance Verification**

- [ ] Template recommendation endpoint shows cache hits after first request
- [ ] Response times improve on cached requests (10s → <2s)
- [ ] NNA Registry API call rate decreases (cached requests skip NNA)

---

## 📊 **Expected Results After Provisioning**

### **Before Redis (Current State)**

```
POST /api/v1/recommend/template
Response Time: 10.5-11.6 seconds
Cache Hit Rate: 0%
NNA Registry Calls: 100% (every request)
```

### **After Redis (Expected State)**

```
POST /api/v1/recommend/template
First Request (cache miss): 10-11 seconds
Subsequent Requests (cache hit): 50-200ms
Cache Hit Rate: 50-70% (after warmup)
NNA Registry Calls: 30-50% (cached requests skip NNA)
```

### **Cost Impact**

- **Memorystore Costs**: ~$30-50/month per instance (Basic tier) / ~$100-150/month (Standard HA)
- **Cloud Run Cost Savings**: Reduced CPU-seconds due to faster responses (estimated 20-30% reduction)
- **NNA Registry Load**: 50% reduction in API calls (major cost savings)

**Net Result**: Slight increase in infrastructure costs, but significant improvement in performance and user experience.

---

## 🔒 **Security Considerations**

1. **Network Isolation**: Redis instances are only accessible from the same VPC as Cloud Run
2. **No Public Access**: Redis does not have public IP addresses
3. **IAM Access**: Only Cloud Run service account can access secrets
4. **Encryption**: Memorystore encrypts data at rest and in transit

---

## 🚨 **Troubleshooting**

### **Issue: Redis Connection Timeout**

**Symptoms**: AlgoRhythm service logs show "Redis connection failed"  
**Causes**:
- Redis instance not in same VPC as Cloud Run
- Firewall rules blocking port 6379
- Incorrect internal IP in secret

**Solution**:
```bash
# Verify Redis instance network
gcloud redis instances describe algorhythm-redis-dev --region=us-central1 --format='yaml(authorizedNetwork)'

# Check firewall rules
gcloud compute firewall-rules list --filter="name~redis OR targetTags~redis" --project=revize-453014

# Verify secret contains correct IP
gcloud secrets versions access latest --secret="algorhythm-redis-url-dev"
```

### **Issue: Secret Manager Permission Denied**

**Symptoms**: Cloud Run deployment fails with "permission denied"  
**Causes**:
- Service account missing `secretAccessor` role
- Secret doesn't exist

**Solution**:
```bash
# Grant access
gcloud secrets add-iam-policy-binding algorhythm-redis-url-dev \
  --member="serviceAccount:116756405696741720548@revize-453014.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify secret exists
gcloud secrets describe algorhythm-redis-url-dev
```

### **Issue: Redis Instance Not Available**

**Symptoms**: `gcloud redis instances describe` returns "not found"  
**Causes**:
- Instance name typo
- Wrong region or project

**Solution**:
```bash
# List all Redis instances
gcloud redis instances list --region=us-central1 --project=revize-453014
```

---

## 📝 **Implementation Notes for AlgoRhythm Team**

**Status**: AlgoRhythm code is **already ready** for Redis:

1. ✅ `CacheService` implemented and uses `ioredis` client
2. ✅ `RedisModule` configured (loads when `REDIS_URL` env var is set)
3. ✅ `OptimizedNnaRegistryService` uses `CacheService` for composite caching
4. ✅ Cloud Run services already reference `REDIS_URL` secrets
5. ✅ Graceful degradation: Service works without Redis (uses in-memory cache fallback)

**After Backend provisions Redis**:
- No code changes needed - caching will automatically activate
- Service will use Redis for shared cache across Cloud Run instances
- Cache hit rate will improve from 0% to 50-70% after warmup

---

## 📞 **Contact and Questions**

If you have questions or need clarification on any step:

1. **AlgoRhythm Team**: Review this document and provide feedback
2. **Backend Team**: Confirm network details (VPC name, IP ranges) before provisioning
3. **DevOps Team**: Coordinate if additional infrastructure changes are needed

---

## 📚 **References**

- **AlgoRhythm Environment Config**: `/docs/environments/ALGORHYTHM_ENVIRONMENT_CONFIGURATION_REFERENCE.md`
- **Performance Analysis**: `/docs/performance/TEMPLATE_ENDPOINT_OPTIMIZATION.md`
- **Cache Service Implementation**: `src/modules/caching/cache.service.ts`
- **Redis Module**: `src/config/redis.config.ts`
- **GCP Memorystore Docs**: https://cloud.google.com/memorystore/docs/redis

---

**Status**: ⏳ **AWAITING BACKEND PROVISIONING**  
**Next Step**: Backend team provisions Redis instances and creates secrets, then AlgoRhythm team verifies connection and measures performance improvements.

