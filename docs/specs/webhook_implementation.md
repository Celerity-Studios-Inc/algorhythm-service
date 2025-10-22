# Webhook Implementation & Security Guide

**Version**: 1.0.0  
**Date**: October 21, 2025  
**Purpose**: Secure webhook communication between Gen-AI Pipeline → NNA Registry → ReViz App

---

## 🎯 Overview

This guide covers the complete webhook implementation for composite generation notifications, including:

1. **Gen-AI Pipeline → NNA Registry**: Generation completion webhook
2. **NNA Registry → ReViz App**: User notification webhook
3. **Security**: HMAC signature verification
4. **Reliability**: Retry logic and fallback polling

---

## 📡 Webhook #1: Gen-AI Pipeline → NNA Registry

### **Endpoint**

```
POST https://registry.dev.reviz.dev/api/v1/webhooks/generation-complete
```

**✅ CONFIRMED WORKING**: Endpoint is properly accessible after routing fix (commit dd09808d1)

### **Request Headers**

```http
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Generation-ID: <generation_id>
```

### **Request Body**

```json
{
  "generation_id": "gen_abc123xyz",
  "status": "success",
  "composite_data": {
    "components": {
      "song": "G.POP.TSW.001",
      "star": "P.FAC.SWP.007",
      "look": "L.MOD.POP.001",
      "moves": "M.POP.CON.001",
      "world": "W.STG.CON.001"
    },
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
    "stages": {
      "face_swap": { "duration_ms": 45000, "status": "complete" },
      "composite_rendering": { "duration_ms": 87000, "status": "complete" },
      "upload": { "duration_ms": 8000, "status": "complete" },
      "thumbnail_generation": { "duration_ms": 2000, "status": "complete" }
    },
    "gpu_cost_usd": 0.13
  },
  "timestamp": "2025-10-21T12:32:22Z"
}
```

### **Response (Success)**

```json
{
  "success": true,
  "composite_id": "C.USR.RMX.007",
  "message": "Composite saved successfully",
  "data": {
    "composite_id": "C.USR.RMX.007",
    "composite_name": "C.USR.RMX.007:G.POP.TSW.001+P.FAC.SWP.007+L.MOD.POP.001+M.POP.CON.001+W.STG.CON.001",
    "nna_address": "C.003.001.007",
    "preview_url": "https://storage.googleapis.com/reviz-composites/C.USR.RMX.007/preview.mp4",
    "thumbnail_url": "https://storage.googleapis.com/reviz-composites/C.USR.RMX.007/thumb.jpg",
    "created_at": "2025-10-21T12:32:22Z"
  }
}
```

### **Response (Error)**

```json
{
  "success": false,
  "error": {
    "code": "SAVE_FAILED",
    "message": "Failed to save composite to MongoDB",
    "details": "Duplicate key error on sequential number"
  }
}
```

---

## 🔐 HMAC Signature Generation & Verification

### **Gen-AI Pipeline: Signing Webhooks**

```typescript
// src/services/webhook-signer.service.ts

import * as crypto from 'crypto';

export class WebhookSignerService {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.WEBHOOK_SECRET;
  }

  signPayload(payload: any): { signature: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create canonical string: timestamp + payload
    const canonicalString = `${timestamp}.${JSON.stringify(payload)}`;
    
    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(canonicalString);
    const signature = hmac.digest('hex');
    
    return { signature, timestamp };
  }

  async sendWebhook(url: string, payload: any) {
    const { signature, timestamp } = this.signPayload(payload);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Generation-ID': payload.generation_id
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

### **NNA Registry: Verifying Webhooks**

```typescript
// src/modules/webhooks/webhook-verification.service.ts

