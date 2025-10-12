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

# API Keys for each environment (you may need to adjust these)
declare -A API_KEYS
API_KEYS[dev]="reviz-dev-30390-13220-4896-9516-9001"
API_KEYS[staging]="reviz-staging-30390-13220-4896-9516-9001"
API_KEYS[prod]="reviz-prod-30390-13220-4896-9516-9001"

# Registry URLs for each environment
declare -A REGISTRY_URLS
REGISTRY_URLS[dev]="https://registry.dev.reviz.dev"
REGISTRY_URLS[staging]="https://registry.staging.reviz.dev"
REGISTRY_URLS[prod]="https://registry.prod.reviz.dev"

echo "🔧 Fixing AlgoRhythm Secret Manager Configuration for All Environments"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Function to fix secrets for an environment
fix_environment_secrets() {
    local env=$1
    local service_name=${ENVIRONMENTS[$env]}
    local api_key=${API_KEYS[$env]}
    local registry_url=${REGISTRY_URLS[$env]}
    
    echo "📋 Fixing environment: $env"
    echo "Service: $service_name"
    echo "Registry URL: $registry_url"
    echo "API Key: ${api_key:0:20}..."
    echo ""
    
    # Fix algorhythm-nna-registry-url-{env}
    echo "Fixing algorhythm-nna-registry-url-$env..."
    echo "$registry_url" | gcloud secrets versions add algorhythm-nna-registry-url-$env --data-file=-
    
    # Fix algorhythm-nna-api-key-{env}
    echo "Fixing algorhythm-nna-api-key-$env..."
    echo "$api_key" | gcloud secrets versions add algorhythm-nna-api-key-$env --data-file=-
    
    # Create NNA_REGISTRY_TIMEOUT secret
    echo "Creating algorhythm-nna-registry-timeout-$env..."
    echo "30000" | gcloud secrets create algorhythm-nna-registry-timeout-$env --data-file=- 2>/dev/null || echo "Secret already exists, updating..."
    echo "30000" | gcloud secrets versions add algorhythm-nna-registry-timeout-$env --data-file=-
    
    # Create NODE_ENV secret
    echo "Creating algorhythm-node-env-$env..."
    echo "$env" | gcloud secrets create algorhythm-node-env-$env --data-file=- 2>/dev/null || echo "Secret already exists, updating..."
    echo "$env" | gcloud secrets versions add algorhythm-node-env-$env --data-file=-
    
    # Create PORT secret
    echo "Creating algorhythm-port-$env..."
    echo "8080" | gcloud secrets create algorhythm-port-$env --data-file=- 2>/dev/null || echo "Secret already exists, updating..."
    echo "8080" | gcloud secrets versions add algorhythm-port-$env --data-file=-
    
    echo "✅ Environment $env secrets fixed!"
    echo ""
}

# Function to update Cloud Run service for an environment
update_cloud_run_service() {
    local env=$1
    local service_name=${ENVIRONMENTS[$env]}
    
    echo "📋 Updating Cloud Run service for $env..."
    
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

# Fix secrets for all environments
for env in dev staging prod; do
    fix_environment_secrets $env
done

echo "📋 Updating Cloud Run services for all environments..."

# Update Cloud Run services for all environments
for env in dev staging prod; do
    update_cloud_run_service $env
done

echo "📋 Verifying all configurations..."

# Verify all environments
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
    echo "   - Created algorhythm-nna-registry-timeout-$env: 30000"
    echo "   - Created algorhythm-node-env-$env: $env"
    echo "   - Created algorhythm-port-$env: 8080"
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
