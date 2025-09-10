# AlgoRhythm Recommendation Engine

AI-powered recommendation engine for ReViz's video remixing platform. AlgoRhythm powers the "Start with a Song" experience, instantly recommending perfect pre-generated video templates when users select a song.

## 🎯 Features

- **Template Recommendations**: Get best video template for any song (<20ms response time)
- **Layer Variations**: Get alternative stars, looks, moves, and worlds for customization
- **Compatibility Scoring**: Rule-based algorithm with freshness boost and diversity
- **Real-time Analytics**: Track user behavior and recommendation performance
- **Redis Caching**: Multi-tier caching for optimal performance
- **NNA Integration**: Seamless integration with existing NNA Registry infrastructure

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17+
- MongoDB 5.0+
- Redis 7.0+
- NNA Registry Service running

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd algorhythm-service

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development

# Update environment variables in .env.development
# - MONGODB_URI: Your MongoDB connection string
# - REDIS_URL: Your Redis connection string  
# - NNA_REGISTRY_BASE_URL: NNA Registry service URL
# - JWT_SECRET: Same as NNA Registry for token compatibility

# Start the development server
npm run start:dev
```

### Development Server
The server will start on `http://localhost:3000`
- API Documentation: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/v1/health`

## 📚 API Endpoints

### Template Recommendations
```http
POST /api/v1/recommend/template
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "song_id": "G.POP.TEN.001",
  "user_context": {
    "user_id": "user123",
    "preferences": {
      "energy_preference": "high",
      "style_preference": "modern"
    }
  }
}
```

### Layer Variations
```http
POST /api/v1/recommend/variations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "current_template_id": "C.001.001.001",
  "vary_layer": "stars",
  "song_id": "G.POP.TEN.001",
  "limit": 8
}
```

## 🏗️ Architecture

AlgoRhythm follows NestJS best practices with a modular architecture:

- **Recommendations Module**: Core recommendation APIs
- **Scoring Module**: Compatibility scoring algorithms  
- **NNA Integration Module**: Connection to NNA Registry
- **Caching Module**: Redis-based performance optimization
- **Analytics Module**: Event tracking and metrics
- **Auth Module**: JWT authentication (inherited from NNA Registry)

## 🔧 Configuration

Key environment variables:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/algorhythm_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev

# Optional
LOG_LEVEL=debug
CACHE_DEFAULT_TTL=300
ANALYTICS_ENABLED=true
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📊 Performance

- **Target Response Time**: <20ms P95
- **Cache Hit Rate**: >90%
- **Throughput**: 1000+ requests/second
- **Uptime**: 99.9%

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t algorhythm:latest .

# Run container
docker run -p 3000:3000 algorhythm:latest
```

### Docker Compose
```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d
```

### Kubernetes
```bash
# Deploy to development
kubectl apply -f k8s/dev/

# Deploy to staging  
kubectl apply -f k8s/staging/

# Deploy to production
kubectl apply -f k8s/production/
```

## 📈 Monitoring

- **Health Check**: `/api/v1/health`
- **Metrics**: Prometheus-compatible metrics at `/metrics`
- **Logs**: Winston logging to files and console
- **Sentry**: Error tracking and performance monitoring

## 🔄 Data Seeding

```bash
# Seed compatibility scores
npm run seed

# Warm up cache
npm run cache-warmup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Proprietary - Celerity Studios Inc.
# Test deployment after GitHub secrets setup - Wed Sep 10 14:04:47 MDT 2025
