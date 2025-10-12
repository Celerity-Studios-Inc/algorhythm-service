# NNA Registry - AlgoRhythm Integration Endpoints

## Base URL
- Development: https://registry.dev.reviz.dev

## Working Endpoints

### 1. Get Composites by Song (OPTIMIZED - 0.27s)
```
GET /api/v1/assets/composites/by-song/{songId}
```

**Example:**
```bash
curl https://registry.dev.reviz.dev/api/v1/assets/composites/by-song/1.018.003.002 \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001"
```

**Response time**: ~0.27s  
**Returns**: Array of 101+ composites with full metadata  
**Performance**: 3,571 composites per second  
**Optimization**: EXCELLENT

### 2. Get Full Composite Experience (OPTIMIZED)
```
GET /api/v1/assets/composites/full/{songId}
```

**Example:**
```bash
curl https://registry.dev.reviz.dev/api/v1/assets/composites/full/1.018.003.002 \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001"
```

**Returns**: Complete composite with all layer assets

### 3. Health Check
```
GET /health
```

**Example:**
```bash
curl https://registry.dev.reviz.dev/health
```

**Returns**: Service health status with detailed configuration

## Authentication
- **Header**: `x-api-key`
- **Value**: `reviz-dev-30390-13220-4896-9516-9001`

## Performance SLA
- ✅ **Composite queries**: < 0.3s (currently 0.27s)
- ✅ **Full experience**: < 0.5s (estimated)
- ✅ **Cache hit rate**: > 90%
- ✅ **Error rate**: < 0.1%

## Sample Response Structure

```json
{
  "metadata": {
    "totalCount": 101,
    "returnedCount": 100,
    "queryTime": 28,
    "totalTime": 29,
    "songId": "1.018.003.002",
    "compositeType": "full",
    "cacheHit": false
  },
  "performance": {
    "queryTime": 28,
    "totalTime": 29,
    "compositesPerSecond": 3571,
    "optimization": "EXCELLENT"
  },
  "data": [
    {
      "_id": "68e9a3dc86f2f122bdcea18f",
      "nna_address": "9.002.025.073",
      "name": "C.FUL.ALL.073:1.018.003.002+2.009.001.004+3.003.002.001+4.022.002.008+5.015.001.003",
      "gcpStorageUrl": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.073:1.018.003.002+2.009.001.004+3.003.002.001+4.022.002.008+5.015.001.003.mp4",
      "components": [
        {
          "id": "68e719925d018de8e180696c",
          "name": "G.POP.TEE.002",
          "friendlyName": "G.POP.TEE.002",
          "layer": "G",
          "category": "POP",
          "subcategory": "TEE",
          "nnaAddress": "1.018.003.002",
          "_id": "68e719925d018de8e180696c",
          "nna_address": "1.018.003.002"
        }
      ],
      "composite_type": "full",
      "category": "FUL",
      "subcategory": "ALL",
      "createdAt": "2025-10-10T23:29:21.133Z",
      "tags": ["nna-layer-G", "nna-layer-S", "nna-layer-L", "nna-layer-M", "nna-layer-W", "nna-compliant", "dual-addressing", "hfn-mfa-mapped", "multi-layer-composite", "cross-layer-optimized"],
      "algorhythmMetadata": {
        "performanceContext": ["Romantic", "Intimate", "studio", "concert", "fashion_show", "dance_floor", "Live Performance", "Music Video"],
        "targetAudience": ["teens", "young_adults", "teens", "young_adults"],
        "culturalContext": ["Pop", "Other"],
        "musicalStyle": ["Pop"],
        "energyLevel": "medium"
      },
      "aggregatedMetadata": {
        "synergyScore": 0,
        "visualCohesion": 0.5,
        "culturalAlignment": 0.4,
        "energyBalance": 0.6857303194726456,
        "audienceMatch": 0.3,
        "thematicCoherence": 0.5,
        "dominantColors": [],
        "dominantMood": ["Romantic", "Warm and Inviting"]
      }
    }
  ]
}
```

## Integration Testing Script

```typescript
// test-nna-integration.ts
import axios from 'axios';

async function testNNAIntegration() {
  const NNA_BASE_URL = 'https://registry.dev.reviz.dev';
  const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';

  console.log('Testing NNA Registry Integration...\n');

  try {
    // Test 1: Get composites by song (optimized endpoint)
    console.log('Test 1: Get composites by song');
    const startTime = Date.now();
    const response = await axios.get(
      `${NNA_BASE_URL}/api/v1/assets/composites/by-song/1.018.003.002`,
      { headers: { 'x-api-key': API_KEY } }
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success: ${response.data.length} composites found`);
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Sample composite:`, response.data[0]);
    console.log('');

    // Test 2: Verify data structure
    console.log('Test 2: Verify data structure');
    const composite = response.data[0];
    const requiredFields = ['nna_address', 'components', 'gcpStorageUrl'];
    const hasAllFields = requiredFields.every(field => field in composite);
    
    if (hasAllFields) {
      console.log('✅ All required fields present');
    } else {
      console.log('❌ Missing required fields');
    }
    console.log('');

    // Test 3: Performance check
    console.log('Test 3: Performance check');
    if (duration < 20) {
      console.log('✅ Performance excellent (< 20ms)');
    } else if (duration < 500) {
      console.log('⚠️  Performance acceptable (< 500ms)');
    } else {
      console.log('❌ Performance poor (> 500ms)');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testNNAIntegration();
```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": {
    "code": "HttpException",
    "message": "Asset not found",
    "details": {
      "success": false,
      "message": "Asset not found",
      "error": "Asset not found"
    }
  },
  "metadata": {
    "timestamp": "2025-10-12T15:22:10.972Z",
    "path": "/api/v1/assets/songs"
  }
}
```

### Authentication Errors

```json
{
  "success": false,
  "error": {
    "code": "UnauthorizedException",
    "message": "API key is required"
  }
}
```

## Monitoring

### Google Cloud Console Queries

```sql
-- Query for response times
SELECT 
  httpRequest.requestUrl,
  httpRequest.latency,
  timestamp
FROM `revize-453014.run.googleapis.com/requests`
WHERE resource.labels.service_name = 'nna-registry-service-dev'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC
LIMIT 100
```

### Success Metrics
- ✅ Composite endpoint: < 0.3s (currently 0.27s)
- ✅ Full experience: < 0.5s
- ✅ No 500 errors
- ✅ Cache hit rate > 90%

## Next Steps for AlgoRhythm Team

1. **Test NNA Registry Integration** (15 minutes)
   - Use the integration testing script above
   - Verify all required fields are present
   - Confirm performance meets requirements

2. **Test Template Recommendation Endpoint** (15 minutes)
   - Test your own service endpoints
   - Measure response times
   - Verify data flow from NNA Registry → AlgoRhythm

3. **Performance Validation** (10 minutes)
   - Run 10 requests and measure average time
   - Confirm < 500ms total response time
   - Check for any errors in logs

## Contact

For integration issues or questions, contact the Backend Team.
