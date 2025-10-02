# Database Management Scripts

This directory contains comprehensive database management scripts for the NNA Registry Service across all environments (Dev, Staging, Production).

## 🚀 Quick Start

### Database Manager (Recommended)
The main database management script with multi-environment support:

```bash
# Show database status
node scripts/database/database-manager.js status --env dev

# Initialize database (collections + indexes)
node scripts/database/database-manager.js init --env dev

# Clear all data (with safety checks)
node scripts/database/database-manager.js clear --env dev --force

# Delete only assets (keep other collections)
node scripts/database/database-manager.js delete-assets --env dev --confirm

# Seed with sample data
node scripts/database/database-manager.js seed --env dev

# Create backup
node scripts/database/database-manager.js backup --env dev

# Dry run (see what would happen)
node scripts/database/database-manager.js clear --env dev --dry-run
```

## 📋 Available Scripts

### 1. Database Manager (`database-manager.js`)
**Multi-environment database management with safety features**

**Features:**
- ✅ Environment-specific configurations (dev/staging/prod)
- ✅ Safety checks and confirmations
- ✅ Dry-run mode for testing
- ✅ Comprehensive backup/restore
- ✅ Database statistics and verification
- ✅ Sample data seeding

**Commands:**
- `init` - Initialize database with collections and indexes
- `clear` - Clear all data from database
- `delete-assets` - Delete all assets (keep other collections)
- `seed` - Seed database with sample data
- `backup` - Create database backup
- `status` - Show database status and statistics
- `verify` - Verify database integrity

**Options:**
- `--env <environment>` - Target environment (dev|staging|prod)
- `--force` - Force operations without confirmation
- `--dry-run` - Show what would be done without executing
- `--backup-path <path>` - Custom backup path
- `--confirm` - Require explicit confirmation for dangerous operations

### 2. Legacy Scripts
**Specialized scripts for specific operations:**

- `clear-dev-database.js` - Clear development database
- `init-dev-database.js` - Initialize development database
- `initialize-dev-database-with-songs.js` - Seed with song data
- `migrate-staging-schema.js` - Schema migration for staging
- `migrate-staging-assets.js` - Asset migration for staging
- `migrate-song-metadata.js` - Song metadata migration
- `backup-staging-database.sh` - Staging database backup

### 3. Backups Directory
**Database backups and exports:**

- `backups/` - Database backup files
  - Automatic backups from database manager
  - Manual backup exports
  - Environment-specific backups

## ⚠️ CRITICAL: Database Naming Convention

**Always use the `nna-registry-service-` prefix for database names:**

| Environment | ✅ Correct Database Name | ❌ Incorrect (Legacy) |
|-------------|-------------------------|----------------------|
| Development | `nna-registry-service-dev` | `nna-registry-dev` |
| Staging | `nna-registry-service-staging` | `nna-registry-staging` |
| Production | `nna-registry-service-production` | `nna-registry-production` |

**This naming convention prevents confusion with legacy databases and ensures proper environment isolation.**

## 🔧 Environment Configuration

### Development Environment
- **Database**: `nna-registry-service-dev`
- **URI File**: `secrets/mongodb-uri-dev.value`
- **Safe Operations**: ✅ Enabled
- **Backup Enabled**: ✅ Yes

### Staging Environment
- **Database**: `nna-registry-service-staging`
- **URI File**: `secrets/mongodb-uri-staging.value`
- **Safe Operations**: ✅ Enabled
- **Backup Enabled**: ✅ Yes

### Production Environment
- **Database**: `nna-registry-service-production`
- **URI File**: `secrets/mongodb-uri-prod.value`
- **Safe Operations**: ❌ Disabled (requires --force)
- **Backup Enabled**: ✅ Yes

## 🛡️ Safety Features

### Environment Protection
- **Production**: Requires `--force` flag for destructive operations
- **Staging**: Safe operations enabled with confirmation
- **Development**: Safe operations enabled

### Confirmation Prompts
- **Dangerous operations** require explicit confirmation
- **Production operations** require `--force` flag
- **Dry-run mode** available for all operations

