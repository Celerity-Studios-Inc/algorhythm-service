# 🔗 **WEBHOOK ARCHITECTURE V2.0 - EVENT-DRIVEN INTEGRATION**

## 🎯 **OVERVIEW**

This document outlines the new event-driven webhook architecture for the Algorhythm service integration with the NNA Registry service. This architecture replaces the previous export-based integration with a real-time, autonomous event-driven system.

## 🏗️ **ARCHITECTURE PRINCIPLES**

### **Event-Driven Design**
- **Real-time Synchronization**: Events trigger immediate updates
- **Autonomous Operation**: Services operate independently
- **Loose Coupling**: Services communicate via events only
- **Fault Tolerance**: System continues operating even if one service fails

### **Security-First Approach**
- **HMAC Signature Validation**: All webhook payloads are cryptographically signed
- **Timestamp Validation**: Prevents replay attacks with 5-minute tolerance
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Payload Validation**: Complete event structure validation

## 🚨 **CRITICAL: ENVIRONMENT VARIABLE ARCHITECTURE**

### **⚠️ ENVIRONMENT VARIABLE MAPPING REQUIREMENTS**

**CRITICAL**: The webhook architecture requires specific environment variable mapping between code and deployment. This mapping MUST be verified for every deployment:

| **Component** | **Code Expects** | **Deployment Sets** | **Priority** | **Critical** |
|---------------|------------------|---------------------|--------------|--------------|
| **Webhook Validation** | `WEBHOOK_SECRET` | `WEBHOOK_SECRET` | **PRIMARY** | ✅ **YES** |
| **Webhook Validation** | `ALGORHYTHM_WEBHOOK_SECRET` | `ALGORHYTHM_WEBHOOK_SECRET` | **FALLBACK** | ✅ **YES** |
| **Webhook Service** | `ALGORHYTHM_WEBHOOK_URL` | `ALGORHYTHM_WEBHOOK_URL` | **PRIMARY** | ✅ **YES** |
| **Webhook Service** | `ALGORHYTHM_WEBHOOK_MAX_RETRIES` | `ALGORHYTHM_WEBHOOK_MAX_RETRIES` | **PRIMARY** | ✅ **YES** |
| **Webhook Service** | `ALGORHYTHM_WEBHOOK_RETRY_DELAY` | `ALGORHYTHM_WEBHOOK_RETRY_DELAY` | **PRIMARY** | ✅ **YES** |

### **🔧 CODE LOGIC IMPLEMENTATION**

```typescript
// src/modules/webhooks/webhook-validation.service.ts:16-17
const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET') || 
                     this.configService.get<string>('ALGORHYTHM_WEBHOOK_SECRET');

if (!webhookSecret) {
  this.logger.error('❌ Webhook secret not configured');
  throw new UnauthorizedException('Webhook secret not configured');
}
```

### **🔧 DEPLOYMENT CONFIGURATION**

```yaml
# cloudbuild.yaml - BOTH REQUIRED
'--set-secrets', 'WEBHOOK_SECRET=algorhythm-webhook-secret-dev:latest',
'--set-secrets', 'ALGORHYTHM_WEBHOOK_SECRET=algorhythm-webhook-secret-dev:latest',
'--set-secrets', 'ALGORHYTHM_WEBHOOK_URL=algorhythm-webhook-url-dev:latest',
'--set-secrets', 'ALGORHYTHM_WEBHOOK_MAX_RETRIES=algorhythm-webhook-max-retries-dev:latest',
'--set-secrets', 'ALGORHYTHM_WEBHOOK_RETRY_DELAY=algorhythm-webhook-retry-delay-dev:latest',
```

### **🚨 CRITICAL FAILURE POINTS**

1. **Environment Variable Mismatch**: Code expects `WEBHOOK_SECRET` but deployment only sets `ALGORHYTHM_WEBHOOK_SECRET`
2. **Missing Fallback Variables**: Code has fallback logic but deployment doesn't set fallback variables
3. **Secret Manager Mismatch**: Deployment references secrets that don't exist in Secret Manager
4. **Typo in Environment Variable Names**: Small typos in environment variable names

