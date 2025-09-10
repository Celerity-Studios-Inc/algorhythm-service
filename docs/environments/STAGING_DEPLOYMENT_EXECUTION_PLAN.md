# Staging Deployment Execution Plan

## Overview

This plan outlines the step-by-step process to promote the unified Phase 2C codebase from Development to Staging environment, including database backup, deployment, and data migration.

**Status**: 🚀 **READY FOR EXECUTION**  
**Timeline**: 2-3 hours  
**Risk Level**: Low (with proper backup)  
**Last Updated**: July 23, 2025

---

## 🎯 **Deployment Strategy**

### **Approach**
1. **Backup Current Staging**: Preserve 1,781 existing assets
2. **Deploy Unified Codebase**: Deploy Phase 2C implementation
3. **Initialize New Database**: Set up new MongoDB schema
4. **Migrate Data**: Import backed-up assets with field mapping
5. **Validate**: Ensure all assets are accessible

### **Benefits**
- ✅ **ReViz Team Unblocked**: Can work with new features immediately
- ✅ **Data Preserved**: All 1,781 assets maintained
- ✅ **New Features Available**: Dual addressing, songMetadata, etc.
- ✅ **Rollback Capable**: Can revert if issues arise

---

## 📋 **Pre-Deployment Checklist**

### **Environment Verification**
- [ ] **Staging Environment**: Cloud Run service ready
- [ ] **Database Access**: MongoDB connection verified
- [ ] **Environment Variables**: Staging configs updated
- [ ] **Monitoring**: Sentry and logging configured
- [ ] **Team Notification**: Stakeholders informed

### **Backup Preparation**
- [ ] **Database Backup**: Full MongoDB backup
- [ ] **Asset Files**: Backup any uploaded files
- [ ] **Configuration**: Backup current staging configs
- [ ] **Documentation**: Current state documented

---

## 🚀 **Step-by-Step Execution Plan**

### **Step 1: Backup Current Staging Database (30 minutes)**

#### **1.1 Create Full Database Backup**
```bash
# Connect to staging MongoDB
mongodump --uri="mongodb+srv://staging-connection-string" \
  --out=./backups/staging-$(date +%Y%m%d-%H%M%S) \
  --gzip

# Verify backup size and contents
ls -la ./backups/staging-$(date +%Y%m%d-%H%M%S)
```

#### **1.2 Export Asset Data for Analysis**
```bash
# Export assets for field mapping analysis
mongoexport --uri="mongodb+srv://staging-connection-string" \
  --collection=assets \
  --out=./backups/staging-assets-$(date +%Y%m%d).json

# Count total assets
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.countDocuments()"
```

#### **1.3 Document Current Schema**
```bash
# Export schema information
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.findOne()" > ./backups/staging-schema-$(date +%Y%m%d).json
```

### **Step 2: Deploy Unified Codebase (45 minutes)**

#### **2.1 Update Staging Branch**
```bash
# Switch to staging branch
git checkout staging

# Merge development branch
git merge dev

# Verify changes
git log --oneline -10
```

#### **2.2 Build and Deploy**
```bash
# Build Docker image
docker build --platform linux/amd64 --no-cache \
  -t gcr.io/project-id/nna-registry-service-staging:latest .

# Push to registry
docker push gcr.io/project-id/nna-registry-service-staging:latest

# Deploy to Cloud Run
gcloud run deploy nna-registry-service-staging \
  --image gcr.io/project-id/nna-registry-service-staging:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### **2.3 Verify Deployment**
```bash
# Test health endpoint
curl https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/health

# Test basic functionality
curl https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/assets
```

### **Step 3: Initialize New Database Schema (30 minutes)**

#### **3.1 Clear Existing Database**
```bash
# Connect to staging MongoDB
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.drop()"
```

#### **3.2 Initialize New Schema**
```bash
# Run database initialization
npm run db:init:staging

# Verify schema creation
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.getIndexes()"
```

#### **3.3 Verify Empty Database**
```bash
# Confirm database is empty
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.countDocuments()"
```

### **Step 4: Migrate Asset Data (60 minutes)**

#### **4.1 Create Migration Script**
```javascript
// scripts/migrate-staging-assets.js
const { MongoClient } = require('mongodb');

async function migrateStagingAssets() {
  const client = new MongoClient(process.env.STAGING_MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Read backup data
    const backupData = require('./backups/staging-assets-20250723.json');
    
    // Transform assets to new schema
    const migratedAssets = backupData.map(asset => ({
      ...asset,
      // Add new Phase 2C fields with defaults
      songMetadata: asset.songMetadata || null,
      creatorDescription: asset.creatorDescription || asset.description || '',
      albumArt: asset.albumArt || null,
      aiMetadata: asset.aiMetadata || {
        description: asset.description || '',
        tags: asset.tags || []
      },
      // Ensure dual addressing fields
      address: asset.address || generateMfaFromHfn(asset.name),
      name: asset.name || generateHfnFromMfa(asset.address),
      // Add timestamps
      createdAt: asset.createdAt || new Date(),
      updatedAt: new Date()
    }));
    
    // Insert migrated assets
    if (migratedAssets.length > 0) {
      const result = await db.collection('assets').insertMany(migratedAssets);
      console.log(`Migrated ${result.insertedCount} assets`);
    }
    
  } finally {
    await client.close();
  }
}

