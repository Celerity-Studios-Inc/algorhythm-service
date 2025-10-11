# Algorhythm Integration Implementation Plan
**Date**: October 11, 2025  
**Goal**: Fix ReViz 404 "No templates available" error by integrating NNA Registry with Algorhythm service  

---

## 🎯 **Implementation Strategy**

### **Phase 1: Bulk Export (Immediate)**
- Export existing 47 Composite assets to Algorhythm
- Transform data to Algorhythm-compatible format
- Register templates in Algorhythm system
- Test template recommendations

### **Phase 2: Real-time Webhooks (This Week)**
- Implement webhook notifications for new Composite assets
- Add real-time sync for asset updates
- Ensure data consistency between systems
- Monitor webhook delivery and retry failed notifications

### **Phase 3: Advanced Features (Future)**
- Add webhook authentication (HMAC signatures)
- Implement retry logic with exponential backoff
- Add monitoring and alerting for webhook failures
- Support for asset deletion and updates

---

## 🔧 **Technical Implementation**

### **1. Bulk Export API (Already Implemented)**
```typescript
// GET /api/algorhythm-export/composites
// GET /api/algorhythm-export/composites/by-song/:songId
// POST /api/algorhythm-export/sync-to-algorhythm
```

### **2. Webhook Service (New Implementation)**
```typescript
// Webhook notification service
@Injectable()
export class AlgorhythmWebhookService {
  async notifyCompositeCreated(asset: Asset): Promise<void>
  async notifyCompositeUpdated(asset: Asset): Promise<void>
  async notifyCompositeDeleted(assetId: string): Promise<void>
}
```

### **3. Data Transformation (New Implementation)**
```typescript
// Transform NNA format to Algorhythm format
interface AlgorhythmTemplate {
  templateId: string;
  songId: string;
  metadata: AlgorhythmMetadata;
  synergyScore: number;
  gcpUrl: string;
  components: ComponentData[];
}
```

### **4. Error Handling (New Implementation)**
```typescript
// Retry logic with exponential backoff
async sendWebhookWithRetry(data: any, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.sendWebhook(data);
      return;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await this.delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

---

## 📁 **File Structure**

### **New Files to Create**
```
src/modules/assets/services/
├── algorhythm-webhook.service.ts          # Webhook service
├── algorhythm-data-transformer.service.ts # Data transformation
└── algorhythm-sync.service.ts             # Sync orchestration

src/modules/assets/dto/
├── algorhythm-template.dto.ts             # Algorhythm template DTO
└── webhook-payload.dto.ts                 # Webhook payload DTO

