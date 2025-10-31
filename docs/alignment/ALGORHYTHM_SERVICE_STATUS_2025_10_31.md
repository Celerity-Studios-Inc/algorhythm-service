# AlgoRhythm Service – Status (2025-10-31)

## What Changed Today

### ✅ Authentication
- **JWT Role Fixed**: Changed from `role: 'service'` to `role: 'user'` for NNA Registry authentication
- **Secrets Alignment**: Using NNA Registry's `JWT_SECRET_DEV/STG/PROD` secrets directly (no duplicates)
- **CI Verification**: Added secret-binding check to ensure `NNA_REGISTRY_JWT_SECRET` is properly configured

### ✅ Variations API Robustness
- **Layer Normalization**: Centralized utilities for normalizing layer keys (`stars`/`looks`/`moves`/`worlds`)
- **Source of Truth**: Using `composite.components[]` array instead of parsing composite names
- **Dual-Address Matching**: Matching assets by both HFN (Human-Friendly Name) and MFA (Machine-Friendly Address)
- **Graceful Degradation**: Per-layer error handling with `warnings` array instead of failing entire request
- **HFN Resolution**: Automatically resolves composite HFNs (e.g., `C.FUL.ALL.082`) to database IDs via NNA Registry lookup

### ✅ CI/CD Improvements
- **Post-Deploy Smoke Tests**: Automated tests for variations endpoint (component IDs path + HFN path)
- **Secret Binding Assertion**: CI verifies `NNA_REGISTRY_JWT_SECRET` is bound to deployed revision
- **Status Code Flexibility**: Accepts both 200 and 201 for smoke tests

## Current Behavior

### Accepted `composite_id` Formats
- **Component IDs**: `1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.008+5.015.001.003`
- **Composite HFN**: `C.FUL.ALL.082` (automatically resolved to `_id`)
- **Composite Database ID/MFA**: `68fc36524229fb941ff56d75` or `9.002.025.082`

### Response Structure
- `success: true`
- `data: { composite_info, layers, total_assets, performance_metrics, warnings? }`
- `warnings` entries (if any): `{ layer: 'stars', reason: 'missing_current_component' }`, etc.

## Quick Commands (Dev)

```bash
# Debug resolution (component IDs)
curl -s "https://dev.algorhythm.media/api/v1/reviz/composite/debug/test-resolution?ids=1.018.003.002,2.009.001.001,3.003.010.002,4.022.002.008,5.015.001.003" \
  -H "x-api-key: <REVIZ_DEV_API_KEY>" | jq

# Variations (HFN)
curl -s -X POST "https://dev.algorhythm.media/api/v1/reviz/composite/variations" \
  -H "x-api-key: <REVIZ_DEV_API_KEY>" -H "Content-Type: application/json" \
  -d '{"composite_id":"9.002.025.082","vary_layers":["stars","looks","moves","worlds"],"assets_per_layer":3}' \
  | jq '{success, data: {layers, warnings}}'
```

## Runbook (High Signal)

### If Variations Returns 401
- Verify `NNA_REGISTRY_JWT_SECRET` is bound to Cloud Run revision
- Confirm JWT token payload has `role: 'user'` (not `role: 'service'`)

### If 404 for HFN
- HFN lookup uses NNA Registry's `/api/v1/assets?layer=C&name=<HFN>` endpoint
- Ensure NNA Registry returns that composite by name

### If Single Layer Fails
- Check response for `warnings` array - service degrades gracefully
- Investigate the component for that layer in NNA Registry
- Service returns partial results (other layers still work)

## Next Steps (Deferred)

- **Redis Caching**: Backend team provisioning (see `/docs/alignment/BACKEND_TEAM_REDIS_CACHE_PROVISIONING.md`)
- **Circuit Breaker Unification**: Per-endpoint keys with individual status/reset
- **Standardized Timeouts**: Jittered backoff for idempotent reads
- **Integration Tests**: Edge cases for partial composites and legacy data

---

**Status**: ✅ **ALL CHANGES DEPLOYED AND VERIFIED**  
**Build**: Latest commit `e87c5f0` - smoke tests passing, secret binding verified

