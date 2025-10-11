# 🔧 **WEBHOOK ENVIRONMENT CONFIGURATION**

## 🎯 **OVERVIEW**

This document outlines the environment configuration for the new webhook infrastructure across all environments (development, staging, production).

## 🌍 **ENVIRONMENT ARCHITECTURE**

### **Multi-Environment Setup**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │    Staging      │    │   Production     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ algorhythm-dev  │    │ algorhythm-stg  │    │ algorhythm-prod │
│ registry-dev    │    │ registry-stg    │    │ registry-prod   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 **SECRET CONFIGURATION**

### **🚨 CRITICAL: ENVIRONMENT VARIABLE MAPPING**

**⚠️ IMPORTANT**: The code expects specific environment variable names. This mapping must be verified in every deployment:

| **Code Expects** | **Deployment Sets** | **Priority** | **Status** |
|------------------|---------------------|--------------|------------|
| `WEBHOOK_SECRET` | `WEBHOOK_SECRET` | **PRIMARY** | ✅ Required |
| `ALGORHYTHM_WEBHOOK_SECRET` | `ALGORHYTHM_WEBHOOK_SECRET` | **FALLBACK** | ✅ Required |
| `ALGORHYTHM_WEBHOOK_URL` | `ALGORHYTHM_WEBHOOK_URL` | **PRIMARY** | ✅ Required |
| `ALGORHYTHM_WEBHOOK_MAX_RETRIES` | `ALGORHYTHM_WEBHOOK_MAX_RETRIES` | **PRIMARY** | ✅ Required |
| `ALGORHYTHM_WEBHOOK_RETRY_DELAY` | `ALGORHYTHM_WEBHOOK_RETRY_DELAY` | **PRIMARY** | ✅ Required |

**🔧 Code Logic**:
```typescript
// src/modules/webhooks/webhook-validation.service.ts:16-17
const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET') || 
                     this.configService.get<string>('ALGORHYTHM_WEBHOOK_SECRET');
```

### **Development Environment**
```bash
# Algorhythm Service - BOTH REQUIRED
WEBHOOK_SECRET=43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a
ALGORHYTHM_WEBHOOK_SECRET=43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a
ALGORHYTHM_WEBHOOK_URL=https://algorhythm-webhook-url-dev:latest
ALGORHYTHM_WEBHOOK_MAX_RETRIES=algorhythm-webhook-max-retries-dev:latest
ALGORHYTHM_WEBHOOK_RETRY_DELAY=algorhythm-webhook-retry-delay-dev:latest
NNA_REGISTRY_BASE_URL=NNA_REGISTRY_BASE_URL:latest
NNA_REGISTRY_API_KEY=NNA_REGISTRY_API_KEY:latest

# NNA Registry Service
ALGORHYTHM_WEBHOOK_URL_DEV=https://algorhythm.dev.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_DEV=43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a
ALGORHYTHM_WEBHOOK_MAX_RETRIES_DEV=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_DEV=1000
```

### **Staging Environment**
```bash
# Algorhythm Service
WEBHOOK_SECRET_STG=54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf
NNA_REGISTRY_WEBHOOK_URL_STG=https://registry.stg.reviz.dev/webhooks

# NNA Registry Service
ALGORHYTHM_WEBHOOK_URL_STG=https://algorhythm.stg.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_STG=54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf
ALGORHYTHM_WEBHOOK_MAX_RETRIES_STG=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_STG=1000
```

### **Production Environment**
```bash
# Algorhythm Service
WEBHOOK_SECRET_PROD=94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91
NNA_REGISTRY_WEBHOOK_URL_PROD=https://registry.prod.reviz.dev/webhooks

# NNA Registry Service
ALGORHYTHM_WEBHOOK_URL_PROD=https://algorhythm.prod.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_PROD=94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91
ALGORHYTHM_WEBHOOK_MAX_RETRIES_PROD=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_PROD=1000
```

## 🚀 **DEPLOYMENT CONFIGURATION**

