# Complete API Contract & Integration Guide

**Version**: 1.0.0  
**Date**: October 21, 2025  
**Purpose**: End-to-end API contracts for ReViz → NNA Registry → Gen-AI Pipeline

---

## 🎯 System Overview

```
┌──────────────┐
│  ReViz App   │  User selects components or uploads personalize assets
└───────┬──────┘
        │
        │ 1. Register Personalize Asset (if needed)
        │    POST /api/v1/assets
        │    Response: P.FAC.SWP.007
        │
        │ 2. Request Composite Resolution
        ▼
┌─────────────────────────────────────────────────┐
│           NNA Registry Service                  │
│  POST /api/v1/composites/resolve-or-generate    │
│  • Search for existing composite                │
│  • If found → Return immediately (CUSTOMIZE)    │
│  • If not found → Trigger Gen-AI (PERSONALIZE)  │
└───────┬─────────────────────────────────────────┘
        │
        │ (If composite doesn't exist)
        │ POST /api/v1/generate/composite
        ▼
┌─────────────────────────────────────────────────┐
│         Gen-AI Pipeline Service                 │
│  • Queue generation job                         │
│  • Submit to RunPod GPU                         │
│  • Monitor progress                             │
│  • Upload to GCS                                │
│  • Webhook callback to NNA Registry             │
└───────┬─────────────────────────────────────────┘
        │
        │ Webhook: POST /api/v1/webhooks/generation-complete
        ▼
┌─────────────────────────────────────────────────┐
│           NNA Registry Service                  │
│  • Save composite to MongoDB                    │
│  • Generate Base HFN (C.USR.RMX.007)           │
│  • Notify ReViz App (WebSocket/Push/Polling)    │
└───────┬─────────────────────────────────────────┘
        │
        │ Notification: composite_ready
        ▼
┌──────────────┐
│  ReViz App   │  Display personalized composite video
└──────────────┘
```

---

## 📋 Use Case Flows

### **Use Case A: CUSTOMIZE (Existing Composite)**

**Scenario**: User selects "Pretty Little Baby" song, then swaps the look from "Mauve One Shoulder" to "Peach Shirt"

```
User Action: Tap on "Peach Shirt" look variant

┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ Current composite components:                   │
│ • song: G.POP.VIN.001                          │
│ • star: S.POP.IDF.002                          │
│ • look: L.MOD.MSH.001 ← User had this         │
│ • moves: M.POP.CON.001                         │
│ • world: W.REL.CEN.001                         │
│                                                 │
│ User selects new look: L.MOD.PSH.003           │
└───────┬─────────────────────────────────────────┘
        │
        │ POST /api/v1/composites/resolve-or-generate
        │ {
        │   "components": {
        │     "song": "G.POP.VIN.001",
        │     "star": "S.POP.IDF.002",
        │     "look": "L.MOD.PSH.003",  ← NEW
        │     "moves": "M.POP.CON.001",
        │     "world": "W.REL.CEN.001"
        │   },
        │   "user_context": {
        │     "user_id": "user_12345",
        │     "email": "user@example.com"
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ NNA Registry Service                            │
│ 1. Validate all 5 components exist ✅           │
│ 2. Search MongoDB for composite with these     │
│    exact components                             │
│ 3. FOUND! Composite C.FUL.ALL.142 matches      │
│    all 5 components ✅                          │
│ 4. Return immediately (18ms)                    │
└───────┬─────────────────────────────────────────┘
        │
        │ Response (18ms):
        │ {
        │   "success": true,
        │   "status": "found",
        │   "data": {
        │     "composite_id": "C.FUL.ALL.142",
        │     "preview_url": "https://storage.googleapis.com/...",
        │     "thumbnail_url": "https://storage.googleapis.com/...",
        │     "components": { ... },
        │     "response_time_ms": 18
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ • Receives composite instantly                  │
│ • Loads preview video                           │
│ • Video plays immediately                       │
│ • Total time: < 500ms (network + video load)    │
└─────────────────────────────────────────────────┘

✅ RESULT: Instant customization, no waiting
```

---

### **Use Case B: PERSONALIZE (New Composite)**

**Scenario**: User uploads their selfie to become the star in "Pretty Little Baby"

