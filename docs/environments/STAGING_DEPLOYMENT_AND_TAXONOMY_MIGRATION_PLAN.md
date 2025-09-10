# Staging Deployment and Taxonomy Service Migration Plan

## Overview

This document outlines the comprehensive plan for deploying the Phase 2C implementation to staging and migrating to the asynchronous taxonomy service as the single source of truth.

**Status**: 📋 **PLANNING**  
**Version**: 2.1  
**Last Updated**: July 23, 2025  
**Timeline**: 2-3 weeks

---

## 🎯 **Three Key Objectives**

### **1. Document Cleanup and Reorganization** ✅
- Update all documentation for Phase 2C completion
- Clean up and reorganize workspace structure
- Archive outdated documents and consolidate information

### **2. Asynchronous Taxonomy Service Migration** 🔄
- Migrate both frontend and backend to use taxonomy service
- Implement as single source of truth microservice
- Enhance and extend taxonomy service capabilities

### **3. Staging Environment Deployment** 📋
- Deploy unified codebase to staging environment
- Initialize staging database with 1,781 assets
- Prepare for production promotion

---

## 📚 **1. Document Cleanup and Reorganization**

### **Current Documentation Status**
```
docs/
├── ✅ Updated (Phase 2C)
│   ├── PHASE_2C_IMPLEMENTATION_COMPLETE.md
│   ├── PAGINATION_SOLUTION_GUIDE.md
│   ├── SENTRY_MONITORING_GUIDE.md
│   └── [API guides updated to v2.1]
├── 🔄 Needs Review
│   ├── [Taxonomy service documents]
│   ├── [Staging migration documents]
│   └── [Legacy implementation guides]
└── 🗂️ Archive Candidates
    ├── [Old Slab documents]
    ├── [Outdated implementation guides]
    └── [Superseded specifications]
```

### **Documentation Cleanup Tasks**

#### **Immediate (This Week)**
- [ ] **Archive Outdated Documents**: Move old Slab documents to archive
- [ ] **Consolidate Implementation Guides**: Merge similar documents
- [ ] **Update Taxonomy Documents**: Reflect current taxonomy service state
- [ ] **Create Master Index**: Single source of truth for all documentation

#### **Short-term (Next Week)**
- [ ] **Reorganize Structure**: Logical grouping by functionality
- [ ] **Update Cross-references**: Fix broken links and references
- [ ] **Create Quick Start Guide**: Simplified onboarding for new team members
- [ ] **Archive Legacy Code**: Remove outdated implementation examples

### **Proposed Documentation Structure**
```
docs/
├── 📋 Getting Started/
│   ├── QUICK_START_GUIDE.md
│   ├── ENVIRONMENT_SETUP.md
│   └── API_OVERVIEW.md
├── 🏗️ Architecture/
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API_SPECIFICATIONS.md
│   └── DEPLOYMENT_ARCHITECTURE.md
├── 🎵 Features/
│   ├── DUAL_ADDRESSING_GUIDE.md
│   ├── SONG_METADATA_GUIDE.md
│   └── PAGINATION_GUIDE.md
├── 🔧 Development/
│   ├── FRONTEND_INTEGRATION.md
│   ├── BACKEND_DEVELOPMENT.md
│   └── TESTING_GUIDE.md
├── 🚀 Deployment/
│   ├── STAGING_DEPLOYMENT.md
│   ├── PRODUCTION_PROMOTION.md
│   └── MONITORING_GUIDE.md
└── 📚 Reference/
    ├── API_REFERENCE.md
    ├── TROUBLESHOOTING.md
    └── GLOSSARY.md
```

---

## 🔄 **2. Asynchronous Taxonomy Service Migration**

### **Current Taxonomy Service Status**
- ✅ **Backend Implementation**: Complete with all endpoints
- ✅ **API-First Architecture**: Fully functional
- ✅ **Environment Support**: Dev, staging, production ready
- 🔄 **Frontend Integration**: Needs implementation of async sync protocol

### **Taxonomy Service Migration Plan**

#### **Phase 1: Frontend Async Sync Implementation (Week 1)**
```typescript
// 1. Create TaxonomySyncService
class TaxonomySyncService {
  private cache = new Map();
  private version: string | null = null;
  private pollInterval: number = 300000; // 5 minutes
  
  async startSync(): Promise<void> {
    // Background polling for version changes
    // Health monitoring
    // Intelligent caching with version-based invalidation
  }
  
  async getTaxonomyData(): Promise<TaxonomyData> {
    // Return cached data or fetch from API
  }
}

// 2. Implement useTaxonomySync hook
const useTaxonomySync = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [taxonomyData, setTaxonomyData] = useState(null);
  const [error, setError] = useState(null);
  
  // State management for sync status
  // Error handling and recovery
  // Loading states
};

// 3. Create TaxonomyProvider component
const TaxonomyProvider = ({ children }) => {
  // Context provider for taxonomy data
  // Utility functions for counts and lookups
  // Real-time updates
};
```

#### **Phase 2: Backend Integration Enhancement (Week 2)**
- [ ] **Remove JSON File Dependencies**: Eliminate `.json` file usage
- [ ] **Enhance Taxonomy Service**: Add advanced features
- [ ] **Implement Caching**: Redis-based caching for performance
- [ ] **Add Monitoring**: Comprehensive health monitoring