### **Google Cloud Secret Manager**

#### **Algorhythm Service Secrets**
```bash
# Development
gcloud config set project algorhythm-dev
echo -n "43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "https://registry.dev.reviz.dev/webhooks" | gcloud secrets create nna-registry-webhook-url --data-file=-

# Staging
gcloud config set project algorhythm-stg
echo -n "54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "https://registry.stg.reviz.dev/webhooks" | gcloud secrets create nna-registry-webhook-url --data-file=-

# Production
gcloud config set project algorhythm-prod
echo -n "94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "https://registry.prod.reviz.dev/webhooks" | gcloud secrets create nna-registry-webhook-url --data-file=-
```

#### **NNA Registry Service Secrets**
```bash
# Development
gcloud config set project nna-registry-dev
echo -n "https://algorhythm.dev.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url --data-file=-
echo -n "43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "3" | gcloud secrets create algorhythm-webhook-max-retries --data-file=-
echo -n "1000" | gcloud secrets create algorhythm-webhook-retry-delay --data-file=-

# Staging
gcloud config set project nna-registry-stg
echo -n "https://algorhythm.stg.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url --data-file=-
echo -n "54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "3" | gcloud secrets create algorhythm-webhook-max-retries --data-file=-
echo -n "1000" | gcloud secrets create algorhythm-webhook-retry-delay --data-file=-

# Production
gcloud config set project nna-registry-prod
echo -n "https://algorhythm.prod.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url --data-file=-
echo -n "94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91" | gcloud secrets create algorhythm-webhook-secret --data-file=-
echo -n "3" | gcloud secrets create algorhythm-webhook-max-retries --data-file=-
echo -n "1000" | gcloud secrets create algorhythm-webhook-retry-delay --data-file=-
```

### **GitHub Repository Secrets**

#### **Algorhythm Service Repository**
```
WEBHOOK_SECRET_DEV=43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a
WEBHOOK_SECRET_STG=54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf
WEBHOOK_SECRET_PROD=94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91
NNA_REGISTRY_WEBHOOK_URL_DEV=https://registry.dev.reviz.dev/webhooks
NNA_REGISTRY_WEBHOOK_URL_STG=https://registry.stg.reviz.dev/webhooks
NNA_REGISTRY_WEBHOOK_URL_PROD=https://registry.prod.reviz.dev/webhooks
```

#### **NNA Registry Service Repository**
```
ALGORHYTHM_WEBHOOK_URL_DEV=https://algorhythm.dev.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_URL_STG=https://algorhythm.stg.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_URL_PROD=https://algorhythm.prod.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_DEV=43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a
ALGORHYTHM_WEBHOOK_SECRET_STG=54594dd7bce76e5603c1fbdb359d7774ceeb611a34d6397cc85f05e8e56feacf
ALGORHYTHM_WEBHOOK_SECRET_PROD=94c67a59112e52474ee30c5a8af2b52adbd4052bb82f584e20ce05f7c7cd8e91
ALGORHYTHM_WEBHOOK_MAX_RETRIES_DEV=3
ALGORHYTHM_WEBHOOK_MAX_RETRIES_STG=3
ALGORHYTHM_WEBHOOK_MAX_RETRIES_PROD=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_DEV=1000
ALGORHYTHM_WEBHOOK_RETRY_DELAY_STG=1000
ALGORHYTHM_WEBHOOK_RETRY_DELAY_PROD=1000
```

## 🔧 **CLOUD RUN CONFIGURATION**

### **Algorhythm Service Configuration**
```yaml
# Cloud Run Service Configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: algorhythm-service
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cloudsql-instances: revize-453014:us-central1:algorhythm-db
    spec:
      containers:
      - image: gcr.io/revize-453014/algorhythm-service
        env:
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-secret
              key: latest
        - name: NNA_REGISTRY_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: nna-registry-webhook-url
              key: latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

### **NNA Registry Service Configuration**
```yaml
# Cloud Run Service Configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nna-registry-service
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cloudsql-instances: revize-453014:us-central1:nna-registry-db
    spec:
      containers:
      - image: gcr.io/revize-453014/nna-registry-service
        env:
        - name: ALGORHYTHM_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-url
              key: latest
        - name: ALGORHYTHM_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-secret
              key: latest
        - name: ALGORHYTHM_WEBHOOK_MAX_RETRIES
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-max-retries
              key: latest
        - name: ALGORHYTHM_WEBHOOK_RETRY_DELAY_MS
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-retry-delay
              key: latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

