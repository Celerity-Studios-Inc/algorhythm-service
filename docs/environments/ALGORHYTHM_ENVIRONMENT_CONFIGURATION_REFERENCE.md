# AlgoRhythm Service - Environment Configuration Reference

## 🎯 **Executive Summary**

This document provides the definitive reference for all environment configurations in the AlgoRhythm AI Recommendation Engine. It includes canonical domain mappings, environment-specific variables, and verification procedures to ensure proper isolation between development, staging, and production environments.

**Last Updated**: January 10, 2025  
**Version**: 1.0  
**Status**: ✅ **Canonical Configuration Established**

---

## 🌍 **Canonical Environment Mapping**

### **Complete Environment Configuration Table**

| Environment     | Frontend Domain                                | Backend Domain                   | Database Name                     | Redis Configuration            | CORS Allowed Origin                            | MongoDB URI                                                                                                                                                    |
| --------------- | ---------------------------------------------- | -------------------------------- | --------------------------------- | ------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development** | `https://algorhythm.dev.reviz.dev`             | `https://algorhythm.dev.reviz.dev` | `algorhythm-service-dev`          | `redis://10.0.0.3:6379`         | `https://algorhythm.dev.reviz.dev`             | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService`        |
| **Staging**     | `https://algorhythm.stg.reviz.dev`             | `https://algorhythm.stg.reviz.dev` | `algorhythm-service-staging`      | `redis://10.0.0.3:6379`         | `https://algorhythm.stg.reviz.dev`             | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-staging?retryWrites=true&w=majority&appName=algorhythmService`    |
| **Production**  | `https://algorhythm.reviz.dev`                 | `https://algorhythm.reviz.dev`     | `algorhythm-service-production`   | `redis://10.0.0.3:6379`         | `https://algorhythm.reviz.dev`                 | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-production?retryWrites=true&w=majority&appName=algorhythmService` |

---

## 🏗️ **Cloud Run Service Configuration**

### **Service Names and Regions**

| Environment     | Cloud Run Service Name         | Region        | Custom Domain            |
| --------------- | ------------------------------ | ------------- | ------------------------ |
| **Development** | `algorhythm-service-dev`       | `us-central1` | `algorhythm.dev.reviz.dev` |
| **Staging**     | `algorhythm-service-staging`   | `us-central1` | `algorhythm.stg.reviz.dev` |
| **Production**  | `algorhythm-service`           | `us-central1` | `algorhythm.reviz.dev`   |

### **Environment Variable Mappings**

Each Cloud Run service maps environment variables to Google Cloud Secret Manager secrets:

#### **Development Environment Variables**

```yaml
Environment Variables:
  NODE_ENV: "development"
  MONGODB_URI: "algorhythm-mongodb-uri-dev" (secret)
  REDIS_URL: "algorhythm-redis-url-dev" (secret)
  JWT_SECRET: "algorhythm-jwt-secret-dev" (secret)
  NNA_REGISTRY_BASE_URL: "https://registry.dev.reviz.dev"
  NNA_REGISTRY_API_KEY: "algorhythm-nna-api-key-dev" (secret)
  SENTRY_DSN: "algorhythm-sentry-dsn-dev" (secret)
```

#### **Staging Environment Variables**

```yaml
Environment Variables:
  NODE_ENV: "staging"
  MONGODB_URI: "algorhythm-mongodb-uri-stg" (secret)
  REDIS_URL: "algorhythm-redis-url-stg" (secret)
  JWT_SECRET: "algorhythm-jwt-secret-stg" (secret)
  NNA_REGISTRY_BASE_URL: "https://registry.stg.reviz.dev"
  NNA_REGISTRY_API_KEY: "algorhythm-nna-api-key-stg" (secret)
  SENTRY_DSN: "algorhythm-sentry-dsn-stg" (secret)
```

#### **Production Environment Variables**

```yaml
Environment Variables:
  NODE_ENV: "production"
  MONGODB_URI: "algorhythm-mongodb-uri" (secret)
  REDIS_URL: "algorhythm-redis-url" (secret)
  JWT_SECRET: "algorhythm-jwt-secret" (secret)
  NNA_REGISTRY_BASE_URL: "https://registry.reviz.dev"
  NNA_REGISTRY_API_KEY: "algorhythm-nna-api-key" (secret)
  SENTRY_DSN: "algorhythm-sentry-dsn" (secret)
```

---

## 🔐 **Secret Manager Configuration**

### **Secret Names and Values**

#### **Development Secrets**

| Secret Name                        | Secret Value                                                                                                                                            | Purpose                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `algorhythm-mongodb-uri-dev`       | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService` | Development database connection |
| `algorhythm-redis-url-dev`         | `redis://10.0.0.3:6379`                                                                                                                               | Development Redis connection    |
| `algorhythm-jwt-secret-dev`        | `algorhythm-dev-jwt-secret-key`                                                                                                                        | Development JWT signing         |
| `algorhythm-nna-api-key-dev`       | `algorhythm-dev-nna-api-key`                                                                                                                           | Development NNA Registry API    |
| `algorhythm-sentry-dsn-dev`        | `https://algorhythm-dev-sentry-dsn@sentry.io/project`                                                                                                  | Development error tracking      |