## 🔧 **COMPONENT ARCHITECTURE**

### **Algorhythm Service Components**

#### **Webhook Infrastructure**
```
┌─────────────────────────────────────────────────────────────┐
│                    Algorhythm Service                      │
├─────────────────────────────────────────────────────────────┤
│  Webhook Controller                                         │
│  ├── POST /webhooks/assets/created                         │
│  ├── POST /webhooks/composites/created                     │
│  └── POST /webhooks/assets/updated                         │
├─────────────────────────────────────────────────────────────┤
│  Webhook Service                                           │
│  ├── HMAC Signature Validation                             │
│  ├── Timestamp Validation                                  │
│  └── Payload Validation                                    │
├─────────────────────────────────────────────────────────────┤
│  Event Processor Service                                   │
│  ├── Asset Event Processing                                │
│  ├── Composite Event Processing                            │
│  └── Internal Event Emission                              │
└─────────────────────────────────────────────────────────────┘
```

#### **Event Processing Pipeline**
```
NNA Registry → Webhook → Validation → Processing → Index Update → ReViz
     ↓            ↓         ↓           ↓            ↓          ↓
Asset Event  Security   Event      Real-time    Local      Fast
Creation     Check      Processing  Indexing    Storage    Queries
```

### **NNA Registry Service Components**

#### **Event Publishing System**
```
┌─────────────────────────────────────────────────────────────┐
│                    NNA Registry Service                     │
├─────────────────────────────────────────────────────────────┤
│  Event Publisher Service                                   │
│  ├── Asset Created Events                                  │
│  ├── Asset Updated Events                                  │
│  └── Composite Created Events                              │
├─────────────────────────────────────────────────────────────┤
│  Webhook Publisher Service                                 │
│  ├── HTTP Webhook Delivery                                 │
│  ├── HMAC Signature Generation                             │
│  └── Retry Logic with Exponential Backoff                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 **EVENT FLOW ARCHITECTURE**

### **Asset Creation Flow**
```
1. NNA Registry: Asset Created
   ↓
2. Event Publisher: Publish AssetCreatedEvent
   ↓
3. Webhook Publisher: Send HTTP webhook to Algorhythm
   ↓
4. Algorhythm: Receive webhook, validate signature
   ↓
5. Event Processor: Process asset event
   ↓
6. Index Update: Update local indexes
   ↓
7. ReViz: Fast queries from local data
```

### **Composite Creation Flow**
```
1. NNA Registry: Composite Asset Created
   ↓
2. Event Publisher: Publish CompositeCreatedEvent with components
   ↓
3. Webhook Publisher: Send HTTP webhook to Algorhythm
   ↓
4. Algorhythm: Receive webhook, validate signature
   ↓
5. Event Processor: Process composite event with components
   ↓
6. Index Update: Update composite indexes and relationships
   ↓
7. ReViz: Fast composite queries from local data
```

## 🔐 **SECURITY ARCHITECTURE**

### **HMAC Signature Validation**
```typescript
// Signature Generation (NNA Registry)
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');

// Signature Validation (Algorhythm)
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');
```

### **Timestamp Validation**
- **Tolerance**: 5 minutes for clock skew
- **Purpose**: Prevent replay attacks
- **Implementation**: Compare event timestamp with current time

### **Payload Validation**
- **Structure**: Validate complete event structure
- **Types**: Ensure proper data types
- **Required Fields**: Validate all required fields present

## 📊 **PERFORMANCE ARCHITECTURE**

### **Latency Optimization**
- **Event Processing**: < 100ms
- **Index Updates**: < 200ms
- **Query Response**: < 200ms
- **Webhook Delivery**: < 500ms

### **Scalability Design**
- **Horizontal Scaling**: Services can scale independently
- **Load Distribution**: Events distributed across multiple processors
- **Caching Strategy**: Local data storage for fast queries
- **Queue Management**: Bull queue system for async processing

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Environment Configuration**
```
Development:
├── Algorhythm: https://algorhythm.dev.reviz.dev/webhooks
├── NNA Registry: https://registry.dev.reviz.dev
└── Secrets: dev-webhook-secret-2025

