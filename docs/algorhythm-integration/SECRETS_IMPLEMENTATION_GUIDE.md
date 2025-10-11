# 🔐 Secrets Implementation Guide - All Environments
**Date**: October 11, 2025  
**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Environments**: dev, staging, production

---

## 🎯 **REQUIRED SECRETS FOR WEBHOOK INTEGRATION**

### **New Secrets Needed**
- `ALGORHYTHM_WEBHOOK_URL` - Algorhythm webhook endpoint URL
- `ALGORHYTHM_WEBHOOK_SECRET` - HMAC signature secret
- `ALGORHYTHM_WEBHOOK_MAX_RETRIES` - Maximum retry attempts (optional)
- `ALGORHYTHM_WEBHOOK_RETRY_DELAY_MS` - Retry delay in milliseconds (optional)

---

## 🔧 **GOOGLE CLOUD SECRET MANAGER**

### **Step 1: Authenticate with Google Cloud**
```bash
# Authenticate with Google Cloud
gcloud auth login

# Set the project
gcloud config set project revize-453014
```

### **Step 2: Add Secrets for Development**
```bash
# Webhook URL for dev
echo "https://algorhythm.dev.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url-dev --data-file=-

# Webhook secret for dev
echo "dev-webhook-secret-2025" | gcloud secrets create algorhythm-webhook-secret-dev --data-file=-

# Max retries for dev
echo "3" | gcloud secrets create algorhythm-webhook-max-retries-dev --data-file=-

# Retry delay for dev
echo "1000" | gcloud secrets create algorhythm-webhook-retry-delay-dev --data-file=-
```

### **Step 3: Add Secrets for Staging**
```bash
# Webhook URL for staging
echo "https://algorhythm.stg.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url-stg --data-file=-

# Webhook secret for staging
echo "stg-webhook-secret-2025" | gcloud secrets create algorhythm-webhook-secret-stg --data-file=-

# Max retries for staging
echo "3" | gcloud secrets create algorhythm-webhook-max-retries-stg --data-file=-

# Retry delay for staging
echo "1000" | gcloud secrets create algorhythm-webhook-retry-delay-stg --data-file=-
```

### **Step 4: Add Secrets for Production**
```bash
# Webhook URL for production
echo "https://algorhythm.prod.reviz.dev/webhooks" | gcloud secrets create algorhythm-webhook-url-prod --data-file=-

# Webhook secret for production
echo "prod-webhook-secret-2025" | gcloud secrets create algorhythm-webhook-secret-prod --data-file=-

# Max retries for production
echo "3" | gcloud secrets create algorhythm-webhook-max-retries-prod --data-file=-

# Retry delay for production
echo "1000" | gcloud secrets create algorhythm-webhook-retry-delay-prod --data-file=-
```

---

## 🔧 **GITHUB REPOSITORY SECRETS**

### **Step 1: Go to GitHub Repository Settings**
1. Navigate to: `https://github.com/ajaymadhok/nna-registry-service/settings/secrets/actions`
2. Click "New repository secret"

### **Step 2: Add Development Secrets**
```
Secret Name: ALGORHYTHM_WEBHOOK_URL_DEV
Secret Value: https://algorhythm.dev.reviz.dev/webhooks

Secret Name: ALGORHYTHM_WEBHOOK_SECRET_DEV
Secret Value: dev-webhook-secret-2025

Secret Name: ALGORHYTHM_WEBHOOK_MAX_RETRIES_DEV
Secret Value: 3

Secret Name: ALGORHYTHM_WEBHOOK_RETRY_DELAY_DEV
Secret Value: 1000
```

### **Step 3: Add Staging Secrets**
```
Secret Name: ALGORHYTHM_WEBHOOK_URL_STG
Secret Value: https://algorhythm.stg.reviz.dev/webhooks

Secret Name: ALGORHYTHM_WEBHOOK_SECRET_STG
Secret Value: stg-webhook-secret-2025

Secret Name: ALGORHYTHM_WEBHOOK_MAX_RETRIES_STG
Secret Value: 3

Secret Name: ALGORHYTHM_WEBHOOK_RETRY_DELAY_STG
Secret Value: 1000
```

### **Step 4: Add Production Secrets**
```
Secret Name: ALGORHYTHM_WEBHOOK_URL_PROD
Secret Value: https://algorhythm.prod.reviz.dev/webhooks

Secret Name: ALGORHYTHM_WEBHOOK_SECRET_PROD
Secret Value: prod-webhook-secret-2025

Secret Name: ALGORHYTHM_WEBHOOK_MAX_RETRIES_PROD
Secret Value: 3

Secret Name: ALGORHYTHM_WEBHOOK_RETRY_DELAY_PROD
Secret Value: 1000
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
        run.googleapis.com/cloudsql-instances: revize-453014:us-central1:nna-registry-db
    spec:
      containers:
      - image: gcr.io/revize-453014/nna-registry-service
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
      --image gcr.io/revize-453014/nna-registry-service \
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

## 🎯 **IMPLEMENTATION CHECKLIST**

### **Google Cloud Secret Manager**
- [ ] Authenticate with Google Cloud
- [ ] Add webhook URL secrets for all environments
- [ ] Add webhook secret secrets for all environments
- [ ] Add max retries secrets for all environments
- [ ] Add retry delay secrets for all environments
- [ ] Verify all secrets were created successfully

### **GitHub Repository Secrets**
- [ ] Add webhook URL secrets for all environments
- [ ] Add webhook secret secrets for all environments
- [ ] Add max retries secrets for all environments
- [ ] Add retry delay secrets for all environments
- [ ] Verify all secrets were added successfully

### **Deployment Configuration**
- [ ] Update Cloud Run service configuration
- [ ] Update GitHub Actions workflow
- [ ] Update local development environment
- [ ] Test webhook configuration in all environments

---

## 🚀 **READY FOR IMPLEMENTATION**

**✅ ALL SECRETS IDENTIFIED!** Ready to add webhook secrets to all environments.

**Timeline**: 1 day for secret configuration, 1 day for testing.

**🎯 Both teams are ready to work together for seamless integration!**