#### **Staging Secrets**

| Secret Name                        | Secret Value                                                                                                                                                | Purpose                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `algorhythm-mongodb-uri-stg`       | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-staging?retryWrites=true&w=majority&appName=algorhythmService` | Staging database connection |
| `algorhythm-redis-url-stg`         | `redis://10.0.0.3:6379`                                                                                                                                   | Staging Redis connection    |
| `algorhythm-jwt-secret-stg`        | `algorhythm-stg-jwt-secret-key`                                                                                                                            | Staging JWT signing         |
| `algorhythm-nna-api-key-stg`       | `algorhythm-stg-nna-api-key`                                                                                                                               | Staging NNA Registry API    |
| `algorhythm-sentry-dsn-stg`        | `https://algorhythm-stg-sentry-dsn@sentry.io/project`                                                                                                      | Staging error tracking      |

#### **Production Secrets**

| Secret Name                    | Secret Value                                                                                                                                                   | Purpose                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `algorhythm-mongodb-uri`       | `mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-production?retryWrites=true&w=majority&appName=algorhythmService` | Production database connection |
| `algorhythm-redis-url`         | `redis://10.0.0.3:6379`                                                                                                                                       | Production Redis connection    |
| `algorhythm-jwt-secret`        | `algorhythm-prod-jwt-secret-key`                                                                                                                               | Production JWT signing         |
| `algorhythm-nna-api-key`       | `algorhythm-prod-nna-api-key`                                                                                                                                  | Production NNA Registry API    |
| `algorhythm-sentry-dsn`        | `https://algorhythm-prod-sentry-dsn@sentry.io/project`                                                                                                         | Production error tracking      |

---

## 🔒 **CORS Configuration**

### **Environment-Specific CORS Policies**

#### **Development CORS**

```typescript
allowedOrigins: [
  'https://algorhythm.dev.reviz.dev',
  'http://localhost:3000', // For local development
  'http://localhost:3001', // Alternative local port
];
```

#### **Staging CORS**

```typescript
allowedOrigins: ['https://algorhythm.stg.reviz.dev'];
```

#### **Production CORS**

```typescript
allowedOrigins: ['https://algorhythm.reviz.dev'];
```

---

## 🚀 **Deployment Configuration**

### **GitHub Actions Workflows**

#### **Development Deployment** (`ci-cd-dev.yml`)

```yaml
Triggers: Push to `dev` branch
Target: `algorhythm-service-dev` Cloud Run service
Environment: Development
Secrets: All `-dev` suffixed secrets
Service Account: 116756405696741720548@revize-453014.iam.gserviceaccount.com
```

#### **Staging Deployment** (`ci-cd-stg.yml`)

```yaml
Triggers: Push to `staging` branch
Target: `algorhythm-service-staging` Cloud Run service
Environment: Staging
Secrets: All `-stg` suffixed secrets
Service Account: 116756405696741720548@revize-453014.iam.gserviceaccount.com
```

#### **Production Deployment** (`ci-cd-prod.yml`)

```yaml
Triggers: Push to `main` branch (with approval)
Target: `algorhythm-service` Cloud Run service
Environment: Production
Secrets: All production secrets (no suffix)
Service Account: 116756405696741720548@revize-453014.iam.gserviceaccount.com
```

---

## 🔍 **Environment Detection Logic**

### **Backend Environment Detection**

```typescript
// Primary: Hostname-based detection
const hostname = req.hostname;

if (hostname.includes('algorhythm.stg.reviz.dev')) {
  return 'staging';
}

if (hostname.includes('algorhythm.dev.reviz.dev')) {
  return 'development';
}

if (hostname.includes('algorhythm.reviz.dev')) {
  return 'production';
}

// Fallback: Environment variables
const nodeEnv = process.env.NODE_ENV;
const environment = process.env.ENVIRONMENT;

// Safety: Default to production
return 'production';
```

---

## 📊 **Health Endpoint Responses**

### **Expected Health Endpoint Format**

#### **Development Health Response**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T18:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "detection": {
    "method": "hostname",
    "hostname": "algorhythm.dev.reviz.dev"
  },
  "config": {
    "database": {
      "connected": true,
      "name": "algorhythm-service-dev"
    },
    "redis": {
      "connected": true,
      "url": "redis://10.0.0.3:6379"
    },
    "nna_registry": {
      "base_url": "https://registry.dev.reviz.dev",
      "connected": true
    },
    "cors": {
      "allowedOrigins": ["https://algorhythm.dev.reviz.dev"]
    },
    "logging": {
      "level": "debug"
    }
  }
}
```

#### **Staging Health Response**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T18:30:00.000Z",
  "version": "1.0.0",
  "environment": "staging",
  "detection": {
    "method": "hostname",
    "hostname": "algorhythm.stg.reviz.dev"
  },
  "config": {
    "database": {
      "connected": true,
      "name": "algorhythm-service-staging"
    },
    "redis": {
      "connected": true,
      "url": "redis://10.0.0.3:6379"
    },
    "nna_registry": {
      "base_url": "https://registry.stg.reviz.dev",
      "connected": true
    },
    "cors": {
      "allowedOrigins": ["https://algorhythm.stg.reviz.dev"]
    },
    "logging": {
      "level": "info"
    }
  }
}
```

