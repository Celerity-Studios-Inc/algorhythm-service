#!/bin/bash

# Schedule Index Build Script
# Runs every 5 minutes to update indexes and tags

# Set up cron job to run every 5 minutes
echo "Setting up cron job to run index build every 5 minutes..."

# Add cron job (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * cd /Users/ajaymadhok/algorhythm-service && MONGODB_URI='mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService' node scripts/database/run-index-build.js >> /tmp/algorhythm-index-build.log 2>&1") | crontab -

echo "✅ Cron job scheduled to run every 5 minutes"
echo "📝 Logs will be written to: /tmp/algorhythm-index-build.log"
echo "🔍 To view logs: tail -f /tmp/algorhythm-index-build.log"
echo "🛑 To stop: crontab -e (remove the line)"

# Run immediately
echo "🚀 Running index build now..."
MONGODB_URI='mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService' node scripts/database/run-index-build.js