## 🔄 **CI/CD CONFIGURATION**

### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [dev, stg, prod]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Google Cloud CLI
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy algorhythm-service \
            --image gcr.io/revize-453014/algorhythm-service \
            --platform managed \
            --region us-central1 \
            --set-env-vars WEBHOOK_SECRET=${{ secrets.WEBHOOK_SECRET_DEV }} \
            --set-env-vars NNA_REGISTRY_WEBHOOK_URL=${{ secrets.NNA_REGISTRY_WEBHOOK_URL_DEV }}
```

## 📊 **ENVIRONMENT MONITORING**

### **Health Check Endpoints**
```
Development:
├── Algorhythm: https://algorhythm.dev.reviz.dev/health
├── NNA Registry: https://registry.dev.reviz.dev/health
└── Webhook Test: https://algorhythm.dev.reviz.dev/webhooks/test

Staging:
├── Algorhythm: https://algorhythm.stg.reviz.dev/health
├── NNA Registry: https://registry.stg.reviz.dev/health
└── Webhook Test: https://algorhythm.stg.reviz.dev/webhooks/test

Production:
├── Algorhythm: https://algorhythm.prod.reviz.dev/health
├── NNA Registry: https://registry.prod.reviz.dev/health
└── Webhook Test: https://algorhythm.prod.reviz.dev/webhooks/test
```

### **Monitoring Configuration**
```yaml
# Prometheus Configuration
scrape_configs:
  - job_name: 'algorhythm-service'
    static_configs:
      - targets: ['algorhythm.dev.reviz.dev:8080']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nna-registry-service'
    static_configs:
      - targets: ['registry.dev.reviz.dev:8080']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

## 🔐 **SECURITY CONFIGURATION**

### **Network Security**
- **HTTPS Only**: All webhook communication over HTTPS
- **TLS 1.3**: Latest TLS version for secure communication
- **Certificate Management**: Automated certificate renewal
- **Firewall Rules**: Restricted access to webhook endpoints

### **Authentication & Authorization**
- **HMAC Signatures**: All webhook payloads cryptographically signed
- **Timestamp Validation**: 5-minute tolerance for replay attack prevention
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **IP Whitelisting**: Restricted access to known IP ranges

## 🎯 **ENVIRONMENT PROMOTION**

### **Development → Staging**
1. **Code Promotion**: Merge dev branch to staging
2. **Secret Update**: Update staging secrets
3. **Deployment**: Deploy to staging environment
4. **Testing**: Run integration tests
5. **Validation**: Verify webhook functionality

### **Staging → Production**
1. **Code Promotion**: Merge staging branch to production
2. **Secret Update**: Update production secrets
3. **Deployment**: Deploy to production environment
4. **Monitoring**: Monitor production metrics
5. **Validation**: Verify production webhook functionality

## 📞 **TROUBLESHOOTING**

### **Common Issues**
- **Webhook Failures**: Check signature validation and network connectivity
- **Secret Access**: Verify Google Cloud Secret Manager permissions
- **Environment Variables**: Check Cloud Run environment variable configuration
- **Network Connectivity**: Verify service-to-service communication

### **Debugging Steps**
1. **Check Logs**: Review Cloud Run logs for errors
2. **Verify Secrets**: Ensure secrets are properly configured
3. **Test Connectivity**: Test webhook endpoint accessibility
4. **Monitor Metrics**: Check Prometheus metrics for issues

---

**🔧 This configuration provides a robust, secure, and scalable foundation for webhook integration across all environments.**
