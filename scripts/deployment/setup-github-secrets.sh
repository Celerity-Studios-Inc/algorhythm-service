#!/bin/bash

# Setup GitHub Secrets for AlgoRhythm Service
# This script helps set up the required GitHub repository secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 GitHub Secrets Setup for AlgoRhythm Service${NC}"
echo "================================================"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${YELLOW}📋 Required GitHub Secrets:${NC}"
echo "1. GCP_PROJECT_ID - Google Cloud Project ID"
echo "2. GCP_SA_KEY - Google Cloud Service Account Key (JSON)"
echo "3. GITHUB_TOKEN - GitHub Personal Access Token (optional, for advanced features)"
echo ""

# Get project ID
read -p "Enter your Google Cloud Project ID (revize-453014): " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-revize-453014}

echo -e "\n${YELLOW}🔑 Setting up GCP_PROJECT_ID...${NC}"
gh secret set GCP_PROJECT_ID --body "$PROJECT_ID"
echo -e "${GREEN}✅ GCP_PROJECT_ID set to: $PROJECT_ID${NC}"

echo -e "\n${YELLOW}🔑 Setting up GCP_SA_KEY...${NC}"
echo "You need to provide the service account key JSON."
echo "This should be the content of the service account key file."
echo ""

# Check if service account key file exists
SA_KEY_FILE=""
if [ -f "service-account-key.json" ]; then
    SA_KEY_FILE="service-account-key.json"
elif [ -f "gcp-key.json" ]; then
    SA_KEY_FILE="gcp-key.json"
elif [ -f "key.json" ]; then
    SA_KEY_FILE="key.json"
fi

if [ -n "$SA_KEY_FILE" ]; then
    echo -e "${BLUE}📁 Found service account key file: $SA_KEY_FILE${NC}"
    read -p "Use this file? (y/n): " use_file
    if [[ $use_file =~ ^[Yy]$ ]]; then
        gh secret set GCP_SA_KEY < "$SA_KEY_FILE"
        echo -e "${GREEN}✅ GCP_SA_KEY set from file: $SA_KEY_FILE${NC}"
    else
        echo "Please paste the service account key JSON content:"
        gh secret set GCP_SA_KEY
        echo -e "${GREEN}✅ GCP_SA_KEY set from input${NC}"
    fi
else
    echo "Please paste the service account key JSON content:"
    gh secret set GCP_SA_KEY
    echo -e "${GREEN}✅ GCP_SA_KEY set from input${NC}"
fi

echo -e "\n${YELLOW}🔍 Verifying secrets...${NC}"
echo "Checking if secrets are properly set..."

# List secrets to verify
gh secret list

echo -e "\n${GREEN}🎉 GitHub secrets setup completed!${NC}"
echo "================================================"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Push a commit to the 'dev' branch to trigger the CI/CD pipeline"
echo "2. Monitor the deployment at: https://github.com/Celerity-Studios-Inc/algorhythm-service/actions"
echo "3. Check the service health at: https://dev.algorhythm.dev/api/v1/health"
echo ""
echo -e "${YELLOW}Note:${NC} The first deployment may take a few minutes to complete."
echo "Subsequent deployments will be faster due to Docker layer caching."
