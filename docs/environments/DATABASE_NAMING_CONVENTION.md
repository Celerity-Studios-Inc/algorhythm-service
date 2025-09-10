# Database Naming Convention - CRITICAL

**Date**: August 3, 2025  
**Status**: ✅ **CRITICAL - MUST FOLLOW**  
**Purpose**: Prevent database connection errors and environment confusion

---

## ⚠️ **CRITICAL: Database Naming Convention**

**Always use the `nna-registry-service-` prefix for database names:**

| Environment | ✅ Correct Database Name | ❌ Incorrect (Legacy) |
|-------------|-------------------------|----------------------|
| Development | `nna-registry-service-dev` | `nna-registry-dev` |
| Staging | `nna-registry-service-staging` | `nna-registry-staging` |
| Production | `nna-registry-service-production` | `nna-registry-production` |

---

## 🚨 **Why This Matters**

### **The Problem**
- Legacy databases exist with the old naming convention (`nna-registry-dev`)
- Connecting to the wrong database can cause:
  - Data loss or corruption
  - Environment confusion
  - Testing on wrong data
  - Production data contamination

### **The Solution**
- **Always** use the `nna-registry-service-` prefix
- This ensures proper environment isolation
- Prevents accidental connection to legacy databases

---

## 📋 **Database Connection Strings**

### **Development Environment**
```javascript
// ✅ CORRECT
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService

// ❌ INCORRECT (Legacy)
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-dev?retryWrites=true&w=majority&appName=registryService
```

### **Staging Environment**
```javascript
// ✅ CORRECT
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-staging?retryWrites=true&w=majority&appName=registryService

// ❌ INCORRECT (Legacy)
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-staging?retryWrites=true&w=majority&appName=registryService
```

### **Production Environment**
```javascript
// ✅ CORRECT
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-production?retryWrites=true&w=majority&appName=registryService

// ❌ INCORRECT (Legacy)
mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-production?retryWrites=true&w=majority&appName=registryService
```

---

## 🔧 **Scripts and Tools**

### **Database Manager**
The `scripts/database/database-manager.js` script now correctly uses:
- Development: `nna-registry-service-dev`
- Staging: `nna-registry-service-staging`
- Production: `nna-registry-service-production`

### **Legacy Scripts**
Some legacy scripts may still reference old database names. Always verify:
1. Check the database name in the connection string
2. Ensure it uses the `nna-registry-service-` prefix
3. Update if necessary

---

## 🛡️ **Safety Checks**

### **Before Running Database Operations**
1. **Verify the database name** in your connection string
2. **Check the environment** you're targeting
3. **Use dry-run mode** when available: `--dry-run`
4. **Confirm the operation** with `--confirm` or `--force`

### **Database Manager Safety Features**
```bash
# Safe status check
node scripts/database/database-manager.js status --env dev

# Dry run before destructive operations
node scripts/database/database-manager.js clear --env dev --dry-run

# Force operations (use with caution)
node scripts/database/database-manager.js clear --env dev --force
```

---

## 📚 **Related Documentation**

- **[Environment Configuration Reference](docs/architecture/ENVIRONMENT_CONFIGURATION_REFERENCE.md)**: Complete environment setup
- **[Database Management Framework](docs/frameworks/DATABASE_MANAGEMENT_FRAMEWORK.md)**: Multi-environment database management
- **[Environment Setup Guide](docs/environments/environment_setup_guide.md)**: Environment creation guidelines

---

## 🎯 **Quick Reference**

| Action | Command |
|--------|---------|
| Check database status | `node scripts/database/database-manager.js status --env dev` |
| Initialize database | `node scripts/database/database-manager.js init --env dev` |
| Clear all data | `node scripts/database/database-manager.js clear --env dev --force` |
| Delete assets only | `node scripts/database/database-manager.js delete-assets --env dev --confirm` |
| Create backup | `node scripts/database/database-manager.js backup --env dev` |

---

**⚠️ REMEMBER: Always use `nna-registry-service-` prefix for database names!** 