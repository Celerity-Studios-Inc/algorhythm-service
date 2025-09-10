# AlgoRhythm Service - Google Cloud Run Deployment

This guide will help you deploy the AlgoRhythm service to Google Cloud Run, sharing infrastructure with your existing NNA Registry service.

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
2. **Docker** installed locally
3. **Access to your GCP project** with the NNA Registry service
4. **MongoDB and Redis** connection details (shared with NNA Registry)

## Quick Deployment

### 1. Setup Infrastructure
```bash
# Run the infrastructure setup script
./setup-infrastructure.sh
```

This script will:
- Create Google Cloud secrets for MongoDB, Redis, and JWT
- Configure environment variables
- Set up shared infrastructure

### 2. Update Configuration
Edit `deploy.sh` and update these values:
```bash
PROJECT_ID="your-actual-gcp-project-id"
NNA_REGISTRY_BASE_URL="https://your-nna-registry-url"
NNA_REGISTRY_API_KEY="your-actual-api-key"
```

### 3. Deploy to Cloud Run
```bash
# Deploy the service
./deploy.sh
```

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Build and Push Image
```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Build the image
docker build -t gcr.io/$PROJECT_ID/algorhythm-service:latest -f docker/Dockerfile.cloudrun .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/algorhythm-service:latest
```

### 2. Deploy to Cloud Run
```bash
gcloud run deploy algorhythm-service \
  --image gcr.io/$PROJECT_ID/algorhythm-service:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1 \
  --concurrency 100 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=8080 \
  --set-secrets MONGODB_URI=MONGODB_URI:latest \
  --set-secrets REDIS_URL=REDIS_URL:latest \
  --set-secrets JWT_SECRET=JWT_SECRET:latest \
  --set-env-vars NNA_REGISTRY_BASE_URL=https://your-nna-registry-url \
  --set-env-vars NNA_REGISTRY_API_KEY=your-api-key
```

## Environment Variables

### Required Secrets (created by setup script)
- `MONGODB_URI` - MongoDB connection string (shared with NNA Registry)
- `REDIS_URL` - Redis connection string (shared with NNA Registry)  
- `JWT_SECRET` - JWT secret (shared with NNA Registry)

### Required Environment Variables
- `NODE_ENV=production`
- `PORT=8080` (Cloud Run default)
- `NNA_REGISTRY_BASE_URL` - Your NNA Registry service URL
- `NNA_REGISTRY_API_KEY` - API key for NNA Registry

### Optional Environment Variables
- `LOG_LEVEL=info`
- `CACHE_DEFAULT_TTL=300`
- `ANALYTICS_ENABLED=true`

## Service Configuration

### Cloud Run Settings
- **Memory**: 1Gi (adjust based on usage)
- **CPU**: 1 (adjust based on usage)
- **Max Instances**: 10 (adjust based on traffic)
- **Min Instances**: 1 (for faster cold starts)
- **Concurrency**: 100 (requests per instance)
- **Timeout**: 300 seconds

### Health Checks
The service includes health checks at:
- `GET /api/v1/health` - Basic health status
- `GET /api/v1/health/info` - Detailed system information

## Monitoring

### View Logs
```bash
gcloud logs read --service=algorhythm-service --region=us-central1 --limit=50
```

### Monitor Performance
- **Cloud Run Metrics**: CPU, memory, request count, latency
- **Application Metrics**: Available at `/api/v1/analytics/metrics/performance`
- **Health Status**: Available at `/api/v1/health`

## API Endpoints

Once deployed, your service will be available at:
- **Base URL**: `https://algorhythm-service-<hash>-uc.a.run.app`
- **API Documentation**: `https://algorhythm-service-<hash>-uc.a.run.app/api/docs`
- **Health Check**: `https://algorhythm-service-<hash>-uc.a.run.app/api/v1/health`

### Main Endpoints
- `POST /api/v1/recommend/template` - Get template recommendations
- `POST /api/v1/recommend/variations` - Get layer variations
- `GET /api/v1/analytics/metrics/recommendations` - Analytics data
- `GET /api/v1/health` - Service health

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check logs: `gcloud logs read --service=algorhythm-service --region=us-central1`
   - Verify environment variables and secrets

2. **Database connection issues**
   - Verify MongoDB URI secret is correct
   - Check network connectivity from Cloud Run

3. **Redis connection issues**
   - Verify Redis URL secret is correct
   - Check Redis instance is accessible

4. **NNA Registry integration issues**
   - Verify NNA Registry URL and API key
   - Check network connectivity between services

### Debug Commands
```bash
# Check service status
gcloud run services describe algorhythm-service --region=us-central1

# View recent logs
gcloud logs read --service=algorhythm-service --region=us-central1 --limit=100

# Test health endpoint
curl https://your-service-url/api/v1/health
```

## Scaling

### Automatic Scaling
Cloud Run automatically scales based on:
- Request volume
- CPU utilization
- Memory usage

### Manual Scaling
Adjust these parameters in the deployment:
- `--min-instances` - Minimum instances to keep warm
- `--max-instances` - Maximum instances to scale to
- `--concurrency` - Requests per instance

## Security

### Authentication
- JWT tokens are validated against the shared secret
- Role-based access control for admin endpoints
- CORS configured for your domains

### Secrets Management
- All sensitive data stored in Google Secret Manager
- Secrets are injected at runtime
- No secrets in container images

## Cost Optimization

### Resource Allocation
- Start with 1Gi memory and 1 CPU
- Monitor usage and adjust as needed
- Use min-instances=1 for faster cold starts

### Caching Strategy
- Redis caching reduces database load
- Template recommendations cached for 5 minutes
- Compatibility scores cached for 24 hours

## Next Steps

1. **Monitor Performance**: Set up alerts for response times and error rates
2. **Scale as Needed**: Adjust resources based on traffic patterns
3. **Add Monitoring**: Integrate with Google Cloud Monitoring
4. **Set up CI/CD**: Use Cloud Build for automated deployments
