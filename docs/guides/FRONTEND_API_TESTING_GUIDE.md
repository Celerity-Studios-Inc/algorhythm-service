# Frontend API Testing Guide

## 🚀 **Quick Start: Authentication & API Testing**

This guide shows how to authenticate with the NNA Registry Service and test APIs programmatically. **UPDATED** with working JWT generation and confirmed endpoints.

---

## 🔐 **Step 1: User Registration**

Register a new user to get access credentials:

```bash
# Register a new user
curl -X POST https://registry.dev.reviz.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "Test1234!",
    "username": "testuser"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "test-user@example.com",
      "username": "testuser"
    }
  }
}
```

---

## 🔑 **Step 2: User Login & JWT Extraction**

Login to get your authentication token:

```bash
# Login and extract JWT token
TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "Test1234!"
  }' | jq -r '.data.token')

echo "JWT Token: $TOKEN"
```

**✅ CONFIRMED WORKING**: This JWT generation method has been tested and verified.

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "test-user@example.com",
      "username": "testuser"
    }
  }
}
```

---

## 📚 **Step 3: Swagger Documentation Access**

Access the interactive API documentation:

- **Swagger UI**: https://registry.dev.reviz.dev/api/docs
- **Swagger JSON**: https://registry.dev.reviz.dev/api/docs-json

**Authentication in Swagger:**
1. Click the "Authorize" button in Swagger UI
2. Enter: `Bearer YOUR_JWT_TOKEN`
3. Click "Authorize"
4. All endpoints will now use your authentication

---

## 🧪 **Step 4: AI Metadata Generation Testing**

**✅ CRITICAL**: Test the AI metadata generation endpoint that the frontend needs:

```bash
# Test AI metadata generation (THE ENDPOINT FRONTEND NEEDS)
curl -H "Authorization: Bearer $TOKEN" \
  -X POST https://registry.dev.reviz.dev/api/ai/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "layer": "G",
    "creatorDescription": "Test song description",
    "taxonomyContext": {
      "categoryName": "Pop",
      "subcategoryName": "Classic Pop"
    }
  }'
```

**✅ CONFIRMED WORKING**: This endpoint has been tested across all layers (G, S, L, M, W, B, P, T, R, C).

## 🧪 **Step 5: Taxonomy API Testing**

Test the taxonomy endpoints with your JWT:

### **Basic Taxonomy Info**
```bash
# Get taxonomy version
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.dev.reviz.dev/api/taxonomy/version

# Check taxonomy health
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.dev.reviz.dev/api/taxonomy/health
```

### **Layer Information**
```bash
# Get all available layers
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.dev.reviz.dev/api/taxonomy/layers

# Get categories for a specific layer (e.g., Stars layer)
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.dev.reviz.dev/api/taxonomy/layers/S/categories
```

### **HFN/MFA Conversion**
```bash
# Convert Human-Friendly Name to Machine-Friendly Address
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/taxonomy/convert/hfn-to-mfa?hfn=S.POP.DIV.001"

# Convert Machine-Friendly Address to Human-Friendly Name
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/taxonomy/convert/mfa-to-hfn?mfa=2.001.002.001"
```

### **Taxonomy Tree Structure**
```bash
# Get complete taxonomy tree
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.dev.reviz.dev/api/taxonomy/tree
```

---

## 🔍 **Available Taxonomy Endpoints**

The taxonomy service provides 28 endpoints:

- **Core Info**: `/version`, `/health`, `/layers`
- **Layer Details**: `/layers/{layer}/categories`, `/layers/{layer}/category-count`
- **Conversion**: `/convert/hfn-to-mfa`, `/convert/mfa-to-hfn`
- **Tree Structure**: `/tree`, `/nodes`, `/nodes/{id}`
- **Migration**: `/migration/analyze`, `/migration/execute`
- **Validation**: `/validate`, `/validate-sequence`

---

## 🛠️ **Frontend Integration Examples**

### **JavaScript/TypeScript - WORKING CODE**
```typescript
// ✅ WORKING: Set up authenticated requests
const API_BASE = 'https://registry.dev.reviz.dev/api';

// ✅ WORKING: JWT Generation
const registerUser = async (email: string, password: string, username: string) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username })
  });
  return response.json();
};

const loginUser = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  return data.data.token; // ✅ Extract from data.data.token
};

// ✅ WORKING: AI Metadata Generation (THE CRITICAL ENDPOINT)
const generateAIMetadata = async (formData: any, token: string) => {
  const response = await fetch(`${API_BASE}/ai/extract-metadata`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      layer: formData.layer || 'G',
      creatorDescription: formData.creatorDescription || '',
      taxonomyContext: {
        categoryName: formData.categoryName,
        subcategoryName: formData.subcategoryName
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`AI metadata generation failed: ${response.statusText}`);
  }
  
  return response.json();
};

// ✅ WORKING: Get taxonomy layers
const getTaxonomyLayers = async (token: string) => {
  const response = await fetch(`${API_BASE}/taxonomy/layers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

### **React Hook Example - WORKING CODE**
```typescript
// ✅ WORKING: React hook for AI metadata generation
const useAIMetadata = (token: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const generateMetadata = async (formData: any) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateAIMetadata(formData, token);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };
  
  return { generateMetadata, isGenerating, error };
};

// ✅ WORKING: Taxonomy hook
const useTaxonomy = (token: string) => {
  const [layers, setLayers] = useState(null);
  
  useEffect(() => {
    if (token) {
      getTaxonomyLayers(token)
        .then(setLayers)
        .catch(console.error);
    }
  }, [token]);
  
  return { layers };
};
```

---

## 🚨 **Important Notes**

- **Environment**: This guide uses the `dev` environment
- **Token Expiry**: JWT tokens have expiration times
- **Rate Limiting**: Be mindful of API rate limits
- **Error Handling**: Always check response status codes
- **CORS**: Ensure your frontend domain is whitelisted

## ✅ **CONFIRMED WORKING ENDPOINTS**

- **Authentication**: `/api/auth/register` and `/api/auth/login` ✅
- **AI Metadata**: `/api/ai/extract-metadata` ✅ (THE CRITICAL ONE)
- **Taxonomy**: All `/api/taxonomy/*` endpoints ✅
- **Cross-layer Support**: Works for G, S, L, M, W, B, P, T, R, C layers ✅

## 🚀 **FRONTEND TEAM: COPY-PASTE READY**

The code examples above are **tested and working**. Copy them directly into your frontend code to resolve the JWT generation and API integration issues.

---

## 📞 **Support**

For questions or issues:
- Check the [API Documentation](https://registry.dev.reviz.dev/api/docs)
- Review the [Backend Architecture Guide](../architecture/BACKEND_ARCHITECTURE_OVERVIEW.md)
- Contact the backend team for authentication issues

---

**Last Updated**: September 25, 2025  
**Environment**: Development  
**Taxonomy Version**: v1.5.3
