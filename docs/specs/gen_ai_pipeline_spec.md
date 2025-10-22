# Gen-AI Pipeline Service - Architecture Specification

**Version**: 1.0.0  
**Date**: October 21, 2025  
**Technology**: TypeScript/NestJS (matching NNA Registry patterns)  
**Infrastructure**: Google Cloud Run + RunPod GPU Infrastructure  
**Purpose**: Orchestrate AI-powered composite video generation with personalized assets

---

## 🎯 Overview

The Gen-AI Pipeline Service is a new microservice that orchestrates the generation of personalized composite videos. It sits between the NNA Registry Service and the RunPod GPU infrastructure, managing the entire generation lifecycle from request to completion.

### **Key Responsibilities**

1. **Request Orchestration**: Receive generation requests from NNA Registry
2. **Asset Validation**: Verify all component assets are accessible
3. **GPU Job Management**: Submit jobs to RunPod, monitor progress
4. **Result Processing**: Upload generated videos to GCS, notify NNA Registry
5. **Queue Management**: Handle priority queuing for standard vs. express generation

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Gen-AI Pipeline Service                        │
│                  (Google Cloud Run - NestJS)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Layer                             │   │
│  │  • POST /api/v1/generate/composite                      │   │
│  │  • GET  /api/v1/generate/status/:id                     │   │
│  │  • POST /api/v1/webhooks/runpod-complete                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐   │
│  │              Generation Orchestrator                      │   │
│  │  • Validate components                                    │   │
│  │  • Prepare generation payload                             │   │
│  │  • Submit to RunPod                                       │   │
│  │  • Monitor generation progress                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐   │
│  │                Queue Manager                              │   │
│  │  • Priority queue (standard vs express)                   │   │
│  │  • Resource allocation                                    │   │
│  │  • Retry logic                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────┬───────────────────────────────────────┬─┘
                        │                                       │
          ┌─────────────▼────────────┐           ┌─────────────▼────────────┐
          │   RunPod GPU Endpoints   │           │   Google Cloud Storage   │
          │  • Face swap models      │           │  • Upload generated      │
          │  • Outfit swap models    │           │    composites            │
          │  • Composite rendering   │           │  • Preview generation    │
          │  • Status polling        │           │  • Thumbnail creation    │
          └──────────────────────────┘           └──────────────────────────┘
                        │                                       │
                        └───────────────┬───────────────────────┘
                                        │
                            ┌───────────▼────────────┐
                            │  Webhook Callback to    │
                            │  NNA Registry Service   │
                            │  /api/v1/webhooks/      │
                            │  generation-complete    │
                            └─────────────────────────┘
