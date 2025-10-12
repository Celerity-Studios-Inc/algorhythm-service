#!/bin/bash

# 🔧 FIX: Dockerignore issue for pre-built deployment
# This script fixes the .dockerignore file to include the dist folder

set -e

echo "🔧 Fixing .dockerignore for pre-built deployment..."
echo ""

# Backup original dockerignore
echo "📋 Step 1: Backing up original .dockerignore..."
cp .dockerignore .dockerignore.backup
echo "✅ Original .dockerignore backed up"
echo ""

# Apply pre-built dockerignore
echo "📋 Step 2: Applying pre-built .dockerignore..."
cp .dockerignore.prebuilt .dockerignore
echo "✅ Pre-built .dockerignore applied"
echo ""

# Show the difference
echo "📋 Step 3: Showing changes..."
echo "Changes made to .dockerignore:"
echo "- Removed 'dist' from exclusion list"
echo "- Added source files to exclusion list"
echo "- Optimized for pre-built deployment"
echo ""

echo "✅ .dockerignore fixed for pre-built deployment!"
echo ""
echo "🚀 You can now run:"
echo "  ./deploy-prebuilt.sh"
echo "  OR"
echo "  gcloud builds submit --config cloudbuild-prebuilt.yaml"
echo ""
echo "Ready for deployment! 🎯"
