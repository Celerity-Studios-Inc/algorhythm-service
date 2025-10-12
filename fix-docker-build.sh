#!/bin/bash

# 🔧 ALGORHYTHM DOCKER BUILD FIX SCRIPT
# This script fixes the Docker build dependency resolution issues

set -e

echo "🚀 Starting AlgoRhythm Docker Build Fix..."
echo ""

# Step 1: Backup current Dockerfile
echo "📋 Step 1: Backing up current Dockerfile..."
cp Dockerfile Dockerfile.backup
echo "✅ Dockerfile backed up as Dockerfile.backup"
echo ""

# Step 2: Apply optimized Dockerfile
echo "📋 Step 2: Applying optimized Dockerfile..."
cat > Dockerfile << 'EOF'
# Multi-stage build for production - OPTIMIZED
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies with legacy peer deps to resolve conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript → JavaScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies with legacy peer deps
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# Copy compiled code from builder stage
COPY --from=builder /usr/src/app/dist ./dist

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
echo "✅ Optimized Dockerfile applied"
echo ""

# Step 3: Test local build
echo "📋 Step 3: Testing local build..."
npm install --legacy-peer-deps
npm run build
echo "✅ Local build successful"
echo ""

# Step 4: Deploy with optimized configuration
echo "📋 Step 4: Deploying with optimized configuration..."
gcloud run deploy algorhythm-service-dev \
  --region us-central1 \
  --source . \
  --set-secrets="NNA_REGISTRY_URL=algorhythm-nna-registry-url-dev:latest,NNA_API_KEY=algorhythm-nna-api-key-dev:latest,NNA_REGISTRY_TIMEOUT=algorhythm-nna-registry-timeout-dev:latest,NODE_ENV=algorhythm-node-env-dev:latest"

echo "✅ Deployment initiated"
echo ""

# Step 5: Test the deployed service
echo "📋 Step 5: Testing deployed service..."
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
echo "🎉 Docker build fix completed!"
echo ""
echo "📊 Summary:"
echo "✅ Optimized Dockerfile applied"
echo "✅ Local build successful"
echo "✅ Deployment initiated"
echo "✅ Service testing completed"
echo ""
echo "🚀 Next steps:"
echo "1. Monitor deployment logs"
echo "2. Test template endpoint performance"
echo "3. Verify NNA Registry integration"
echo ""
echo "Ready for testing! 🎯"
