#!/bin/bash

# Fix AlgoRhythm Secret Manager Configuration for All Environments
# This script fixes all the secret values and Cloud Run configuration for dev, staging, and production

set -e

# Configuration
PROJECT_ID="revize-453014"
REGION="us-central1"

# Environment configurations
declare -A ENVIRONMENTS
ENVIRONMENTS[dev]="algorhythm-service-dev"
ENVIRONMENTS[staging]="algorhythm-service-staging"
ENVIRONMENTS[prod]="algorhythm-service-prod"

# API Keys for each environment
declare -A API_KEYS
API_KEYS[dev]="reviz-dev-30390-13220-4896-9516-9001"
API_KEYS[staging]="reviz-staging-30390-13220-4896-9516-9001"
API_KEYS[prod]="reviz-prod-30390-13220-4896-9516-9001"

# Registry URLs for each environment
declare -A REGISTRY_URLS
REGISTRY_URLS[dev]="https://registry.dev.reviz.dev"
REGISTRY_URLS[staging]="https://registry.staging.reviz.dev"
REGISTRY_URLS[prod]="https://registry.prod.reviz.dev"

# Node environment values
declare -A NODE_ENV_VALUES
NODE_ENV_VALUES[dev]="development"
NODE_ENV_VALUES[staging]="staging"
NODE_ENV_VALUES[prod]="production"

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
    gcloud secrets list --filter="name:algorhythm-nna" --format="table(name,createTime)" --project="$PROJECT_ID" || echo "No secrets found or authentication required"
    echo ""
    
    # Check specific secrets for each environment
    for env in dev staging prod; do
        echo "Checking secrets for $env environment:"
        
        # Check if environment-specific secrets exist
        for secret_type in "registry-url" "api-key" "registry-timeout" "node-env" "port"; do
            secret_name="algorhythm-nna-$secret_type-$env"
            if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &> /dev/null; then
                echo "  ✅ $secret_name exists"
            else
                echo "  ❌ $secret_name missing"
            fi
        done
        echo ""
    done
}

# Function to fix secrets for an environment
fix_environment_secrets() {
    local env=$1
    local service_name=${ENVIRONMENTS[$env]}
    local api_key=${API_KEYS[$env]}
    local registry_url=${REGISTRY_URLS[$env]}
    local node_env_value=${NODE_ENV_VALUES[$env]}
    
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
    local service_name=${ENVIRONMENTS[$env]}
    
    echo "📋 Updating Cloud Run service for $env..."
    echo "Service: $service_name"
    
    # Update Cloud Run service with all secrets
    gcloud run services update $service_name \
      --region $REGION \
      --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-$env:latest,NNA_API_KEY=algorhythm-nna-api-key-$env:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-$env:latest,NODE_ENV=algorhythm-node-env-$env:latest,PORT=algorhythm-port-$env:latest"
    
    echo "✅ Cloud Run service $service_name updated!"
    echo ""
}

# Function to verify configuration for an environment
verify_environment() {
    local env=$1
    local service_name=${ENVIRONMENTS[$env]}
    
    echo "🔍 Verifying environment: $env"
    echo "Service: $service_name"
    
    # List secrets for this environment
    echo "Secrets for $env:"
    gcloud secrets list --filter="name:algorhythm-nna.*-$env" --format="table(name,createTime)" 2>/dev/null || echo "No secrets found"
    
    # Check Cloud Run service status
    echo "Cloud Run service status:"
    gcloud run services describe $service_name --region $REGION --format="value(status.conditions[0].status)" 2>/dev/null || echo "Service not found"
    
    echo ""
}

# Main execution
echo "🚀 Starting comprehensive fix for all environments..."
echo ""

# Step 1: Verify current state
verify_current_secrets

# Step 2: Fix secrets for all environments
echo "📋 Step 2: Fixing secrets for all environments..."
for env in dev staging prod; do
    fix_environment_secrets $env
done

# Step 3: Update Cloud Run services for all environments
echo "📋 Step 3: Updating Cloud Run services for all environments..."
for env in dev staging prod; do
    update_cloud_run_service $env
done

# Step 4: Verify all configurations
echo "📋 Step 4: Verifying all configurations..."
for env in dev staging prod; do
    verify_environment $env
done

echo "🎉 Configuration complete for all environments!"
echo ""
echo "📊 Summary of changes:"
echo ""

for env in dev staging prod; do
    echo "✅ Environment: $env"
    echo "   - Fixed algorhythm-nna-registry-url-$env: ${REGISTRY_URLS[$env]}"
    echo "   - Fixed algorhythm-nna-api-key-$env: ${API_KEYS[$env]:0:20}..."
    echo "   - Created/Updated algorhythm-nna-registry-timeout-$env: 30000"
    echo "   - Created/Updated algorhythm-node-env-$env: ${NODE_ENV_VALUES[$env]}"
    echo "   - Created/Updated algorhythm-port-$env: 8080"
    echo "   - Updated Cloud Run service: ${ENVIRONMENTS[$env]}"
    echo ""
done

echo "🚀 Next steps:"
echo "1. Test all AlgoRhythm service endpoints"
echo "2. Verify NNA Registry integration is working for all environments"
echo "3. Check that timeouts are resolved"
echo ""
echo "🧪 Test commands for each environment:"
echo ""
echo "# Development"
echo "curl https://dev.algorhythm.media/health"
echo "curl -X POST https://dev.algorhythm.media/api/v1/recommend/template -H 'x-api-key: ${API_KEYS[dev]}' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "# Staging"
echo "curl https://staging.algorhythm.media/health"
echo "curl -X POST https://staging.algorhythm.media/api/v1/recommend/template -H 'x-api-key: ${API_KEYS[staging]}' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "# Production"
echo "curl https://prod.algorhythm.media/health"
echo "curl -X POST https://prod.algorhythm.media/api/v1/recommend/template -H 'x-api-key: ${API_KEYS[prod]}' -H 'Content-Type: application/json' -d '{\"song_id\": \"1.018.003.002\", \"user_context\": {\"user_id\": \"test-user\"}}'"
echo ""
echo "🎯 All environments are now configured with:"
echo "✅ Correct API keys"
echo "✅ Correct registry URLs"
echo "✅ 30-second timeouts"
echo "✅ Proper environment variables"
echo "✅ Cloud Run service configuration"
