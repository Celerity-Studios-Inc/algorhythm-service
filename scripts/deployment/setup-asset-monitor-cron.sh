#!/bin/bash

# Setup Asset Metadata Monitor Cron Job
# This script sets up a cron job to monitor asset metadata every 10 minutes

set -e

echo "🔧 Setting up Asset Metadata Monitor Cron Job"
echo "=============================================="

# Get the current directory (should be the project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONITOR_SCRIPT="$PROJECT_ROOT/scripts/database/monitor-asset-metadata.js"
CRON_LOG="$PROJECT_ROOT/scripts/asset-monitor-cron.log"

echo "📁 Project Root: $PROJECT_ROOT"
echo "📄 Monitor Script: $MONITOR_SCRIPT"
echo "📝 Cron Log: $CRON_LOG"

# Check if the monitor script exists
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "❌ Monitor script not found at: $MONITOR_SCRIPT"
    exit 1
fi

# Make the monitor script executable
chmod +x "$MONITOR_SCRIPT"

# Create the cron job entry
CRON_ENTRY="*/10 * * * * cd $PROJECT_ROOT && MONGODB_URI='mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService' node $MONITOR_SCRIPT run-once >> $CRON_LOG 2>&1"

echo "📋 Cron Job Entry:"
echo "$CRON_ENTRY"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "monitor-asset-metadata.js"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "monitor-asset-metadata.js" | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "📊 Cron job will run every 10 minutes and:"
echo "   - Monitor asset metadata quality"
echo "   - Create/update search indices"
echo "   - Track AlgoRhythm field completion"
echo "   - Log results to: $CRON_LOG"
echo ""
echo "🔍 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "📝 To view monitor logs:"
echo "   tail -f $CRON_LOG"
echo ""
echo "🛑 To remove the cron job:"
echo "   crontab -l | grep -v 'monitor-asset-metadata.js' | crontab -"
echo ""
echo "🚀 To test the monitor manually:"
echo "   cd $PROJECT_ROOT && node $MONITOR_SCRIPT run-once"
echo ""
echo "📊 To check current status:"
echo "   cd $PROJECT_ROOT && node $MONITOR_SCRIPT status"
echo ""

# Test the monitor script once
echo "🧪 Testing monitor script..."
cd "$PROJECT_ROOT"
if MONGODB_URI='mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService' node "$MONITOR_SCRIPT" run-once; then
    echo "✅ Monitor script test successful!"
else
    echo "❌ Monitor script test failed!"
    echo "   Check the error messages above"
    exit 1
fi

echo ""
echo "🎉 Asset Metadata Monitor setup complete!"
echo "   The cron job is now running every 10 minutes"
echo "   Check the logs at: $CRON_LOG"

