#!/bin/bash

# AlgoRhythm Service Deployment Script for Google Cloud Run
# This script deploys the AlgoRhythm service to Google Cloud Run
# sharing infrastructure with the existing NNA Registry service

set -e

# Configuration
PROJECT_ID="revize-453014"  # Your actual GCP project ID
REGION="us-central1"
SERVICE_NAME="algorhythm-service"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying AlgoRhythm Service to Google Cloud Run${NC}"
echo -e "${YELLOW}Project: $PROJECT_ID${NC}"
echo -e "${YELLOW}Region: $REGION${NC}"
echo -e "${YELLOW}Service: $SERVICE_NAME${NC}"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}📋 Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t $IMAGE_NAME:latest -f docker/Dockerfile .

echo -e "${YELLOW}📤 Pushing image to Container Registry...${NC}"
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1 \
  --concurrency 100 \
  --timeout 300 \
  --set-env-vars NODE_ENV=development \
  --set-env-vars ENVIRONMENT=development \
  --set-env-vars MONGODB_URI="mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService" \
  --set-env-vars REDIS_URL=redis://10.0.0.3:6379 \
  --set-env-vars JWT_SECRET=dev-jwt-secret-key \
  --set-env-vars NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev \
  --set-env-vars NNA_REGISTRY_API_KEY=your-api-key \
  --service-account ci-cd-service-account@revize-453014.iam.gserviceaccount.com

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${GREEN}📚 API Documentation: $SERVICE_URL/api/docs${NC}"
echo -e "${GREEN}🏥 Health Check: $SERVICE_URL/api/v1/health${NC}"

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
sleep 10  # Wait for service to be ready

if curl -f -s "$SERVICE_URL/api/v1/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed. Check the logs:${NC}"
    echo "gcloud logs read --service=$SERVICE_NAME --region=$REGION --limit=50"
fi

echo -e "${GREEN}🎉 AlgoRhythm Service is now live!${NC}"
