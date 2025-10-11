# Phase 2 Implementation Guidance for Algorhythm Team

**Date**: October 11, 2025
**Author**: NNA Registry Team (Assistant)
**Status**: ✅ **PHASE 1 COMPLETE** - Ready for Phase 2

---

## 🎉 **PHASE 1 SUCCESS CONFIRMED**

✅ **Algorhythm service is successfully deployed and running!**
- Service starts successfully in Cloud Run
- Container listens on port 8080
- Basic infrastructure is working
- Ready for Phase 2 implementation

---

## 🚀 **PHASE 2: RE-ENABLE CORE FEATURES**

### **Priority 1: Re-enable WebhookModule (CRITICAL)**

This is the most important step for integration with NNA Registry.

#### **Step 1: Update app.module.ts**
```typescript
// src/app.module.ts
@Module({
  imports: [
    // ... existing imports
    
    // ✅ RE-ENABLE: WebhookModule (Phase 2)
    WebhookModule,
    
    // ✅ RE-ENABLE: NnaIntegrationModule (Phase 2)
    NnaIntegrationModule,
    
    // Keep these disabled for now (Phase 3)
    // ...(process.env.MONGODB_URI ? [
    //   RecommendationsModule,
    //   ScoringModule,
    //   AnalyticsModule,
    //   IndexingModule,
    // ] : []),
  ],
  // ... rest of module
})
export class AppModule {}
```

#### **Step 2: Fix Webhook Controller Headers (CRITICAL)**
```typescript
// src/modules/webhooks/webhook.controller.ts
@Post('assets/created')
async handleAssetCreated(
  @Body() payload: AssetCreatedEventDto,
  @Headers('x-algorhythm-signature') signature: string,  // ✅ FIX: Correct header name
  @Headers('x-algorhythm-timestamp') timestamp: string  // ✅ FIX: Correct header name
) {
  // ... existing implementation
}

@Post('assets/updated')
async handleAssetUpdated(
  @Body() payload: AssetUpdatedEventDto,
  @Headers('x-algorhythm-signature') signature: string,  // ✅ FIX: Correct header name
  @Headers('x-algorhythm-timestamp') timestamp: string  // ✅ FIX: Correct header name
) {
  // ... existing implementation
}

@Post('composites/created')
async handleCompositeCreated(
  @Body() payload: CompositeCreatedEventDto,
  @Headers('x-algorhythm-signature') signature: string,  // ✅ FIX: Correct header name
  @Headers('x-algorhythm-timestamp') timestamp: string  // ✅ FIX: Correct header name
) {
  // ... existing implementation
}

// ✅ ADD: Asset Deleted Endpoint (CRITICAL)
@Post('assets/deleted')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Handle asset deletion webhook from NNA Registry' })
async handleAssetDeleted(
  @Body() payload: AssetDeletedEventDto,
  @Headers('x-algorhythm-signature') signature: string,
  @Headers('x-algorhythm-timestamp') timestamp: string
) {
  this.logger.log(`🔄 Processing asset deleted webhook: ${payload.assetId}`);
  
  try {
    const result = await this.webhookService.processAssetDeleted(payload, signature, timestamp);
    this.logger.log(`✅ Asset deleted webhook processed successfully: ${payload.assetId}`);
    return result;
  } catch (error) {
    this.logger.error(`❌ Asset deleted webhook failed: ${error.message}`);
    throw error;
  }
}
```

#### **Step 3: Add Asset Deleted DTO**
```typescript
// src/modules/webhooks/dto/webhook-events.dto.ts
export class AssetDeletedEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.deleted';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}
```

#### **Step 4: Add Asset Deleted Processing**
```typescript
// src/modules/webhooks/webhook.service.ts
async processAssetDeleted(
  payload: AssetDeletedEventDto,
  signature: string,
  timestamp: string
): Promise<{ success: boolean; message: string; assetId: string }> {
  try {
    this.logger.log(`🔄 Processing asset deleted webhook: ${payload.assetId}`);

    // Validate webhook signature
    await this.validationService.validateSignature(payload, signature, timestamp);

    // Process asset deletion event
    await this.eventProcessor.processAssetDeleted(payload);

    this.logger.log(`✅ Asset deleted webhook processed: ${payload.assetId}`);
    return { 
      success: true, 
      message: 'Asset deleted webhook processed successfully',
      assetId: payload.assetId
    };
  } catch (error) {
    this.logger.error(`❌ Asset deleted webhook failed: ${error.message}`);
    throw new BadRequestException(`Webhook processing failed: ${error.message}`);
  }
}
```

#### **Step 5: Add Asset Deleted Event Processing**
```typescript
// src/modules/events/event-processor.service.ts
async processAssetDeleted(event: AssetDeletedEventDto): Promise<void> {
  try {
    this.logger.log(`🔄 Processing asset deleted event: ${event.assetId}`);

    // For now, just log the event (indexing will be enabled in Phase 3)
    this.logger.log(`📝 Asset deleted event logged: ${event.assetId}`);

    this.logger.log(`✅ Asset deleted event processed: ${event.assetId}`);
  } catch (error) {
    this.logger.error(`❌ Failed to process asset deleted event: ${error.message}`);
    throw error;
  }
}
```

### **Priority 2: Fix Environment Variable Names**

