# 🔐 JWT Fallback Authentication Implementation

## 📋 **Overview**

This document details the implementation of JWT fallback authentication in the AlgoRhythm service, allowing ReViz Expo developers to use NNA Registry JWT tokens directly without requiring token exchange.

## 🎯 **Problem Statement**

ReViz Expo developers need to authenticate with the AlgoRhythm service using JWT tokens from the NNA Registry service. Previously, this required a token exchange mechanism. The JWT fallback implementation allows direct use of NNA Registry tokens.

## 🏗️ **Architecture**

### **JWT Fallback Flow**
```
1. Client sends request with JWT token
2. JwtFallbackGuard extracts token from Authorization header
3. Try AlgoRhythm JWT secret first
4. If fails, try NNA Registry JWT secret as fallback
5. Return user object with tokenSource indicator
6. Continue with request processing
```

### **Token Sources**
- **Primary**: AlgoRhythm JWT tokens (signed with `JWT_SECRET`)
- **Fallback**: NNA Registry JWT tokens (signed with `NNA_REGISTRY_JWT_SECRET`)

## 🔧 **Implementation Details**

### **1. JwtFallbackGuard**

**File**: `src/modules/auth/guards/jwt-fallback.guard.ts`

```typescript
@Injectable()
export class JwtFallbackGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Try AlgoRhythm JWT secret first
      const algorhythmSecret = this.configService.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, algorhythmSecret) as any;

      request.user = {
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role || 'user',
        tokenSource: 'algorhythm'
      };

      return true;
    } catch (algorhythmError) {
      // If AlgoRhythm verification fails, try NNA Registry JWT secret as fallback
      try {
        const nnaSecret = this.configService.get<string>('NNA_REGISTRY_JWT_SECRET');
        if (!nnaSecret) {
          throw new UnauthorizedException('NNA Registry JWT secret not configured');
        }

        const payload = jwt.verify(token, nnaSecret) as any;

        request.user = {
          userId: payload.userId || payload.sub,
          email: payload.email,
          role: payload.role || 'user',
          tokenSource: 'nna_registry'
        };

        return true;
      } catch (nnaError) {
        throw new UnauthorizedException('Invalid token from both AlgoRhythm and NNA Registry');
      }
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### **2. Environment Configuration**

**Development Environment** (`config/environment.development.ts`):
```typescript
export const developmentConfig = {
  NODE_ENV: 'development',
  ENVIRONMENT: 'development',
  // ... other config
  NNA_REGISTRY_JWT_SECRET: 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39',
};
```

**Staging Environment** (`config/environment.staging.ts`):
```typescript
export const stagingConfig = {
  NODE_ENV: 'staging',
  ENVIRONMENT: 'staging',
  // ... other config
  NNA_REGISTRY_JWT_SECRET: 'stg-jwt-secret-key',
};
```

**Production Environment** (`config/environment.production.ts`):
```typescript
export const productionConfig = {
  NODE_ENV: 'production',
  ENVIRONMENT: 'production',
  // ... other config
  NNA_REGISTRY_JWT_SECRET: 'prod-jwt-secret-key',
};
```

### **3. Controller Updates**

**Recommendations Controller** (`src/modules/recommendations/recommendations.controller.ts`):
```typescript
import { JwtFallbackGuard } from '../auth/guards/jwt-fallback.guard';

@Controller('recommend')
@UseGuards(JwtFallbackGuard)
export class RecommendationsController {
  // ... controller methods
}
```

**Daemon Controller** (`src/modules/daemon/daemon.controller.ts`):
```typescript
import { JwtFallbackGuard } from '../auth/guards/jwt-fallback.guard';

@Controller('daemon')
@UseGuards(JwtFallbackGuard, RolesGuard)
export class DaemonController {
  // ... controller methods
}
```

**Analytics Controller** (`src/modules/analytics/analytics.controller.ts`):
```typescript
import { JwtFallbackGuard } from '../auth/guards/jwt-fallback.guard';

