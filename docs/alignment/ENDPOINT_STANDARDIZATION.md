# Endpoint Standardization - October 2025

Date: 2025-10-13
Type: Immediate Cutover
Impact: Internal testing only (no production impact)

## What Changed

Before (unstable): multiple simultaneous paths
- /api/v1/algorhythm/recommend/template (removed)
- /api/v1/recommend/template (canonical)

After (stable): single canonical path
- POST /api/v1/recommend/template

Legacy behavior
- Legacy paths return 410 Gone with Location header to canonical path

Why immediate cutover
- No official release yet; avoid confusion
- Establish single source of truth immediately

Action Required (clients)
- Update calls to POST /api/v1/recommend/template
- Use OpenAPI at /.well-known/openapi.json for codegen

Enforcement
- CI checks: duplicate route detection and legacy path detection
- Runtime: 410 for legacy paths with structured logging