#### **Step 1: Update Webhook Validation Service**
```typescript
// src/modules/webhooks/webhook-validation.service.ts
async validateSignature(
  payload: any,
  signature: string,
  timestamp: string
): Promise<boolean> {
  // ✅ FIX: Use correct environment variable name
  const webhookSecret = this.configService.get<string>('ALGORHYTHM_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    this.logger.error('❌ Algorhythm webhook secret not configured');
    throw new UnauthorizedException('Algorhythm webhook secret not configured');
  }
  
  // ... rest of implementation
}
```

#### **Step 2: Update Environment Configuration**
```typescript
// config/environment.development.ts
export const developmentConfig = {
  // ... existing config
  
  // ✅ ADD: Webhook configuration
  ALGORHYTHM_WEBHOOK_SECRET: '43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a',
  ALGORHYTHM_WEBHOOK_URL: 'https://algorhythm.dev.reviz.dev/webhooks',
  
  // ... rest of config
};
```

### **Priority 3: Re-enable NnaIntegrationModule**

#### **Step 1: Update NNA Integration Service**
```typescript
// src/modules/nna-integration/nna-registry.service.ts
// ✅ VERIFY: Service is already implemented correctly
// ✅ VERIFY: Headers and authentication are correct
// ✅ VERIFY: Error handling is robust
```

---

## 🧪 **PHASE 2 TESTING PLAN**

### **Step 1: Deploy Phase 2 Changes**
1. **Commit and push** the Phase 2 changes
2. **Monitor deployment** in GitHub Actions
3. **Verify service starts** successfully

### **Step 2: Test Webhook Endpoints**
```bash
# Test webhook endpoints are accessible
curl -X GET https://dev.algorhythm.media/webhooks/assets/created
curl -X GET https://dev.algorhythm.media/webhooks/assets/updated
curl -X GET https://dev.algorhythm.media/webhooks/composites/created
curl -X GET https://dev.algorhythm.media/webhooks/assets/deleted
```

### **Step 3: Test with NNA Registry**
1. **Configure NNA Registry** to send webhooks to Algorhythm
2. **Create test assets** in NNA Registry
3. **Verify webhook delivery** to Algorhythm
4. **Check Algorhythm logs** for webhook processing

---

## 📋 **PHASE 2 CHECKLIST**

### **Critical Fixes (Must Complete)**
- [ ] **Fix webhook controller headers** (`x-algorhythm-signature`, `x-algorhythm-timestamp`)
- [ ] **Add asset deleted endpoint** and processing
- [ ] **Update environment variable names** (`ALGORHYTHM_WEBHOOK_SECRET`)
- [ ] **Re-enable WebhookModule** in app.module.ts
- [ ] **Re-enable NnaIntegrationModule** in app.module.ts

### **Important Fixes (This Week)**
- [ ] **Test webhook endpoints** are accessible
- [ ] **Verify environment variables** are configured
- [ ] **Test with NNA Registry** webhook delivery
- [ ] **Monitor webhook processing** logs

### **Enhancement Fixes (Next Week)**
- [ ] **Add comprehensive testing** for webhook endpoints
- [ ] **Add monitoring and alerting** for webhook delivery
- [ ] **Optimize webhook processing** performance

---

## 🎯 **SUCCESS CRITERIA FOR PHASE 2**

### **Technical Requirements**
- ✅ **Webhook Endpoints**: All 4 endpoints accessible (`/webhooks/assets/created`, `/updated`, `/deleted`, `/composites/created`)
- ✅ **Header Validation**: Correct header names (`x-algorhythm-signature`, `x-algorhythm-timestamp`)
- ✅ **Environment Variables**: Proper configuration (`ALGORHYTHM_WEBHOOK_SECRET`)
- ✅ **Service Integration**: NnaIntegrationModule working

### **Integration Requirements**
- ✅ **NNA Registry Integration**: Webhooks delivered successfully
- ✅ **Event Processing**: Webhook events processed and logged
- ✅ **Error Handling**: Proper error handling and logging
- ✅ **Performance**: Webhook processing < 100ms

---

## 📞 **COORDINATION**

### **For Algorhythm Team**
1. **Implement Phase 2 changes** listed above
2. **Test webhook endpoints** are accessible
3. **Notify NNA Registry team** when Phase 2 is complete
4. **Coordinate integration testing** with NNA Registry team

### **For NNA Registry Team**
1. **Wait for Phase 2 completion** from Algorhythm team
2. **Prepare integration testing** scripts
3. **Configure webhook delivery** to Algorhythm service
4. **Begin integration testing** once Phase 2 is complete

---

## 🚀 **NEXT STEPS**

### **Immediate (Today)**
1. **Algorhythm Team**: Implement Phase 2 critical fixes
2. **Algorhythm Team**: Deploy and test webhook endpoints
3. **Algorhythm Team**: Notify NNA Registry team when ready

### **This Week**
1. **Integration Testing**: Test webhook delivery from NNA Registry
2. **Performance Testing**: Verify webhook processing performance
3. **Error Handling**: Test error scenarios and recovery

### **Next Week**
1. **Phase 3 Planning**: Plan database integration
2. **Full Functionality**: Complete feature set
3. **Production Deployment**: Deploy to production environment

---

## 🎉 **CONCLUSION**

**Phase 1 is complete and successful!** The Algorhythm service is running in Cloud Run.

**Phase 2 is ready to begin!** The critical fixes are identified and ready for implementation.

**Timeline**: Phase 2 can be completed in 1-2 days.

**🎯 Let's make Phase 2 a success and get ready for integration testing!**