@Controller('analytics')
@UseGuards(JwtFallbackGuard, RolesGuard)
export class AnalyticsController {
  // ... controller methods
}
```

### **4. Auth Module Updates**

**Auth Module** (`src/modules/auth/auth.module.ts`):
```typescript
import { JwtFallbackGuard } from './guards/jwt-fallback.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, JwtFallbackGuard, RolesGuard],
  exports: [JwtStrategy, JwtAuthGuard, JwtFallbackGuard, RolesGuard],
})
export class AuthModule {}
```

## 🔑 **Secret Management**

### **Google Cloud Secret Manager**

**Secret Names**:
- Development: `algorhythm-nna-jwt-secret-dev`
- Staging: `algorhythm-nna-jwt-secret-stg`
- Production: `algorhythm-nna-jwt-secret`

**Secret Values**:
- Development: `a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39`
- Staging: `stg-jwt-secret-key`
- Production: `prod-jwt-secret-key`

### **Service Account Permissions**

The service account needs the following roles:
- `secretmanager.secretAccessor`
- `cloudrun.admin`
- `iam.serviceAccountUser`

## 🧪 **Testing**

### **Test JWT Token**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8
```

### **Test Request**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.001.001", "user_context": {"user_id": "68c82c41928bbc0b14297755"}}'
```

### **Expected Response**
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "user": {
      "userId": "68c82c41928bbc0b14297755",
      "email": "ajay@celerity.studio",
      "role": "user",
      "tokenSource": "nna_registry"
    }
  }
}
```

## 🚨 **Current Issues**

### **Environment Variable Loading**
**Problem**: The deployed service is not loading the `NNA_REGISTRY_JWT_SECRET` environment variable correctly.

**Symptoms**:
- JWT tokens verify correctly locally
- Deployed service returns: `"Invalid token from both AlgoRhythm and NNA Registry"`
- Environment variable appears to be undefined in deployed service

**Debugging Steps**:
1. Check Cloud Run service environment variables
2. Verify service account permissions for Secret Manager
3. Check service logs for environment variable loading errors
4. Confirm secret exists and is accessible

## 🔄 **Deployment Configuration**

### **CI/CD Workflow Updates**

**Development** (`.github/workflows/ci-cd-dev.yml`):
```yaml
--set-secrets=NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret-dev:latest \
--set-env-vars "NODE_ENV=development,ENVIRONMENT=development,NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev,ALGORHYTHM_BASE_URL=https://dev.algorhythm.media"
```

**Staging** (`.github/workflows/ci-cd-stg.yml`):
```yaml
--set-secrets=NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret-stg:latest \
--set-env-vars "NODE_ENV=staging,ENVIRONMENT=staging,NNA_REGISTRY_BASE_URL=https://registry.stg.reviz.dev,ALGORHYTHM_BASE_URL=https://stg.algorhythm.media"
```

**Production** (`.github/workflows/ci-cd-prod.yml`):
```yaml
--set-secrets=NNA_REGISTRY_JWT_SECRET=algorhythm-nna-jwt-secret:latest \
--set-env-vars "NODE_ENV=production,ENVIRONMENT=production,NNA_REGISTRY_BASE_URL=https://registry.reviz.dev,ALGORHYTHM_BASE_URL=https://prod.algorhythm.media"
```

## 📊 **Monitoring & Logging**

### **Log Messages**
- `"No token provided"` - Missing Authorization header
- `"NNA Registry JWT secret not configured"` - Environment variable not loaded
- `"Invalid token from both AlgoRhythm and NNA Registry"` - Token verification failed

### **User Object Structure**
```typescript
{
  userId: string;
  email: string;
  role: string;
  tokenSource: 'algorhythm' | 'nna_registry';
}
```

## 🎯 **Success Criteria**

The implementation is successful when:
1. ✅ JWT fallback authentication works in deployed service
2. ✅ ReViz Expo developers can use NNA Registry tokens directly
3. ✅ API endpoints return successful responses with NNA Registry tokens
4. ✅ User object includes `tokenSource` indicator
5. ✅ Error messages are clear and helpful for debugging

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Environment Variable Not Loaded**
   - Check Cloud Run service configuration
   - Verify secret exists in Secret Manager
   - Check service account permissions

2. **Token Verification Fails**
   - Verify JWT token is not expired
   - Check token format and structure
   - Confirm secret values match

3. **Service Account Permissions**
   - Ensure `secretmanager.secretAccessor` role
   - Verify service account is properly configured
   - Check IAM policy bindings

---

**Last Updated**: September 19, 2025  
**Status**: Implementation complete, debugging environment variable loading

