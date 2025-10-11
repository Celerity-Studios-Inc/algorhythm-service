#!/bin/bash

# Setup webhook secret for Algorhythm service
# This script creates the webhook secret in Google Cloud Secret Manager

set -e

# Configuration
PROJECT_ID="revize-453014"
SECRET_NAME="ALGORHYTHM_WEBHOOK_SECRET"
SECRET_VALUE="43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a"

echo "🔐 Setting up webhook secret for Algorhythm service..."

# Set the project
gcloud config set project $PROJECT_ID

# Create the secret if it doesn't exist
if ! gcloud secrets describe $SECRET_NAME >/dev/null 2>&1; then
    echo "📝 Creating webhook secret..."
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=-
    echo "✅ Webhook secret created successfully"
else
    echo "📝 Updating existing webhook secret..."
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=-
    echo "✅ Webhook secret updated successfully"
fi

# Verify the secret
echo "🔍 Verifying webhook secret..."
SECRET_VERSION=$(gcloud secrets versions list $SECRET_NAME --limit=1 --format="value(name)")
echo "✅ Secret version: $SECRET_VERSION"

echo "🎉 Webhook secret setup complete!"
echo "🔗 Secret name: $SECRET_NAME"
echo "🔗 Project: $PROJECT_ID"
echo "📝 Next: Deploy the service to use the secret"
