#!/bin/bash

# Fix AlgoRhythm Secret Manager Configuration for All Environments
# This script fixes all the secret values and Cloud Run configuration for dev, staging, and production

set -e

# Configuration
PROJECT_ID="revize-453014"
REGION="us-central1"

echo "🔧 Fixing AlgoRhythm Secret Manager Configuration for All Environments"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Function to create or update a secret
update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo "  Processing secret: $secret_name"
    echo "  Description: $description"
    
    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &> /dev/null; then
        echo "    ✅ Secret '$secret_name' exists. Adding new version..."
    else
        echo "    🔧 Secret '$secret_name' does not exist. Creating it..."
        gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --labels="environment=algorhythm,type=nna-registry" \
            --data-file=- <<< "$secret_value"
        echo "    ✅ Secret '$secret_name' created successfully!"
        return
    fi
    
    # Add new version to existing secret
    echo "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID"
    echo "    ✅ New version added to '$secret_name'"
}

# Function to verify current secrets
verify_current_secrets() {
    echo "🔍 Verifying current secrets..."
    echo ""
    
    # List all algorhythm-nna secrets
    echo "Current algorhythm-nna secrets:"
    gcloud secrets list --filter="name:algorhythm-nna" --format="table(name,createTime)" --project="$PROJECT_ID" || echo "No secrets found"
    echo ""
}

# Function to fix secrets for an environment
fix_environment_secrets() {
    local env=$1
    local service_name=$2
    local api_key=$3
    local registry_url=$4
    local node_env_value=$5
    
    echo "📋 Fixing environment: $env"
    echo "Service: $service_name"
    echo "Registry URL: $registry_url"
    echo "API Key: ${api_key:0:20}..."
    echo "Node Environment: $node_env_value"
    echo ""
    
    # Fix algorhythm-nna-registry-url-{env}
    update_secret "algorhythm-nna-registry-url-$env" "$registry_url" "NNA Registry URL for $env environment"
    
    # Fix algorhythm-nna-api-key-{env}
    update_secret "algorhythm-nna-api-key-$env" "$api_key" "NNA Registry API key for $env environment"
    
    # Create/Update NNA_REGISTRY_TIMEOUT secret
    update_secret "algorhythm-nna-registry-timeout-$env" "30000" "NNA Registry timeout (30 seconds) for $env environment"
    
    # Create/Update NODE_ENV secret
    update_secret "algorhythm-node-env-$env" "$node_env_value" "Node.js environment for $env"
    
    # Create/Update PORT secret
    update_secret "algorhythm-port-$env" "8080" "Port for $env environment"
    
    echo "✅ Environment $env secrets processed!"
    echo ""
}

# Function to update Cloud Run service for an environment
update_cloud_run_service() {
    local env=$1
    local service_name=$2
    
    echo "📋 Updating Cloud Run service for $env..."
    echo "Service: $service_name"
    
    # Update Cloud Run service with all secrets
    gcloud run services update $service_name \
      --region $REGION \
      --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-$env:latest,NNA_API_KEY=algorhythm-nna-api-key-$env:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-$env:latest,NODE_ENV=algorhythm-node-env-$env:latest,PORT=algorhythm-port-$env:latest"
    
    echo "✅ Cloud Run service $service_name updated!"
    echo ""
}

# Main execution
echo "🚀 Starting comprehensive fix for all environments..."
echo ""

# Step 1: Verify current state
verify_current_secrets

# Step 2: Fix secrets for all environments
echo "📋 Step 2: Fixing secrets for all environments..."

# Development environment
fix_environment_secrets "dev" "algorhythm-service-dev" "reviz-dev-30390-13220-4896-9516-9001" "https://registry.dev.reviz.dev" "development"

# Staging environment
fix_environment_secrets "staging" "algorhythm-service-staging" "reviz-staging-30390-13220-4896-9516-9001" "https://registry.staging.reviz.dev" "staging"

# Production environment
fix_environment_secrets "prod" "algorhythm-service-prod" "reviz-prod-30390-13220-4896-9516-9001" "https://registry.prod.reviz.dev" "production"

# Step 3: Update Cloud Run services for all environments
echo "📋 Step 3: Updating Cloud Run services for all environments..."

# Development
update_cloud_run_service "dev" "algorhythm-service-dev"

# Staging
update_cloud_run_service "staging" "algorhythm-service-staging"

# Production
update_cloud_run_service "prod" "algorhythm-service-prod"

echo "🎉 Configuration complete for all environments!"
echo ""
echo "📊 Summary of changes:"
echo ""
echo "✅ Environment: dev"
echo "   - Fixed algorhythm-nna-registry-url-dev: https://registry.dev.reviz.dev"
echo "   - Fixed algorhythm-nna-api-key-dev: reviz-dev-30390-13220-4896-9516-9001"
echo "   - Created/Updated algorhythm-nna-registry-timeout-dev: 30000"
echo "   - Created/Updated algorhythm-node-env-dev: development"
echo "   - Created/Updated algorhythm-port-dev: 8080"
echo "   - Updated Cloud Run service: algorhythm-service-dev"
echo ""
echo "✅ Environment: staging"
echo "   - Fixed algorhythm-nna-registry-url-staging: https://registry.staging.reviz.dev"
echo "   - Fixed algorhythm-nna-api-key-staging: reviz-staging-30390-13220-4896-9516-9001"
echo "   - Created/Updated algorhythm-nna-registry-timeout-staging: 30000"
echo "   - Created/Updated algorhythm-node-env-staging: staging"
echo "   - Created/Updated algorhythm-port-staging: 8080"
echo "   - Updated Cloud Run service: algorhythm-service-staging"
echo ""
echo "✅ Environment: prod"
echo "   - Fixed algorhythm-nna-registry-url-prod: https://registry.prod.reviz.dev"
echo "   - Fixed algorhythm-nna-api-key-prod: reviz-prod-30390-13220-4896-9516-9001"
echo "   - Created/Updated algorhythm-nna-registry-timeout-prod: 30000"
echo "   - Created/Updated algorhythm-node-env-prod: production"
echo "   - Created/Updated algorhythm-port-prod: 8080"
echo "   - Updated Cloud Run service: algorhythm-service-prod"
echo ""
echo "🚀 Next steps:"
echo "1. Test all AlgoRhythm service endpoints"
echo "2. Verify NNA Registry integration is working for all environments"
echo "3. Check that timeouts are resolved"
echo ""
echo "🧪 Test commands for each environment:"
echo ""
echo "# Development"
echo "curl https://dev.algorhythm.media/health"
echo "curl -X POST https://dev.algorhythm.media/api/v1/recommend/template -H 'x-api-key: reviz-dev-30390-13220-4896-9516-9001' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "# Staging"
echo "curl https://staging.algorhythm.media/health"
echo "curl -X POST https://staging.algorhythm.media/api/v1/recommend/template -H 'x-api-key: reviz-staging-30390-13220-4896-9516-9001' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "# Production"
echo "curl https://prod.algorhythm.media/health"
echo "curl -X POST https://prod.algorhythm.media/api/v1/recommend/template -H 'x-api-key: reviz-prod-30390-13220-4896-9516-9001' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "🎯 All environments are now configured with:"
echo "✅ Correct API keys"
echo "✅ Correct registry URLs"
echo "✅ 30-second timeouts"
echo "✅ Proper environment variables"
echo "✅ Cloud Run service configuration"