```

---

## 📡 API Specification

### **1. Initiate Composite Generation**

```
POST /api/v1/generate/composite
```

**Request:**

```json
{
  "request_id": "req_abc123",
  "components": {
    "song": "G.POP.TSW.001",
    "star": "P.FAC.SWP.007",  // Personalize asset
    "look": "L.MOD.POP.001",
    "moves": "M.POP.CON.001",
    "world": "W.STG.CON.001"
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
    "priority": "express",
    "quality": "hd",
    "callback_url": "https://registry.dev.reviz.dev/api/v1/webhooks/generation-complete"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "generation_id": "gen_abc123xyz",
    "status": "queued",
    "queue_position": 3,
    "estimated_completion_time": "2025-10-21T12:35:00Z",
    "status_url": "/api/v1/generate/status/gen_abc123xyz",
    "runpod_job_id": "runpod_xyz789",
    "components": {
      "song": "G.POP.TSW.001",
      "star": "P.FAC.SWP.007",
      "look": "L.MOD.POP.001",
      "moves": "M.POP.CON.001",
      "world": "W.STG.CON.001"
    }
  }
}
```

---

### **2. Check Generation Status**

```
GET /api/v1/generate/status/:generationId
```

**Response (In Progress):**

```json
{
  "success": true,
  "data": {
    "generation_id": "gen_abc123xyz",
    "status": "processing",
    "progress": 65,
    "current_stage": "face_swap_complete",
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

**Response (Complete):**

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
    "stages": {
      "face_swap": { "status": "complete", "duration_ms": 45000 },
      "composite_rendering": { "status": "complete", "duration_ms": 87000 },
      "upload": { "status": "complete", "duration_ms": 8000 },
      "thumbnail_generation": { "status": "complete", "duration_ms": 2000 }
    },
    "completed_at": "2025-10-21T12:32:22Z"
  }
}
```

---

### **3. RunPod Completion Webhook (Internal)**

```
POST /api/v1/webhooks/runpod-complete
```

**Request (from RunPod):**

```json
{
  "job_id": "runpod_xyz789",
  "generation_id": "gen_abc123xyz",
  "status": "success",
  "output": {
    "video_url": "https://runpod-output.s3.amazonaws.com/gen_abc123xyz/output.mp4",
    "metadata": {
      "duration_seconds": 30,
      "resolution": "1920x1080",
      "fps": 30,
      "file_size_mb": 24.5
    }
  },
  "processing_time_ms": 135000
}
```

**Response:**

```json
{
  "success": true,
  "message": "Generation completed and uploaded to GCS",
  "composite_id": "C.USR.RMX.007"
}
```

---

## 🔄 Generation Workflow

### **Detailed Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Request Validation & Queuing (< 1 second)              │
├─────────────────────────────────────────────────────────────────┤
│ 1. Receive generation request from NNA Registry                 │
│ 2. Validate all component HFNs exist                             │
│ 3. Fetch component asset URLs from NNA Registry                  │
│ 4. Create generation record in MongoDB                           │
│ 5. Add to priority queue (express → front, standard → back)     │
│ 6. Return generation_id to NNA Registry                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: GPU Job Submission (1-5 seconds)                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Pop job from queue when GPU available                         │
│ 2. Prepare RunPod payload:                                       │
│    - Base composite video URL                                    │
│    - Personalize asset URL (face/outfit)                         │
│    - Quality settings (resolution, fps)                          │
│ 3. Submit job to RunPod endpoint                                 │
│ 4. Update generation status: "queued" → "processing"             │
│ 5. Store RunPod job_id for tracking                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: GPU Processing (60-180 seconds)                        │
├─────────────────────────────────────────────────────────────────┤
│ RunPod executes on NVIDIA A100 GPU:                             │
│ 1. Face Swap (if P.FAC.SWP.*) - 30-60s                          │
│    - Load source video frames                                    │
│    - Load target face image                                      │
│    - Apply face swap model                                       │
│    - Generate face-swapped frames                                │
│                                                                   │
│ 2. Outfit Swap (if P.CLO.OUT.*) - 40-80s                        │
│    - Load source video frames                                    │
│    - Load target outfit image                                    │
│    - Apply outfit swap model                                     │
│    - Generate outfit-swapped frames                              │
│                                                                   │
│ 3. Composite Rendering (30-40s)                                 │
│    - Combine all layers (song, star, look, moves, world)        │
│    - Apply effects and transitions                               │
│    - Encode final video (H.264, 1920x1080, 30fps)               │
│                                                                   │
│ Gen-AI Pipeline polls RunPod status every 5 seconds             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Result Processing (5-15 seconds)                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Receive completion webhook from RunPod                        │
│ 2. Download generated video from RunPod output                   │
│ 3. Upload to Google Cloud Storage:                               │
│    - Main video: gs://reviz-composites/C.USR.RMX.007/preview.mp4│
│    - Generate thumbnail at 3-second mark                         │
│    - Thumbnail: gs://reviz-composites/C.USR.RMX.007/thumb.jpg   │
│ 4. Update generation status: "processing" → "uploading"          │
│ 5. Generate GCS public URLs                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: Notification & Cleanup (< 1 second)                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Send webhook to NNA Registry:                                 │
│    POST /api/v1/webhooks/generation-complete                     │
│    {                                                             │
│      "generation_id": "gen_abc123xyz",                          │
│      "composite_id": "C.USR.RMX.007",                           │
│      "preview_url": "https://storage.googleapis.com/...",       │
│      "thumbnail_url": "https://storage.googleapis.com/..."      │
│    }                                                             │
│                                                                   │
│ 2. NNA Registry saves composite to MongoDB                       │
│ 3. NNA Registry notifies ReViz App (push notification/WebSocket)│
│ 4. Update generation status: "uploading" → "complete"            │
│ 5. Clean up temporary files from RunPod                          │
└─────────────────────────────────────────────────────────────────┘

TOTAL TIME: 66-196 seconds (1-3.5 minutes)
Express Priority: 66-120 seconds (1-2 minutes)
Standard Priority: 120-196 seconds (2-3.5 minutes)
```

---

## 🎨 RunPod Integration

### **RunPod Endpoint Configuration**

