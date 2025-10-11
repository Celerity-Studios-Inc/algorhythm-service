# 🚀 **PHASE 1: WEBHOOK INFRASTRUCTURE IMPLEMENTATION**

## 🎯 **PHASE OVERVIEW**

**Duration**: 3-5 days  
**Goal**: Enable Algorhythm service to receive asset events from NNA Registry  
**Priority**: High - Foundation for all subsequent phases

## 📋 **IMPLEMENTATION TASKS**

### **Task 1.1: Webhook Endpoints (Day 1-2)**

#### **1.1.1 Create Webhook Controller**
```typescript
// src/modules/webhooks/webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { AssetCreatedEvent, CompositeCreatedEvent, AssetUpdatedEvent } from './dto/webhook-events.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('assets/created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset creation webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleAssetCreated(
    @Body() payload: AssetCreatedEvent,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string
  ) {
    return await this.webhookService.processAssetCreated(payload, signature, timestamp);
  }

  @Post('assets/updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleAssetUpdated(
    @Body() payload: AssetUpdatedEvent,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string
  ) {
    return await this.webhookService.processAssetUpdated(payload, signature, timestamp);
  }

  @Post('composites/created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle composite creation webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleCompositeCreated(
    @Body() payload: CompositeCreatedEvent,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string
  ) {
    return await this.webhookService.processCompositeCreated(payload, signature, timestamp);
  }
}
```

#### **1.1.2 Create Webhook DTOs**
```typescript
// src/modules/webhooks/dto/webhook-events.dto.ts
import { IsString, IsObject, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssetCreatedEvent {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.created';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Asset data' })
  @IsObject()
  asset: any;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class AssetUpdatedEvent {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.updated';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Updated asset data' })
  @IsObject()
  asset: any;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class CompositeCreatedEvent {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'composite.created';

  @ApiProperty({ description: 'Composite ID' })
  @IsString()
  compositeId: string;

  @ApiProperty({ description: 'Composite data' })
  @IsObject()
  composite: any;

  @ApiProperty({ description: 'Component assets' })
  @IsArray()
  components: any[];

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}
```

### **Task 1.2: Webhook Service Implementation (Day 2-3)**

#### **1.2.1 Create Webhook Service**
```typescript
// src/modules/webhooks/webhook.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventProcessorService } from '../events/event-processor.service';
import { WebhookValidationService } from './webhook-validation.service';
import { AssetCreatedEvent, CompositeCreatedEvent, AssetUpdatedEvent } from './dto/webhook-events.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventProcessor: EventProcessorService,
    private readonly validationService: WebhookValidationService
  ) {}

  async processAssetCreated(
    payload: AssetCreatedEvent,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process asset creation event
      await this.eventProcessor.processAssetCreated(payload);

      this.logger.log(`✅ Asset created webhook processed: ${payload.assetId}`);
      return { success: true, message: 'Asset created webhook processed successfully' };
    } catch (error) {
      this.logger.error(`❌ Asset created webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async processAssetUpdated(
    payload: AssetUpdatedEvent,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process asset update event
      await this.eventProcessor.processAssetUpdated(payload);

      this.logger.log(`✅ Asset updated webhook processed: ${payload.assetId}`);
      return { success: true, message: 'Asset updated webhook processed successfully' };
    } catch (error) {
      this.logger.error(`❌ Asset updated webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async processCompositeCreated(
    payload: CompositeCreatedEvent,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process composite creation event
      await this.eventProcessor.processCompositeCreated(payload);

      this.logger.log(`✅ Composite created webhook processed: ${payload.compositeId}`);
      return { success: true, message: 'Composite created webhook processed successfully' };
    } catch (error) {
      this.logger.error(`❌ Composite created webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }
}
```

#### **1.2.2 Create Webhook Validation Service**
```typescript
// src/modules/webhooks/webhook-validation.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookValidationService {
  constructor(private readonly configService: ConfigService) {}

  async validateSignature(
    payload: any,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const eventTime = Math.floor(new Date(timestamp).getTime() / 1000);
    const timeDiff = Math.abs(currentTime - eventTime);

    if (timeDiff > 300) { // 5 minutes tolerance
      throw new UnauthorizedException('Webhook timestamp too old');
    }

    // Validate HMAC signature
    const expectedSignature = this.generateSignature(payload, timestamp, webhookSecret);
    
    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  private generateSignature(payload: any, timestamp: string, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signatureString = `${timestamp}.${payloadString}`;
    return crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');
  }
}
```

### **Task 1.3: Event Processing System (Day 3-4)**

#### **1.3.1 Create Event Processor Service**
```typescript
// src/modules/events/event-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetCreatedEvent, CompositeCreatedEvent, AssetUpdatedEvent } from '../webhooks/dto/webhook-events.dto';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async processAssetCreated(event: AssetCreatedEvent): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset created event: ${event.assetId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('asset.created', {
        assetId: event.assetId,
        asset: event.asset,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Asset created event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset created event: ${error.message}`);
      throw error;
    }
  }

  async processAssetUpdated(event: AssetUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset updated event: ${event.assetId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('asset.updated', {
        assetId: event.assetId,
        asset: event.asset,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Asset updated event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset updated event: ${error.message}`);
      throw error;
    }
  }

  async processCompositeCreated(event: CompositeCreatedEvent): Promise<void> {
    try {
      this.logger.log(`🔄 Processing composite created event: ${event.compositeId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('composite.created', {
        compositeId: event.compositeId,
        composite: event.composite,
        components: event.components,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Composite created event processed: ${event.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite created event: ${error.message}`);
      throw error;
    }
  }
}
```

### **Task 1.4: Module Configuration (Day 4-5)**

#### **1.4.1 Create Webhook Module**
```typescript
// src/modules/webhooks/webhook.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookValidationService } from './webhook-validation.service';
import { EventProcessorService } from '../events/event-processor.service';

