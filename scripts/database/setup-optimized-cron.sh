#!/bin/bash

# Setup Optimized Cron Job for Limited Development Assets
# - 1 minute interval for development
# - Trigger-based index building
# - Optimized for 90 assets

echo "🔧 Setting up optimized cron job for limited development assets"
echo "=============================================================="

# Get the full path to the node executable
NODE_PATH=$(which node)

# Define the MongoDB URI
MONGODB_URI='mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService'

# Define the paths
PROJECT_DIR="/Users/ajaymadhok/algorhythm-service"
TRIGGER_SCRIPT="$PROJECT_DIR/scripts/database/trigger-index-build.js"
OPTIMIZE_SCRIPT="$PROJECT_DIR/scripts/database/optimize-limited-assets.js"

# Define the log file
LOG_FILE="/tmp/algorhythm-optimized-build.log"

echo "📊 Current setup:"
echo "  Project Directory: $PROJECT_DIR"
echo "  Node Path: $NODE_PATH"
echo "  Trigger Script: $TRIGGER_SCRIPT"
echo "  Optimize Script: $OPTIMIZE_SCRIPT"
echo "  Log File: $LOG_FILE"

# Remove existing cron jobs
echo "🧹 Removing existing cron jobs..."
crontab -l 2>/dev/null | grep -v "algorhythm" | crontab -

# Add optimized cron job (every minute for development)
echo "⏰ Adding optimized cron job (every minute)..."
(crontab -l 2>/dev/null; echo "*/1 * * * * cd $PROJECT_DIR && MONGODB_URI='$MONGODB_URI' $NODE_PATH $TRIGGER_SCRIPT >> $LOG_FILE 2>&1") | crontab -

# Add daily optimization (at 2 AM)
echo "🌙 Adding daily optimization (2 AM)..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && MONGODB_URI='$MONGODB_URI' $NODE_PATH $OPTIMIZE_SCRIPT >> $LOG_FILE 2>&1") | crontab -

echo "✅ Optimized cron jobs scheduled:"
echo "  - Every minute: Trigger-based index building"
echo "  - Daily at 2 AM: Full optimization for limited assets"
echo "  - Logs: $LOG_FILE"

# Run initial optimization
echo "🚀 Running initial optimization..."
cd $PROJECT_DIR
MONGODB_URI="$MONGODB_URI" $NODE_PATH $OPTIMIZE_SCRIPT

echo "✅ Setup completed!"
echo "📊 Monitor with: tail -f $LOG_FILE"
echo "🛑 Stop with: crontab -e (remove the lines)"