```
User Action: Upload headshot, select "Be the Star"

┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ 1. User uploads selfie.jpg                      │
│ 2. App shows upload progress                    │
└───────┬─────────────────────────────────────────┘
        │
        │ POST /api/v1/assets (Register Personalize Asset)
        │ Content-Type: multipart/form-data
        │ {
        │   "layer": "P",
        │   "category": "FAC",
        │   "subcategory": "SWP",
        │   "file": <selfie.jpg>,
        │   "metadata": {
        │     "name": "User's Face",
        │     "description": "Face swap asset"
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ NNA Registry Service                            │
│ 1. Upload selfie to GCS                         │
│ 2. Generate thumbnail                           │
│ 3. Save asset to MongoDB                        │
│ 4. Assign HFN: P.FAC.SWP.007                   │
└───────┬─────────────────────────────────────────┘
        │
        │ Response (2.3s):
        │ {
        │   "success": true,
        │   "data": {
        │     "asset_id": "P.FAC.SWP.007",
        │     "nna_address": "P.003.001.007",
        │     "fileUrl": "https://storage.googleapis.com/...",
        │     "thumbnailUrl": "https://storage.googleapis.com/..."
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ Now request composite with personalized star    │
└───────┬─────────────────────────────────────────┘
        │
        │ POST /api/v1/composites/resolve-or-generate
        │ {
        │   "components": {
        │     "song": "G.POP.VIN.001",
        │     "star": "P.FAC.SWP.007",  ← PERSONALIZE
        │     "look": "L.MOD.PSH.003",
        │     "moves": "M.POP.CON.001",
        │     "world": "W.REL.CEN.001"
        │   },
        │   "user_context": {
        │     "user_id": "user_12345",
        │     "email": "user@example.com"
        │   },
        │   "generation_options": {
        │     "priority": "express",
        │     "quality": "hd"
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ NNA Registry Service                            │
│ 1. Validate all 5 components exist ✅           │
│ 2. Search MongoDB for composite                 │
│ 3. NOT FOUND (contains P.FAC.SWP.007)          │
│ 4. Detect personalize asset                     │
│ 5. Trigger Gen-AI Pipeline                      │
└───────┬─────────────────────────────────────────┘
        │
        │ Response (143ms):
        │ {
        │   "success": true,
        │   "status": "generating",
        │   "data": {
        │     "generation_id": "gen_abc123",
        │     "estimated_completion_time": "2025-10-21T12:35:00Z",
        │     "status_url": "/api/v1/composites/generation-status/gen_abc123",
        │     "components": { ... }
        │   },
        │   "message": "Composite generation initiated..."
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ • Show "Generating your remix..." animation     │
│ • Display progress bar                          │
│ • Estimated time: 2-3 minutes                   │
│ • Option to browse while waiting                │
└─────────────────────────────────────────────────┘

        ... 2-3 minutes later ...

┌─────────────────────────────────────────────────┐
│ Gen-AI Pipeline Service                         │
│ • Face swap complete (45s)                      │
│ • Composite rendering complete (87s)            │
│ • Upload to GCS complete (8s)                   │
│ • Total: 142 seconds                            │
│ • Send webhook to NNA Registry                  │
└───────┬─────────────────────────────────────────┘
        │
        │ POST /api/v1/webhooks/generation-complete
        │ {
        │   "generation_id": "gen_abc123",
        │   "status": "success",
        │   "composite_data": {
        │     "preview_url": "https://storage.googleapis.com/...",
        │     "thumbnail_url": "https://storage.googleapis.com/...",
        │     ...
        │   }
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ NNA Registry Service                            │
│ 1. Verify webhook signature ✅                  │
│ 2. Save composite to MongoDB                    │
│ 3. Assign Base HFN: C.USR.RMX.007              │
│ 4. Send notification to user                    │
└───────┬─────────────────────────────────────────┘
        │
        │ WebSocket/Push Notification:
        │ {
        │   "type": "composite_ready",
        │   "composite_id": "C.USR.RMX.007",
        │   "preview_url": "https://storage.googleapis.com/...",
        │   "message": "Your personalized remix is ready!"
        │ }
        ▼
┌─────────────────────────────────────────────────┐
│ ReViz App                                       │
│ • Notification: "🎉 Your remix is ready!"       │
│ • Auto-navigate to preview screen               │
│ • Load and play personalized video              │
│ • User sees themselves as the star! 🌟         │
└─────────────────────────────────────────────────┘

✅ RESULT: User's personalized remix ready in 2-3 minutes
```

---

## 📡 Complete API Reference

### **API 1: Register Personalize Asset**

