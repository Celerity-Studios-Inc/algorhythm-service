#!/bin/bash

# 🔧 Fix GitHub Secrets for AlgoRhythm Service
# This script helps resolve the 6 GitHub Actions workflow problems

set -e

echo "🔧 Fixing GitHub Secrets Issues..."
echo "=================================="

# Check if the service account key file exists
SERVICE_ACCOUNT_KEY_FILE="/Users/ajaymadhok/Downloads/revize-453014-c1ce9351d24c.json"

if [ ! -f "$SERVICE_ACCOUNT_KEY_FILE" ]; then
    echo "❌ Service account key file not found: $SERVICE_ACCOUNT_KEY_FILE"
    echo "Please ensure the file exists and try again."
    exit 1
fi

echo "✅ Service account key file found: $SERVICE_ACCOUNT_KEY_FILE"

# Extract project ID from the key file
PROJECT_ID=$(jq -r '.project_id' "$SERVICE_ACCOUNT_KEY_FILE")
echo "📋 Project ID: $PROJECT_ID"

# Extract service account email
SERVICE_ACCOUNT_EMAIL=$(jq -r '.client_email' "$SERVICE_ACCOUNT_KEY_FILE")
echo "📧 Service Account: $SERVICE_ACCOUNT_EMAIL"

echo ""
echo "🔍 Current Issues:"
echo "=================="
echo "❌ GCP_SA_KEY secret missing from GitHub repository"
echo "❌ 6 workflow problems due to context access issues"
echo ""

echo "📋 Manual Steps Required:"
echo "========================="
echo ""
echo "1. Go to GitHub Secrets:"
echo "   https://github.com/Celerity-Studios-Inc/algorhythm-service/settings/secrets/actions"
echo ""
echo "2. Add new secret:"
echo "   Name: GCP_SA_KEY"
echo "   Value: Copy the entire contents of $SERVICE_ACCOUNT_KEY_FILE"
echo ""
echo "3. Verify existing secret:"
echo "   Name: GCP_PROJECT_ID"
echo "   Value: $PROJECT_ID"
echo ""

echo "🧪 Testing Service Account Permissions..."
echo "=========================================="

# Test service account authentication
echo "🔐 Testing authentication..."
gcloud auth activate-service-account \
  --key-file="$SERVICE_ACCOUNT_KEY_FILE" \
  --quiet

echo "✅ Authentication successful"

# Test basic permissions
echo "🔍 Testing permissions..."

echo "📋 Testing project access..."
if gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    echo "✅ Project access: OK"
else
    echo "❌ Project access: FAILED"
fi

echo "📦 Testing Artifact Registry access..."
if gcloud artifacts repositories list --location=us-central1 &> /dev/null; then
    echo "✅ Artifact Registry access: OK"
else
    echo "❌ Artifact Registry access: FAILED"
fi

echo "🚀 Testing Cloud Run access..."
if gcloud run services list --region=us-central1 &> /dev/null; then
    echo "✅ Cloud Run access: OK"
else
    echo "❌ Cloud Run access: FAILED"
fi

echo "🔐 Testing Secret Manager access..."
if gcloud secrets list &> /dev/null; then
    echo "✅ Secret Manager access: OK"
else
    echo "❌ Secret Manager access: FAILED"
fi

echo ""
echo "📊 Service Account Key Contents:"
echo "================================="
echo "File: $SERVICE_ACCOUNT_KEY_FILE"
echo "Size: $(wc -c < "$SERVICE_ACCOUNT_KEY_FILE") bytes"
echo ""

echo "🔑 Key Contents (first 200 chars):"
head -c 200 "$SERVICE_ACCOUNT_KEY_FILE"
echo "..."
echo ""

echo "📋 Required GitHub Secrets:"
echo "==========================="
echo "1. GCP_PROJECT_ID = $PROJECT_ID"
echo "2. GCP_SA_KEY = [Contents of $SERVICE_ACCOUNT_KEY_FILE]"
echo ""

echo "✅ Next Steps:"
echo "=============="
echo "1. Add GCP_SA_KEY secret to GitHub repository"
echo "2. Verify GCP_PROJECT_ID secret is set to: $PROJECT_ID"
echo "3. Test a workflow run to verify the fixes"
echo "4. Check that all 6 problems are resolved"
echo ""

echo "🎯 Expected Results:"
echo "==================="
echo "✅ 0 problems in GitHub Actions workflows"
echo "✅ Successful deployments to Cloud Run"
echo "✅ Proper authentication with Google Cloud"
echo "✅ Docker image pushes to Artifact Registry"
echo ""

echo "🔧 Fix script completed!"
echo "Please follow the manual steps above to add the missing secret."
