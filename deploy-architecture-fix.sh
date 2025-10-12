#!/bin/bash

# 🚀 ALGORHYTHM ARCHITECTURE-AWARE DEPLOYMENT SCRIPT
# This script fixes architecture issues for Cloud Run deployment

set -e

echo "🚀 Starting AlgoRhythm Architecture-Aware Deployment..."
echo ""

# Configuration
PROJECT_ID="revize-453014"
REGION="us-central1"
SERVICE_NAME="algorhythm-service-dev"
IMAGE_NAME="gcr.io/$PROJECT_ID/algorhythm-service-dev"

echo "📋 Step 1: Building locally first..."
npm install --legacy-peer-deps
npm run build
echo "✅ Local build successful"
echo ""

echo "📋 Step 2: Preparing for x86_64 architecture..."
# Use the pre-built dockerignore that includes dist folder
cp .dockerignore.prebuilt .dockerignore
echo "✅ Dockerignore configured for pre-built deployment"
echo ""

echo "📋 Step 3: Building Docker image for x86_64 platform..."
# Build for x86_64 platform (Cloud Run requirement)
docker build --platform linux/amd64 -f Dockerfile.prebuilt -t $IMAGE_NAME .
echo "✅ Docker image built for x86_64 platform"
echo ""

echo "📋 Step 4: Pushing image to Google Container Registry..."
docker push $IMAGE_NAME
echo "✅ Image pushed to GCR"
echo ""

echo "📋 Step 5: Deploying to Cloud Run with architecture-aware configuration..."
gcloud run deploy $SERVICE_NAME \
  --region $REGION \
  --image $IMAGE_NAME \
  --platform managed \
  --cpu 1 \
  --memory 2Gi \
  --timeout 300 \
  --concurrency 100 \
  --max-instances 10 \
  --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-dev:latest,NNA_API_KEY=algorhythm-nna-api-key-dev:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-dev:latest,NODE_ENV=algorhythm-node-env-dev:latest" \
  --allow-unauthenticated

echo "✅ Deployment completed with architecture-aware configuration"
echo ""

# Restore original dockerignore
git checkout .dockerignore
echo "✅ Original dockerignore restored"
echo ""

echo "📋 Step 6: Testing deployed service..."
sleep 30  # Wait for deployment to complete

echo "Testing health endpoint..."
curl -f https://dev.algorhythm.media/health || echo "❌ Health check failed"

echo "Testing template endpoint..."
curl -X POST https://dev.algorhythm.media/api/v1/recommend/template \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test-user-123"}}' \
  --max-time 35 || echo "❌ Template endpoint test failed"

echo ""
echo "🎉 Architecture-aware deployment completed!"
echo ""
echo "📊 Summary:"
echo "✅ Local build successful"
echo "✅ Docker image built for x86_64 platform"
echo "✅ Image pushed to GCR"
echo "✅ Cloud Run deployment with architecture-aware configuration"
echo "✅ Service testing completed"
echo ""
echo "🚀 This approach fixes architecture issues for Cloud Run deployment!"
echo "Ready for testing! 🎯"
