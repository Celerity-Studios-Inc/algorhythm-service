# AlgoRhythm API Endpoint Standardization

**Version:** 2.0.0  
**Status:** 🟢 CANONICAL REFERENCE  
**Last Updated:** October 13, 2025  

## 🎯 Purpose

This document defines the **single source of truth** for AlgoRhythm API endpoints. All implementations, documentation, and integrations MUST use these exact paths.

---

## 📍 Canonical API Endpoints

### Base Configuration

| Environment | Base URL | Status |
|------------|----------|---------|
| Production | `https://algorhythm.media` | 🟢 Live |
| Staging | `https://stg.algorhythm.media` | 🟢 Live |
| Development | `https://dev.algorhythm.media` | 🟢 Live |
| Local | `http://localhost:3000` | 🟢 Available |

**API Version:** All endpoints are versioned under `/api/v1`

**Full Base URL Pattern:**
```
{BASE_URL}/api/v1/algorhythm
```

---

## 🎵 1. Template Recommendation

**Get recommended video template for a song**

### Endpoint
```http
POST /api/v1/algorhythm/recommend/template
```

### Full URLs
```
Production:  https://algorhythm.media/api/v1/algorhythm/recommend/template
Staging:     https://stg.algorhythm.media/api/v1/algorhythm/recommend/template
Development: https://dev.algorhythm.media/api/v1/algorhythm/recommend/template
Local:       http://localhost:3000/api/v1/algorhythm/recommend/template
```

### Request
```typescript
{
  "song_id": string;  // Required: Song identifier
  "user_preferences"?: {
    "style"?: string[];
    "mood"?: string[];
    "exclude_templates"?: string[];
  }
}
```

### Response
```typescript
{
  "template_id": string;
  "nna_address": string;
  "compatibility_score": number;  // 0.0 - 1.0
  "layers": {
    "stars": string;
    "looks": string;
    "moves": string;
    "worlds": string;
    "songs": string;
  };
  "reasoning": string;
  "alternatives": Array<{
    "template_id": string;
    "nna_address": string;
    "compatibility_score": number;
  }>;
  "metadata": {
    "cached": boolean;
    "response_time_ms": number;
    "timestamp": string;  // ISO 8601
    "algorithm_version": string;
  }
}
```

### Example
```bash
curl -X POST https://algorhythm.media/api/v1/algorhythm/recommend/template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "song_id": "song_12345",
    "user_preferences": {
      "style": ["energetic", "modern"],
      "mood": ["upbeat"]
    }
  }'
```

---

## 🎬 2. Composite Recommendation

**Get detailed information about a specific composite**

### Endpoint
```http
GET /api/v1/algorhythm/recommend/composite/{composite_id}
```

### Full URLs
```
Production:  https://algorhythm.media/api/v1/algorhythm/recommend/composite/{composite_id}
Staging:     https://stg.algorhythm.media/api/v1/algorhythm/recommend/composite/{composite_id}
Development: https://dev.algorhythm.media/api/v1/algorhythm/recommend/composite/{composite_id}
```

### Path Parameters
- `composite_id` (string, required): Composite identifier

### Response
```typescript
{
  "composite_id": string;
  "nna_address": string;
  "layers": {
    "stars": {
      "id": string;
      "nna_address": string;
      "metadata": object;
    };
    "looks": { /* same structure */ };
    "moves": { /* same structure */ };
    "worlds": { /* same structure */ };
    "songs": { /* same structure */ };
  };
  "metadata": {
    "cached": boolean;
    "query_time_ms": number;
    "response_time_ms": number;
    "timestamp": string;
  }
}
```

