#!/bin/bash

# Setup Webhook Secrets for All Environments
# This script sets up webhook secrets for dev, staging, and production

set -e

echo "🔐 Setting up webhook secrets for all environments..."

# Generate a secure webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Generated webhook secret: ${WEBHOOK_SECRET}"

# Environment configurations
ENVIRONMENTS=("dev" "stg" "prod")
PROJECT_IDS=("algorhythm-dev" "algorhythm-stg" "algorhythm-prod")

for i in "${!ENVIRONMENTS[@]}"; do
    ENV="${ENVIRONMENTS[$i]}"
    PROJECT_ID="${PROJECT_IDS[$i]}"
    
    echo "🔧 Setting up secrets for ${ENV} environment (Project: ${PROJECT_ID})..."
    
    # Set the project
    gcloud config set project ${PROJECT_ID}
    
    # Create webhook secret in Google Cloud Secret Manager
    echo "Creating webhook secret in Google Cloud Secret Manager..."
    echo -n "${WEBHOOK_SECRET}" | gcloud secrets create algorhythm-webhook-secret \
        --data-file=- \
        --labels=environment=${ENV},service=algorhythm,type=webhook \
        --replication-policy=automatic
    
    # Create NNA Registry webhook URL secret
    echo "Creating NNA Registry webhook URL secret..."
    echo -n "https://registry.${ENV}.reviz.dev/webhooks" | gcloud secrets create nna-registry-webhook-url \
        --data-file=- \
        --labels=environment=${ENV},service=algorhythm,type=webhook-url \
        --replication-policy=automatic
    
    echo "✅ Secrets created for ${ENV} environment"
done

echo "🎉 All webhook secrets have been created successfully!"

# Display the secrets for GitHub repository setup
echo ""
echo "📋 GitHub Repository Secrets to Add:"
echo "====================================="
echo ""
echo "For Algorhythm Service:"
echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
echo ""
echo "For NNA Registry Service:"
echo "ALGORHYTHM_WEBHOOK_SECRET=${WEBHOOK_SECRET}"
echo ""

echo "🔧 Next Steps:"
echo "1. Add the above secrets to GitHub repository secrets"
echo "2. Update Cloud Run services to use the secrets"
echo "3. Test webhook integration"