#### **Phase 3: Unified Integration (Week 3)**
- [ ] **Frontend Migration**: Complete async sync implementation
- [ ] **Backend Migration**: Remove all JSON file dependencies
- [ ] **Testing**: Comprehensive integration testing
- [ ] **Documentation**: Update all taxonomy-related documentation

### **Taxonomy Service Enhancement Features**

#### **Advanced Features to Implement**
```typescript
// 1. Real-time Version Tracking
interface TaxonomyVersion {
  version: string;
  timestamp: Date;
  changes: TaxonomyChange[];
  compatibility: VersionCompatibility;
}

// 2. Advanced Caching
interface TaxonomyCache {
  data: TaxonomyData;
  version: string;
  timestamp: Date;
  ttl: number;
  invalidationStrategy: 'version' | 'time' | 'manual';
}

// 3. Health Monitoring
interface TaxonomyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastSync: Date;
  version: string;
}
```

---

## 🚀 **3. Staging Environment Deployment**

### **Current Staging Status**
- **Environment**: Staging environment ready
- **Assets**: 1,781 assets in MongoDB
- **Database**: Ready for initialization
- **Infrastructure**: Cloud Run deployment configured

### **Staging Deployment Plan**

#### **Phase 1: Pre-Deployment Preparation (Week 1)**
```bash
# 1. Database Backup
mongodump --uri="staging-mongodb-uri" --out=./backups/staging-$(date +%Y%m%d)

# 2. Environment Configuration
# Update staging environment variables
# Configure staging-specific settings
# Set up monitoring and alerting

# 3. Asset Analysis
# Analyze current 1,781 assets
# Identify migration requirements
# Plan data transformation if needed
```

#### **Phase 2: Staging Deployment (Week 2)**
```bash
# 1. Deploy Backend
git checkout staging
git merge dev
npm run build
docker build -t staging-image .
gcloud run deploy nna-registry-service-staging

# 2. Initialize Database
# Run database initialization scripts
# Migrate existing assets if needed
# Verify data integrity

# 3. Frontend Integration
# Deploy frontend with staging API
# Test all functionality
# Validate performance
```

#### **Phase 3: Testing and Validation (Week 3)**
- [ ] **End-to-End Testing**: Comprehensive testing of all features
- [ ] **Performance Testing**: Load testing and performance validation
- [ ] **Data Validation**: Verify all 1,781 assets migrated correctly
- [ ] **User Acceptance Testing**: Stakeholder validation

### **Staging Database Migration Strategy**

#### **Asset Migration Approach**
```typescript
// 1. Asset Analysis
interface AssetAnalysis {
  totalAssets: number;        // 1,781
  layerDistribution: {
    C: number;               // Composite assets
    G: number;               // Songs
    L: number;               // Looks
    S: number;               // Stars
    W: number;               // Worlds
    M: number;               // Moves
  };
  migrationRequirements: {
    songMetadata: boolean;
    dualAddressing: boolean;
    taxonomyUpdates: boolean;
  };
}

// 2. Migration Script
async function migrateStagingAssets() {
  // Backup existing data
  // Transform assets to new schema
  // Validate data integrity
  // Update references and relationships
  // Verify migration success
}
```

---

## 📊 **Implementation Timeline**

### **Week 1: Foundation**
- [ ] **Documentation Cleanup**: Archive outdated documents, consolidate guides
- [ ] **Taxonomy Service**: Begin frontend async sync implementation
- [ ] **Staging Prep**: Environment configuration and asset analysis

### **Week 2: Core Implementation**
- [ ] **Taxonomy Migration**: Complete frontend integration, enhance backend
- [ ] **Staging Deployment**: Deploy backend, initialize database
- [ ] **Testing**: Begin comprehensive testing and validation

### **Week 3: Validation and Launch**
- [ ] **Final Testing**: End-to-end testing, performance validation
- [ ] **Documentation**: Complete documentation updates
- [ ] **Staging Launch**: Full staging environment launch
- [ ] **Production Prep**: Prepare for production promotion

---

## 🎯 **Success Criteria**

### **Documentation Cleanup**
- [ ] All outdated documents archived
- [ ] Documentation structure reorganized
- [ ] Cross-references updated and working
- [ ] Quick start guide created

### **Taxonomy Service Migration**
- [ ] Frontend async sync protocol implemented
- [ ] Backend JSON file dependencies removed
- [ ] All taxonomy data served via API
- [ ] Performance optimized with caching

### **Staging Deployment**
- [ ] Backend deployed and stable
- [ ] All 1,781 assets migrated successfully
- [ ] Frontend integration complete
- [ ] Comprehensive testing passed

---

## 📞 **Resources and Support**

### **Key Documents**
- [Taxonomy Service Frontend Checklist](./for-frontend/TAXONOMY_SERVICE_FRONTEND_CHECKLIST.md)
- [Asynchronous Taxonomy Sync Spec](./for-frontend/ASYNCHRONOUS_TAXONOMY_SYNC_IMPLEMENTATION_SPEC.md)
- [Staging Migration Plan](./STAGING_TO_DEVELOPMENT_MIGRATION_PLAN.md)

### **Team Coordination**
- **Frontend Team**: Taxonomy service integration
- **Backend Team**: Service enhancement and deployment
- **DevOps Team**: Staging environment setup
- **QA Team**: Testing and validation

---

**Status**: 📋 **PLANNING IN PROGRESS**  
**Next Milestone**: Document cleanup completion and taxonomy service implementation start 