### Example
```bash
curl -X GET https://algorhythm.media/api/v1/algorhythm/recommend/composite/comp_67890 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🎨 3. Layer Variations

**Get alternative layers for a composite**

### Endpoint
```http
POST /api/v1/algorhythm/variations/layer
```

### Full URLs
```
Production:  https://algorhythm.media/api/v1/algorhythm/variations/layer
Staging:     https://stg.algorhythm.media/api/v1/algorhythm/variations/layer
Development: https://dev.algorhythm.media/api/v1/algorhythm/variations/layer
```

### Request
```typescript
{
  "composite_id": string;  // Required
  "layer_type": "stars" | "looks" | "moves" | "worlds";  // Required
  "limit"?: number;  // Optional, default: 10, max: 50
  "exclude_ids"?: string[];  // Optional: IDs to exclude
}
```

### Response
```typescript
{
  "composite_id": string;
  "layer_type": string;
  "variations": Array<{
    "layer_id": string;
    "nna_address": string;
    "compatibility_score": number;
    "metadata": {
      "style": string[];
      "mood": string[];
      "tags": string[];
    }
  }>;
  "cached": boolean;
  "query_time_ms": number;
  "response_time_ms": number;
}
```

### Example
```bash
curl -X POST https://algorhythm.media/api/v1/algorhythm/variations/layer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "composite_id": "comp_67890",
    "layer_type": "stars",
    "limit": 10
  }'
