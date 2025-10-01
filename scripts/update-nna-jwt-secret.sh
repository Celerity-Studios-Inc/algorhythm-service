#!/bin/bash

# Update NNA Registry JWT Secret in AlgoRhythm Service
# This script updates the JWT secret to match the NNA Registry service

set -e

PROJECT_ID="revize-453014"
SECRET_NAME="algorhythm-nna-jwt-secret-dev"
NNA_JWT_SECRET="a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39"

echo "🔐 Updating NNA Registry JWT Secret for AlgoRhythm Service..."
echo "Project: $PROJECT_ID"
echo "Secret: $SECRET_NAME"
echo ""

# Check if secret exists
echo "📋 Checking if secret exists..."
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ Secret exists: $SECRET_NAME"
else
    echo "❌ Secret does not exist: $SECRET_NAME"
    echo "Creating secret..."
    echo -n "$NNA_JWT_SECRET" | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID
    echo "✅ Secret created: $SECRET_NAME"
fi

# Update secret with NNA Registry JWT secret
echo "🔄 Updating secret with NNA Registry JWT secret..."
echo -n "$NNA_JWT_SECRET" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID

echo "✅ Secret updated successfully!"
echo ""

# Grant access to service account
echo "🔑 Granting access to service account..."
gcloud secrets add-iam-policy-binding $SECRET_NAME \
    --member="serviceAccount:algorhythm-service@revize-453014.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

echo "✅ Service account access granted!"
echo ""

# Verify the secret
echo "🔍 Verifying secret value..."
SECRET_VALUE=$(gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID)
if [ "$SECRET_VALUE" = "$NNA_JWT_SECRET" ]; then
    echo "✅ Secret value matches NNA Registry JWT secret!"
else
    echo "❌ Secret value does not match!"
    echo "Expected: $NNA_JWT_SECRET"
    echo "Actual: $SECRET_VALUE"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Test the JWT fallback with a fresh NNA Registry token"
echo "2. Verify the AlgoRhythm service can access the secret"
echo "3. Check service logs for any remaining issues"
echo ""
echo "✅ NNA Registry JWT secret synchronization complete!"