**Endpoint**: `POST /api/v1/assets`  
**Service**: NNA Registry  
**Purpose**: Upload and register user's personalize asset (face, outfit, etc.)

**Request**:
```http
POST /api/v1/assets
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

{
  "layer": "P",
  "category": "FAC",
  "subcategory": "SWP",
  "file": <binary_file_data>,
  "metadata": {
    "name": "User's Face",
    "description": "Face swap asset for personalization"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "asset_id": "P.FAC.SWP.007",
    "nna_address": "P.003.001.007",
    "name": "P.FAC.SWP.007",
    "layer": "P",
    "category": "FAC",
    "subcategory": "SWP",
    "fileUrl": "https://storage.googleapis.com/reviz-personalize/P.FAC.SWP.007/asset.jpg",
    "thumbnailUrl": "https://storage.googleapis.com/reviz-personalize/P.FAC.SWP.007/thumb.jpg",
    "createdAt": "2025-10-21T12:30:00Z"
  }
}
```

**Status Codes**:
- `201`: Asset created successfully
- `400`: Invalid file format or missing required fields
- `401`: Unauthorized (invalid JWT)
- `413`: File too large (> 50MB)
- `500`: Server error

---

### **API 2: Resolve or Generate Composite**

**Endpoint**: `POST /api/v1/composites/resolve-or-generate`  
**Service**: NNA Registry  
**Purpose**: Find existing composite or trigger generation

**Request**:
```json
{
  "components": {
    "song": "G.POP.VIN.001",
    "star": "S.POP.IDF.002" or "P.FAC.SWP.007",
    "look": "L.MOD.PSH.003" or "P.CLO.OUT.003",
    "moves": "M.POP.CON.001" or "P.MOV.DAN.004",
    "world": "W.REL.CEN.001" or "P.ENV.LOC.005"
  },
  "user_context": {
    "user_id": "user_12345",
    "email": "user@example.com",
    "device_info": {
      "platform": "ios",
      "app_version": "1.2.0"
    }
  },
  "generation_options": {
    "priority": "standard" | "express",
    "quality": "standard" | "hd" | "4k",
    "callback_url": "https://reviz.app/api/webhooks/composite-ready"
  }
}
```

**Response (CUSTOMIZE - Found)**:
```json
{
  "success": true,
  "status": "found",
  "data": {
    "composite_id": "C.FUL.ALL.142",
    "composite_name": "C.FUL.ALL.142:G.POP.VIN.001+S.POP.IDF.002+L.MOD.PSH.003+M.POP.CON.001+W.REL.CEN.001",
    "nna_address": "C.001.001.142",
    "preview_url": "https://storage.googleapis.com/reviz-composites/C.FUL.ALL.142/preview.mp4",
    "thumbnail_url": "https://storage.googleapis.com/reviz-composites/C.FUL.ALL.142/thumb.jpg",
    "components": {
      "song": "G.POP.VIN.001",
      "star": "S.POP.IDF.002",
      "look": "L.MOD.PSH.003",
      "moves": "M.POP.CON.001",
      "world": "W.REL.CEN.001"
    },
    "response_time_ms": 18
  }
}
```

**Response (PERSONALIZE - Generating)**:
```json
{
  "success": true,
  "status": "generating",
  "data": {
    "generation_id": "gen_abc123xyz",
    "composite_id": "C.USR.RMX.000",
    "estimated_completion_time": "2025-10-21T12:35:00Z",
    "status_url": "/api/v1/composites/generation-status/gen_abc123xyz",
    "components": {
      "song": "G.POP.VIN.001",
      "star": "P.FAC.SWP.007",
      "look": "L.MOD.PSH.003",
      "moves": "M.POP.CON.001",
      "world": "W.REL.CEN.001"
    },
    "generation_options": {
      "priority": "express",
      "quality": "hd",
      "queue_position": 3
    }
  },
  "message": "Composite generation initiated. You will receive a notification when ready."
}
```

**Status Codes**:
- `200`: Success (found or generating)
- `400`: Invalid request (missing components, invalid HFNs)
- `401`: Unauthorized
- `404`: Component asset not found
- `503`: Generation service unavailable

---

### **API 3: Check Generation Status**

**Endpoint**: `GET /api/v1/composites/generation-status/:generationId`  
**Service**: NNA Registry  
**Purpose**: Poll for generation progress

**Request**:
```http
GET /api/v1/composites/generation-status/gen_abc123xyz
Authorization: Bearer <JWT_TOKEN>
```

