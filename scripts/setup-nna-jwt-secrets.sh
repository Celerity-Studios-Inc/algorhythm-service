#!/bin/bash

# Setup NNA Registry JWT Secrets for AlgoRhythm Service
# This script creates the NNA Registry JWT secrets in Google Cloud Secret Manager

set -e

PROJECT_ID="revize-453014"
REGION="us-central1"

echo "🔐 Setting up NNA Registry JWT secrets for AlgoRhythm Service..."

# Development environment
echo "📝 Creating development NNA Registry JWT secret..."
gcloud secrets create algorhythm-nna-jwt-secret-dev \
    --data-file=- <<< "nna-registry-dev-jwt-secret-key" \
    --project=$PROJECT_ID

# Staging environment  
echo "📝 Creating staging NNA Registry JWT secret..."
gcloud secrets create algorhythm-nna-jwt-secret-stg \
    --data-file=- <<< "nna-registry-stg-jwt-secret-key" \
    --project=$PROJECT_ID

# Production environment
echo "📝 Creating production NNA Registry JWT secret..."
gcloud secrets create algorhythm-nna-jwt-secret \
    --data-file=- <<< "nna-registry-prod-jwt-secret-key" \
    --project=$PROJECT_ID

echo "✅ NNA Registry JWT secrets created successfully!"
echo ""
echo "🔑 Secret names:"
echo "  - algorhythm-nna-jwt-secret-dev (development)"
echo "  - algorhythm-nna-jwt-secret-stg (staging)" 
echo "  - algorhythm-nna-jwt-secret (production)"
echo ""
echo "📋 Next steps:"
echo "  1. Update the actual JWT secrets with real NNA Registry secrets"
echo "  2. Grant access to the service account:"
echo "     gcloud secrets add-iam-policy-binding algorhythm-nna-jwt-secret-dev \\"
echo "       --member='serviceAccount:algorhythm-service@revize-453014.iam.gserviceaccount.com' \\"
echo "       --role='roles/secretmanager.secretAccessor' \\"
echo "       --project=$PROJECT_ID"
echo ""
echo "  3. Repeat for staging and production secrets"
