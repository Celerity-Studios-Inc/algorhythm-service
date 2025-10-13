# AlgoRhythm API Endpoints - CANONICAL SPECIFICATION

Status: LOCKED – changes require explicit approval
Last Updated: 2025-10-13

## Template Recommendations

- Endpoint: POST /api/v1/recommend/template
- Dev URL: https://dev.algorhythm.media/api/v1/recommend/template
- Stg URL: https://stg.algorhythm.media/api/v1/recommend/template
- Prod URL: https://algorhythm.media/api/v1/recommend/template

OpenAPI Contract (well-known):
- GET https://dev.algorhythm.media/.well-known/openapi.json

## Removed/Legacy

- REMOVED: POST /api/v1/algorhythm/recommend/template
  - Runtime behavior: 410 Gone with Location header to canonical path
  - Reason: Endpoint standardization – immediate cutover

## Governance

- No new routes or path changes without written approval.
- All changes must include: migration guide, OpenAPI update, and docs PR.