**Response (In Progress)**:
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_abc123xyz",
    "status": "processing",
    "progress": 65,
    "current_stage": "composite_rendering",
    "stages": {
      "face_swap": { "status": "complete", "duration_ms": 45000 },
      "composite_rendering": { "status": "in_progress", "progress": 65 },
      "upload": { "status": "pending" },
      "thumbnail_generation": { "status": "pending" }
    },
    "estimated_completion_time": "2025-10-21T12:33:00Z",
    "started_at": "2025-10-21T12:30:00Z"
  }
}
```

**Response (Complete)**:
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_abc123xyz",
    "status": "complete",
    "progress": 100,
    "composite_id": "C.USR.RMX.007",
    "preview_url": "https://storage.googleapis.com/reviz-composites/C.USR.RMX.007/preview.mp4",
    "thumbnail_url": "https://storage.googleapis.com/reviz-composites/C.USR.RMX.007/thumb.jpg",
    "total_duration_ms": 142000,
    "completed_at": "2025-10-21T12:32:22Z"
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Generation not found

---

### **API 4: Initiate Composite Generation** (Internal)

**Endpoint**: `POST /api/v1/generate/composite`  
**Service**: Gen-AI Pipeline  
**Purpose**: Trigger GPU-accelerated composite generation  
**Access**: Internal only (called by NNA Registry)

**Request**:
```json
{
  "request_id": "req_abc123",
  "generation_id": "gen_abc123xyz",
  "components": {
    "song": "G.POP.VIN.001",
    "star": "P.FAC.SWP.007",
    "look": "L.MOD.PSH.003",
    "moves": "M.POP.CON.001",
    "world": "W.REL.CEN.001"
  },
  "component_urls": {
    "song": "https://storage.googleapis.com/reviz-songs/G.POP.VIN.001/audio.mp3",
    "star": "https://storage.googleapis.com/reviz-personalize/P.FAC.SWP.007/face.jpg",
    "base_composite": "https://storage.googleapis.com/reviz-composites/base/C.FUL.ALL.001/video.mp4"
  },
  "user_context": {
    "user_id": "user_12345",
    "email": "user@example.com"
  },
  "generation_options": {
    "priority": "express",
    "quality": "hd",
    "callback_url": "https://registry.dev.reviz.dev/api/v1/webhooks/generation-complete"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_abc123xyz",
    "status": "queued",
    "queue_position": 3,
    "estimated_completion_time": "2025-10-21T12:35:00Z",
    "runpod_job_id": "runpod_xyz789"
  }
}
```

---

### **API 5: Generation Complete Webhook** (Internal)

**Endpoint**: `POST /api/v1/webhooks/generation-complete`  
**Service**: NNA Registry  
**Purpose**: Receive notification when generation is complete  
**Access**: Internal only (called by Gen-AI Pipeline)

**Request**:
```json
{
  "generation_id": "gen_abc123xyz",
  "status": "success",
  "composite_data": {
    "components": { ... },
    "preview_url": "https://storage.googleapis.com/reviz-composites/temp/gen_abc123xyz/preview.mp4",
    "thumbnail_url": "https://storage.googleapis.com/reviz-composites/temp/gen_abc123xyz/thumb.jpg",
    "metadata": {
      "duration_seconds": 30,
      "resolution": "1920x1080",
      "fps": 30,
      "file_size_mb": 24.5
    }
  },
  "user_context": {
    "user_id": "user_12345",
    "email": "user@example.com"
  },
  "processing_details": {
    "total_duration_ms": 142000,
    "stages": { ... }
  },
  "timestamp": "2025-10-21T12:32:22Z"
}
```

**Response**:
```json
{
  "success": true,
  "composite_id": "C.USR.RMX.007",
  "message": "Composite saved successfully"
}
```

---

## 🔒 Authentication

### **JWT Authentication (User APIs)**

All user-facing APIs require JWT authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload**:
```json
{
  "user_id": "user_12345",
  "email": "user@example.com",
  "iat": 1697897200,
  "exp": 1697983600
}
```

### **API Key Authentication (Service-to-Service)**

Internal service APIs use API keys:

```http
X-API-Key: nna_registry_service_key_abc123xyz
```

**Environment Variables**:
```bash
# NNA Registry → Gen-AI Pipeline
GEN_AI_API_KEY=gen_ai_service_key_xyz789

# Gen-AI Pipeline → NNA Registry
NNA_REGISTRY_API_KEY=nna_registry_service_key_abc123

