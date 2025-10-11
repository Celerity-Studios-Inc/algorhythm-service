# 🏗️ Backend Architecture Comprehensive Reference

**Date**: October 11, 2025  
**Version**: 4.0 - Webhook Integration Architecture  
**Status**: 🚀 **WEBHOOK INFRASTRUCTURE COMPLETE** - Event-driven architecture implemented  
**Context**: Comprehensive architecture with webhook integration and event-driven design

---

## 🚀 **WEBHOOK INTEGRATION STATUS**

### **Current Implementation Progress**
After comprehensive webhook infrastructure development, we've successfully implemented **event-driven architecture**:

| Component | Status | Impact |
|-----------|--------|--------|
| **Webhook Infrastructure** | ✅ **COMPLETE** | Real-time event processing |
| **Security Implementation** | ✅ **COMPLETE** | HMAC signature validation |
| **Event Processing** | ✅ **COMPLETE** | Internal event handling |
| **Integration Testing** | 🔄 **IN PROGRESS** | End-to-end validation |

### **Webhook Architecture Overview**
```
Event-Driven Architecture: 100% Complete
- Algorhythm Service: ✅ Webhook endpoints ready
- NNA Registry Service: ✅ Event publishing ready
- Security: ✅ HMAC validation implemented
- Integration: 🔄 Testing in progress
```

---

## 🎯 **EXECUTIVE SUMMARY**

This document provides the definitive backend architecture reference with **webhook integration and event-driven design** for the Algorhythm Service. The backend implements a sophisticated multi-layer architecture with real-time webhook integration, providing autonomous operation and improved performance.

### **Architecture Priorities**
1. **Immediate**: Webhook infrastructure implementation complete
2. **Short-term**: Real-time index updates and local data storage
3. **Long-term**: Performance optimization and monitoring

---

## 🏛️ **CORE BACKEND ARCHITECTURE**

### **Technology Stack**
```typescript
Framework: NestJS with TypeScript
Database: MongoDB with Mongoose ODM
Storage: Google Cloud Storage (GCS)
Deployment: Google Cloud Run (3-tier)
Authentication: JWT with role-based access
AI Integration: OpenAI GPT-4o with structured outputs
Monitoring: Sentry + structured logging
Documentation: Swagger/OpenAPI
Validation: class-validator + class-transformer
Architecture: Modular + Strategy Pattern
```

### **Service Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│                  (Express + NestJS)                      │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┬──────────────┬─────────────┐
     ▼                       ▼              ▼             ▼
┌────────────┐  ┌────────────────┐  ┌──────────┐  ┌──────────────┐
│   Auth     │  │     Assets      │  │    AI    │  │   Storage    │
│  Module    │  │     Module      │  │  Module  │  │    Module    │
└────────────┘  └────────────────┘  └──────────┘  └──────────────┘
     │                  │                  │              │
     ▼                  ▼                  ▼              ▼
┌────────────┐  ┌────────────────┐  ┌──────────┐  ┌──────────────┐
│   Users    │  │     Asset       │  │ OpenAI   │  │     GCS      │
│ Collection │  │   Collection    │  │   API    │  │   Storage    │
└────────────┘  └────────────────┘  └──────────┘  └──────────────┘
```

### **Module Structure**
```typescript
src/
├── modules/
│   ├── auth/                 # Authentication & authorization
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── assets/               # Asset management
│   │   ├── assets.controller.ts
│   │   ├── assets.service.ts
│   │   ├── assets.module.ts
│   │   └── dto/
│   │       ├── create-asset.dto.ts    # ✅ ALIGNED
│   │       └── update-asset.dto.ts    # ✅ ALIGNED
│   │
│   ├── ai/                   # AI processing
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts           # ❌ NEEDS FIXES
│   │   ├── ai.module.ts
│   │   ├── base/
│   │   │   └── structured-ai-service.base.ts
│   │   └── services/
│   │       ├── hybrid-extraction.service.ts  # ❌ NEEDS FIXES
│   │       ├── songs-ai.service.ts
│   │       ├── stars-ai.service.ts
│   │       └── validation.service.ts
│   │
│   └── taxonomy/             # NNA taxonomy validation
│       ├── taxonomy.controller.ts
│       ├── taxonomy.service.ts
│       └── taxonomy.module.ts
│
├── models/                   # Database schemas
│   ├── asset.schema.ts      # ❌ NEEDS FIXES
│   └── user.schema.ts
│
└── common/                   # Shared utilities
    ├── filters/
    ├── guards/
    └── interceptors/
