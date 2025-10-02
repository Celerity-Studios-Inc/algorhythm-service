#!/bin/bash

# Backup Staging Database Script
# This script backs up the current staging database before promoting Phase 2C

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check environment variables
check_environment() {
    log_info "Checking environment variables..."
    
    if [ -z "$STAGING_MONGODB_URI" ]; then
        log_error "STAGING_MONGODB_URI environment variable is not set"
        log_info "Please set: export STAGING_MONGODB_URI=\"mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-staging?retryWrites=true&w=majority&appName=registryService\""
        exit 1
    fi
    
    log_success "Environment variables verified"
}

# Create backup directory
setup_backup_dir() {
    log_info "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory ready: $BACKUP_DIR"
}

# Backup staging database
backup_database() {
    log_info "Creating staging database backup..."
    
    # Create full database backup
    log_info "Creating full database backup..."
    mongodump --uri="$STAGING_MONGODB_URI" \
        --out="$BACKUP_DIR/staging-pre-promotion-$DATE" \
        --gzip
    
    # Export assets for migration
    log_info "Exporting assets for migration..."
    mongoexport --uri="$STAGING_MONGODB_URI" \
        --collection=assets \
        --out="$BACKUP_DIR/staging-assets-$DATE.json"
    
    # Count assets
    log_info "Counting assets..."
    ASSET_COUNT=$(mongo --uri="$STAGING_MONGODB_URI" \
        --quiet --eval="db.assets.countDocuments()")
    
    log_success "Backup completed: $ASSET_COUNT assets backed up"
    log_info "Backup location: $BACKUP_DIR/staging-pre-promotion-$DATE"
    log_info "Assets export: $BACKUP_DIR/staging-assets-$DATE.json"
    
    # Document backup info
    cat > "$BACKUP_DIR/backup-info-$DATE.txt" << EOF
Staging Database Backup
======================

Date: $(date)
Commit: $(git rev-parse HEAD)
Branch: $(git branch --show-current)

Asset Count: $ASSET_COUNT
Backup Location: $BACKUP_DIR/staging-pre-promotion-$DATE
Assets Export: $BACKUP_DIR/staging-assets-$DATE.json

Purpose: Backup before promoting Phase 2C from dev to staging
EOF
    
    log_success "Backup information documented"
}

# Verify backup
verify_backup() {
    log_info "Verifying backup..."
    
    # Check backup directory exists
    if [ -d "$BACKUP_DIR/staging-pre-promotion-$DATE" ]; then
        log_success "Backup directory created"
    else
        log_error "Backup directory not found"
        exit 1
    fi
    
    # Check assets export exists
    if [ -f "$BACKUP_DIR/staging-assets-$DATE.json" ]; then
        log_success "Assets export created"
    else
        log_error "Assets export not found"
        exit 1
    fi
    
    # Count assets in export
    ASSET_COUNT_EXPORT=$(jq length "$BACKUP_DIR/staging-assets-$DATE.json")
    log_info "Assets in export: $ASSET_COUNT_EXPORT"
    
    log_success "Backup verification completed"
}

# Main function
main() {
    log_info "🚀 Starting Staging Database Backup..."
    log_info "📅 Date: $DATE"
    log_info "📁 Project Root: $PROJECT_ROOT"
    
    check_environment
    setup_backup_dir
    backup_database
    verify_backup
    
    log_success "🎉 Staging database backup completed successfully!"
    log_info "💾 Backup location: $BACKUP_DIR/staging-pre-promotion-$DATE"
    log_info "📄 Assets export: $BACKUP_DIR/staging-assets-$DATE.json"
    log_info "📋 Backup info: $BACKUP_DIR/backup-info-$DATE.txt"
}

# Show help
show_help() {
    echo "Staging Database Backup Script"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Environment Variables:"
    echo "  STAGING_MONGODB_URI    MongoDB connection string for staging"
    echo ""
    echo "Examples:"
    echo "  STAGING_MONGODB_URI=\"mongodb+srv://...\" $0"
}

# Handle command line arguments
case "${1:-}" in
    --help)
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac 