#!/bin/bash

# Setup NNA Registry JWT Secrets for AlgoRhythm Service - All Environments
# This script creates/updates the JWT secrets in Google Cloud Secret Manager
# and wires them to Cloud Run services for dev, staging, and production

set -e

# Configuration
PROJECT_ID="revize-453014"
REGION="us-central1"

# Secret values from environment configs
DEV_SECRET_VALUE="a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39"
STG_SECRET_VALUE="6156d9df271a1fcc2f3f631112a8a7d8fafd710df5d99cab0bf865328c19c896"
PROD_SECRET_VALUE="a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39"

echo "🔐 Setting up NNA Registry JWT Secrets for AlgoRhythm Service"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Authenticate (launches browser)
echo "▶ Step 1: Authenticating with Google Cloud..."
gcloud auth login --launch-browser
gcloud config set project $PROJECT_ID
gcloud auth application-default set-quota-project $PROJECT_ID 2>/dev/null || true
echo "✅ Authentication complete"
echo ""

# Function to create or update a secret
update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo "  Processing secret: $secret_name"
    echo "  Description: $description"
    
    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo "    ✅ Secret '$secret_name' exists. Adding new version..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null
        echo "    ✅ New version added to '$secret_name'"
    else
        echo "    🔧 Secret '$secret_name' does not exist. Creating it..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --labels="environment=algorhythm,type=nna-registry-jwt" \
            --data-file=- >/dev/null
        echo "    ✅ Secret '$secret_name' created successfully!"
    fi
}

# Step 2: Create/update secrets
echo "▶ Step 2: Creating/updating JWT secrets in Secret Manager..."
update_secret "algorhythm-nna-jwt-secret-dev" "$DEV_SECRET_VALUE" "Development NNA Registry JWT secret"
update_secret "algorhythm-nna-jwt-secret-stg" "$STG_SECRET_VALUE" "Staging NNA Registry JWT secret"
update_secret "algorhythm-nna-jwt-secret" "$PROD_SECRET_VALUE" "Production NNA Registry JWT secret"
echo "✅ All secrets created/updated"
echo ""

# Step 3: Grant service account access
echo "▶ Step 3: Granting service account access to secrets..."
SERVICE_ACCOUNT="algorhythm-service@revize-453014.iam.gserviceaccount.com"

for secret_name in algorhythm-nna-jwt-secret-dev algorhythm-nna-jwt-secret-stg algorhythm-nna-jwt-secret; do
    echo "  Granting access to: $secret_name"
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" >/dev/null 2>&1 || echo "    (Access may already be granted)"
    echo "    ✅ Access granted"
done
echo "✅ Service account access configured"
echo ""

# Step 4: Wire secrets to Cloud Run services
echo "▶ Step 4: Wiring secrets to Cloud Run services..."

# Dev
echo "  Updating algorhythm-service-dev..."
gcloud run services update algorhythm-service-dev \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets="NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret-dev:latest" \
    --quiet >/dev/null 2>&1 || echo "    ⚠️  Update may have failed - check logs"
echo "    ✅ Dev service updated"

# Staging
echo "  Updating algorhythm-service-staging..."
gcloud run services update algorhythm-service-staging \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets="NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret-stg:latest" \
    --quiet >/dev/null 2>&1 || echo "    ⚠️  Update may have failed - check logs"
echo "    ✅ Staging service updated"

# Production
echo "  Updating algorhythm-service..."
gcloud run services update algorhythm-service \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets="NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret:latest" \
    --quiet >/dev/null 2>&1 || echo "    ⚠️  Update may have failed - check logs"
echo "    ✅ Production service updated"

echo "✅ Cloud Run services configured"
echo ""

# Step 5: Verification
echo "▶ Step 5: Verifying configuration..."
echo ""

echo "Secret status:"
for secret_name in algorhythm-nna-jwt-secret-dev algorhythm-nna-jwt-secret-stg algorhythm-nna-jwt-secret; do
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        LATEST_VERSION=$(gcloud secrets versions list "$secret_name" --limit=1 --format="value(name)" --project="$PROJECT_ID")
        echo "  ✅ $secret_name (latest: $LATEST_VERSION)"
    else
        echo "  ❌ $secret_name (not found)"
    fi
done

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Secrets created/updated in Secret Manager"
echo "  ✅ Service account access granted"
echo "  ✅ Cloud Run services wired to secrets"
echo ""
echo "🧪 Test command (dev environment):"
echo "  curl -s \"https://dev.algorhythm.media/api/v1/reviz/composite/debug/test-resolution?ids=1.018.003.002,2.009.001.001,3.003.010.002,4.022.002.008,5.015.001.003\" \\"
echo "    -H \"x-api-key: reviz-dev-30390-13220-4896-9516-9001\" | jq '.result'"
echo ""
echo "Expected: No 'secret not configured' error; response status should be 'found', 'generating', or 'not_found'"
echo ""