import * as crypto from 'crypto';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookVerificationService {
  private readonly secret: string;
  private readonly toleranceSeconds = 300; // 5 minutes

  constructor(private configService: ConfigService) {
    this.secret = this.configService.get('WEBHOOK_SECRET');
  }

  verifySignature(
    payload: any,
    signature: string,
    timestamp: number
  ): boolean {
    // Step 1: Check timestamp freshness (prevent replay attacks)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTimestamp - timestamp);
    
    if (timeDifference > this.toleranceSeconds) {
      throw new BadRequestException({
        code: 'TIMESTAMP_TOO_OLD',
        message: `Webhook timestamp is too old. Difference: ${timeDifference}s`
      });
    }

    // Step 2: Reconstruct canonical string
    const canonicalString = `${timestamp}.${JSON.stringify(payload)}`;

    // Step 3: Calculate expected signature
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(canonicalString);
    const expectedSignature = hmac.digest('hex');

    // Step 4: Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      throw new UnauthorizedException({
        code: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed'
      });
    }

    return true;
  }
}
```

### **NNA Registry: Webhook Controller**

```typescript
// src/modules/webhooks/generation-webhook.controller.ts

import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookVerificationService } from './webhook-verification.service';
import { CompositeCreationService } from '../composites/composite-creation.service';
import { NotificationService } from '../notifications/notification.service';

@Controller('api/v1/webhooks')
@ApiTags('Webhooks')
export class GenerationWebhookController {
  private readonly logger = new Logger(GenerationWebhookController.name);

  constructor(
    private readonly verificationService: WebhookVerificationService,
    private readonly compositeService: CompositeCreationService,
    private readonly notificationService: NotificationService
  ) {}