```typescript
interface RunPodConfig {
  endpoints: {
    face_swap: {
      url: 'https://api.runpod.ai/v2/{endpoint_id}/runsync';
      endpoint_id: 'xxxxx-face-swap-model';
      gpu: 'NVIDIA A100 40GB';
      cost_per_second: 0.00079;  // $0.00079/second
    };
    outfit_swap: {
      url: 'https://api.runpod.ai/v2/{endpoint_id}/runsync';
      endpoint_id: 'xxxxx-outfit-swap-model';
      gpu: 'NVIDIA A100 40GB';
      cost_per_second: 0.00079;
    };
    composite_render: {
      url: 'https://api.runpod.ai/v2/{endpoint_id}/runsync';
      endpoint_id: 'xxxxx-composite-render';
      gpu: 'NVIDIA A100 80GB';
      cost_per_second: 0.00119;  // $0.00119/second
    };
  };
  api_key: process.env.RUNPOD_API_KEY;
  timeout_seconds: 300;  // 5 minute max per job
  retry_attempts: 3;
}
```

### **RunPod Request Format**

```json
{
  "input": {
    "source_video_url": "https://storage.googleapis.com/reviz-components/C.FUL.ALL.136/base.mp4",
    "target_image_url": "https://storage.googleapis.com/reviz-personalize/P.FAC.SWP.007/face.jpg",
    "quality": "hd",
    "output_format": "mp4",
    "resolution": "1920x1080",
    "fps": 30,
    "webhook_url": "https://gen-ai.dev.reviz.dev/api/v1/webhooks/runpod-complete",
    "generation_id": "gen_abc123xyz"
  }
}
```

### **RunPod Response Format**

```json
{
  "id": "runpod-job-xyz789",
  "status": "COMPLETED",
  "output": {
    "video_url": "https://runpod-output.s3.amazonaws.com/gen_abc123xyz/output.mp4",
    "metadata": {
      "duration": 30.5,
      "resolution": "1920x1080",
      "fps": 30,
      "file_size_mb": 24.5
    }
  },
  "executionTime": 135420
}
```

---

## 🗄️ Database Schema

### **Generation Jobs Collection**

```typescript
interface GenerationJob {
  _id: ObjectId;
  generation_id: string;           // "gen_abc123xyz"
  request_id: string;               // From NNA Registry
  
  // Request data
  components: {
    song: string;
    star: string;
    look: string;
    moves: string;
    world: string;
  };
  
  user_context: {
    user_id: string;
    email: string;
    device_info?: any;
  };
  
  generation_options: {
    priority: 'standard' | 'express';
    quality: 'standard' | 'hd' | '4k';
    callback_url?: string;
  };
  
  // Status tracking
  status: 'queued' | 'processing' | 'uploading' | 'complete' | 'failed';
  progress: number;  // 0-100
  
  // RunPod integration
  runpod_job_id?: string;
  runpod_status?: string;
  
  // Results
  composite_id?: string;            // "C.USR.RMX.007" (after completion)
  preview_url?: string;
  thumbnail_url?: string;
  
  // Timing
  queued_at: Date;
  started_at?: Date;
  completed_at?: Date;
  estimated_completion_time?: Date;
  
  // Processing stages
  stages: {
    face_swap?: { status: string; duration_ms?: number };
    outfit_swap?: { status: string; duration_ms?: number };
    composite_rendering?: { status: string; duration_ms?: number; progress?: number };
    upload?: { status: string; duration_ms?: number };
    thumbnail_generation?: { status: string; duration_ms?: number };
  };
  
  // Error handling
  error?: {
    code: string;
    message: string;
    details: any;
    timestamp: Date;
  };
  retry_count: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

---

## 📊 Queue Management

### **Priority Queue System**

```typescript
interface QueueManager {
  // Add job to queue
  enqueue(job: GenerationJob): Promise<QueuePosition>;
  
  // Get next job to process
  dequeue(): Promise<GenerationJob | null>;
  
  // Check queue status
  getQueueStatus(): Promise<QueueStatus>;
  
  // Priority boost (for premium users)
  prioritize(generationId: string): Promise<void>;
}

interface QueueStatus {
  express_queue_length: number;    // 0-5 jobs (fast lane)
  standard_queue_length: number;   // 0-50 jobs (normal lane)
  processing_jobs: number;         // Currently executing
  available_gpu_slots: number;     // 0-10 (RunPod capacity)
  average_wait_time_seconds: {
    express: number;               // ~10-30 seconds
    standard: number;              // ~60-180 seconds
  };
}
```

### **GPU Resource Allocation**

```typescript
interface GPUResourceManager {
  // Check GPU availability
  checkAvailability(): Promise<{
    total_gpus: number;
    available_gpus: number;
    utilized_gpus: number;
    utilization_percentage: number;
  }>;
  