src/modules/assets/controllers/
└── algorhythm-webhook.controller.ts      # Webhook receiver (for testing)
```

### **Files to Modify**
```
src/modules/assets/
├── assets.service.ts                      # Add webhook calls
├── assets.module.ts                       # Add new services
└── algorhythm-export.controller.ts        # Enhance existing export
```

---

## 🔄 **Data Flow Implementation**

### **1. Composite Asset Creation Flow**
```typescript
async createAssetWithMapper(createAssetDto: CreateAssetDto): Promise<Asset> {
  // 1. Create asset in database
  const asset = await this.createAsset(createAssetDto);
  
  // 2. If Composite, notify Algorhythm
  if (asset.layer === 'C') {
    await this.algorhythmWebhookService.notifyCompositeCreated(asset);
  }
  
  return asset;
}
```

### **2. Webhook Notification Flow**
```typescript
async notifyCompositeCreated(asset: Asset): Promise<void> {
  // 1. Transform data to Algorhythm format
  const template = await this.dataTransformer.transformToAlgorhythm(asset);
  
  // 2. Send webhook with retry logic
  await this.sendWebhookWithRetry({
    event: 'composite.created',
    songId: this.extractSongId(asset.name),
    template
  });
}
```

### **3. Algorhythm Integration Flow**
```typescript
// Algorhythm webhook handler
app.post('/webhooks/nna-registry', async (req, res) => {
  const { event, songId, template } = req.body;
  
  switch (event) {
    case 'composite.created':
      await algorhythmService.registerTemplate(songId, template);
      break;
    case 'composite.updated':
      await algorhythmService.updateTemplate(songId, template);
      break;
    case 'composite.deleted':
      await algorhythmService.deleteTemplate(songId, template.templateId);
      break;
  }
  
  res.status(200).json({ success: true });
});
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
describe('AlgorhythmWebhookService', () => {
  it('should notify Algorhythm when Composite is created', async () => {
    const asset = createMockCompositeAsset();
    await webhookService.notifyCompositeCreated(asset);
    expect(mockWebhookCall).toHaveBeenCalledWith(expectedPayload);
  });
});
```

### **Integration Tests**
```typescript
describe('Algorhythm Integration', () => {
  it('should sync Composite assets to Algorhythm', async () => {
    const response = await request(app)
      .get('/api/algorhythm-export/composites/by-song/1.018.003.002');
    
    expect(response.body.composites).toHaveLength(44);
    expect(response.body.success).toBe(true);
  });
});
```

### **End-to-End Tests**
```typescript
describe('ReViz Template Recommendations', () => {
  it('should return templates for song 1.018.003.002', async () => {
    const response = await request(algorhythmAPI)
      .post('/api/v1/recommend/template')
      .send({ song_id: '1.018.003.002' });
    
    expect(response.status).toBe(200);
    expect(response.body.templates).toHaveLength(44);
  });
});
```

---

## 📊 **Monitoring & Observability**

### **Metrics to Track**
- **Webhook delivery success rate**: Target 99.9%
- **Webhook response time**: Target < 500ms
- **Template registration success**: Target 100%
- **Data consistency**: Zero mismatches between systems

### **Logging Strategy**
```typescript
// Webhook delivery logs
this.logger.log(`🎯 [WEBHOOK] Sending Composite ${asset._id} to Algorhythm`);
this.logger.log(`✅ [WEBHOOK] Successfully delivered to Algorhythm`);
this.logger.error(`❌ [WEBHOOK] Failed to deliver to Algorhythm: ${error.message}`);
```

### **Alerting Rules**
- **Webhook failure rate > 5%**: Alert development team
- **Template registration failure**: Alert immediately
- **Data inconsistency detected**: Alert immediately

---

## 🚀 **Deployment Strategy**

### **Phase 1: Bulk Export (Today)**
1. **Deploy** existing export API endpoints
2. **Test** with Algorhythm team
3. **Verify** template recommendations work
4. **Monitor** for any issues

### **Phase 2: Webhook Integration (This Week)**
1. **Deploy** webhook service
2. **Configure** Algorhythm webhook endpoint
3. **Test** real-time sync
4. **Monitor** webhook delivery

### **Phase 3: Production (Next Week)**
1. **Enable** webhooks for all new Composite assets
2. **Monitor** system performance
3. **Optimize** based on usage patterns
4. **Scale** as needed

---

## 🔒 **Security Considerations**

### **Webhook Authentication**
```typescript
// HMAC signature verification
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== req.headers['x-signature']) {
  throw new Error('Invalid webhook signature');
}
```

### **Data Validation**
```typescript
// Validate webhook payload
const schema = Joi.object({
  event: Joi.string().valid('composite.created', 'composite.updated', 'composite.deleted'),
  songId: Joi.string().required(),
  template: Joi.object().required()
});

const { error } = schema.validate(req.body);
if (error) throw new Error(`Invalid payload: ${error.message}`);
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Bulk Export**
- [ ] Deploy export API endpoints
- [ ] Test with Algorhythm team
- [ ] Verify 44 templates for song `1.018.003.002`
- [ ] Confirm ReViz app receives templates

### **Phase 2: Webhook Service**
- [ ] Create `AlgorhythmWebhookService`
- [ ] Create `AlgorhythmDataTransformer`
- [ ] Add webhook calls to asset creation
- [ ] Implement retry logic
- [ ] Add error handling

### **Phase 3: Testing & Monitoring**
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Add monitoring and alerting
- [ ] Test end-to-end flow
- [ ] Performance testing

### **Phase 4: Production**
- [ ] Deploy to production
- [ ] Monitor webhook delivery
- [ ] Verify template recommendations
- [ ] Scale as needed

---

**Status**: ✅ Implementation Plan Complete  
**Next**: Source Code Implementation