migrateStagingAssets().catch(console.error);
```

#### **4.2 Execute Migration**
```bash
# Run migration script
node scripts/migrate-staging-assets.js

# Verify migration
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.countDocuments()"
```

#### **4.3 Validate Migration**
```bash
# Test sample assets
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/assets?limit=5

# Test MFA endpoints
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/assets/address/C.001.001.001
```

### **Step 5: Validation and Testing (45 minutes)**

#### **5.1 Core Functionality Tests**
```bash
# Run comprehensive tests against staging
node scripts/comprehensive-e2e-test.js \
  --base-url https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api
```

#### **5.2 Data Validation**
```bash
# Verify asset counts
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.countDocuments()"

# Check layer distribution
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.aggregate([{\$group: {_id: '\$layer', count: {\$sum: 1}}}])"
```

#### **5.3 Performance Validation**
```bash
# Test response times
curl -w "@curl-format.txt" \
  https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/assets

# Test search performance
curl -w "@curl-format.txt" \
  "https://nna-registry-service-staging-5jm4duk5oa-uc.a.run.app/api/assets?search=test&limit=20"
```

---

## 📊 **Field Mapping Strategy**

### **New Fields with Defaults**
```javascript
// Fields that will be empty but functional
{
  songMetadata: null,                    // Will be populated by frontend
  creatorDescription: asset.description || '',  // Use existing description
  albumArt: null,                        // Will be generated by frontend
  aiMetadata: {
    description: asset.description || '',
    tags: asset.tags || []
  },
  // Dual addressing
  address: asset.address || generateMfaFromHfn(asset.name),
  name: asset.name || generateHfnFromMfa(asset.address)
}
```

### **Preserved Fields**
- ✅ **All existing asset data**: IDs, names, descriptions, metadata
- ✅ **Layer information**: G, L, S, W, M, C layers preserved
- ✅ **File references**: All uploaded files maintained
- ✅ **Timestamps**: Creation and update times preserved

---

## 🔄 **Rollback Plan**

### **If Issues Arise**
```bash
# 1. Revert deployment
gcloud run deploy nna-registry-service-staging \
  --image gcr.io/project-id/nna-registry-service-staging:previous-version

# 2. Restore database
mongorestore --uri="mongodb+srv://staging-connection-string" \
  --gzip ./backups/staging-20250723-143000/

# 3. Verify restoration
mongo --uri="mongodb+srv://staging-connection-string" \
  --eval="db.assets.countDocuments()"
```

### **Rollback Triggers**
- **Data Loss**: Any assets missing after migration
- **Performance Issues**: Response times > 500ms
- **Functionality Issues**: Core features not working
- **User Complaints**: Multiple stakeholder issues

---

## 📋 **Post-Deployment Tasks**

### **Immediate (Day 1)**
- [ ] **ReViz Team Notification**: Inform team of new staging environment
- [ ] **Documentation Update**: Update staging URLs and credentials
- [ ] **Monitoring Setup**: Ensure Sentry and logging are active
- [ ] **Performance Monitoring**: Track response times and errors

### **Short-term (Week 1)**
- [ ] **User Testing**: ReViz team validates functionality
- [ ] **Performance Optimization**: Monitor and optimize as needed
- [ ] **Issue Resolution**: Address any migration-related issues
- [ ] **Documentation**: Update guides with staging information

### **Long-term (Month 1)**
- [ ] **Frontend Integration**: Complete Composite asset enhancements
- [ ] **Full Feature Testing**: Test all Phase 2C features
- [ ] **Production Preparation**: Plan production deployment
- [ ] **Archive Backups**: Move old backups to long-term storage

---

## 🎯 **Success Criteria**

### **✅ Deployment Success**
- [ ] All 1,781 assets migrated successfully
- [ ] New Phase 2C features working (dual addressing, songMetadata)
- [ ] Performance acceptable (< 500ms response times)
- [ ] No data loss or corruption

### **✅ ReViz Team Unblocked**
- [ ] Can access staging environment
- [ ] Can test new features
- [ ] Can create and manage assets
- [ ] Can use dual addressing system

### **✅ System Stability**
- [ ] No errors in Sentry
- [ ] All endpoints responding correctly
- [ ] Database queries performing well
- [ ] Monitoring and alerting active

---

## 📞 **Team Coordination**

### **DevOps Team**
- **Primary**: Execute deployment and migration
- **Secondary**: Monitor system performance
- **Tertiary**: Handle rollback if needed

### **Backend Team**
- **Primary**: Validate API functionality
- **Secondary**: Monitor Sentry for errors
- **Tertiary**: Support ReViz team integration

### **ReViz Team**
- **Primary**: Test new features and functionality
- **Secondary**: Provide feedback on performance
- **Tertiary**: Report any issues or bugs

---

**Status**: 🚀 **READY FOR EXECUTION**  
**Timeline**: 2-3 hours  
**Risk Level**: Low (with proper backup and rollback plan) 