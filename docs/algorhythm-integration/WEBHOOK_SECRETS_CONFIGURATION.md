# 🔐 Webhook Secrets Configuration - All Environments
**Date**: October 11, 2025  
**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Environments**: dev, staging, production

---

## 🎯 **NEW SECRETS REQUIRED**

### **Webhook Configuration Secrets**
- `ALGORHYTHM_WEBHOOK_URL` - Algorhythm webhook endpoint URL
- `ALGORHYTHM_WEBHOOK_SECRET` - HMAC signature secret
- `ALGORHYTHM_WEBHOOK_MAX_RETRIES` - Maximum retry attempts (optional)
- `ALGORHYTHM_WEBHOOK_RETRY_DELAY_MS` - Retry delay in milliseconds (optional)

---

## 🔧 **GOOGLE CLOUD SECRET MANAGER**

### **Development Environment**
```bash
# Add secrets to GCP Secret Manager for dev
gcloud secrets create algorhythm-webhook-url-dev \
  --data-file=- <<< "https://algorhythm.dev.reviz.dev/webhooks"

gcloud secrets create algorhythm-webhook-secret-dev \
  --data-file=- <<< "dev-webhook-secret-2025"

gcloud secrets create algorhythm-webhook-max-retries-dev \
  --data-file=- <<< "3"

gcloud secrets create algorhythm-webhook-retry-delay-dev \
  --data-file=- <<< "1000"
```

### **Staging Environment**
```bash
# Add secrets to GCP Secret Manager for staging
gcloud secrets create algorhythm-webhook-url-stg \
  --data-file=- <<< "https://algorhythm.stg.reviz.dev/webhooks"

gcloud secrets create algorhythm-webhook-secret-stg \
  --data-file=- <<< "stg-webhook-secret-2025"

gcloud secrets create algorhythm-webhook-max-retries-stg \
  --data-file=- <<< "3"

gcloud secrets create algorhythm-webhook-retry-delay-stg \
  --data-file=- <<< "1000"
```

### **Production Environment**
```bash
# Add secrets to GCP Secret Manager for production
gcloud secrets create algorhythm-webhook-url-prod \
  --data-file=- <<< "https://algorhythm.prod.reviz.dev/webhooks"

gcloud secrets create algorhythm-webhook-secret-prod \
  --data-file=- <<< "prod-webhook-secret-2025"

gcloud secrets create algorhythm-webhook-max-retries-prod \
  --data-file=- <<< "3"

gcloud secrets create algorhythm-webhook-retry-delay-prod \
  --data-file=- <<< "1000"
```

---

## 🔧 **GITHUB REPOSITORY SECRETS**

### **Development Environment**
```bash
# GitHub Secrets for dev environment
ALGORHYTHM_WEBHOOK_URL_DEV=https://algorhythm.dev.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_DEV=dev-webhook-secret-2025
ALGORHYTHM_WEBHOOK_MAX_RETRIES_DEV=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_DEV=1000
```

### **Staging Environment**
```bash
# GitHub Secrets for staging environment
ALGORHYTHM_WEBHOOK_URL_STG=https://algorhythm.stg.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_STG=stg-webhook-secret-2025
ALGORHYTHM_WEBHOOK_MAX_RETRIES_STG=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_STG=1000
```

### **Production Environment**
```bash
# GitHub Secrets for production environment
ALGORHYTHM_WEBHOOK_URL_PROD=https://algorhythm.prod.reviz.dev/webhooks
ALGORHYTHM_WEBHOOK_SECRET_PROD=prod-webhook-secret-2025
ALGORHYTHM_WEBHOOK_MAX_RETRIES_PROD=3
ALGORHYTHM_WEBHOOK_RETRY_DELAY_PROD=1000
```

---

## 🚀 **DEPLOYMENT CONFIGURATION UPDATES**

### **Cloud Run Service Configuration**
```yaml
# Update Cloud Run service to use new secrets
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nna-registry-service
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cloudsql-instances: PROJECT_ID:REGION:INSTANCE
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/nna-registry-service
        env:
        - name: ALGORHYTHM_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-url-ENV
              key: latest
        - name: ALGORHYTHM_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-secret-ENV
              key: latest
        - name: ALGORHYTHM_WEBHOOK_MAX_RETRIES
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-max-retries-ENV
              key: latest
        - name: ALGORHYTHM_WEBHOOK_RETRY_DELAY_MS
          valueFrom:
            secretKeyRef:
              name: algorhythm-webhook-retry-delay-ENV
              key: latest
```

### **GitHub Actions Workflow Updates**
```yaml
# Update GitHub Actions to use new secrets
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy nna-registry-service \
      --image gcr.io/$PROJECT_ID/nna-registry-service \
      --platform managed \
      --region us-central1 \
      --set-env-vars ALGORHYTHM_WEBHOOK_URL=${{ secrets.ALGORHYTHM_WEBHOOK_URL_DEV }} \
      --set-env-vars ALGORHYTHM_WEBHOOK_SECRET=${{ secrets.ALGORHYTHM_WEBHOOK_SECRET_DEV }} \
      --set-env-vars ALGORHYTHM_WEBHOOK_MAX_RETRIES=${{ secrets.ALGORHYTHM_WEBHOOK_MAX_RETRIES_DEV }} \
      --set-env-vars ALGORHYTHM_WEBHOOK_RETRY_DELAY_MS=${{ secrets.ALGORHYTHM_WEBHOOK_RETRY_DELAY_DEV }}
```

---

## 🔐 **SECURITY CONSIDERATIONS**

### **Secret Rotation**
- **Webhook Secrets**: Rotate every 90 days
- **URL Changes**: Update when Algorhythm endpoints change
- **Retry Configuration**: Adjust based on performance requirements

### **Access Control**
- **Development**: Full access for testing
- **Staging**: Limited access for integration testing
- **Production**: Restricted access with audit logging

### **Monitoring**
- **Secret Usage**: Monitor webhook secret usage
- **Failed Attempts**: Alert on repeated failures
- **Performance**: Track webhook delivery metrics

---

## 🎯 **IMPLEMENTATION STEPS**

### **Step 1: Add GCP Secrets**
1. **Development**: Add all webhook secrets to GCP Secret Manager
2. **Staging**: Add all webhook secrets to GCP Secret Manager
3. **Production**: Add all webhook secrets to GCP Secret Manager

### **Step 2: Add GitHub Secrets**
1. **Development**: Add all webhook secrets to GitHub repository
2. **Staging**: Add all webhook secrets to GitHub repository
3. **Production**: Add all webhook secrets to GitHub repository

### **Step 3: Update Deployment Configs**
1. **Cloud Run**: Update service configuration
2. **GitHub Actions**: Update workflow configuration
3. **Local Development**: Update environment variables

### **Step 4: Test Configuration**
1. **Development**: Test webhook configuration
2. **Staging**: Test webhook configuration
3. **Production**: Test webhook configuration

---

## 🚀 **READY FOR IMPLEMENTATION**

**✅ ALL SECRETS IDENTIFIED!** Ready to add webhook secrets to all environments.

**Timeline**: 1 day for secret configuration, 1 day for testing.

**🎯 Both teams are ready to work together for seamless integration!**