  // Allocate GPU for job
  allocateGPU(job: GenerationJob): Promise<{
    gpu_id: string;
    gpu_type: string;
    estimated_completion_time: Date;
  }>;
  
  // Release GPU after completion
  releaseGPU(gpuId: string): Promise<void>;
  
  // Auto-scaling (future)
  scaleGPUs(targetUtilization: number): Promise<void>;
}
```

---

## 🔐 Security & Authentication

### **API Key Management**

```typescript
// Gen-AI Pipeline validates incoming requests
const validateApiKey = (request: Request): boolean => {
  const apiKey = request.headers['x-api-key'];
  
  // Only NNA Registry can call Gen-AI Pipeline
  const validKeys = [
    process.env.NNA_REGISTRY_API_KEY,
    process.env.ADMIN_API_KEY  // For testing
  ];
  
  return validKeys.includes(apiKey);
};
```

### **Webhook Security (HMAC Signatures)**

```typescript
// Gen-AI Pipeline signs webhooks to NNA Registry
const signWebhook = (payload: any, secret: string): string => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

// NNA Registry verifies webhook signatures
const verifyWebhook = (payload: any, signature: string, secret: string): boolean => {
  const expectedSignature = signWebhook(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

---

## 📈 Monitoring & Observability

### **Key Metrics**

```typescript
interface GenerationMetrics {
  // Performance
  average_generation_time_ms: number;
  p50_generation_time_ms: number;
  p95_generation_time_ms: number;
  p99_generation_time_ms: number;
  
  // Success rates
  success_rate: number;              // % of successful generations
  face_swap_success_rate: number;
  outfit_swap_success_rate: number;
  
  // Queue health
  average_queue_wait_time_ms: number;
  max_queue_wait_time_ms: number;
  queue_abandonment_rate: number;    // % users who cancel while queued
  
  // GPU utilization
  gpu_utilization: number;           // % of time GPUs are busy
  gpu_cost_per_generation: number;   // $ cost per generation
  
  // Business metrics
  generations_per_hour: number;
  peak_generation_hours: number[];
  express_vs_standard_ratio: number;
}
```

### **Logging Strategy**

```typescript
// Structured logging for every stage
logger.log({
  event: 'generation_started',
  generation_id: 'gen_abc123',
  runpod_job_id: 'runpod_xyz789',
  components: { ... },
  queue_wait_time_ms: 15000,
  priority: 'express',
  timestamp: new Date().toISOString()
});

logger.log({
  event: 'stage_complete',
  generation_id: 'gen_abc123',
  stage: 'face_swap',
  duration_ms: 45000,
  success: true,
  timestamp: new Date().toISOString()
});

logger.log({
  event: 'generation_complete',
  generation_id: 'gen_abc123',
  composite_id: 'C.USR.RMX.007',
  total_duration_ms: 142000,
  stages: { ... },
  success: true,
  timestamp: new Date().toISOString()
});
```

---

## 🧪 Testing Strategy

### **Unit Tests**

```typescript
describe('GenerationOrchestrator', () => {
  it('should validate components before queuing', async () => {
    const invalidComponents = {
      song: 'G.INVALID.XXX.999',
      star: 'P.FAC.SWP.007',
      look: 'L.MOD.POP.001',
      moves: 'M.POP.CON.001',
      world: 'W.STG.CON.001'
    };
    
    await expect(orchestrator.initiateGeneration(invalidComponents))
      .rejects.toThrow('Component validation failed');
  });
  
  it('should prioritize express jobs over standard', async () => {
    const standardJob = createJob({ priority: 'standard' });
    const expressJob = createJob({ priority: 'express' });
    
    await queueManager.enqueue(standardJob);
    await queueManager.enqueue(expressJob);
    
    const nextJob = await queueManager.dequeue();
    expect(nextJob.generation_id).toBe(expressJob.generation_id);
  });
});
```

### **Integration Tests**

```typescript
describe('End-to-End Generation', () => {
  it('should complete full generation workflow', async () => {
    // Mock RunPod to return success
    mockRunPod.mockSuccess({
      video_url: 'https://mock-output.com/video.mp4',
      processing_time_ms: 120000
    });
    
    const result = await genAIPipeline.initiateGeneration({
      components: { ... },
      user_context: { ... }
    });
    
    // Wait for completion (or mock webhook)
    await waitForGenerationComplete(result.generation_id);
    
    const status = await genAIPipeline.checkStatus(result.generation_id);
    expect(status.status).toBe('complete');
    expect(status.composite_id).toMatch(/^C\.USR\.RMX\.\d{3}$/);
    expect(status.preview_url).toContain('storage.googleapis.com');
  });
});
```

---

## 🚀 Deployment Architecture

### **Google Cloud Run Configuration**

```yaml
service: gen-ai-pipeline-service
runtime: nodejs20

resources:
  memory: 2Gi
  cpu: 2

scaling:
  min_instances: 1
  max_instances: 20
  target_cpu_utilization: 0.70

environment_variables:
  NODE_ENV: production
  RUNPOD_API_KEY: ${RUNPOD_API_KEY}
  NNA_REGISTRY_API_KEY: ${NNA_REGISTRY_API_KEY}
  GCS_BUCKET: reviz-composites
  WEBHOOK_SECRET: ${WEBHOOK_SECRET}

secrets:
  - MONGODB_URI
  - RUNPOD_FACE_SWAP_ENDPOINT_ID
  - RUNPOD_OUTFIT_SWAP_ENDPOINT_ID
  - RUNPOD_COMPOSITE_RENDER_ENDPOINT_ID
```

### **Infrastructure Costs (Estimated)**

```
RunPod GPU Costs:
- Face Swap: 45 seconds × $0.00079/sec = $0.036 per generation
- Outfit Swap: 60 seconds × $0.00079/sec = $0.047 per generation
- Composite Render: 40 seconds × $0.00119/sec = $0.048 per generation
Total GPU Cost: ~$0.13 per personalized composite

Cloud Run Costs:
- API requests: Negligible (< $0.01 per generation)
- Egress (GCS upload): ~$0.01 per generation

Total Infrastructure Cost: ~$0.14 per personalized generation
Premium Express: $0.20 per generation (30% faster GPU allocation)
```

---

## 🔄 Future Enhancements

### **Phase 2: Edge SDK Integration (Mirai.ai)**

```typescript
interface EdgeGenerationService {
  // On-device generation for P.FAC.SWP
  generateOnDevice(
    sourceVideo: Blob,
    targetFace: Blob,
    quality: 'standard' | 'hd'
  ): Promise<{
    composite_video: Blob;
    generation_time_ms: number;
  }>;
  
  // Hybrid: Pre-process on device, final render in cloud
  hybridGeneration(
    sourceVideo: Blob,
    targetFace: Blob,
    quality: 'hd' | '4k'
  ): Promise<GenerationResult>;
}
```

**Benefits:**
- **Privacy**: Face data never leaves device
- **Speed**: Instant preview (< 5 seconds)
- **Cost**: Zero cloud GPU costs for previews
- **Bandwidth**: No upload of source video

---

## 📝 Implementation Checklist

**Phase 1: Core Service (Week 1-2)**
- [ ] Set up NestJS project with AlgoRhythm/NNA patterns
- [ ] Implement API endpoints (generate, status, webhooks)
- [ ] Set up MongoDB for generation jobs
- [ ] Implement queue manager (priority queue)
- [ ] Integrate with RunPod endpoints

**Phase 2: RunPod Integration (Week 2-3)**
- [ ] Configure RunPod GPU endpoints
- [ ] Implement face swap integration
- [ ] Implement outfit swap integration
- [ ] Implement composite rendering
- [ ] Set up polling & webhook handling

**Phase 3: Result Processing (Week 3-4)**
- [ ] Implement GCS upload service
- [ ] Implement thumbnail generation
- [ ] Implement webhook to NNA Registry
- [ ] Set up retry logic

**Phase 4: Testing & Deployment (Week 4-5)**
- [ ] Write unit tests (80% coverage)
- [ ] Write integration tests
- [ ] Load testing (100 concurrent generations)
- [ ] Deploy to Cloud Run (dev environment)
- [ ] End-to-end testing with NNA Registry
- [ ] Production deployment

---

**Status**: ✅ Ready for Implementation  
**Estimated Development Time**: 4-5 weeks  
**Team Size**: 2-3 developers  
**Dependencies**: NNA Registry webhook endpoint, RunPod account setup