```

---

## 🔗 **WEBHOOK INTEGRATION ARCHITECTURE**

### **Event-Driven Design**
The Algorhythm service implements a sophisticated webhook infrastructure for real-time integration with the NNA Registry service:

```
┌─────────────────────────────────────────────────────────────┐
│                    Algorhythm Service                      │
├─────────────────────────────────────────────────────────────┤
│  Webhook Infrastructure                                   │
│  ├── Webhook Controller                                   │
│  │   ├── POST /webhooks/assets/created                    │
│  │   ├── POST /webhooks/composites/created                │
│  │   └── POST /webhooks/assets/updated                    │
│  ├── Webhook Service                                       │
│  │   ├── HMAC Signature Validation                        │
│  │   ├── Timestamp Validation                            │
│  │   └── Payload Validation                              │
│  └── Event Processor Service                              │
│      ├── Asset Event Processing                          │
│      ├── Composite Event Processing                      │
│      └── Internal Event Emission                        │
└─────────────────────────────────────────────────────────────┘
```

### **Security Implementation**
```typescript
// HMAC Signature Validation
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');

// Timestamp Validation (5-minute tolerance)
const currentTime = Math.floor(Date.now() / 1000);
const eventTime = Math.floor(new Date(timestamp).getTime() / 1000);
const timeDiff = Math.abs(currentTime - eventTime);
```

### **Event Processing Pipeline**
```
NNA Registry → Webhook → Validation → Processing → Index Update → ReViz
     ↓            ↓         ↓           ↓            ↓          ↓
Asset Event  Security   Event      Real-time    Local      Fast
Creation     Check      Processing  Indexing    Storage    Queries
```

---

## 📊 **COMPLETE SCHEMA ALIGNMENT SPECIFICATION**

### **SongMetadata DTO (ALIGNED) ✅**
```typescript
// src/modules/assets/dto/create-asset.dto.ts
export class SongMetadataDto {
  // Core Identification
  songName?: string;
  artistName?: string;
  albumName?: string;
  albumArt?: string;              // ✅ Consistent naming
  
  // Musical Characteristics  
  bpm?: number;
  genre?: string[];               // ✅ Array type
  mood?: string[];                // ✅ Array type
  key?: string;
  timeSignature?: string;
  tempo?: string;
  duration?: number;
  energy?: string;
  danceability?: string;
  
  // Cultural & Context
  releaseYear?: number;
  originalArtistGender?: string;
  genderSuitability?: string;
  vocalType?: string;
  ageAppropriateness?: string[]; // ✅ Array type
  popularity?: string;
  language?: string[];            // ✅ Array type
  songCulturalOrigin?: string[]; // ✅ Array type
  
  // Production
  remixedBy?: string;
  originalSongId?: string;
  
  // NEW FIELDS (Schema Alignment)
  instrumentalType?: string;      // ✅ ADDED
  richDescription?: string;       // ✅ ADDED
  comprehensiveTags?: string[];   // ✅ ADDED
}
```

### **Database Schema (NEEDS FIXES) ❌**
```typescript
// src/models/asset.schema.ts
@Prop({ type: Object })
songMetadata?: {
  // ... other fields ...
  genre?: string;  // ❌ WRONG: Should be string[]
  // Missing: Proper array type definition
};

// REQUIRED FIX:
@Prop({ type: Object })
songMetadata?: {
  // ... other fields ...
  genre?: string[];  // ✅ FIXED: Array type
  mood?: string[];   // ✅ Already correct
  language?: string[]; // ✅ Already correct
  // All new fields already added
};
```

### **AI Service Interface (NEEDS FIXES) ❌**
```typescript
// src/modules/ai/ai.service.ts
interface SongsMetadata {
  // ... existing fields ...
  albumArtUrl?: string;  // ❌ WRONG: Should be albumArt
  // ❌ MISSING: instrumentalType, richDescription, comprehensiveTags
}

