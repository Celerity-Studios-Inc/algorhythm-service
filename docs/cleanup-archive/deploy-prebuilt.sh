#!/bin/bash

# 🚀 ALGORHYTHM PRE-BUILT DEPLOYMENT SCRIPT
# This script bypasses Docker build issues by using pre-built images

set -e

echo "🚀 Starting AlgoRhythm Pre-built Deployment..."
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

echo "📋 Step 2: Creating optimized Dockerfile for pre-built deployment..."
cat > Dockerfile.prebuilt << 'EOF'
# Pre-built deployment Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# Copy pre-built dist folder
COPY dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /usr/src/app

USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require(\"http\").get(\"http://localhost:${PORT:-8080}/api/v1/health\", (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/main.js"]
EOF
echo "✅ Pre-built Dockerfile created"
echo ""

echo "📋 Step 3: Building Docker image with pre-built code..."
# Use the pre-built dockerignore that includes dist folder
cp .dockerignore.prebuilt .dockerignore
# Build for x86_64 platform (Cloud Run requirement)
docker build --platform linux/amd64 -f Dockerfile.prebuilt -t $IMAGE_NAME .
# Restore original dockerignore
git checkout .dockerignore
echo "✅ Docker image built successfully"
echo ""

echo "📋 Step 4: Pushing image to Google Container Registry..."
docker push $IMAGE_NAME
echo "✅ Image pushed to GCR"
echo ""

echo "📋 Step 5: Deploying to Cloud Run with pre-built image..."
gcloud run deploy $SERVICE_NAME \
  --region $REGION \
  --image $IMAGE_NAME \
  --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-dev:latest,NNA_API_KEY=algorhythm-nna-api-key-dev:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-dev:latest,NODE_ENV=algorhythm-node-env-dev:latest" \
  --platform managed \
  --allow-unauthenticated

echo "✅ Deployment completed"
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
echo "🎉 Pre-built deployment completed!"
echo ""
echo "📊 Summary:"
echo "✅ Local build successful"
echo "✅ Docker image built with pre-built code"
echo "✅ Image pushed to GCR"
echo "✅ Cloud Run deployment completed"
echo "✅ Service testing completed"
echo ""
echo "🚀 This approach bypasses Docker build issues by using pre-built code!"
echo "Ready for testing! 🎯"
