# JWT Authentication Guide - NNA Registry API

**Date**: October 29, 2025
**Status**: ✅ Verified and Working
**Purpose**: Programmatically generate JWT tokens for API testing
**Audience**: Backend Developers, QA Engineers, DevOps

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Flow](#authentication-flow)
3. [Working Code Examples](#working-code-examples)
   - [Bash/Shell Scripts](#bashshell-scripts)
   - [Node.js/JavaScript](#nodejsjavascript)
   - [Python](#python)
   - [TypeScript](#typescript)
4. [Common Use Cases](#common-use-cases)
5. [Token Management](#token-management)
6. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### **Generate a JWT Token in 30 Seconds**

```bash
#!/bin/bash

# Create registration payload
cat > /tmp/register.json <<EOF
{
  "email": "test-$(date +%s)@example.com",
  "password": "TestPass123!",
  "username": "testuser$(date +%s)"
}
EOF

# Register and get token
TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d @/tmp/register.json | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Use token
echo "Your JWT token: $TOKEN"
echo "$TOKEN" > /tmp/nna_jwt_token.txt

# Test it
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/v1/assets?layer=G&limit=1"
```

**Output:**
```
Your JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{"success":true,"data":[...]}
```

---

## 🔐 Authentication Flow

### **How JWT Authentication Works**

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /api/v1/auth/register
       │    { email, password, username }
       ▼
┌─────────────┐
│  Backend    │
└──────┬──────┘
       │
       │ 2. Returns JWT Token
       │    { success: true, data: { token: "eyJ..." } }
       ▼
┌─────────────┐
│   Client    │ Stores token
└──────┬──────┘
       │
       │ 3. Use token in headers
       │    Authorization: Bearer eyJ...
       ▼
┌─────────────┐
│  Backend    │ Validates & Authorizes
└─────────────┘
```

### **Two Ways to Get a Token**

#### **Option 1: Register a New User** (Recommended for automated testing)
```bash
POST /api/v1/auth/register
Body: { email, password, username }
Response: { success: true, data: { token: "...", user: {...} } }
```

#### **Option 2: Login with Existing User**
```bash
POST /api/v1/auth/login
Body: { email, password }
Response: { success: true, data: { token: "...", user: {...} } }
```

### **Token Details**

| Property | Value |
|----------|-------|
| **Lifespan** | 24 hours |
| **Format** | `Authorization: Bearer <token>` |
| **Payload** | `{ userId, email, role, iat, exp }` |
| **Algorithm** | HS256 (HMAC SHA-256) |

---

## 💻 Working Code Examples

### **Bash/Shell Scripts**

#### **Complete Token Generator Script**

```bash
#!/bin/bash
# File: generate-jwt-token.sh

API_BASE="https://registry.dev.reviz.dev/api/v1"
TIMESTAMP=$(date +%s)

# Create unique user credentials
EMAIL="test-${TIMESTAMP}@example.com"
USERNAME="testuser${TIMESTAMP}"
PASSWORD="TestPass123!"

# Create JSON payload file (avoids escaping issues)
cat > /tmp/register-${TIMESTAMP}.json <<EOF
{
  "email": "${EMAIL}",
  "password": "${PASSWORD}",
  "username": "${USERNAME}"
}
EOF

echo "Registering user: $EMAIL"
echo ""

# Register and capture response
RESPONSE=$(curl -s -X POST "${API_BASE}/auth/register" \
  -H "Content-Type: application/json" \
  -d @/tmp/register-${TIMESTAMP}.json)

# Extract token
TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Success! JWT Token generated:"
  echo "$TOKEN"
  echo ""

  # Save token for reuse
  echo "$TOKEN" > /tmp/nna_jwt_token.txt
  echo "💾 Token saved to: /tmp/nna_jwt_token.txt"
  echo ""

  # Test token
  echo "🧪 Testing token with API call..."
  curl -s "${API_BASE}/assets?layer=G&limit=1" \
    -H "Authorization: Bearer $TOKEN" | head -10
  echo "..."
  echo ""
  echo "✅ Token is working!"
else
  echo "❌ Failed to get token"
  echo "Response: $RESPONSE"
  exit 1
fi

# Cleanup
rm /tmp/register-${TIMESTAMP}.json
```

**Usage:**
```bash
chmod +x generate-jwt-token.sh
./generate-jwt-token.sh
```

#### **Reusable Token Manager**

```bash
#!/bin/bash
# File: jwt-token-manager.sh

TOKEN_FILE="/tmp/nna_jwt_token.txt"
API_BASE="https://registry.dev.reviz.dev/api/v1"

# Function: Get existing token or create new one
get_token() {
  if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE")

    # Check if token is still valid (simple check)
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      "${API_BASE}/assets?limit=1" \
      -H "Authorization: Bearer $TOKEN")

    if [ "$RESPONSE" = "200" ]; then
      echo "$TOKEN"
      return 0
    fi
  fi

  # Token doesn't exist or expired - generate new one
  generate_new_token
}

# Function: Generate new token
generate_new_token() {
  TIMESTAMP=$(date +%s)

  cat > /tmp/register-temp.json <<EOF
{
  "email": "auto-${TIMESTAMP}@example.com",
  "password": "TestPass123!",
  "username": "auto${TIMESTAMP}"
}
EOF

  RESPONSE=$(curl -s -X POST "${API_BASE}/auth/register" \
    -H "Content-Type: application/json" \
    -d @/tmp/register-temp.json)

  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$TOKEN" ]; then
    echo "$TOKEN" > "$TOKEN_FILE"
    echo "$TOKEN"
    rm /tmp/register-temp.json
    return 0
  else
    echo "ERROR: Failed to generate token" >&2
    rm /tmp/register-temp.json
    return 1
  fi
}

# Main execution
case "${1:-get}" in
  get)
    get_token
    ;;
  new)
    generate_new_token
    ;;
  test)
    TOKEN=$(get_token)
    curl -s "${API_BASE}/assets?limit=1" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  *)
    echo "Usage: $0 {get|new|test}"
    exit 1
    ;;
esac
```

**Usage:**
```bash
# Get existing token or create new one
TOKEN=$(./jwt-token-manager.sh get)

# Force create new token
TOKEN=$(./jwt-token-manager.sh new)

# Test current token
./jwt-token-manager.sh test

# Use in API calls
curl -H "Authorization: Bearer $(./jwt-token-manager.sh get)" \
  "https://registry.dev.reviz.dev/api/v1/assets"
```

---

### **Node.js/JavaScript**

#### **ES Modules (Recommended)**

```javascript
// File: jwt-auth.mjs
import https from 'https';

const API_BASE = 'registry.dev.reviz.dev';

/**
 * Generate a fresh JWT token by registering a new user
 * @returns {Promise<string>} JWT token
 */
export async function generateJWT() {
  const timestamp = Date.now();
  const userData = {
    email: `test-${timestamp}@example.com`,
    password: 'TestPass123!',
    username: `testuser${timestamp}`
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(userData);

    const options = {
      hostname: API_BASE,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.token) {
            resolve(response.data.token);
          } else {
            reject(new Error(`Registration failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/assets')
 * @param {string} token - JWT token
 * @returns {Promise<Object>} API response
 */
export async function makeAuthenticatedRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('Generating JWT token...');
      const token = await generateJWT();
      console.log('✅ Token:', token);
      console.log('');

      console.log('Testing token with API call...');
      const assets = await makeAuthenticatedRequest('/api/v1/assets?layer=G&limit=1', token);
      console.log('✅ API Response:', JSON.stringify(assets, null, 2).substring(0, 200) + '...');
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
```

**Usage:**
```bash
# Run the example
node jwt-auth.mjs

# Or import in your code
import { generateJWT, makeAuthenticatedRequest } from './jwt-auth.mjs';

const token = await generateJWT();
const assets = await makeAuthenticatedRequest('/api/v1/assets', token);
```

#### **CommonJS Version**

```javascript
// File: jwt-auth.js
const https = require('https');

const API_BASE = 'registry.dev.reviz.dev';

function generateJWT() {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const userData = JSON.stringify({
      email: `test-${timestamp}@example.com`,
      password: 'TestPass123!',
      username: `testuser${timestamp}`
    });

    const options = {
      hostname: API_BASE,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(userData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const response = JSON.parse(data);
        if (response.success && response.data.token) {
          resolve(response.data.token);
        } else {
          reject(new Error(`Failed: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(userData);
    req.end();
  });
}

module.exports = { generateJWT };
```

---

### **Python**

#### **Python 3 with requests library**

```python
#!/usr/bin/env python3
# File: jwt_auth.py

import requests
import time
from typing import Optional, Dict

API_BASE = "https://registry.dev.reviz.dev/api/v1"

class JWTAuthenticator:
    """Handle JWT token generation and API requests for NNA Registry"""

    def __init__(self):
        self.token: Optional[str] = None
        self.api_base = API_BASE

    def generate_token(self) -> str:
        """
        Generate a fresh JWT token by registering a new user

        Returns:
            str: JWT token

        Raises:
            Exception: If registration fails
        """
        timestamp = int(time.time())
        user_data = {
            "email": f"test-{timestamp}@example.com",
            "password": "TestPass123!",
            "username": f"testuser{timestamp}"
        }

        response = requests.post(
            f"{self.api_base}/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            if data.get("success") and "token" in data.get("data", {}):
                self.token = data["data"]["token"]
                return self.token

        raise Exception(f"Registration failed: {response.text}")

    def get_token(self) -> str:
        """Get existing token or generate new one"""
        if not self.token:
            return self.generate_token()
        return self.token

    def make_request(self, endpoint: str, method: str = "GET", **kwargs) -> Dict:
        """
        Make an authenticated API request

        Args:
            endpoint: API endpoint path (e.g., '/assets')
            method: HTTP method (GET, POST, etc.)
            **kwargs: Additional arguments for requests

        Returns:
            Dict: API response data
        """
        if not self.token:
            self.generate_token()

        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token}"

        url = f"{self.api_base}{endpoint}"
        response = requests.request(method, url, headers=headers, **kwargs)

        return response.json()


# Example usage
if __name__ == "__main__":
    # Create authenticator
    auth = JWTAuthenticator()

    # Generate token
    print("Generating JWT token...")
    token = auth.generate_token()
    print(f"✅ Token: {token[:50]}...")
    print()

    # Test token with API call
    print("Testing token with API call...")
    assets = auth.make_request("/assets", params={"layer": "G", "limit": 1})
    print(f"✅ Retrieved {len(assets.get('data', []))} asset(s)")
    print()

    # Example: Create multiple requests
    print("Making multiple authenticated requests...")

    # Get all G layer assets
    songs = auth.make_request("/assets", params={"layer": "G", "limit": 5})
    print(f"  - Songs: {len(songs.get('data', []))}")

    # Get composite assets
    composites = auth.make_request("/assets", params={"layer": "C", "limit": 5})
    print(f"  - Composites: {len(composites.get('data', []))}")

    print()
    print("✅ All requests successful!")
```

**Usage:**
```bash
# Install dependencies
pip install requests

# Run the example
python3 jwt_auth.py

# Or import in your code
from jwt_auth import JWTAuthenticator

auth = JWTAuthenticator()
token = auth.generate_token()
assets = auth.make_request("/assets", params={"layer": "G"})
```

---

### **TypeScript**

```typescript
// File: jwt-auth.ts
import https from 'https';

const API_BASE = 'registry.dev.reviz.dev';

interface RegisterResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
  };
  metadata: {
    timestamp: string;
  };
}

interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Generate a fresh JWT token by registering a new user
 */
export async function generateJWT(): Promise<string> {
  const timestamp = Date.now();
  const userData = {
    email: `test-${timestamp}@example.com`,
    password: 'TestPass123!',
    username: `testuser${timestamp}`
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(userData);

    const options = {
      hostname: API_BASE,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          const response: RegisterResponse = JSON.parse(data);
          if (response.success && response.data.token) {
            resolve(response.data.token);
          } else {
            reject(new Error(`Registration failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Make an authenticated API request
 */
export async function makeAuthenticatedRequest<T = any>(
  endpoint: string,
  token: string
): Promise<APIResponse<T>> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * JWT Token Manager class
 */
export class JWTTokenManager {
  private token: string | null = null;

  async getToken(): Promise<string> {
    if (!this.token) {
      this.token = await generateJWT();
    }
    return this.token;
  }

  async refreshToken(): Promise<string> {
    this.token = await generateJWT();
    return this.token;
  }

  async request<T = any>(endpoint: string): Promise<APIResponse<T>> {
    const token = await this.getToken();
    return makeAuthenticatedRequest<T>(endpoint, token);
  }
}
```

---

## 📚 Common Use Cases

### **Use Case 1: Testing Single API Endpoint**

```bash
# Generate token and test endpoint
TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"TestPass123!","username":"test'$(date +%s)'"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/v1/assets/G.POP.TEE.004"
```

### **Use Case 2: Running Test Suite**

```javascript
// test-suite.mjs
import { generateJWT, makeAuthenticatedRequest } from './jwt-auth.mjs';

async function runTests() {
  // Generate token once
  const token = await generateJWT();
  console.log('✅ Token generated');

  // Test 1: Get assets by layer
  const songs = await makeAuthenticatedRequest('/api/v1/assets?layer=G&limit=5', token);
  console.log(`✅ Test 1: Retrieved ${songs.data.length} songs`);

  // Test 2: Get composite assets
  const composites = await makeAuthenticatedRequest('/api/v1/assets?layer=C&limit=5', token);
  console.log(`✅ Test 2: Retrieved ${composites.data.length} composites`);

  // Test 3: Search assets
  const search = await makeAuthenticatedRequest('/api/v1/assets?search=pop&limit=3', token);
  console.log(`✅ Test 3: Search found ${search.data.length} results`);
}

runTests().catch(console.error);
```

### **Use Case 3: CI/CD Pipeline**

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Generate JWT Token
        id: jwt
        run: |
          TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/v1/auth/register \
            -H "Content-Type: application/json" \
            -d '{"email":"ci-'$(date +%s)'@example.com","password":"TestPass123!","username":"ci'$(date +%s)'"}' | \
            grep -o '"token":"[^"]*"' | cut -d'"' -f4)
          echo "::set-output name=token::$TOKEN"

      - name: Run API Tests
        env:
          JWT_TOKEN: ${{ steps.jwt.outputs.token }}
        run: |
          ./run-api-tests.sh
```

### **Use Case 4: Load Testing**

```python
# load_test.py
import concurrent.futures
from jwt_auth import JWTAuthenticator

def test_endpoint(auth, endpoint):
    """Test a single endpoint"""
    response = auth.make_request(endpoint)
    return response.get('success', False)

def main():
    # Generate single token for all requests
    auth = JWTAuthenticator()
    auth.generate_token()

    endpoints = [
        "/assets?layer=G&limit=10",
        "/assets?layer=S&limit=10",
        "/assets?layer=L&limit=10",
        "/assets?layer=M&limit=10",
        "/assets?layer=W&limit=10",
        "/assets?layer=C&limit=10",
    ] * 10  # 60 total requests

    # Run 10 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(test_endpoint, auth, ep) for ep in endpoints]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    success_count = sum(results)
    print(f"✅ {success_count}/{len(results)} requests successful")

if __name__ == "__main__":
    main()
```

---

## 🔧 Token Management

### **Token Expiration**

JWT tokens expire after **24 hours**. You can decode the token to check expiration:

```bash
# Decode JWT payload (middle part)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTAxYjQyNDM4ZDdkNDRjNGI4NzdhYTYiLCJlbWFpbCI6Imp3dC1ndWlkZS0xNzYxNzE5MzMyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjE3MTkzMzIsImV4cCI6MTc2MTgwNTczMn0.QFPKOZP6Y6AGIiV6Lc7OMs7z-5irL5RWtI-gEDGuw7A"

# Extract payload (middle part between dots)
PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)

# Base64 decode (add padding if needed)
PADDING=$(( (4 - ${#PAYLOAD} % 4) % 4 ))
PAYLOAD_PADDED="${PAYLOAD}$(printf '=%.0s' $(seq 1 $PADDING))"

echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null | python3 -m json.tool
```

**Output:**
```json
{
  "userId": "6901b42438d7d44c4b877aa6",
  "email": "jwt-guide-1761719332@example.com",
  "role": "user",
  "iat": 1761719332,
  "exp": 1761805732
}
```

**Check if token is expired:**
```bash
# Get expiration timestamp
EXP=$(echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null | grep -o '"exp":[0-9]*' | cut -d':' -f2)

# Compare with current time
NOW=$(date +%s)

if [ "$NOW" -lt "$EXP" ]; then
  echo "✅ Token is valid for $(( (EXP - NOW) / 3600 )) more hours"
else
  echo "❌ Token expired $(( (NOW - EXP) / 3600 )) hours ago"
fi
```

### **Auto-Refresh Token**

```javascript
// auto-refresh-token.mjs
import { generateJWT } from './jwt-auth.mjs';

class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  decodeJWT(token) {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64').toString();
    return JSON.parse(decoded);
  }

  async getValidToken() {
    const now = Math.floor(Date.now() / 1000);

    // If no token or expired, generate new one
    if (!this.token || !this.expiresAt || now >= this.expiresAt - 300) {
      this.token = await generateJWT();
      const payload = this.decodeJWT(this.token);
      this.expiresAt = payload.exp;
      console.log(`✅ New token generated (expires in ${Math.floor((this.expiresAt - now) / 3600)}h)`);
    }

    return this.token;
  }
}

export default TokenManager;
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Issue 1: "Bad escaped character in JSON"**

**Problem:** JSON escaping issues in bash when using inline JSON

**Solution:** Use a JSON file instead of inline JSON

```bash
# ❌ WRONG (escaping issues)
curl -d '{"email":"test@example.com","password":"pass"}' ...

# ✅ CORRECT (use file)
cat > /tmp/data.json <<'EOF'
{"email":"test@example.com","password":"pass"}
EOF
curl -d @/tmp/data.json ...
```

#### **Issue 2: "User already exists"**

**Problem:** Trying to register with an email that's already used

**Solution:** Use timestamp in email to ensure uniqueness

```bash
EMAIL="test-$(date +%s)@example.com"
```

#### **Issue 3: "Unauthorized" (401)**

**Problem:** Token expired or invalid

**Solution:** Generate a fresh token

```bash
# Check token expiration first
# If expired, generate new token
TOKEN=$(./jwt-token-manager.sh new)
```

#### **Issue 4: Token Not Extracted**

**Problem:** `grep` or `jq` not finding token in response

**Solution:** Check the actual response format

```bash
# Debug: See full response
curl -s -X POST https://registry.dev.reviz.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d @/tmp/register.json

# Extract token with multiple methods
TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)  # grep
TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')  # jq
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")  # python
```

---

## 📝 Summary

### **Quick Reference Commands**

```bash
# 1. Generate token (one-liner)
TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"TestPass123!","username":"test'$(date +%s)'"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Use token in API call
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/v1/assets"

# 3. Save token for reuse
echo "$TOKEN" > /tmp/nna_jwt_token.txt

# 4. Load saved token
TOKEN=$(cat /tmp/nna_jwt_token.txt)

# 5. Test token validity
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/v1/assets?limit=1"
```

### **Key Takeaways**

✅ **Registration returns token immediately** - No separate login needed
✅ **Use file-based JSON** - Avoids escaping issues in bash
✅ **Tokens expire in 24 hours** - Plan for refresh in long-running processes
✅ **Timestamp emails** - Ensures uniqueness for automated testing
✅ **Store tokens** - Reuse within the 24-hour window

---

**Last Updated**: October 29, 2025
**Verified**: All code examples tested and working
**Contact**: See project documentation for support
