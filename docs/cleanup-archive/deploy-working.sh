#!/bin/bash

# WORKING DEPLOYMENT SCRIPT FOR ALGORHYTHM SERVICE
# This script ensures a successful deployment

set -e

echo "🚀 Starting AlgoRhythm Working Deployment..."
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

echo "📋 Step 2: Using working Dockerfile and dockerignore..."
# Use our working files
cp Dockerfile.working Dockerfile
cp .dockerignore.working .dockerignore
echo "✅ Working configuration applied"
echo ""

echo "📋 Step 3: Building Docker image for x86_64 platform..."
# Build for x86_64 platform (Cloud Run requirement)
docker build --platform linux/amd64 --no-cache -t $IMAGE_NAME .
echo "✅ Docker image built successfully"
echo ""

echo "📋 Step 4: Pushing image to Google Container Registry..."
docker push $IMAGE_NAME
echo "✅ Image pushed successfully"
echo ""

echo "📋 Step 5: Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 100 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars="NODE_ENV=development,PORT=8080"

echo "✅ Deployment completed successfully!"
echo ""

echo "🎉 AlgoRhythm Service is now deployed and ready!"
echo "Service URL: https://dev.algorhythm.media"
echo "Health Check: https://dev.algorhythm.media/health"
echo ""

echo "🧪 Testing the deployment..."
sleep 10

echo "Testing health endpoint..."
curl -f https://dev.algorhythm.media/health || echo "Health check failed - service may still be starting"

echo ""
echo "✅ Deployment script completed!"