// REQUIRED FIX:
interface SongsMetadata {
  // ... existing fields ...
  albumArt?: string;              // ✅ FIXED: Consistent naming
  instrumentalType?: string;      // ✅ ADDED
  richDescription?: string;       // ✅ ADDED  
  comprehensiveTags?: string[];   // ✅ ADDED
}
```

### **Hybrid Extraction Service (NEEDS FIXES) ❌**
```typescript
// src/modules/ai/services/hybrid-extraction.service.ts
interface SongMetadata {
  // ... existing fields ...
  // ❌ MISSING: instrumentalType, richDescription, comprehensiveTags
}

// REQUIRED FIX:
interface SongMetadata {
  // ... existing fields ...
  instrumentalType?: string;      // ✅ ADDED
  richDescription?: string;       // ✅ ADDED
  comprehensiveTags?: string[];   // ✅ ADDED
}
```

---

## 🔄 **API CONTRACTS & ENDPOINTS**

### **Asset Creation Endpoint**
```typescript
POST /api/assets
Content-Type: multipart/form-data

// Request (FormData)
{
  layer: string;           // Required: G, S, L, M, W, C
  category: string;        // Required: POP, ROCK, etc.
  subcategory: string;     // Required: TSW, BAS, etc.
  source: string;          // Required: source identifier
  description: string;     // Required: asset description
  tags?: string;           // Optional: comma-separated
  file?: File;            // Optional: asset file
  songMetadata?: string;  // JSON stringified SongMetadataDto
  aiMetadata?: string;    // JSON stringified AI metadata
}

// Response
{
  success: boolean;
  data: {
    id: string;           // MongoDB ObjectId
    name: string;         // HFN (e.g., "G.POP.TSW.001")
    nna_address: string;  // NNA address
    gcpStorageUrl: string;
    songMetadata: SongMetadataDto;  // Populated metadata
    // ... other fields
  };
  message?: string;
}
```

### **Asset Update Endpoint**
```typescript
PUT /api/assets/:id
Content-Type: application/json

// Request
{
  description?: string;
  tags?: string[];
  songMetadata?: SongMetadataDto;  // All fields optional
  // ... other updatable fields
}

// Response (same as creation)
```

### **AI Metadata Extraction Endpoint**
```typescript
POST /api/ai/extract-metadata  // V2.0 endpoint
Content-Type: application/json

// Request
{
  layer: string;
  fileUrl: string;
  fileContent?: string;
  creatorDescription?: string;
}

// Response (AI Response Contract)
{
  success: boolean;
  data: {
    layerType: string;
    layerMetadata: {
      // Layer-specific metadata
      // For songs layer: includes all SongMetadataDto fields
    };
    confidence: number;
    processingTime: number;
  };
}
```

---

## 🏭 **SHARED SCHEMA ARCHITECTURE (FUTURE)**

### **OpenAPI-First Implementation Plan**
```yaml
# /shared-schemas/openapi.yaml
openapi: 3.0.0
info:
  title: NNA Registry API
  version: 1.0.0

components:
  schemas:
    SongMetadata:
      type: object
      properties:
        songName:
          type: string
        genre:
          type: array
          items:
            type: string
        # ... complete field definitions
```

### **Code Generation Pipeline**
```typescript
// Generate frontend types
npm run generate:frontend  // → src/generated/types.ts

// Generate backend DTOs
npm run generate:backend   // → src/generated/dtos.ts

// Generate database schemas
npm run generate:database  // → src/generated/schemas.ts