# Webhook signatures
WEBHOOK_SECRET=webhook_secret_super_secure_32chars
```

---

## 📊 Error Handling

### **Standard Error Response**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context",
      "suggestion": "What user should do"
    }
  },
  "request_id": "req_abc123",
  "timestamp": "2025-10-21T12:30:00Z"
}
```

### **Common Error Codes**

| Code | HTTP Status | Description | Resolution |
|------|------------|-------------|------------|
| `INVALID_COMPONENT` | 404 | Component asset not found | Verify HFN exists in registry |
| `MISSING_COMPONENT` | 400 | Required component missing | Provide all 5 components |
| `INVALID_HFN_FORMAT` | 400 | HFN format invalid | Use format: L.CAT.SUB.001 |
| `GENERATION_SERVICE_UNAVAILABLE` | 503 | Gen-AI Pipeline down | Retry later or use standard composite |
| `GENERATION_TIMEOUT` | 408 | Generation took > 15 min | Request new generation |
| `GENERATION_FAILED` | 500 | GPU processing failed | Check component compatibility |
| `UNAUTHORIZED` | 401 | Invalid or expired JWT | Re-authenticate |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait before retrying |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | Webhook verification failed | Check webhook secret |
| `TIMESTAMP_TOO_OLD` | 400 | Webhook timestamp > 5 min | Resend webhook |

---

## 🧪 Testing & Validation

### **cURL Examples**

#### **1. Register Personalize Asset**

```bash
curl -X POST https://registry.dev.reviz.dev/api/v1/assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "layer=P" \
  -F "category=FAC" \
  -F "subcategory=SWP" \
  -F "file=@selfie.jpg" \
  -F "metadata={\"name\":\"My Face\",\"description\":\"Face swap asset\"}"
```

#### **2. Resolve/Generate Composite (CUSTOMIZE)**

```bash
curl -X POST https://registry.dev.reviz.dev/api/v1/composites/resolve-or-generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "components": {
      "song": "G.POP.VIN.001",
      "star": "S.POP.IDF.002",
      "look": "L.MOD.PSH.003",
      "moves": "M.POP.CON.001",
      "world": "W.REL.CEN.001"
    },
    "user_context": {
      "user_id": "user_12345",
      "email": "test@example.com"
    }
  }'
```

#### **3. Resolve/Generate Composite (PERSONALIZE)**

```bash
curl -X POST https://registry.dev.reviz.dev/api/v1/composites/resolve-or-generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "components": {
      "song": "G.POP.VIN.001",
      "star": "P.FAC.SWP.007",
      "look": "L.MOD.PSH.003",
      "moves": "M.POP.CON.001",
      "world": "W.REL.CEN.001"
    },
    "user_context": {
      "user_id": "user_12345",
      "email": "test@example.com"
    },
    "generation_options": {
      "priority": "express",
      "quality": "hd"
    }
  }'
```

#### **4. Check Generation Status**

```bash
curl -X GET https://registry.dev.reviz.dev/api/v1/composites/generation-status/gen_abc123xyz \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📱 ReViz App Integration Example

### **Complete TypeScript Implementation**

```typescript
// services/compositeService.ts

import axios from 'axios';

const API_BASE_URL = 'https://registry.dev.reviz.dev/api/v1';
const getAuthHeaders = () => ({
  Authorization: `Bearer ${getJWTToken()}`
});

interface Component {
  song: string;
  star: string;
  look: string;
  moves: string;
  world: string;
}

interface CompositeResult {
  composite_id: string;
  preview_url: string;
  thumbnail_url: string;
  status: 'found' | 'generating';
  generation_id?: string;
}

/**
 * Register personalize asset (face, outfit, etc.)
 */