@Module({
  imports: [ConfigModule],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WebhookValidationService,
    EventProcessorService
  ],
  exports: [WebhookService, EventProcessorService]
})
export class WebhookModule {}
```

#### **1.4.2 Update App Module**
```typescript
// src/app.module.ts
import { WebhookModule } from './modules/webhooks/webhook.module';

@Module({
  imports: [
    // ... existing imports
    WebhookModule,
  ],
  // ... rest of module
})
export class AppModule {}
```

## 🧪 **TESTING IMPLEMENTATION**

### **Test Webhook Endpoints**
```typescript
// test/webhook.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from '../src/modules/webhooks/webhook.controller';
import { WebhookService } from '../src/modules/webhooks/webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            processAssetCreated: jest.fn(),
            processAssetUpdated: jest.fn(),
            processCompositeCreated: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    service = module.get<WebhookService>(WebhookService);
  });

  it('should process asset created webhook', async () => {
    const payload = {
      event: 'asset.created',
      assetId: 'test-asset-id',
      asset: { name: 'Test Asset' },
      timestamp: new Date().toISOString()
    };

    jest.spyOn(service, 'processAssetCreated').mockResolvedValue({
      success: true,
      message: 'Webhook processed successfully'
    });

    const result = await controller.handleAssetCreated(
      payload,
      'test-signature',
      new Date().toISOString()
    );

    expect(result.success).toBe(true);
    expect(service.processAssetCreated).toHaveBeenCalledWith(
      payload,
      'test-signature',
      expect.any(String)
    );
  });
});
```

## 📊 **SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ Webhook endpoints respond to asset events
- ✅ Signature validation works correctly
- ✅ Event processing system handles events
- ✅ Error handling and logging implemented

### **Performance Requirements**
- ✅ Webhook response time < 200ms
- ✅ Event processing time < 1 second
- ✅ Error rate < 1%
- ✅ 99.9% uptime for webhook endpoints

### **Security Requirements**
- ✅ HMAC signature validation
- ✅ Timestamp validation (replay attack prevention)
- ✅ Rate limiting implemented
- ✅ Input validation and sanitization

## 🚀 **NEXT STEPS**

1. **Implement webhook endpoints** (Day 1-2)
2. **Create webhook service** (Day 2-3)
3. **Build event processing system** (Day 3-4)
4. **Configure modules** (Day 4-5)
5. **Test and validate** (Day 5)

**🎯 Phase 1 completion will provide the foundation for real-time asset monitoring and autonomous Algorhythm service operation.**
