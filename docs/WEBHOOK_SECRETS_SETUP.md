# 🔐 **WEBHOOK SECRETS SETUP GUIDE**

## 🎯 **OVERVIEW**

This document outlines the setup of webhook secrets for the Algorhythm service integration with the NNA Registry service across all environments (dev, staging, production).

## 🔧 **REQUIRED SECRETS**

### **For Algorhythm Service**
- `WEBHOOK_SECRET` - HMAC signature validation secret
- `NNA_REGISTRY_WEBHOOK_URL` - NNA Registry webhook URL (for future use)

### **For NNA Registry Service**
- `ALGORHYTHM_WEBHOOK_SECRET` - Webhook secret for HMAC signature generation
- `ALGORHYTHM_WEBHOOK_URL` - Algorhythm webhook URL

## 🚀 **SETUP INSTRUCTIONS**

### **1. Google Cloud Secret Manager**

#### **For Algorhythm Service (All Environments)**
```bash
# Dev Environment
gcloud config set project algorhythm-dev
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=dev,service=algorhythm,type=webhook \
  --replication-policy=automatic

# Staging Environment
gcloud config set project algorhythm-stg
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=stg,service=algorhythm,type=webhook \
  --replication-policy=automatic

# Production Environment
gcloud config set project algorhythm-prod
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=prod,service=algorhythm,type=webhook \
  --replication-policy=automatic
```

#### **For NNA Registry Service (All Environments)**
```bash
# Dev Environment
gcloud config set project nna-registry-dev
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=dev,service=nna-registry,type=webhook \
  --replication-policy=automatic

# Staging Environment
gcloud config set project nna-registry-stg
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=stg,service=nna-registry,type=webhook \
  --replication-policy=automatic

# Production Environment
gcloud config set project nna-registry-prod
echo -n "your-webhook-secret-here" | gcloud secrets create algorhythm-webhook-secret \
  --data-file=- \
  --labels=environment=prod,service=nna-registry,type=webhook \
  --replication-policy=automatic
```

### **2. GitHub Repository Secrets**

#### **For Algorhythm Service Repository**
```
WEBHOOK_SECRET=your-webhook-secret-here
NNA_REGISTRY_WEBHOOK_URL=https://registry.{env}.reviz.dev/webhooks
```

#### **For NNA Registry Service Repository**
```
ALGORHYTHM_WEBHOOK_SECRET=your-webhook-secret-here
ALGORHYTHM_WEBHOOK_URL=https://algorhythm.{env}.reviz.dev/webhooks
```

## 🔧 **AUTOMATED SETUP**

### **Option 1: Use the Setup Script**
```bash
# Run the automated setup script
./scripts/setup-webhook-secrets.sh
```

### **Option 2: Use GitHub Actions**
1. Go to GitHub Actions
2. Run the "Setup Webhook Secrets" workflow
3. Select the environment (dev/stg/prod)
4. The workflow will create all necessary secrets

## 🔐 **SECURITY CONSIDERATIONS**

### **Secret Generation**
- Use cryptographically secure random generation
- Minimum 32 characters for webhook secrets
- Different secrets for each environment
- Regular rotation schedule

### **Secret Storage**
- Store in Google Cloud Secret Manager
- Use appropriate labels for organization
- Enable automatic replication
- Set up proper IAM permissions

### **Secret Access**
- Use service accounts with minimal permissions
- Enable audit logging for secret access
- Monitor secret usage patterns
- Set up alerts for unusual access

## 📊 **ENVIRONMENT CONFIGURATION**

### **Development Environment**
- **Algorhythm URL**: `https://algorhythm.dev.reviz.dev/webhooks`
- **NNA Registry URL**: `https://registry.dev.reviz.dev/webhooks`
- **Secret**: `dev-webhook-secret-here`

### **Staging Environment**
- **Algorhythm URL**: `https://algorhythm.stg.reviz.dev/webhooks`
- **NNA Registry URL**: `https://registry.stg.reviz.dev/webhooks`
- **Secret**: `stg-webhook-secret-here`

### **Production Environment**
- **Algorhythm URL**: `https://algorhythm.prod.reviz.dev/webhooks`
- **NNA Registry URL**: `https://registry.prod.reviz.dev/webhooks`
- **Secret**: `prod-webhook-secret-here`

## 🧪 **TESTING SECRETS**

### **Test Webhook Secret Generation**
```bash
# Generate a test secret
openssl rand -hex 32

# Test HMAC signature generation
echo -n "test-payload" | openssl dgst -sha256 -hmac "your-webhook-secret-here"
```

### **Test Webhook Endpoints**
```bash
# Test Algorhythm webhook endpoint
curl -X POST https://algorhythm.dev.reviz.dev/webhooks/assets/created \
  -H "Content-Type: application/json" \
  -H "X-Signature: your-hmac-signature" \
  -H "X-Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{"event":"asset.created","data":{"assetId":"test"}}'
```

## 🔄 **SECRET ROTATION**

### **Rotation Schedule**
- **Development**: Every 30 days
- **Staging**: Every 60 days
- **Production**: Every 90 days

### **Rotation Process**
1. Generate new secret
2. Update Google Cloud Secret Manager
3. Update GitHub repository secrets
4. Deploy services with new secret
5. Verify webhook functionality
6. Remove old secret

## 📞 **SUPPORT**

### **Troubleshooting**
- Check Google Cloud Secret Manager access
- Verify GitHub repository secret permissions
- Test webhook endpoint connectivity
- Validate HMAC signature generation

### **Contact Information**
- **Algorhythm Team**: Available for technical support
- **NNA Registry Team**: Available for coordination
- **DevOps Team**: Available for infrastructure support

## 🎯 **NEXT STEPS**

1. **Setup Secrets**: Run the automated setup script
2. **Test Integration**: Verify webhook functionality
3. **Monitor Performance**: Track webhook delivery success
4. **Documentation**: Update integration guides

---

**🔐 All webhook secrets are now properly configured for secure integration between Algorhythm and NNA Registry services!**