### Backup Integration
- **Automatic backups** before destructive operations
- **Custom backup paths** supported
- **Backup verification** included

## 📊 Database Statistics

The database manager provides comprehensive statistics:

```
📊 Development Database Status
==================================================
🏗️  Database: nna-registry-dev
📅 Environment: Development
🔒 Safe Operations: ✅ Enabled

📋 Collections:
  assets: 3 documents
  users: 0 documents
  taxonomy: 0 documents
  migrations: 0 documents

📊 Summary:
  Assets: 3
  Users: 0
  Taxonomy: 0

🔍 Indexes:
  assets: 5 indexes
  users: 2 indexes
  taxonomy: 2 indexes
```

## 🎯 Common Use Cases

### 1. Development Setup
```bash
# Initialize fresh development database
node scripts/database/database-manager.js init --env dev

# Seed with sample data
node scripts/database/database-manager.js seed --env dev

# Check status
node scripts/database/database-manager.js status --env dev
```

### 2. Testing Cleanup
```bash
# Clear all data for fresh testing
node scripts/database/database-manager.js clear --env dev --force

# Or just delete assets
node scripts/database/database-manager.js delete-assets --env dev --confirm
```

### 3. Staging Management
```bash
# Backup staging before changes
node scripts/database/database-manager.js backup --env staging

# Clear staging data
node scripts/database/database-manager.js clear --env staging --force

# Verify staging setup
node scripts/database/database-manager.js verify --env staging
```

### 4. Production Safety
```bash
# Check production status (read-only)
node scripts/database/database-manager.js status --env prod

# Production backup
node scripts/database/database-manager.js backup --env prod

# Production cleanup (requires force)
node scripts/database/database-manager.js clear --env prod --force --confirm
```

## 🔍 Troubleshooting

### Connection Issues
```bash
# Check if MongoDB URI files exist
ls -la secrets/mongodb-uri-*.value

# Test connection with dry-run
node scripts/database/database-manager.js status --env dev --dry-run
```

### Permission Issues
```bash
# Make script executable
chmod +x scripts/database/database-manager.js

# Run with explicit node
node scripts/database/database-manager.js status --env dev
```

### Environment Issues
```bash
# Check environment configuration
node scripts/database/database-manager.js --help

# Verify environment setup
node scripts/database/database-manager.js status --env dev
```

## 📝 Best Practices

### 1. Always Use Dry-Run First
```bash
# See what would happen
node scripts/database/database-manager.js clear --env dev --dry-run

# Then execute if safe
node scripts/database/database-manager.js clear --env dev --force
```

### 2. Backup Before Destructive Operations
```bash
# Create backup first
node scripts/database/database-manager.js backup --env staging

# Then perform operation
node scripts/database/database-manager.js clear --env staging --force
```

### 3. Use Environment-Specific Commands
```bash
# Development (safe)
node scripts/database/database-manager.js clear --env dev --force

# Staging (with backup)
node scripts/database/database-manager.js backup --env staging
node scripts/database/database-manager.js clear --env staging --force

# Production (extra caution)
node scripts/database/database-manager.js backup --env prod
node scripts/database/database-manager.js clear --env prod --force --confirm
```

### 4. Verify Operations
```bash
# Check before
node scripts/database/database-manager.js status --env dev

# Perform operation
node scripts/database/database-manager.js clear --env dev --force

# Check after
node scripts/database/database-manager.js status --env dev
```

## 🚨 Important Notes

### Production Safety
- **Never run destructive operations** on production without backup
- **Always use `--force`** for production operations
- **Consider using `--confirm`** for extra safety
- **Test in staging first** before production

### Environment Isolation
- **Each environment** has separate MongoDB URI files
- **Database names** are environment-specific
- **Safety settings** vary by environment
- **Backup paths** are environment-specific

### Data Integrity
- **Indexes are preserved** during operations
- **Collections are maintained** unless explicitly cleared
- **Backups include** all collections and indexes
- **Verification** ensures data integrity

---

**🎯 The Database Manager provides a unified, safe, and comprehensive way to manage all database operations across environments!** 