# AlgoRhythm Integration Examples
*Real-world code examples for ReViz Expo developers*

## 🎯 **Complete Integration Example**

### **1. Setup and Configuration**

```typescript
// config/algorhythm.ts
export const ALGORHYTHM_CONFIG = {
  // Canonical URLs (planned)
  canonicalUrls: {
    development: 'https://dev.algorhythm.media',
    staging: 'https://stg.algorhythm.media',
    production: 'https://prod.algorhythm.media'
  },
  
  // Current Active URLs (use these for now)
  apiUrl: __DEV__ 
    ? 'https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app'
    : 'https://prod.algorhythm.media',
  
  endpoints: {
    health: '/api/v1/health',
    recommendTemplate: '/api/v1/recommend/template',
    recommendVariations: '/api/v1/recommend/variations',
    analytics: '/api/v1/analytics/popular/templates'
  }
};

// JWT Secret (in production, this should be server-side)
const JWT_SECRET = 'algorhythm-dev-jwt-secret-key';
```

### **2. Authentication Service**

```typescript
// services/AlgoRhythmAuth.ts
import jwt from 'jsonwebtoken';

export class AlgoRhythmAuth {
  private static JWT_SECRET = 'algorhythm-dev-jwt-secret-key';
  
  static generateToken(userId: string, email: string, role: string = 'user'): string {
    const payload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    return jwt.sign(payload, this.JWT_SECRET);
  }
  
  static getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}
```

### **3. AlgoRhythm API Service**

