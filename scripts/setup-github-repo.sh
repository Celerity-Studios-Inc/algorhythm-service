#!/bin/bash

# AlgoRhythm Service - GitHub Repository Setup Script
# This script helps set up the GitHub repository and configure secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AlgoRhythm Service - GitHub Repository Setup${NC}"
echo -e "${YELLOW}This script will help you set up the GitHub repository and configure secrets${NC}"

# Configuration
REPO_NAME="algorhythm-service"
ORG_NAME="Celerity-Studios-Inc"
GCP_PROJECT_ID="revize-453014"

echo -e "${BLUE}📋 Repository Configuration:${NC}"
echo -e "Organization: ${ORG_NAME}"
echo -e "Repository: ${REPO_NAME}"
echo -e "GCP Project: ${GCP_PROJECT_ID}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo -e "${YELLOW}https://cli.github.com/${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI. Please run:${NC}"
    echo -e "${YELLOW}gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"

# Create repository (if it doesn't exist)
echo -e "${BLUE}📦 Creating GitHub repository...${NC}"
if gh repo view "${ORG_NAME}/${REPO_NAME}" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Repository ${ORG_NAME}/${REPO_NAME} already exists${NC}"
else
    gh repo create "${ORG_NAME}/${REPO_NAME}" \
        --public \
        --description "AI-powered recommendation engine for ReViz's video remixing platform" \
        --add-readme
    echo -e "${GREEN}✅ Repository created successfully${NC}"
fi

# Set up repository secrets
echo -e "${BLUE}🔐 Setting up repository secrets...${NC}"

# Required secrets
SECRETS=(
    "GCP_PROJECT_ID:${GCP_PROJECT_ID}"
    "GCP_SA_KEY:$(cat secrets/gcp-sa-key.json | base64 -w 0)"
    "NNA_REGISTRY_API_KEY:your-nna-registry-api-key"
)

for secret in "${SECRETS[@]}"; do
    IFS=':' read -r key value <<< "$secret"
    
    if [ -z "$value" ] || [ "$value" = "your-nna-registry-api-key" ]; then
        echo -e "${YELLOW}⚠️  Please set ${key} manually in GitHub repository settings${NC}"
        echo -e "${YELLOW}   Go to: https://github.com/${ORG_NAME}/${REPO_NAME}/settings/secrets/actions${NC}"
    else
        echo "$value" | gh secret set "$key" --repo "${ORG_NAME}/${REPO_NAME}"
        echo -e "${GREEN}✅ Set secret: ${key}${NC}"
    fi
done

# Create branches
echo -e "${BLUE}🌿 Creating branches...${NC}"
git checkout -b dev 2>/dev/null || echo -e "${YELLOW}⚠️  dev branch already exists${NC}"
git checkout -b staging 2>/dev/null || echo -e "${YELLOW}⚠️  staging branch already exists${NC}"
git checkout main

# Push branches to GitHub
echo -e "${BLUE}📤 Pushing branches to GitHub...${NC}"
git push -u origin main
git push -u origin dev
git push -u origin staging

# Set up branch protection rules
echo -e "${BLUE}🛡️  Setting up branch protection rules...${NC}"

# Main branch protection
gh api repos/"${ORG_NAME}"/"${REPO_NAME}"/branches/main/protection \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":["build-and-deploy"]}' \
    --field enforce_admins=true \
    --field required_pull_request_reviews='{"required_approving_review_count":1}' \
    --field restrictions=null

echo -e "${GREEN}✅ Branch protection rules set for main branch${NC}"

# Create initial commit with all files
echo -e "${BLUE}📝 Creating initial commit...${NC}"
git add .
git commit -m "Initial commit: AlgoRhythm AI Recommendation Engine

- Complete NestJS implementation with modular architecture
- Three-environment setup (dev, staging, production)
- CI/CD workflows for automated deployment
- Integration with NNA Registry infrastructure
- Redis caching for <20ms response times
- Comprehensive analytics and monitoring
- Ready for ReViz Expo mobile app integration"

git push origin main

echo -e "${GREEN}🎉 GitHub repository setup completed!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. ${YELLOW}Set NNA_REGISTRY_API_KEY secret manually${NC}"
echo -e "2. ${YELLOW}Push to dev branch to trigger development deployment${NC}"
echo -e "3. ${YELLOW}Test the development environment${NC}"
echo -e "4. ${YELLOW}Configure custom domain for production${NC}"

echo -e "${BLUE}🔗 Repository URL: https://github.com/${ORG_NAME}/${REPO_NAME}${NC}"
echo -e "${BLUE}🔗 Secrets URL: https://github.com/${ORG_NAME}/${REPO_NAME}/settings/secrets/actions${NC}"
