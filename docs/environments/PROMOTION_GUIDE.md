# NNA Registry Service Promotion Guide

**Version:** 1.1
**Date:** July 13, 2025
**Status:** Updated for robust two-step deploy and traffic update

## Key Deployment Pattern
- All environments (dev, stg, prod) use a two-step deploy:
  1. Deploy new revision with all secret volumes.
  2. Update traffic to route 100% to the latest revision.
- Both GCP and Firebase keys are mounted as secret volumes.
- Service account and secrets are managed via Google Secret Manager.

## Promotion Steps
- Align ci-cd-stg.yml and ci-cd-prod.yml with ci-cd-dev.yml.
- After successful dev validation, promote to stg, then prod.

## Traffic Routing
- Use `gcloud run services update-traffic ... --to-latest` after deploy to ensure 100% traffic to the latest revision.

## Secret Volumes
- GCP key: /etc/gcp/key
- Firebase key: /app/firebase-key.json

## See ci-cd-dev.yml for canonical configuration.

---

*Last updated: July 13, 2025* 