// Validate alignment
npm run validate:schemas   // → Run alignment tests
```

### **3-Week Implementation Timeline**
- **Week 1**: Fix current schema issues + create OpenAPI spec
- **Week 2**: Implement code generation pipeline
- **Week 3**: Migrate to generated schemas + validation
- **Result**: Schema drift becomes architecturally impossible

---

## 🧪 **VALIDATION & TESTING**

### **Current Validation Chain**
```typescript
Request → DTO Validation → Business Logic → Database Validation → Response
   ↓           ↓                ↓                ↓                   ↓
FormData → class-validator → Service Layer → Mongoose Schema → Serialization
```

### **Schema Alignment Testing**
```typescript
// Test all components have same field definitions
describe('Schema Alignment', () => {
  test('DTO matches Database Schema', () => {
    expect(SongMetadataDto.fields).toEqual(AssetSchema.songMetadata.fields);
  });
  
  test('AI Service matches DTO', () => {
    expect(SongsMetadata.fields).toEqual(SongMetadataDto.fields);
  });
  
  test('Array fields consistently arrays', () => {
    ['genre', 'mood', 'language'].forEach(field => {
      expect(getFieldType(field, 'dto')).toBe('array');
      expect(getFieldType(field, 'database')).toBe('array');
      expect(getFieldType(field, 'ai-service')).toBe('array');
    });
  });
});
```

---

## 🚀 **DEPLOYMENT & ENVIRONMENTS**

### **Environment Configuration**
```typescript
// Development
URL: https://registry.dev.reviz.dev/api
Database: mongodb://localhost:27017/nna-registry-dev
GCS Bucket: nna-registry-dev-assets

// Staging  
URL: https://registry.stg.reviz.dev/api
Database: MongoDB Atlas (staging cluster)
GCS Bucket: nna-registry-staging-assets

// Production
URL: https://registry.reviz.dev/api
Database: MongoDB Atlas (production cluster)
GCS Bucket: nna-registry-prod-assets
```

### **CI/CD Pipeline**
```yaml
# GitHub Actions workflow
on:
  push:
    branches: [dev, staging, main]

jobs:
  test:
    - npm run test
    - npm run test:e2e
  
  validate-schemas:
    - npm run validate:schemas
    - npm run test:alignment
  
  deploy:
    - gcloud run deploy
```

---

## 📈 **SUCCESS METRICS**

### **Schema Alignment Goals**
- **Immediate**: Fix 4 critical backend issues → 100% alignment
- **Short-term**: Zero schema-related 500 errors
- **Long-term**: Automated schema validation preventing drift

### **Performance Targets**
- API Response Time: < 200ms (p95)
- AI Processing: < 3s for metadata extraction
- Database Queries: < 50ms average
- Error Rate: < 0.1%

---

## 🔧 **CURRENT ACTION ITEMS**

### **Backend Team Tasks (IN PROGRESS)**
1. ✅ Fix database schema `genre` type (string → string[])
2. ✅ Add missing fields to AI service interface
3. ✅ Fix field naming consistency (albumArtUrl → albumArt)
4. ✅ Add missing fields to hybrid extraction service
5. 🔄 Deploy fixes to development environment
6. 🔄 Run schema alignment validation tests

### **Next Phase**
1. Implement OpenAPI-first shared schema architecture
2. Set up automated code generation pipeline
3. Add CI/CD schema validation checks
4. Document new developer workflow

---

## 📚 **REFERENCES**

### **Key Documents**
- `/docs/backend/BACKEND_SCHEMA_ANALYSIS.md` - Detailed schema analysis
- `/docs/backend/SHARED_SCHEMA_ARCHITECTURE.md` - Architecture solution
- `/docs/backend/IMPLEMENTATION_PLAN.md` - 3-week rollout plan
- `/docs/backend/openapi.yaml` - Complete OpenAPI specification

### **Related Systems**
- Frontend Architecture: `FRONTEND_ARCHITECTURE_COMPREHENSIVE_REFERENCE.md`
- Schema Testing Plan: `SCHEMA_ALIGNMENT_TESTING_PLAN.md`
- V2.0 Integration: `docs/backend/BACKEND_IMPLEMENTATION_V2.md`

---

**This comprehensive backend architecture reference provides the complete picture of current state, required fixes, and future architectural direction for permanent schema alignment.**