# Guide to Setting Up a New Environment

This document outlines the steps and best practices for creating a new, isolated deployment environment (e.g., `testing`, `uat`) for the NNA Registry Service, based on the learnings from setting up the `staging` environment.

## Guiding Philosophy: Environment Parity

The primary goal is to create an environment that is as identical to production as possible ("environment parity"). This minimizes surprises during deployment and ensures that code tested in a lower environment behaves the same way in production. This means every component must be separate and isolated.

---

## 1. Google Cloud Infrastructure Checklist

For each new environment, create the following dedicated resources in Google Cloud. Use a consistent naming suffix (e.g., `-test`).

- **[ ] Separate Database:** Create a new database within the shared MongoDB Atlas cluster.
  - **Action:** In the connection string, specify the new database name (e.g., `...mongodb.net/nna-registry-service-test?retryWrites=true...`).
  - **⚠️ CRITICAL:** Always use the `nna-registry-service-` prefix for database names to avoid confusion with legacy databases.
- **[ ] Separate Storage Bucket:** Create a new Google Cloud Storage bucket.
  - **Example Name:** `nna-registry-assets-test`
- **[ ] Dedicated IAM Service Account:** This account will run the Cloud Run service.
  - **Example Name:** `nna-registry-test-runner`
  - **Required Roles/Permissions:**
    1.  `Secret Manager Secret Accessor` (to read secrets)
    2.  `Storage Object Admin` (to manage files in the bucket)
- **[ ] Grant CI/CD Permissions:** The main CI/CD service account (`ci-cd-service-account@...`) must be ableto act as the new runner account.
  - **Action:** In the new runner account's permissions, grant the `ci-cd-service-account@...` the `Service Account User` role.
- **[ ] Environment Secrets:** In **Google Cloud Secret Manager**, create a new set of secrets for the environment.
  - **Important:** The names must be an _exact match_ for what the deployment script expects (e.g., `mongodb-uri-test`, `jwt-secret-test`).

---

## 2. CI/CD Pipeline Checklist (GitHub Actions)

- **[ ] Create a New Branch:** Create a long-lived branch for the new environment (e.g., `test`).
- **[ ] Duplicate the Workflow:** Copy an existing workflow file (e.g., `.github/workflows/ci-cd-stg.yml`) to a new file (e.g., `.github/workflows/ci-cd-test.yml`).
- **[ ] Modify the New Workflow File:**
  - Change the `on: push: branches:` trigger to the new branch name.
  - Update the `IMAGE_TAG` to include the environment name to avoid collisions.
  - Update the `gcloud run deploy` command:
    - Change the service name (e.g., `nna-registry-service-testing`).
    - Update the `--service-account` flag to the new runner account's email.
    - Update the `--set-secrets` flag to reference the new secret names from Secret Manager.
    - Change the `NODE_ENV` variable to the new environment's name (e.g., `testing`).

---

## 3. Common Pitfalls & Key Learnings

- **Secret Naming is Crucial:** A "secret not found" error is almost always a typo or mismatch between the name in the `gcloud` command and the name in Google Secret Manager. They are case-sensitive.
- **`--set-secrets` is All-in-One:** Use a single `--set-secrets` flag to specify all secrets, whether they are mounted as files (e.g., `/etc/gcp/key=my-secret:latest`) or exposed as environment variables (e.g., `MY_VAR=my-secret:latest`). Do not mix `--set-secrets` and `--update-secrets`.
- **Database Isolation String:** Always explicitly name the database in the MongoDB URI. If you don't, it will connect to a default database, which could be production.
- **⚠️ CRITICAL - Database Naming Convention:** Always use the `nna-registry-service-` prefix for database names:
  - ✅ **Correct:** `nna-registry-service-dev`, `nna-registry-service-staging`, `nna-registry-service-production`
  - ❌ **Incorrect:** `nna-registry-dev`, `nna-registry-staging`, `nna-registry-production` (legacy databases)
- **CORS Configuration:** Remember to add the new frontend's URL to the backend's CORS allowed origins list in `src/main.ts`.