#### **Production Health Response**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T18:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "detection": {
    "method": "hostname",
    "hostname": "algorhythm.reviz.dev"
  },
  "config": {
    "database": {
      "connected": true,
      "name": "algorhythm-service-production"
    },
    "redis": {
      "connected": true,
      "url": "redis://10.0.0.3:6379"
    },
    "nna_registry": {
      "base_url": "https://registry.reviz.dev",
      "connected": true
    },
    "cors": {
      "allowedOrigins": ["https://algorhythm.reviz.dev"]
    },
    "logging": {
      "level": "warn"
    }
  }
}
```

---

## 🛠️ **Verification Procedures**

### **Automated Verification Script**

Use the provided verification script to check all environments:

```bash
# Verify all environments
./scripts/verify-environments.sh all

# Verify specific environment
./scripts/verify-environments.sh dev
./scripts/verify-environments.sh staging
./scripts/verify-environments.sh prod
```

### **Manual Verification Checklist**

#### **Pre-Deployment Checks**

- [ ] Verify Cloud Run service names match expected pattern
- [ ] Confirm secret mappings are correct for target environment
- [ ] Validate environment variables are properly set
- [ ] Check CORS configuration allows correct frontend domain
- [ ] Verify Redis connection configuration
- [ ] Confirm NNA Registry integration URLs

#### **Post-Deployment Checks**

- [ ] Health endpoint returns correct environment information
- [ ] Database connection uses correct database name
- [ ] Redis connection is established and working
- [ ] NNA Registry integration is functional
- [ ] CORS preflight requests succeed from frontend domain
- [ ] Environment detection logic works correctly
- [ ] Recommendation APIs respond within <20ms target

#### **Cross-Environment Isolation Checks**

- [ ] Analytics data created in dev appears only in dev database
- [ ] Analytics data created in staging appears only in staging database
- [ ] Analytics data created in production appears only in production database
- [ ] No cross-environment data leakage occurs
- [ ] Redis cache isolation between environments

---

## 🚨 **Common Configuration Issues**

### **Issue 1: Wrong Redis Configuration**

**Symptoms**: Cache operations fail, slow response times
**Cause**: `REDIS_URL` secret mapped to wrong value or Redis not accessible
**Solution**: Update Cloud Run environment variable mapping to correct secret

### **Issue 2: Wrong Database Connection**

**Symptoms**: Analytics data appears in wrong database
**Cause**: `MONGODB_URI` secret mapped to wrong value
**Solution**: Update Cloud Run environment variable mapping to correct secret

### **Issue 3: NNA Registry Integration Failure**

**Symptoms**: Template recommendations fail, 500 errors
**Cause**: `NNA_REGISTRY_BASE_URL` or `NNA_REGISTRY_API_KEY` incorrect
**Solution**: Verify NNA Registry URLs and API keys for each environment

### **Issue 4: CORS Errors**

**Symptoms**: Frontend cannot communicate with backend
**Cause**: CORS configuration doesn't allow frontend domain
**Solution**: Update CORS allowed origins in backend configuration

### **Issue 5: Environment Detection Failure**

**Symptoms**: Health endpoint shows wrong environment
**Cause**: Hostname detection logic or environment variables incorrect
**Solution**: Verify hostname configuration and environment variable values

---

## 📋 **Maintenance Procedures**

### **Adding New Environment**

1. Create new Cloud Run service with appropriate name
2. Create new secrets in Secret Manager with environment suffix
3. Configure environment variables in Cloud Run service
4. Update CORS configuration for new frontend domain
5. Add new environment to verification script
6. Update this documentation

### **Updating Secret Values**

1. Update secret value in Google Cloud Secret Manager
2. Redeploy Cloud Run service to pick up new secret value
3. Verify configuration using health endpoint
4. Run verification script to confirm changes

### **Troubleshooting Configuration**

1. Run verification script to identify issues
2. Check Cloud Run service configuration
3. Verify secret values in Secret Manager
4. Test health endpoint for runtime configuration
5. Check CORS preflight requests
6. Verify Redis and MongoDB connections

---

## 📚 **Related Documentation**

- [NNA Registry Environment Configuration](../nna-registry-reference/ENVIRONMENT_CONFIGURATION_REFERENCE.md)
- [AlgoRhythm API Specification](../specs/algorhythm-api-spec.md)
- [ReViz Expo Integration Guide](../specs/reviz-expo-algorhythm-guide.md)
- [Backend Architecture Reference](../architecture/BACKEND_ARCHITECTURE_COMPREHENSIVE_REFERENCE.md)

---

**This document serves as the single source of truth for all AlgoRhythm environment configurations. Any changes to environment setup must be reflected here and verified using the provided verification script.**
