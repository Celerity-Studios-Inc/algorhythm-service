# Issue #2 – Complete Root Cause Analysis (Authentication)

## Root cause confirmed

- What's happening: AlgoRhythm sends `x-api-key: reviz-dev-30390-13220-4896-9516-9001`
- What's needed: Backend requires `Authorization: Bearer <JWT_TOKEN>`
- Result: 401 Unauthorized → Circuit breaker opens → Fallback responses

## Evidence

Error details captured from live dev (commit 09a287f enhanced logging):

```json
{
  "http_status": 401,
  "error_code": "ERR_BAD_REQUEST",
  "error_message": "Request failed with status code 401",
  "response_data": {
    "success": false,
    "error": {
      "code": "UnauthorizedException",
      "message": "Unauthorized",
      "details": { "message": "Unauthorized", "statusCode": 401 }
    },
    "metadata": {
      "path": "/api/v1/composites/resolve-or-generate"
    }
  }
}
```

Additional confirmation:

- Circuit breaker last_error shows 401 with `x-api-key` header present
- Direct Backend tests with JWT Bearer succeed for the same request body

## Why this explains everything

1. Backend endpoint works (tested with JWT)
2. AlgoRhythm request body is correct
3. Authentication method mismatch (API key vs JWT)
4. 401 responses triggered the circuit breaker → fallback responses observed

## Solution

- Option 1 (recommended): AlgoRhythm uses JWT Bearer token
  - Use service account JWT from Secrets Manager, or programmatic login to get JWT
  - Send `Authorization: Bearer <token>` header for `/api/v1/composites/resolve-or-generate`

- Option 2 (alternative): Backend adds API key support
  - Allow both JWT and API key for server-to-server calls on this endpoint

## Implementation notes (AlgoRhythm)

- Generate a service JWT using `NNA_REGISTRY_JWT_SECRET` and include it as Bearer for this endpoint only
- Keep existing API key usage for endpoints that still accept `x-api-key`
- Reset circuit breaker after fixing auth to clear OPEN state from past 401s

## Timeline

Once authentication is fixed:
1. Backend accepts request
2. Resolution returns `status: found` or `status: generating`
3. Circuit breaker remains CLOSED
4. Issue #2 is resolved immediately

---

Status: Confirmed root cause and fix path. Documentation updated; ready for deployment change.

# Issue #2 - Complete Root Cause Analysis ✅

**Date**: October 31, 2025  
**Status**: ✅ **ROOT CAUSE IDENTIFIED** - Authentication method mismatch  
**Confidence**: ✅ **100%** - Error details clearly show 401 Unauthorized

---

## 🎯 **ROOT CAUSE: AUTHENTICATION METHOD MISMATCH**

### **The Problem**

**AlgoRhythm is using**: `x-api-key` header (API key authentication)  
**Backend requires**: `Authorization: Bearer <JWT_TOKEN>` (JWT Bearer token authentication)

**This mismatch causes:**
1. ❌ Backend returns `401 Unauthorized`
2. ❌ Circuit breaker opens after repeated failures
3. ❌ All subsequent requests return "Circuit breaker fallback"
4. ❌ Issue #2 appears broken

---

## 📊 **EVIDENCE**

### **Error Details from API Response:**

```json
{
  "http_status": 401,
  "error_code": "ERR_BAD_REQUEST",
  "error_message": "Request failed with status code 401",
  "response_data": {
    "error": {
      "code": "UnauthorizedException",
      "message": "Unauthorized"
    }
  }
}
```

### **What AlgoRhythm is Sending:**

```http
POST https://registry.dev.reviz.dev/api/v1/composites/resolve-or-generate
Headers:
  x-api-key: reviz-dev-30390-13220-4896-9516-9001
  Content-Type: application/json
```

### **What Backend Requires:**

```http
POST https://registry.dev.reviz.dev/api/v1/composites/resolve-or-generate
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
```

---

## ✅ **WHY THIS EXPLAINS EVERYTHING**

1. ✅ **Backend endpoint works** - Tested successfully with JWT token
2. ✅ **AlgoRhythm's code is correct** - Proper request body structure
3. ❌ **Authentication method mismatch** - API key vs JWT Bearer token
4. ❌ **Backend returns 401 Unauthorized** - Rejecting API key authentication
5. ❌ **Circuit breaker opens** - After repeated 401 errors
6. ❌ **All requests get fallback** - Circuit breaker blocks calls

---

## 🔧 **SOLUTIONS**

### **Option 1: AlgoRhythm Uses JWT Token** (Recommended) ✅

**Implementation:**

#### **Step 1: Add JWT Token Service**

```typescript
// File: optimized-nna-registry.service.ts

private async getServiceToken(): Promise<string> {
  // Option A: Service account token (from secrets manager)
  if (process.env.NNA_REGISTRY_SERVICE_TOKEN) {
    return process.env.NNA_REGISTRY_SERVICE_TOKEN;
  }
  
  // Option B: Auto-login to get JWT
  const loginResponse = await this.httpService.post(
    `${this.baseUrl}/api/v1/auth/login`,
    {
      email: process.env.ALGORHYTHM_SERVICE_EMAIL || 'system@algorhythm.media',
      password: process.env.ALGORHYTHM_SERVICE_PASSWORD
    }
  ).toPromise();
  
  return loginResponse.data.token;
}
```