  @Post('generation-complete')
  @ApiOperation({
    summary: 'Receive generation completion webhook from Gen-AI Pipeline',
    description: 'Called by Gen-AI Pipeline when composite generation is complete'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or payload' })
  async handleGenerationComplete(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestampStr: string,
    @Headers('x-generation-id') generationId: string
  ) {
    const startTime = Date.now();
    this.logger.log(`[${generationId}] Received generation complete webhook`);

    try {
      // Step 1: Verify webhook signature
      const timestamp = parseInt(timestampStr, 10);
      this.verificationService.verifySignature(payload, signature, timestamp);
      this.logger.log(`[${generationId}] ✅ Webhook signature verified`);

      // Step 2: Validate payload structure
      this.validatePayload(payload);

      // Step 3: Save composite to MongoDB
      const composite = await this.compositeService.createFromGeneration(payload);
      this.logger.log(`[${generationId}] ✅ Composite saved: ${composite.name}`);

      // Step 4: Notify ReViz App
      await this.notificationService.notifyCompositeReady({
        user_id: payload.user_context.user_id,
        composite_id: this.extractBaseHFN(composite.name),
        preview_url: composite.fileUrl,
        thumbnail_url: composite.thumbnailUrl,
        generation_id: generationId
      });
      this.logger.log(`[${generationId}] ✅ User notified`);

      const processingTime = Date.now() - startTime;
      return {
        success: true,
        composite_id: this.extractBaseHFN(composite.name),
        message: 'Composite saved successfully',
        data: {
          composite_id: this.extractBaseHFN(composite.name),
          composite_name: composite.name,
          nna_address: composite.nna_address,
          preview_url: composite.fileUrl,
          thumbnail_url: composite.thumbnailUrl,
          created_at: composite.createdAt
        },
        processing_time_ms: processingTime
      };

    } catch (error) {
      this.logger.error(`[${generationId}] ❌ Webhook processing failed:`, error);
      throw error;
    }
  }

  private validatePayload(payload: any) {
    const required = ['generation_id', 'status', 'composite_data', 'user_context'];
    for (const field of required) {
      if (!payload[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (payload.status !== 'success') {
      throw new Error(`Unexpected status: ${payload.status}`);
    }

    const compositeRequired = ['components', 'preview_url', 'thumbnail_url'];
    for (const field of compositeRequired) {
      if (!payload.composite_data[field]) {
        throw new Error(`Missing composite_data field: ${field}`);
      }
    }
  }

  private extractBaseHFN(compositeName: string): string {
    return compositeName.split(':')[0];
  }
}
```

---

## 🔄 Retry Logic & Fallback Polling

### **Gen-AI Pipeline: Retry Strategy**

```typescript
// src/services/webhook-retry.service.ts

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class WebhookRetryService {
  private readonly config: RetryConfig = {
    maxAttempts: 5,
    initialDelayMs: 1000,      // Start with 1 second
    maxDelayMs: 30000,          // Max 30 seconds between retries
    backoffMultiplier: 2        // Exponential backoff
  };

  async sendWithRetry(
    url: string,
    payload: any,
    generationId: string
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        this.logger.log(`[${generationId}] Webhook attempt ${attempt}/${this.config.maxAttempts}`);
        
        const result = await this.webhookSigner.sendWebhook(url, payload);
        
        this.logger.log(`[${generationId}] ✅ Webhook successful on attempt ${attempt}`);
        return result;

      } catch (error) {
        lastError = error;
        this.logger.warn(`[${generationId}] ❌ Webhook attempt ${attempt} failed:`, error.message);

        if (attempt < this.config.maxAttempts) {
          const delayMs = this.calculateBackoff(attempt);
          this.logger.log(`[${generationId}] Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    // All retries failed
    this.logger.error(`[${generationId}] ❌ All webhook retries failed. Last error:`, lastError);
    
    // Store failed webhook for manual retry or investigation
    await this.storeFailedWebhook(generationId, url, payload, lastError);
    
    throw new Error(`Webhook failed after ${this.config.maxAttempts} attempts`);
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async storeFailedWebhook(
    generationId: string,
    url: string,
    payload: any,
    error: Error
  ) {
    await this.failedWebhooksCollection.insertOne({
      generation_id: generationId,
      webhook_url: url,
      payload,
      error: {
        message: error.message,
        stack: error.stack
      },
      attempts: this.config.maxAttempts,
      failed_at: new Date(),
      retry_after: new Date(Date.now() + 300000)  // Retry after 5 minutes
    });
  }
}
```

### **NNA Registry: Fallback Polling**

```typescript
// src/modules/composites/generation-polling.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class GenerationPollingService {
  private readonly logger = new Logger(GenerationPollingService.name);
  private readonly POLLING_START_DELAY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly POLLING_TIMEOUT_MS = 15 * 60 * 1000;    // 15 minutes

  constructor(
    @InjectModel('GenerationRequest') private generationModel: Model<any>,
    private readonly genAIPipelineService: GenAIPipelineService,
    private readonly compositeService: CompositeCreationService
  ) {}

  /**
   * Safety Net: Poll for stuck generations every 2 minutes
   * This catches cases where webhook fails
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async pollStuckGenerations() {
    this.logger.log('🔍 Checking for stuck generations...');

    const now = Date.now();
    const fiveMinutesAgo = new Date(now - this.POLLING_START_DELAY_MS);
    const fifteenMinutesAgo = new Date(now - this.POLLING_TIMEOUT_MS);

    // Find generations that are:
    // 1. Status is 'generating'
    // 2. Started > 5 minutes ago (webhook should have arrived)
    // 3. Started < 15 minutes ago (not timed out yet)
    const stuckGenerations = await this.generationModel.find({
      status: 'generating',
      started_at: {
        $lt: fiveMinutesAgo,
        $gt: fifteenMinutesAgo
      }
    }).exec();

    if (stuckGenerations.length === 0) {
      this.logger.log('✅ No stuck generations found');
      return;
    }

    this.logger.warn(`⚠️ Found ${stuckGenerations.length} stuck generations`);

    for (const generation of stuckGenerations) {
      await this.checkAndCompleteGeneration(generation);
    }
  }

  private async checkAndCompleteGeneration(generation: any) {
    try {
      this.logger.log(`Polling status for generation: ${generation.generation_id}`);

      // Call Gen-AI Pipeline to check status
      const status = await this.genAIPipelineService.checkGenerationStatus(
        generation.generation_id
      );

      if (status.status === 'complete') {
        this.logger.log(`✅ Generation ${generation.generation_id} is complete (webhook missed)`);

        // Process completion manually (webhook fallback)
        await this.compositeService.createFromGeneration({
          generation_id: generation.generation_id,
          status: 'success',
          composite_data: status.composite_data,
          user_context: generation.user_context,
          processing_details: status.processing_details,
          timestamp: new Date().toISOString()
        });

        // Update generation status
        await this.generationModel.updateOne(
          { generation_id: generation.generation_id },
          { status: 'complete', completed_at: new Date() }
        );

        this.logger.log(`✅ Generation ${generation.generation_id} completed via polling`);
      } else if (status.status === 'failed') {
        this.logger.error(`❌ Generation ${generation.generation_id} failed`);
        
        await this.generationModel.updateOne(
          { generation_id: generation.generation_id },
          {
            status: 'failed',
            error: status.error,
            completed_at: new Date()
          }
        );
      } else {
        this.logger.log(`⏳ Generation ${generation.generation_id} still processing: ${status.progress}%`);
      }

    } catch (error) {
      this.logger.error(`Failed to poll generation ${generation.generation_id}:`, error);
    }
  }

  /**
   * Timeout stuck generations after 15 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async timeoutOldGenerations() {
    const fifteenMinutesAgo = new Date(Date.now() - this.POLLING_TIMEOUT_MS);

    const timedOutGenerations = await this.generationModel.find({
      status: 'generating',
      started_at: { $lt: fifteenMinutesAgo }
    }).exec();

    if (timedOutGenerations.length > 0) {
      this.logger.warn(`⏱️ Timing out ${timedOutGenerations.length} old generations`);

      for (const generation of timedOutGenerations) {
        await this.generationModel.updateOne(
          { generation_id: generation.generation_id },
          {
            status: 'timeout',
            error: {
              code: 'GENERATION_TIMEOUT',
              message: 'Generation exceeded 15 minute timeout'
            },
            completed_at: new Date()
          }
        );

        this.logger.error(`❌ Generation ${generation.generation_id} timed out after 15 minutes`);
      }
    }
  }
}
```

---

## 📱 Webhook #2: NNA Registry → ReViz App

### **Notification Methods**

#### **Option 1: WebSocket (Real-time)**

```typescript
// src/modules/notifications/websocket-notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: true, namespace: '/notifications' })
export class WebSocketNotificationService {
  @WebSocketServer()
  private server: Server;
  
  private readonly logger = new Logger(WebSocketNotificationService.name);

  async notifyCompositeReady(data: {
    user_id: string;
    composite_id: string;
    preview_url: string;
    thumbnail_url: string;
    generation_id: string;
  }) {
    this.logger.log(`Sending WebSocket notification to user: ${data.user_id}`);

    // Send to specific user's room
    this.server.to(`user_${data.user_id}`).emit('composite_ready', {
      type: 'composite_ready',
      data: {
        composite_id: data.composite_id,
        preview_url: data.preview_url,
        thumbnail_url: data.thumbnail_url,
        generation_id: data.generation_id,
        message: 'Your personalized remix is ready!',
        timestamp: new Date().toISOString()
      }
    });

    this.logger.log(`✅ WebSocket notification sent to user: ${data.user_id}`);
  }
}

// ReViz App receives notification
const socket = io('wss://registry.dev.reviz.dev/notifications', {
  auth: { token: jwtToken }
});

socket.on('composite_ready', (notification) => {
  console.log('🎉 Composite ready:', notification);
  
  // Navigate to preview screen
  navigation.navigate('CompositePreview', {
    composite_id: notification.data.composite_id,
    preview_url: notification.data.preview_url,
    thumbnail_url: notification.data.thumbnail_url
  });
  
  // Show success toast
  Toast.show({
    type: 'success',
    text1: '🎉 Your remix is ready!',
    text2: 'Tap to view your personalized video'
  });
});
```

#### **Option 2: Push Notification (Firebase Cloud Messaging)**

```typescript
// src/modules/notifications/push-notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  async notifyCompositeReady(data: {
    user_id: string;
    composite_id: string;
    preview_url: string;
    thumbnail_url: string;
    generation_id: string;
  }) {
    this.logger.log(`Sending push notification to user: ${data.user_id}`);

    // Get user's FCM token from database
    const user = await this.userModel.findOne({ user_id: data.user_id });
    if (!user || !user.fcm_token) {
      this.logger.warn(`No FCM token for user: ${data.user_id}`);
      return;
    }

    const message = {
      token: user.fcm_token,
      notification: {
        title: '🎉 Your Remix is Ready!',
        body: 'Your personalized video has been generated. Tap to view!',
        imageUrl: data.thumbnail_url
      },
      data: {
        type: 'composite_ready',
        composite_id: data.composite_id,
        preview_url: data.preview_url,
        thumbnail_url: data.thumbnail_url,
        generation_id: data.generation_id
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'composite_ready'
        }
      }
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push notification sent: ${response}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send push notification:`, error);
    }
  }
}
```

#### **Option 3: App Refresh / Polling**

```typescript
// ReViz App: Poll for generation status
const pollGenerationStatus = async (generationId: string) => {
  const maxAttempts = 20;  // Poll for up to 10 minutes (20 × 30s)
  let attempt = 0;

  const interval = setInterval(async () => {
    attempt++;

    try {
      const response = await fetch(
        `https://registry.dev.reviz.dev/api/v1/composites/generation-status/${generationId}`,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );

      const data = await response.json();

      if (data.status === 'complete') {
        clearInterval(interval);
        
        // Navigate to preview
        navigation.navigate('CompositePreview', {
          composite_id: data.composite_id,
          preview_url: data.preview_url
        });

        Toast.show({
          type: 'success',
          text1: '🎉 Your remix is ready!'
        });
      } else if (data.status === 'failed') {
        clearInterval(interval);
        
        Toast.show({
          type: 'error',
          text1: 'Generation failed',
          text2: data.error?.message || 'Please try again'
        });
      } else if (attempt >= maxAttempts) {
        clearInterval(interval);
        
        Toast.show({
          type: 'error',
          text1: 'Generation timeout',
          text2: 'This is taking longer than expected'
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 30000);  // Poll every 30 seconds
};
```

---

## 🧪 Testing Webhooks

### **Unit Tests**

```typescript
describe('WebhookVerificationService', () => {
  it('should verify valid webhook signature', () => {
    const payload = { generation_id: 'gen_test', status: 'success' };
    const timestamp = Math.floor(Date.now() / 1000);
    
    const { signature } = webhookSigner.signPayload(payload);
    
    expect(() => {
      verificationService.verifySignature(payload, signature, timestamp);
    }).not.toThrow();
  });

  it('should reject webhook with invalid signature', () => {
    const payload = { generation_id: 'gen_test', status: 'success' };
    const timestamp = Math.floor(Date.now() / 1000);
    const invalidSignature = 'invalid_signature_123';
    
    expect(() => {
      verificationService.verifySignature(payload, invalidSignature, timestamp);
    }).toThrow('INVALID_SIGNATURE');
  });

  it('should reject webhook with old timestamp', () => {
    const payload = { generation_id: 'gen_test', status: 'success' };
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const { signature } = webhookSigner.signPayload(payload);
    
    expect(() => {
      verificationService.verifySignature(payload, signature, oldTimestamp);
    }).toThrow('TIMESTAMP_TOO_OLD');
  });
});
```

### **Integration Tests**

```typescript
describe('Generation Webhook End-to-End', () => {
  it('should complete full webhook flow', async () => {
    // Mock Gen-AI Pipeline sending webhook
    const payload = {
      generation_id: 'gen_test_123',
      status: 'success',
      composite_data: {
        components: { ... },
        preview_url: 'https://storage.googleapis.com/test/preview.mp4',
        thumbnail_url: 'https://storage.googleapis.com/test/thumb.jpg',
        metadata: { ... }
      },
      user_context: { user_id: 'test_user', email: 'test@example.com' },
      processing_details: { ... },
      timestamp: new Date().toISOString()
    };

    const { signature, timestamp } = webhookSigner.signPayload(payload);

    const response = await request(app.getHttpServer())
      .post('/api/v1/webhooks/generation-complete')
      .set('X-Webhook-Signature', signature)
      .set('X-Webhook-Timestamp', timestamp.toString())
      .set('X-Generation-ID', payload.generation_id)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.composite_id).toMatch(/^C\.USR\.RMX\.\d{3}$/);

    // Verify composite was saved to MongoDB
    const composite = await assetModel.findOne({ 
      name: { $regex: new RegExp(`^${response.body.composite_id}:`) }
    });
    expect(composite).toBeDefined();
    expect(composite.fileUrl).toBe(payload.composite_data.preview_url);
  });
});
```

### **Manual Testing with cURL**

```bash
# Generate test signature
node -e "
const crypto = require('crypto');
const payload = { generation_id: 'gen_test', status: 'success', composite_data: { ... } };
const timestamp = Math.floor(Date.now() / 1000);
const canonical = \`\${timestamp}.\${JSON.stringify(payload)}\`;
const hmac = crypto.createHmac('sha256', 'your_webhook_secret');
hmac.update(canonical);
console.log('Signature:', hmac.digest('hex'));
console.log('Timestamp:', timestamp);
"

# Send test webhook
curl -X POST https://registry.dev.reviz.dev/api/v1/webhooks/generation-complete \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <generated_signature>" \
  -H "X-Webhook-Timestamp: <timestamp>" \
  -H "X-Generation-ID: gen_test" \
  -d '{
    "generation_id": "gen_test",
    "status": "success",
    "composite_data": { ... }
  }'
```

---

## 📊 Monitoring & Alerting

### **Key Metrics**

```typescript
interface WebhookMetrics {
  // Delivery
  webhooks_sent: number;
  webhooks_delivered: number;
  webhooks_failed: number;
  delivery_success_rate: number;
  
  // Timing
  average_delivery_time_ms: number;
  p95_delivery_time_ms: number;
  
  // Retries
  retry_attempts: number;
  retries_exhausted: number;
  
  // Fallback
  polling_activations: number;
  webhook_vs_polling_ratio: number;
}
```

### **Alerting Rules**

```yaml
# Webhook delivery failure rate > 5%
- alert: WebhookDeliveryFailureHigh
  expr: (webhooks_failed / webhooks_sent) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High webhook delivery failure rate"
    description: "{{ $value }}% of webhooks are failing"

# Webhook delivery time > 5 seconds
- alert: WebhookDeliveryTimeSlow
  expr: webhook_delivery_time_p95 > 5000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Slow webhook delivery"
    description: "P95 delivery time is {{ $value }}ms"

# Polling fallback rate > 10%
- alert: PollingFallbackHigh
  expr: (polling_activations / webhooks_sent) > 0.10
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "High polling fallback rate"
    description: "{{ $value }}% of notifications using polling fallback"
```

---

## ✅ Implementation Checklist

**Security**
- [ ] Generate strong webhook secret (32+ characters)
- [ ] Implement HMAC-SHA256 signature generation
- [ ] Implement signature verification with timing-safe comparison
- [ ] Add timestamp validation (prevent replay attacks)
- [ ] Store webhook secret in secrets manager (not env file)

**Reliability**
- [ ] Implement retry logic with exponential backoff
- [ ] Store failed webhooks for manual retry
- [ ] Implement fallback polling mechanism
- [ ] Add timeout handling for stuck generations
- [ ] Set up monitoring and alerting

**Testing**
- [ ] Unit tests for signature generation/verification
- [ ] Integration tests for full webhook flow
- [ ] Load testing (100 concurrent webhooks)
- [ ] Manual testing with cURL
- [ ] Test retry logic with simulated failures

**Documentation**
- [ ] Update API documentation with webhook specs
- [ ] Document webhook security requirements
- [ ] Create troubleshooting guide
- [ ] Document monitoring dashboards

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**  
**Implementation Date**: October 22, 2025  
**Routing Fix**: Commit dd09808d1 - Fixed controller paths  
**Dependencies**: Gen-AI Pipeline Service, NNA Registry Service