```

---

## 🏥 4. Health Check

**Service health and status**

### Endpoint
```http
GET /api/v1/algorhythm/health
```

### Response
```typescript
{
  "status": "ok" | "degraded" | "down";
  "nna_registry": boolean;
  "cache": boolean;
  "timestamp": string;
  "version": string;
  "uptime_seconds": number;
}
```

### Example
```bash
curl https://algorhythm.media/api/v1/algorhythm/health
```

---

## 🔧 5. Admin Endpoints

### Cache Refresh
```http
POST /api/v1/algorhythm/admin/cache/refresh
```

**Request:**
```typescript
{
  "type": "template" | "composite" | "layer";
  "identifier": string;
}
```

### Cache Statistics
```http
GET /api/v1/algorhythm/admin/cache/stats
```

**Response:**
```typescript
{
  "total_keys": number;
  "template_keys": number;
  "composite_keys": number;
  "layer_keys": number;
  "cache_hit_rate": number;
  "uptime_seconds": number;
}
```

---

## 🔒 Authentication

All endpoints (except `/health`) require authentication.

### API Key (Recommended)
```http
Authorization: Bearer YOUR_API_KEY
```

### JWT Token (For user-specific requests)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ❌ Deprecated Endpoints

**These endpoints are DEPRECATED and will be removed in v2.0:**

| Deprecated Path | Use Instead | Removal Date |
|----------------|-------------|--------------|
| `/api/v1/recommend/template` | `/api/v1/algorhythm/recommend/template` | Dec 31, 2025 |
| `/recommend/template` | `/api/v1/algorhythm/recommend/template` | Dec 31, 2025 |
| `/api/recommend/*` | `/api/v1/algorhythm/recommend/*` | Dec 31, 2025 |

**Migration Notice:**
These deprecated endpoints currently redirect to the canonical paths but will return `410 Gone` after the removal date.

---

## 🌐 CORS Configuration

**Allowed Origins (Production):**
```
https://reviz.io
https://app.reviz.io
https://www.reviz.io
```

**Allowed Origins (Staging/Development):**
```
https://stg.reviz.io
https://dev.reviz.io
http://localhost:*
```

**Allowed Methods:**
```
GET, POST, OPTIONS
```

**Allowed Headers:**
```
Content-Type, Authorization, X-Request-ID
```

---

## 📊 Rate Limiting

| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| Template Recommendation | 100 requests | per minute |
| Composite Recommendation | 200 requests | per minute |
| Layer Variations | 150 requests | per minute |
| Health Check | Unlimited | - |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## 🚨 Error Responses

### Standard Error Format
```typescript
{
  "error": {
    "code": string;      // Machine-readable error code
    "message": string;   // Human-readable message
    "details"?: any;     // Optional additional context
    "timestamp": string; // ISO 8601
    "request_id": string;
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Dependency unavailable |

### Example Error
```json
{
  "error": {
    "code": "SONG_NOT_FOUND",
    "message": "No matching templates found for song: song_12345",
    "details": {
      "song_id": "song_12345",
      "searched_templates": 0
    },
    "timestamp": "2025-10-13T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## 🧪 Testing Endpoints

### Postman Collection
Download the official Postman collection:
```
https://algorhythm.media/api/v1/postman-collection.json
```

### OpenAPI Specification
Access the OpenAPI (Swagger) spec:
```
https://algorhythm.media/api/v1/openapi.json
```

### Interactive Docs
View interactive API documentation:
```
https://algorhythm.media/api/v1/docs
```

---

## 📝 Request ID Tracing

All responses include a unique request ID for debugging:

```http
X-Request-ID: req_abc123def456
```

Include this ID when reporting issues or requesting support.

---

## 🔄 Versioning Strategy

### Current Version: v1

**Version in URL:** `/api/v1/`

**Breaking Changes:**
- When introducing breaking changes, a new version will be released (e.g., `/api/v2/`)
- Previous version will be supported for minimum 6 months
- Deprecation warnings will be added 3 months before removal

**Non-Breaking Changes:**
- New optional fields
- New endpoints
- Performance improvements
- Bug fixes

These do NOT require version changes.

---

## 📞 Support & Contact

**Questions about API?**
- Documentation: https://docs.algorhythm.media
- Support: support@algorhythm.media
- Slack: #algorhythm-api

**Report Issues:**
- GitHub: https://github.com/reviz/algorhythm/issues
- Email: bugs@algorhythm.media

---

## ✅ Frontend Integration Checklist

When integrating AlgoRhythm API:

- [ ] Use the exact canonical endpoints from this document
- [ ] Include `Authorization` header with valid API key/token
- [ ] Handle all documented error responses
- [ ] Implement exponential backoff for retries
- [ ] Respect rate limits
- [ ] Log `X-Request-ID` for debugging
- [ ] Use TypeScript interfaces from this document
- [ ] Test against staging environment first
- [ ] Monitor response times and alert on slowness

---

## 📚 Code Examples

### TypeScript SDK

```typescript
import { AlgoRhythmClient } from '@reviz/algorhythm-client';

const client = new AlgoRhythmClient({
  apiKey: process.env.ALGORHYTHM_API_KEY,
  environment: 'production', // or 'staging', 'development'
});

// Get template recommendation
const recommendation = await client.recommendations.getTemplate({
  song_id: 'song_12345',
  user_preferences: {
    style: ['energetic', 'modern'],
  },
});

console.log(recommendation.template_id);
console.log(recommendation.compatibility_score);
```

### React Hook

```typescript
import { useAlgoRhythm } from '@reviz/algorhythm-hooks';

function TemplateSelector({ songId }: { songId: string }) {
  const { data, loading, error } = useAlgoRhythm.useTemplateRecommendation({
    song_id: songId,
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <TemplateCard
      template={data.template_id}
      score={data.compatibility_score}
    />
  );
}
```

### cURL Examples

See individual endpoint sections above for cURL examples.

---

## 🎯 Summary

**Key Takeaways:**

1. ✅ **ONE canonical path per endpoint** - no variations
2. ✅ **All paths start with** `/api/v1/algorhythm`
3. ✅ **Authentication required** (except health)
4. ✅ **Rate limits apply** - respect the limits
5. ✅ **Errors are standardized** - handle them consistently
6. ❌ **Deprecated paths will be removed** - migrate now

**Questions?** Contact the AlgoRhythm team in Slack #algorhythm-api

---

**Document Status:** 🔒 Locked - No changes without Architecture Review  
**Last Reviewed:** October 13, 2025  
**Next Review:** November 13, 2025  
**Owner:** AlgoRhythm API Team