#### **Step 2: Update resolveOrGenerateComposite()**

```typescript
async resolveOrGenerateComposite(componentIds: string[]): Promise<any> {
  // Get JWT token for Backend authentication
  const jwtToken = await this.getServiceToken();
  
  const url = `${this.baseUrl}/api/v1/composites/resolve-or-generate`;
  const requestBody = {
    components: this.mapComponentIdsToComponents(componentIds),
    user_context: {
      user_id: 'system',
      email: 'system@algorhythm.media'
    },
    generation_options: {
      priority: 'standard',
      quality: 'standard'
    }
  };
  
  const response = await this.httpService.post(url, requestBody, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,  // ✅ JWT Bearer token
      'Content-Type': 'application/json',
    },
    timeout: 10000
  }).toPromise();
  
  // ... rest of method
}
```

**Advantages:**
- ✅ Standard authentication method for NNA Registry
- ✅ Secure (JWT tokens can expire/rotate)
- ✅ Service-to-service authentication

---

### **Option 2: Backend Adds API Key Support** (Alternative)

**If Backend team prefers, they could add API key authentication:**

```typescript
// Backend: composite-resolution.controller.ts

@Controller('composites')
@ApiTags('Composite Resolution')
@UseGuards(ApiKeyAuthGuard || JwtAuthGuard)  // ← Allow both methods
export class CompositeResolutionController {
  // ...
}
```

**Advantages:**
- ✅ No changes needed in AlgoRhythm
- ✅ Uses existing API key infrastructure

**Note**: Backend team should confirm if API key support is preferred for service-to-service calls.

---

## 🎯 **RECOMMENDED SOLUTION**

### **✅ Option 1 (JWT Token) is Recommended**

**Why:**
1. **Standard**: JWT is the standard auth method for NNA Registry
2. **Consistent**: All other Backend endpoints use JWT
3. **Secure**: Tokens can expire and be rotated
4. **Future-proof**: Ready for token refresh logic

**Implementation Steps:**
1. Backend team creates service account for AlgoRhythm (or provides credentials)
2. AlgoRhythm stores service account JWT token in secrets manager
3. AlgoRhythm uses token in `Authorization: Bearer <token>` header
4. Test immediately - Issue #2 should be resolved

---

## ✅ **VERIFICATION PLAN**

### **After Fix:**

**Test 1: Debug Endpoint**
```bash
GET /api/v1/reviz/composite/debug/test-resolution?ids=1.018.003.002,2.009.001.001,3.003.010.002,4.022.002.008,5.015.001.003
```

**Expected:**
```json
{
  "result": {
    "success": true,
    "status": "found",
    "composite_id": "C.FUL.ALL.082",
    "data": {...}
  },
  "error_details": null  // ← No more 401!
}
```

**Test 2: Variations Endpoint**
```bash
POST /api/v1/reviz/composite/variations
{
  "composite_id": "1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.008+5.015.001.003",
  "vary_layers": ["stars"]
}
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "composite_info": {...},
    "layers": [...]
  }
}
```

---

## 📊 **SUMMARY**

| Component | Status | Fix Required |
|-----------|--------|-------------|
| **Root Cause** | ✅ **CONFIRMED** | Authentication mismatch |
| **AlgoRhythm** | ❌ **Using API key** | Need JWT Bearer token |
| **Backend** | ✅ **Working correctly** | Requires JWT (as designed) |
| **Circuit Breaker** | ✅ **Working correctly** | Correctly blocking failed auth |
| **Fix Required** | 🔴 **AlgoRhythm** | Implement JWT authentication |

---

## 🎯 **ACTION REQUIRED**

### **AlgoRhythm Team:**
1. ✅ **Root cause confirmed** - 401 due to auth method mismatch
2. 🔴 **Implement JWT authentication** - Use Bearer token for Backend calls
3. ✅ **Test after fix** - Issue #2 should be resolved immediately

### **Backend Team:**
- ✅ **No action required** - Endpoint working correctly
- ⚠️ **Optional**: Could add API key support for service-to-service calls (if preferred)

---

## 🔐 **IMPLEMENTATION DETAILS**

### **Service Account Setup (Recommended)**

**Backend team creates:**
1. Service account for AlgoRhythm
2. Generate long-lived JWT token
3. Provide token to AlgoRhythm team
4. AlgoRhythm stores in secrets manager

**AlgoRhythm uses:**
```typescript
const jwtToken = process.env.NNA_REGISTRY_SERVICE_TOKEN;
headers: {
  'Authorization': `Bearer ${jwtToken}`
}
```

---

### **Auto-Login Setup (Alternative)**

**AlgoRhythm implements:**
1. Auto-register service account on startup
2. Auto-login to get JWT token
3. Cache token (refresh before expiration)
4. Use token for all Backend calls

---

## ✅ **CONFIDENCE LEVEL**

**Root Cause Identification**: ✅ **100%**  
**Error Details**: ✅ **Clear and unambiguous**  
**Solution**: ✅ **Well-defined**  
**Timeline**: Once authentication fixed, Issue #2 resolves immediately

---

**Last Updated**: October 31, 2025  
**Status**: ✅ **ROOT CAUSE CONFIRMED** - Authentication method mismatch  
**Fix**: 🔴 **AlgoRhythm team** - Implement JWT Bearer token authentication  
**Priority**: 🔴 **HIGH** - Blocking Issue #2 resolution