export async function registerPersonalizeAsset(
  file: File,
  layer: string,
  category: string,
  subcategory: string
): Promise<string> {
  const formData = new FormData();
  formData.append('layer', layer);
  formData.append('category', category);
  formData.append('subcategory', subcategory);
  formData.append('file', file);
  formData.append('metadata', JSON.stringify({
    name: `User's ${category}`,
    description: `Personalize asset for ${subcategory}`
  }));

  const response = await axios.post(
    `${API_BASE_URL}/assets`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return response.data.data.asset_id; // Returns "P.FAC.SWP.007"
}

/**
 * Request composite (customize or personalize)
 */
export async function requestComposite(
  components: Components,
  options?: {
    priority?: 'standard' | 'express';
    quality?: 'standard' | 'hd' | '4k';
  }
): Promise<CompositeResult> {
  const response = await axios.post(
    `${API_BASE_URL}/composites/resolve-or-generate`,
    {
      components,
      user_context: {
        user_id: getCurrentUserId(),
        email: getCurrentUserEmail(),
        device_info: {
          platform: Platform.OS,
          app_version: '1.2.0'
        }
      },
      generation_options: options || {
        priority: 'standard',
        quality: 'hd'
      }
    },
    { headers: getAuthHeaders() }
  );

  return {
    composite_id: response.data.data.composite_id,
    preview_url: response.data.data.preview_url,
    thumbnail_url: response.data.data.thumbnail_url,
    status: response.data.status,
    generation_id: response.data.data.generation_id
  };
}

/**
 * Poll for generation status
 */
export async function pollGenerationStatus(
  generationId: string
): Promise<{
  status: 'queued' | 'processing' | 'uploading' | 'complete' | 'failed';
  progress: number;
  composite_id?: string;
  preview_url?: string;
  thumbnail_url?: string;
}> {
  const response = await axios.get(
    `${API_BASE_URL}/composites/generation-status/${generationId}`,
    { headers: getAuthHeaders() }
  );

  return response.data.data;
}

/**
 * Complete workflow: Customize use case
 */
export async function customizeComposite(
  currentComponents: Components,
  layerToChange: 'star' | 'look' | 'moves' | 'world',
  newAssetHFN: string
): Promise<CompositeResult> {
  const updatedComponents = {
    ...currentComponents,
    [layerToChange]: newAssetHFN
  };

  const result = await requestComposite(updatedComponents);

  if (result.status === 'found') {
    console.log('✅ Composite found instantly:', result.composite_id);
    return result;
  } else {
    throw new Error('Expected to find existing composite for customization');
  }
}

/**
 * Complete workflow: Personalize use case
 */
export async function personalizeComposite(
  baseComponents: Components,
  personalizeFile: File,
  personalizeType: 'face' | 'outfit' | 'move' | 'world'
): Promise<CompositeResult> {
  // Step 1: Register personalize asset
  const layerMap = {
    face: { category: 'FAC', subcategory: 'SWP' },
    outfit: { category: 'CLO', subcategory: 'OUT' },
    move: { category: 'MOV', subcategory: 'DAN' },
    world: { category: 'ENV', subcategory: 'LOC' }
  };

  const { category, subcategory } = layerMap[personalizeType];
  const personalizeHFN = await registerPersonalizeAsset(
    personalizeFile,
    'P',
    category,
    subcategory
  );

  console.log('✅ Personalize asset registered:', personalizeHFN);

  // Step 2: Request composite generation
  const componentLayerMap = {
    face: 'star',
    outfit: 'look',
    move: 'moves',
    world: 'world'
  };

  const updatedComponents = {
    ...baseComponents,
    [componentLayerMap[personalizeType]]: personalizeHFN
  };

  const result = await requestComposite(updatedComponents, {
    priority: 'express',
    quality: 'hd'
  });

  if (result.status === 'generating') {
    console.log('🎨 Generation started:', result.generation_id);
    return result;
  } else {
    throw new Error('Expected generation to be triggered for personalization');
  }
}

/**
 * Poll with timeout and progress updates
 */
export async function pollWithProgress(
  generationId: string,
  onProgress: (progress: number, stage: string) => void,
  maxAttempts: number = 20
): Promise<CompositeResult> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;

      try {
        const status = await pollGenerationStatus(generationId);

        onProgress(status.progress, status.status);

        if (status.status === 'complete') {
          clearInterval(interval);
          resolve({
            composite_id: status.composite_id!,
            preview_url: status.preview_url!,
            thumbnail_url: status.thumbnail_url!,
            status: 'found'
          });
        } else if (status.status === 'failed') {
          clearInterval(interval);
          reject(new Error('Generation failed'));
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Generation timeout'));
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(error);
        }
      }
    }, 30000); // Poll every 30 seconds
  });
}
```

### **React Native Component Example**

```typescript
// components/CompositeCustomizer.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { customizeComposite, personalizeComposite, pollWithProgress } from '../services/compositeService';

interface Props {
  currentComponents: Components;
  onCompositeReady: (compositeId: string, previewUrl: string) => void;
}

