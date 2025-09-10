#!/bin/bash

# Setup script for AlgoRhythm Service shared infrastructure
# This script configures the shared MongoDB and Redis infrastructure
# with the existing NNA Registry service

set -e

# Configuration
PROJECT_ID="revize-453014"  # Your actual GCP project ID
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Setting up AlgoRhythm Service Infrastructure${NC}"
echo -e "${YELLOW}Project: $PROJECT_ID${NC}"
echo -e "${YELLOW}Region: $REGION${NC}"

# Set the project
gcloud config set project $PROJECT_ID

# Create secrets for shared infrastructure
echo -e "${YELLOW}🔐 Creating secrets for shared infrastructure...${NC}"

# MongoDB URI (shared with NNA Registry)
echo -e "${YELLOW}📝 Please enter your MongoDB connection string:${NC}"
read -p "MongoDB URI: " MONGODB_URI
echo -n "$MONGODB_URI" | gcloud secrets create MONGODB_URI --data-file=- || \
echo -n "$MONGODB_URI" | gcloud secrets versions add MONGODB_URI --data-file=-

# Redis URL (shared with NNA Registry)
echo -e "${YELLOW}📝 Please enter your Redis connection string:${NC}"
read -p "Redis URL: " REDIS_URL
echo -n "$REDIS_URL" | gcloud secrets create REDIS_URL --data-file=- || \
echo -n "$REDIS_URL" | gcloud secrets versions add REDIS_URL --data-file=-

# JWT Secret (shared with NNA Registry)
echo -e "${YELLOW}📝 Please enter your JWT secret (same as NNA Registry):${NC}"
read -p "JWT Secret: " JWT_SECRET
echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=- || \
echo -n "$JWT_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-

# Get NNA Registry service URL
echo -e "${YELLOW}📝 Please enter your NNA Registry service URL:${NC}"
read -p "NNA Registry URL: " NNA_REGISTRY_URL

# Get NNA Registry API Key
echo -e "${YELLOW}📝 Please enter your NNA Registry API Key:${NC}"
read -p "NNA Registry API Key: " NNA_API_KEY

# Create environment configuration file
echo -e "${YELLOW}📄 Creating environment configuration...${NC}"
cat > .env.production << EOF
# AlgoRhythm Production Environment Configuration
NODE_ENV=production
PORT=8080

# Database Configuration (shared with NNA Registry)
MONGODB_URI=\${MONGODB_URI}

# Redis Configuration (shared with NNA Registry)
REDIS_URL=\${REDIS_URL}

# Authentication (shared with NNA Registry)
JWT_SECRET=\${JWT_SECRET}

# NNA Registry Integration
NNA_REGISTRY_BASE_URL=$NNA_REGISTRY_URL
NNA_REGISTRY_API_KEY=$NNA_API_KEY

# Logging
LOG_LEVEL=info

# Performance
CACHE_DEFAULT_TTL=300
SCORE_COMPUTATION_BATCH_SIZE=1000

# Analytics
ANALYTICS_ENABLED=true
ANALYTICS_BATCH_SIZE=100
EOF

echo -e "${GREEN}✅ Infrastructure setup completed!${NC}"
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "${GREEN}1. Update the deploy.sh script with your actual project ID and service URLs${NC}"
echo -e "${GREEN}2. Run: ./deploy.sh${NC}"
echo -e "${GREEN}3. Your AlgoRhythm service will be deployed to Cloud Run${NC}"
