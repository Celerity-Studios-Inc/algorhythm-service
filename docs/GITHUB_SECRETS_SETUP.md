# GitHub Secrets Setup Guide

This guide explains how to set up the required GitHub repository secrets for AlgoRhythm service deployment.

## 🔐 **Required Secrets**

The AlgoRhythm service requires the following GitHub repository secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GCP_PROJECT_ID` | Google Cloud Project ID | `revize-453014` |
| `GCP_SA_KEY` | Google Cloud Service Account Key (JSON) | `{"type": "service_account", ...}` |

## 🚀 **Setup Methods**

### **Method 1: Using GitHub CLI (Recommended)**

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh
   
   # Ubuntu/Debian
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh
   ```

2. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

3. **Run the setup script**:
   ```bash
   ./scripts/setup-github-secrets.sh
   ```

### **Method 2: Manual Setup via GitHub Web Interface**

1. **Navigate to Repository Settings**:
   - Go to: `https://github.com/Celerity-Studios-Inc/algorhythm-service`
   - Click on **Settings** tab
   - Click on **Secrets and variables** → **Actions**

2. **Add GCP_PROJECT_ID Secret**:
   - Click **New repository secret**
   - Name: `GCP_PROJECT_ID`
   - Value: `revize-453014`
   - Click **Add secret**

3. **Add GCP_SA_KEY Secret**:
   - Click **New repository secret**
   - Name: `GCP_SA_KEY`
   - Value: Paste the entire JSON content of your service account key file
   - Click **Add secret**

## 🔑 **Service Account Key Setup**

### **Option 1: Use Existing Service Account**

If you already have a service account key file:

1. **Locate the key file** (usually named `service-account-key.json` or similar)
2. **Copy the entire JSON content**
3. **Paste it as the value for `GCP_SA_KEY` secret**

### **Option 2: Create New Service Account Key**

1. **Go to Google Cloud Console**:
   - Navigate to: `https://console.cloud.google.com/iam-admin/serviceaccounts?project=revize-453014`

2. **Select the Service Account**:
   - Find: `116756405696741720548@revize-453014.iam.gserviceaccount.com`
   - Click on the service account name

3. **Create Key**:
   - Click on **Keys** tab
   - Click **Add Key** → **Create new key**
   - Choose **JSON** format
   - Click **Create**

4. **Download and Use**:
   - The key file will be downloaded automatically
   - Copy the entire JSON content
   - Use it as the value for `GCP_SA_KEY` secret

## ✅ **Verification**

After setting up the secrets, verify they are properly configured:

### **Using GitHub CLI**:
```bash
gh secret list
```

### **Using GitHub Web Interface**:
- Go to repository **Settings** → **Secrets and variables** → **Actions**
- You should see both secrets listed

## 🚀 **Testing the Setup**

1. **Trigger a deployment**:
   ```bash
   # Make a small change and push to dev branch
   echo "# Test deployment" >> README.md
   git add README.md
   git commit -m "Test deployment trigger"
   git push origin dev
   ```

2. **Monitor the deployment**:
   - Go to: `https://github.com/Celerity-Studios-Inc/algorhythm-service/actions`
   - Watch the "AlgoRhythm Service CI/CD (Development)" workflow

3. **Check for errors**:
   - If you see authentication errors, verify the secrets are set correctly
   - If you see permission errors, ensure the service account has the required roles

## 🔧 **Troubleshooting**

### **Error: "the GitHub Action workflow must specify exactly one of 'workload_identity_provider' or 'credentials_json'"**

This error occurs when the `GCP_SA_KEY` secret is not properly set or is empty.

**Solution**:
1. Verify the secret exists: `gh secret list`
2. Re-set the secret with the correct JSON content
3. Ensure there are no extra spaces or characters

### **Error: "Permission denied" or "Service account does not have required permissions"**

This error occurs when the service account doesn't have the necessary IAM roles.

**Required Roles**:
- `Cloud Run Admin`
- `Storage Admin`
- `Service Account User`
- `Cloud Build Editor`

**Solution**:
1. Go to Google Cloud Console IAM
2. Find the service account: `116756405696741720548@revize-453014.iam.gserviceaccount.com`
3. Add the required roles

### **Error: "Project not found" or "Invalid project ID"**

This error occurs when the `GCP_PROJECT_ID` secret is incorrect.

**Solution**:
1. Verify the project ID is correct: `revize-453014`
2. Ensure the service account has access to this project

## 📋 **Security Best Practices**

1. **Never commit service account keys to the repository**
2. **Use GitHub secrets for all sensitive information**
3. **Rotate service account keys regularly**
4. **Use least-privilege principle for IAM roles**
5. **Monitor secret usage in GitHub Actions logs**

## 🎯 **Next Steps**

After successfully setting up the secrets:

1. **Deploy to Development**:
   - Push to `dev` branch to trigger development deployment
   - Monitor at: `https://github.com/Celerity-Studios-Inc/algorhythm-service/actions`

2. **Test the Service**:
   - Health check: `https://dev.algorhythm.dev/api/v1/health`
   - Run tests: `./scripts/test-deployment.sh`

3. **Deploy to Staging**:
   - Push to `staging` branch for staging deployment
   - Test at: `https://stg.algorhythm.dev/api/v1/health`

4. **Deploy to Production**:
   - Push to `main` branch for production deployment
   - Monitor at: `https://prod.algorhythm.dev/api/v1/health`

---

**Need Help?** If you encounter any issues, check the GitHub Actions logs for detailed error messages and refer to the troubleshooting section above.