export const CompositeCustomizer: React.FC<Props> = ({
  currentComponents,
  onCompositeReady
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');

  // CUSTOMIZE: User selects different look
  const handleLookChange = async (newLookHFN: string) => {
    setIsLoading(true);
    try {
      const result = await customizeComposite(
        currentComponents,
        'look',
        newLookHFN
      );

      // Instant result for customize
      onCompositeReady(result.composite_id, result.preview_url);
    } catch (error) {
      console.error('Customize error:', error);
      Alert.alert('Error', 'Failed to customize composite');
    } finally {
      setIsLoading(false);
    }
  };

  // PERSONALIZE: User uploads selfie
  const handlePersonalize = async (selfieFile: File) => {
    setIsLoading(true);
    setGenerationProgress(0);
    setGenerationStage('Uploading...');

    try {
      // Step 1: Start generation
      const result = await personalizeComposite(
        currentComponents,
        selfieFile,
        'face'
      );

      setGenerationStage('Generating your remix...');

      // Step 2: Poll for completion
      const finalResult = await pollWithProgress(
        result.generation_id!,
        (progress, stage) => {
          setGenerationProgress(progress);
          setGenerationStage(stage);
        }
      );

      // Step 3: Show result
      onCompositeReady(finalResult.composite_id, finalResult.preview_url);

      Alert.alert('Success', '🎉 Your personalized remix is ready!');
    } catch (error) {
      console.error('Personalize error:', error);
      Alert.alert('Error', 'Failed to generate personalized composite');
    } finally {
      setIsLoading(false);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5B5FED" />
          <Text style={styles.loadingText}>{generationStage}</Text>
          {generationProgress > 0 && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${generationProgress}%` }
                ]} 
              />
            </View>
          )}
          <Text style={styles.progressText}>{generationProgress}%</Text>
        </View>
      )}

      {/* Look selection UI */}
      <View style={styles.lookGrid}>
        {lookVariants.map(look => (
          <TouchableOpacity
            key={look.hfn}
            onPress={() => handleLookChange(look.hfn)}
            disabled={isLoading}
          >
            <Image source={{ uri: look.thumbnailUrl }} style={styles.thumbnail} />
            <Text>{look.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Personalize button */}
      <TouchableOpacity
        style={styles.personalizeButton}
        onPress={() => {
          // Open image picker
          ImagePicker.openPicker({
            width: 512,
            height: 512,
            cropping: true
          }).then(image => {
            handlePersonalize(image);
          });
        }}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Upload Your Face</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 🔄 State Management

### **Generation States**

```typescript
type GenerationState = 
  | { type: 'idle' }
  | { type: 'customizing'; components: Components }
  | { type: 'uploading_asset'; progress: number }
  | { type: 'generating'; generationId: string; progress: number; stage: string }
  | { type: 'complete'; compositeId: string; previewUrl: string }
  | { type: 'error'; error: string };

// Redux/Context state management
interface CompositeState {
  currentComposite: CompositeResult | null;
  generationState: GenerationState;
  components: Components;
}

const initialState: CompositeState = {
  currentComposite: null,
  generationState: { type: 'idle' },
  components: {
    song: '',
    star: '',
    look: '',
    moves: '',
    world: ''
  }
};
```

---

## 📈 Performance Benchmarks

### **Expected Response Times**

| Operation | Target | Typical | Max |
|-----------|--------|---------|-----|
| **CUSTOMIZE** (existing composite) | < 50ms | 18-30ms | 100ms |
| **Asset Upload** (personalize) | < 3s | 2-3s | 5s |
| **Generation Start** (trigger) | < 200ms | 100-150ms | 500ms |
| **Generation Complete** (GPU) | 1-3 min | 2-2.5 min | 5 min |
| **Webhook Delivery** | < 1s | 200-500ms | 2s |
| **Status Poll** | < 100ms | 30-50ms | 200ms |

### **Scalability Targets**

- **Concurrent CUSTOMIZE requests**: 1,000/second
- **Concurrent PERSONALIZE uploads**: 100/second
- **Concurrent GPU generations**: 10-50 (based on RunPod capacity)
- **Daily personalized composites**: 10,000+
- **Peak generation queue**: 100-200 jobs

---

## 🛡️ Rate Limits

### **User Tier Limits**

```typescript
interface RateLimits {
  free: {
    personalizations_per_day: 5;
    personalizations_per_hour: 2;
    customizations_per_minute: 20;
  };
  premium: {
    personalizations_per_day: 50;
    personalizations_per_hour: 10;
    customizations_per_minute: 100;
    priority_queue: true;
  };
  enterprise: {
    personalizations_per_day: 'unlimited';
    personalizations_per_hour: 'unlimited';
    customizations_per_minute: 'unlimited';
    priority_queue: true;
    dedicated_gpu: true;
  };
}
```

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1697897200
```

### **Rate Limit Error Response**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your hourly personalization limit",
    "details": {
      "limit": 2,
      "reset_at": "2025-10-21T13:00:00Z",
      "upgrade_url": "https://reviz.app/upgrade"
    }
  }
}
```

---

## 🎯 Success Criteria

### **Technical Metrics**

✅ **CUSTOMIZE Flow**
- [ ] 95% of requests return in < 50ms
- [ ] 99.9% success rate
- [ ] Zero generation triggers for standard composites

✅ **PERSONALIZE Flow**
- [ ] 95% of generations complete in < 3 minutes
- [ ] 95% success rate
- [ ] 99% webhook delivery success

✅ **Reliability**
- [ ] 99.5% API uptime
- [ ] < 0.1% webhook failures requiring polling fallback
- [ ] Zero data loss for personalize assets

### **User Experience Metrics**

✅ **Speed**
- [ ] Customize feels instant (< 1 second total)
- [ ] Personalize progress bar updates smoothly
- [ ] Notifications arrive within 10 seconds of completion

✅ **Quality**
- [ ] Face swap quality rated 4+ stars by 90% of users
- [ ] < 5% regeneration requests due to quality issues
- [ ] < 1% generation failures

---

## 📚 Additional Resources

### **Documentation Links**

- **NNA Registry API**: https://registry.dev.reviz.dev/api/docs
- **Gen-AI Pipeline API**: https://gen-ai.dev.reviz.dev/api/docs
- **AlgoRhythm API**: https://dev.algorhythm.media/api/docs
- **Swagger/OpenAPI Specs**: Available at `/api/docs` for each service

### **Support Contacts**

- **Backend Team**: backend@celerity.studio
- **AlgoRhythm Team**: algorhythm@celerity.studio
- **Gen-AI Team**: gen-ai@celerity.studio
- **ReViz Developers**: reviz-dev@celerity.studio

### **Environment URLs**

| Environment | NNA Registry | Gen-AI Pipeline | AlgoRhythm |
|-------------|--------------|-----------------|------------|
| **Development** | https://registry.dev.reviz.dev | https://gen-ai.dev.reviz.dev | https://dev.algorhythm.media |
| **Staging** | https://registry.stg.reviz.dev | https://gen-ai.stg.reviz.dev | https://stg.algorhythm.media |
| **Production** | https://registry.reviz.dev | https://gen-ai.reviz.dev | https://algorhythm.media |

---

## ✅ Implementation Checklist

### **Week 1: NNA Registry Endpoint**
- [ ] Create `CompositeResolutionController` and `CompositeResolutionService`
- [ ] Implement component validation logic
- [ ] Implement MongoDB composite search (exact component match)
- [ ] Integrate with Gen-AI Pipeline service
- [ ] Write unit tests (80% coverage)
- [ ] Deploy to dev environment

### **Week 2-3: Gen-AI Pipeline Service**
- [ ] Set up NestJS project with AlgoRhythm patterns
- [ ] Implement API endpoints (generate, status, webhooks)
- [ ] Set up MongoDB for generation jobs
- [ ] Integrate with RunPod GPU endpoints
- [ ] Implement queue manager
- [ ] Write unit and integration tests

### **Week 4: Webhook System**
- [ ] Implement HMAC signature generation/verification
- [ ] Create webhook endpoint in NNA Registry
- [ ] Implement retry logic with exponential backoff
- [ ] Implement fallback polling mechanism
- [ ] Set up monitoring and alerting

### **Week 5: Testing & Deployment**
- [ ] End-to-end testing (CUSTOMIZE flow)
- [ ] End-to-end testing (PERSONALIZE flow)
- [ ] Load testing (1000 concurrent requests)
- [ ] Security audit (penetration testing)
- [ ] Production deployment
- [ ] ReViz team integration support

---

**Status**: ✅ Ready for Implementation  
**Total Estimated Time**: 5 weeks  
**Team Size**: 3-4 developers (Backend, Gen-AI, DevOps)  
**Next Steps**: Kickoff meeting with all teams to review specifications