```typescript
// services/AlgoRhythmService.ts
import { ALGORHYTHM_CONFIG } from '../config/algorhythm';
import { AlgoRhythmAuth } from './AlgoRhythmAuth';

export interface UserContext {
  user_id: string;
  preferences: {
    energy_preference: 'low' | 'medium' | 'high';
    style_preference: string;
  };
}

export interface TemplateRecommendation {
  template_id: string;
  compatibility_score: number;
  preview_url: string;
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommended_template: TemplateRecommendation;
    alternatives: TemplateRecommendation[];
  };
}

export class AlgoRhythmService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = ALGORHYTHM_CONFIG.apiUrl;
  }
  
  // Health check
  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}${ALGORHYTHM_CONFIG.endpoints.health}`);
    return response.json();
  }
  
  // Get template recommendation
  async recommendTemplate(
    songId: string, 
    userContext: UserContext,
    authToken: string
  ): Promise<RecommendationResponse> {
    const response = await fetch(
      `${this.baseUrl}${ALGORHYTHM_CONFIG.endpoints.recommendTemplate}`,
      {
        method: 'POST',
        headers: AlgoRhythmAuth.getAuthHeaders(authToken),
        body: JSON.stringify({
          song_id: songId,
          user_context: userContext
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`AlgoRhythm API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Get layer variations
  async getLayerVariations(
    templateId: string,
    layer: 'star' | 'look' | 'moves' | 'world',
    songId: string,
    authToken: string,
    limit: number = 6
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}${ALGORHYTHM_CONFIG.endpoints.recommendVariations}`,
      {
        method: 'POST',
        headers: AlgoRhythmAuth.getAuthHeaders(authToken),
        body: JSON.stringify({
          current_template_id: templateId,
          vary_layer: layer,
          song_id: songId,
          limit
        })
      }
    );
    
    return response.json();
  }
  
  // Get popular templates
  async getPopularTemplates(authToken: string, limit: number = 10): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}${ALGORHYTHM_CONFIG.endpoints.analytics}?limit=${limit}`,
      {
        headers: AlgoRhythmAuth.getAuthHeaders(authToken)
      }
    );
    
    return response.json();
  }
}
```

### **4. React Hook for AlgoRhythm**

```typescript
// hooks/useAlgoRhythm.ts
import { useState, useEffect } from 'react';
import { AlgoRhythmService, UserContext } from '../services/AlgoRhythmService';
import { AlgoRhythmAuth } from '../services/AlgoRhythmAuth';

export const useAlgoRhythm = (userId: string, userEmail: string) => {
  const [service] = useState(() => new AlgoRhythmService());
  const [authToken, setAuthToken] = useState<string>('');
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize authentication
  useEffect(() => {
    const token = AlgoRhythmAuth.generateToken(userId, userEmail);
    setAuthToken(token);
  }, [userId, userEmail]);
  
  // Check service health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await service.checkHealth();
        setIsHealthy(health.status === 'healthy' || health.status === 'degraded');
      } catch (err) {
        setIsHealthy(false);
        setError('AlgoRhythm service unavailable');
      }
    };
    
    if (authToken) {
      checkHealth();
    }
  }, [authToken, service]);
  
  // Recommend template
  const recommendTemplate = async (
    songId: string, 
    preferences: UserContext['preferences']
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const userContext: UserContext = {
        user_id: userId,
        preferences
      };
      
      const result = await service.recommendTemplate(songId, userContext, authToken);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Get layer variations
  const getLayerVariations = async (
    templateId: string,
    layer: 'star' | 'look' | 'moves' | 'world',
    songId: string,
    limit: number = 6
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.getLayerVariations(
        templateId, 
        layer, 
        songId, 
        authToken, 
        limit
      );
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    isHealthy,
    loading,
    error,
    recommendTemplate,
    getLayerVariations,
    service
  };
};
```

### **5. React Component Example**

```typescript
// components/SongRecommendation.tsx
import React, { useState } from 'react';
import { useAlgoRhythm } from '../hooks/useAlgoRhythm';

interface SongRecommendationProps {
  userId: string;
  userEmail: string;
  selectedSongId: string;
}

export const SongRecommendation: React.FC<SongRecommendationProps> = ({
  userId,
  userEmail,
  selectedSongId
}) => {
  const { isHealthy, loading, error, recommendTemplate } = useAlgoRhythm(userId, userEmail);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    energy_preference: 'high' as const,
    style_preference: 'pop'
  });
  
  const handleGetRecommendation = async () => {
    try {
      const result = await recommendTemplate(selectedSongId, preferences);
      setRecommendation(result);
    } catch (err) {
      console.error('Failed to get recommendation:', err);
    }
  };
  
  if (!isHealthy) {
    return (
      <div className="error">
        <p>AlgoRhythm service is currently unavailable</p>
        {error && <p>Error: {error}</p>}
      </div>
    );
  }
  
  return (
    <div className="song-recommendation">
      <h2>Get Template Recommendation</h2>
      
      <div className="preferences">
        <label>
          Energy Level:
          <select 
            value={preferences.energy_preference}
            onChange={(e) => setPreferences({
              ...preferences,
              energy_preference: e.target.value as 'low' | 'medium' | 'high'
            })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        
        <label>
          Style:
          <input
            type="text"
            value={preferences.style_preference}
            onChange={(e) => setPreferences({
              ...preferences,
              style_preference: e.target.value
            })}
            placeholder="e.g., pop, rock, electronic"
          />
        </label>
      </div>
      
      <button 
        onClick={handleGetRecommendation}
        disabled={loading || !selectedSongId}
      >
        {loading ? 'Getting Recommendation...' : 'Get Template Recommendation'}
      </button>
      
      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}
      
      {recommendation && (
        <div className="recommendation-result">
          <h3>Recommended Template</h3>
          <div className="template">
            <p><strong>Template ID:</strong> {recommendation.data.recommended_template.template_id}</p>
            <p><strong>Compatibility Score:</strong> {recommendation.data.recommended_template.compatibility_score}</p>
            <p><strong>Preview URL:</strong> {recommendation.data.recommended_template.preview_url}</p>
          </div>
          
          {recommendation.data.alternatives.length > 0 && (
            <div className="alternatives">
              <h4>Alternative Options</h4>
              {recommendation.data.alternatives.map((alt: any, index: number) => (
                <div key={index} className="alternative">
                  <p><strong>Template ID:</strong> {alt.template_id}</p>
                  <p><strong>Score:</strong> {alt.compatibility_score}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### **6. Error Handling and Retry Logic**

```typescript
// utils/AlgoRhythmErrorHandler.ts
export class AlgoRhythmErrorHandler {
  static handleError(error: any): string {
    if (error.status === 401) {
      return 'Authentication required. Please log in again.';
    }
    
    if (error.status === 404) {
      return 'Song not found. This song may not be available yet.';
    }
    
    if (error.status === 400) {
      return `Invalid request: ${error.message}`;
    }
    
    if (error.status >= 500) {
      return 'AlgoRhythm service is temporarily unavailable. Please try again later.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
}
```

### **7. Usage in App**

```typescript
// App.tsx
import React from 'react';
import { SongRecommendation } from './components/SongRecommendation';

const App: React.FC = () => {
  const userId = '68c1f0d6d36816c3b22e0e36';
  const userEmail = 'ajay@celerity.studio';
  const selectedSongId = 'song-123'; // Replace with actual song ID
  
  return (
    <div className="app">
      <h1>ReViz Expo - AlgoRhythm Integration</h1>
      <SongRecommendation
        userId={userId}
        userEmail={userEmail}
        selectedSongId={selectedSongId}
      />
    </div>
  );
};

export default App;
```

## 🧪 **Testing Examples**

### **Test with Current Data**

```typescript
// Test with existing Star assets
const testWithCurrentAssets = async () => {
  const service = new AlgoRhythmService();
  const token = AlgoRhythmAuth.generateToken('test-user', 'test@example.com');
  
  // Test health check
  const health = await service.checkHealth();
  console.log('Health:', health);
  
  // Test with mock song (will fail until Songs Layer is created)
  try {
    const recommendation = await service.recommendTemplate(
      'mock-song-001',
      {
        user_id: 'test-user',
        preferences: {
          energy_preference: 'high',
          style_preference: 'pop'
        }
      },
      token
    );
    console.log('Recommendation:', recommendation);
  } catch (error) {
    console.log('Expected error (no songs yet):', error.message);
  }
};
```

## 📊 **Monitoring Integration**

```typescript
// Monitor AlgoRhythm service health
const monitorService = async () => {
  const service = new AlgoRhythmService();
  
  setInterval(async () => {
    try {
      const health = await service.checkHealth();
      console.log('AlgoRhythm Status:', health.status);
      
      if (health.status === 'degraded') {
        console.warn('Service degraded:', health.services);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, 30000); // Check every 30 seconds
};
```

This comprehensive integration example provides everything ReViz Expo developers need to integrate with AlgoRhythm! 🚀
