# 🔧 GitHub Secrets Troubleshooting Guide

**Issue**: 6 problems in GitHub Actions workflows related to `GCP_PROJECT_ID` and `GCP_SA_KEY` context access.

---

## 🚨 **Problem Analysis**

### **Current Issues**
1. **ci-cd-dev.yml**: 2 problems
   - `Context access might be invalid: GCP_PROJECT_ID [Ln 13, Col 45]`
   - `Context access might be invalid: GCP_SA_KEY [Ln 37, Col 29]`

2. **ci-cd-stg.yml**: 2 problems
   - `Context access might be invalid: GCP_PROJECT_ID [Ln 13, Col 45]`
   - `Context access might be invalid: GCP_SA_KEY [Ln 37, Col 29]`

3. **ci-cd-prod.yml**: 2 problems
   - `Context access might be invalid: GCP_PROJECT_ID [Ln 27, Col 45]`
   - `Context access might be invalid: GCP_SA_KEY [Ln 54, Col 29]`

### **Root Causes**
1. **Missing Secrets**: `GCP_SA_KEY` not configured in GitHub repository
2. **Secret Access**: Secrets not accessible in workflow context
3. **Service Account**: Wrong service account key being used

---

## ✅ **Solution Steps**

### **Step 1: Verify Current Secrets**
Check what secrets are currently configured in your GitHub repository:

1. Go to: `https://github.com/Celerity-Studios-Inc/algorhythm-service/settings/secrets/actions`
2. Verify you have:
   - ✅ `GCP_PROJECT_ID` (should be: `revize-453014`)
   - ❌ `GCP_SA_KEY` (missing - this is the main issue)

### **Step 2: Add Missing Secret**
You need to add the `GCP_SA_KEY` secret:

1. **Get the Service Account Key**:
   - The key you have: `revize-453014-c1ce9351d24c.json`
   - This is for: `algorhythm-service@revize-453014.iam.gserviceaccount.com`

2. **Add to GitHub Secrets**:
   - Go to: `https://github.com/Celerity-Studios-Inc/algorhythm-service/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `GCP_SA_KEY`
   - Value: Copy the entire contents of `revize-453014-c1ce9351d24c.json`

### **Step 3: Verify Service Account Permissions**
The service account `algorhythm-service@revize-453014.iam.gserviceaccount.com` needs these roles:

```bash
# Check current roles
gcloud projects get-iam-policy revize-453014 \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:algorhythm-service@revize-453014.iam.gserviceaccount.com"
```

**Required Roles**:
- `roles/artifactregistry.writer`
- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.secretAccessor`
- `roles/storage.admin`

### **Step 4: Alternative Solution - Use CI/CD Service Account**
If you want to use the `ci-cd-service-account` instead (which we've been using successfully), update the workflows:

---

## 🔄 **Workflow Updates**

### **Option 1: Fix Current Service Account**
Keep using `algorhythm-service@revize-453014.iam.gserviceaccount.com` but add the missing secret.

### **Option 2: Switch to CI/CD Service Account**
Update workflows to use `ci-cd-service-account@revize-453014.iam.gserviceaccount.com` (which already has proper permissions).

---

## 🧪 **Testing the Fix**

### **Test 1: Verify Secrets**
```bash
# Check if secrets are accessible (this will only work in GitHub Actions)
echo "Testing secret access..."
echo "GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}"
echo "GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}"
```

### **Test 2: Manual Workflow Test**
1. Push a small change to the `dev` branch
2. Check the GitHub Actions run
3. Verify no context access errors

### **Test 3: Service Account Test**
```bash
# Test service account authentication
gcloud auth activate-service-account \
  --key-file=revize-453014-c1ce9351d24c.json

# Test permissions
gcloud projects describe revize-453014
gcloud artifacts repositories list --location=us-central1
gcloud run services list --region=us-central1
```

---

## 📋 **Quick Fix Checklist**

- [ ] **Add `GCP_SA_KEY` secret** to GitHub repository
- [ ] **Verify `GCP_PROJECT_ID`** is set to `revize-453014`
- [ ] **Test service account permissions** locally
- [ ] **Run a test workflow** to verify fixes
- [ ] **Check for any remaining errors** in GitHub Actions

---

## 🚀 **Expected Results**

After implementing the fix:
- ✅ **0 problems** in GitHub Actions workflows
- ✅ **Successful deployments** to Cloud Run
- ✅ **Proper authentication** with Google Cloud
- ✅ **Docker image pushes** to Artifact Registry

---

**Last Updated**: October 1, 2025  
**Status**: 🔧 **FIXING**  
**Next Steps**: Add missing `GCP_SA_KEY` secret to GitHub repository