Staging:
├── Algorhythm: https://algorhythm.stg.reviz.dev/webhooks
├── NNA Registry: https://registry.stg.reviz.dev
└── Secrets: stg-webhook-secret-2025

Production:
├── Algorhythm: https://algorhythm.prod.reviz.dev/webhooks
├── NNA Registry: https://registry.prod.reviz.dev
└── Secrets: prod-webhook-secret-2025
```

### **Secret Management**
- **Google Cloud Secret Manager**: Centralized secret storage
- **GitHub Repository Secrets**: CI/CD integration
- **Environment Variables**: Runtime configuration
- **Rotation Strategy**: 90-day rotation schedule

## 🔧 **INTEGRATION ARCHITECTURE**

### **ReViz Integration**
```
ReViz Frontend → Algorhythm Service → Local Data Storage
     ↓                ↓                    ↓
Template Queries  Fast Responses    Cached Metadata
```

### **API Endpoints**
```
Algorhythm Service:
├── POST /webhooks/assets/created
├── POST /webhooks/composites/created
├── POST /webhooks/assets/updated
├── GET /api/v1/recommend/template
└── GET /api/v1/reviz/complete-experience
```

## 📈 **MONITORING ARCHITECTURE**

### **Health Monitoring**
- **Webhook Endpoints**: Health checks for all endpoints
- **Event Processing**: Monitor event processing success rates
- **Index Updates**: Track index update performance
- **Error Rates**: Monitor and alert on error rates

### **Performance Metrics**
- **Event Latency**: Track event processing time
- **Webhook Success Rate**: Monitor webhook delivery success
- **Index Update Time**: Track index update performance
- **Query Response Time**: Monitor API response times

## 🎯 **BENEFITS OF NEW ARCHITECTURE**

### **Performance Improvements**
- **50% Faster Responses**: Local data access vs HTTP requests
- **Real-time Updates**: No stale data
- **Reduced Latency**: Eliminated API call overhead
- **Better Scalability**: Independent service scaling

### **Reliability Improvements**
- **Fault Tolerance**: Services operate independently
- **Reduced Dependencies**: No tight coupling between services
- **Better Error Handling**: Comprehensive error management
- **Improved Monitoring**: Better visibility into system health

### **Developer Experience**
- **Faster Development**: Local data access
- **Better Testing**: Isolated service testing
- **Easier Debugging**: Clear event flow
- **Simplified Deployment**: Independent deployments

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Webhook Infrastructure (Completed)**
- ✅ Webhook endpoints implemented
- ✅ Security validation implemented
- ✅ Event processing implemented
- ✅ Testing completed

### **Phase 2: Real-time Index Updates (Next)**
- 🔄 Index management system
- 🔄 Local data storage
- 🔄 Query optimization
- 🔄 Performance monitoring

### **Phase 3: API Updates (Future)**
- ⏳ ReViz integration updates
- ⏳ Endpoint optimization
- ⏳ Performance tuning
- ⏳ Documentation updates

## 📞 **SUPPORT AND MAINTENANCE**

### **Troubleshooting**
- **Webhook Failures**: Check signature validation and network connectivity
- **Event Processing**: Monitor event queue and processing times
- **Index Updates**: Verify index update success rates
- **Performance Issues**: Monitor latency and throughput metrics

### **Maintenance Tasks**
- **Secret Rotation**: 90-day rotation schedule
- **Performance Monitoring**: Daily performance reviews
- **Error Analysis**: Weekly error analysis
- **Capacity Planning**: Monthly capacity reviews

---

**🔗 This architecture provides a robust, scalable, and secure foundation for real-time integration between Algorhythm and NNA Registry services.**
