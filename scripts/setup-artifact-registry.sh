#!/bin/bash

# Setup Google Artifact Registry for AlgoRhythm Service
# This script creates the necessary Artifact Registry repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️ Setting up Google Artifact Registry for AlgoRhythm Service${NC}"
echo "================================================"

# Configuration
PROJECT_ID="revize-453014"
REGION="us-central1"
REPOSITORY_NAME="algorhythm-repo"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Repository: $REPOSITORY_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed.${NC}"
    echo "Please install it first: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated with gcloud.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${YELLOW}🔧 Setting project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Create Artifact Registry repository
echo -e "${YELLOW}🏗️ Creating Artifact Registry repository...${NC}"
if gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION &> /dev/null; then
    echo -e "${GREEN}✅ Repository $REPOSITORY_NAME already exists${NC}"
else
    gcloud artifacts repositories create $REPOSITORY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="AlgoRhythm Service Docker Images"
    echo -e "${GREEN}✅ Created repository $REPOSITORY_NAME${NC}"
fi

# Configure Docker authentication
echo -e "${YELLOW}🔧 Configuring Docker authentication...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev

echo -e "\n${GREEN}🎉 Artifact Registry setup completed!${NC}"
echo "================================================"
echo -e "${BLUE}Repository Details:${NC}"
echo "Name: $REPOSITORY_NAME"
echo "Location: $REGION"
echo "Format: Docker"
echo "URL: $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. The CI/CD workflows have been updated to use Artifact Registry"
echo "2. Push a commit to trigger a new deployment"
echo "3. The Docker images will now be stored in Artifact Registry"
echo ""
echo -e "${BLUE}Test the setup:${NC}"
echo "docker pull $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME/algorhythm-service-dev:latest"
