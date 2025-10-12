# 🧪 **REVIZ COMPOSITE API TESTING GUIDE**

## 🎯 **OVERVIEW**

This guide provides comprehensive testing instructions for the ReViz Composite API, which implements the ReViz developer's request to replace `song_id` with `composite_id` and remove `max_composites` parameter.

## 🔧 **API ENDPOINT**

```
POST /api/v1/reviz/composite/complete-experience
```

## 🔐 **AUTHENTICATION**

All requests require a valid JWT token:
```bash
Authorization: Bearer <your-jwt-token>
```

## 📋 **TEST SCENARIOS**

### **🔧 TEST 1: Mobile Configuration (Cellular)**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "composite_id": "COMPOSITE_001",
    "user_context": {
      "user_id": "user_123",
      "device_type": "mobile",
      "connection_speed": "medium",
      "preferences": {
        "preferred_genres": ["pop", "rock"],
        "energy_preference": "high",
        "style_preference": "modern"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "variant_depth": 2,
      "layers": ["stars", "looks", "moves", "worlds"]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "composite_info": {
      "composite_id": "COMPOSITE_001",
      "composite_name": "Pop Star Experience",
      "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_001.mp4",
      "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_001.jpg",
      "duration_seconds": 180,
      "file_size_mb": 45.2,
      "resolution": "1920x1080",
      "format": "mp4",
      "compatibility_score": 0.95
    },
    "layer_assets": {
      "stars": {
        "layer_type": "stars",
        "total_assets": 4,
        "assets": [
          {
            "asset_id": "STAR_001",
            "asset_name": "Pop Star Performance",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/STAR_001.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_001.jpg",
            "duration_seconds": 30,
            "file_size_mb": 8.5,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.92,
            "layer": "stars",
            "category": "performance",
            "subcategory": "dancing",
            "variants": [
              {
                "variant_id": "STAR_001_V1",
                "variant_name": "Pop Star Performance - Alternative",
                "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/variants/STAR_001_V1.mp4",
                "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/variants/STAR_001_V1.jpg",
                "compatibility_score": 0.88,
                "differences": ["different_angle", "slower_tempo"]
              }
            ]
          }
        ]
      },
      "looks": {
        "layer_type": "looks",
        "total_assets": 3,
        "assets": [
          {
            "asset_id": "LOOK_001",
            "asset_name": "Modern Outfit",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/looks/LOOK_001.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/looks/LOOK_001.jpg",
            "duration_seconds": 25,
            "file_size_mb": 6.2,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.89,
            "layer": "looks",
            "category": "fashion",
            "subcategory": "casual"
          }
        ]
      },
      "moves": {
        "layer_type": "moves",
        "total_assets": 5,
        "assets": [
          {
            "asset_id": "MOVE_001",
            "asset_name": "Dance Choreography",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/moves/MOVE_001.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/moves/MOVE_001.jpg",
            "duration_seconds": 35,
            "file_size_mb": 9.8,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.94,
            "layer": "moves",
            "category": "dance",
            "subcategory": "hip_hop"
          }
        ]
      },
      "worlds": {
        "layer_type": "worlds",
        "total_assets": 2,
        "assets": [
          {
            "asset_id": "WORLD_001",
            "asset_name": "Concert Stage",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/worlds/WORLD_001.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/worlds/WORLD_001.jpg",
            "duration_seconds": 40,
            "file_size_mb": 12.1,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.91,
            "layer": "worlds",
            "category": "venue",
            "subcategory": "indoor"
          }
        ]
      }
    },
    "asset_relationships": {
      "compatibility_matrix": {
        "STAR_001": {
          "LOOK_001": 0.92,
          "MOVE_001": 0.95,
          "WORLD_001": 0.88
        }
      },
      "base_to_variants": {
        "STAR_001": ["STAR_001_V1"]
      },
      "layer_dependencies": {
        "stars": ["looks", "moves"],
        "looks": ["worlds"]
      }
    },
    "performance_metrics": {
      "total_assets_loaded": 14,
      "response_time_ms": 245,
      "response_size_bytes": 2847392,
      "cache_hit_rate": 0.85,
      "assets_from_cdn": 12
    }
  },
  "metadata": {
    "request_id": "req_12345",
    "timestamp": "2025-10-11T20:21:00.000Z",
    "version": "2.0.0",
    "partial_response": false
  }
}
```

### **🔧 TEST 2: Desktop Configuration (WiFi)**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "composite_id": "COMPOSITE_002",
    "user_context": {
      "user_id": "user_456",
      "device_type": "desktop",
      "connection_speed": "fast",
      "preferences": {
        "preferred_genres": ["electronic", "indie"],
        "energy_preference": "medium",
        "style_preference": "trendy"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 8,
      "include_variants": true,
      "variant_depth": 4,
      "layers": ["stars", "looks", "moves", "worlds"]
    }
  }'
```

### **🔧 TEST 3: Minimal Configuration**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "composite_id": "COMPOSITE_003",
    "experience_config": {
      "max_assets_per_layer": 2,
      "include_variants": false
    }
  }'
```

## 🚨 **ERROR TESTING**

### **🔧 TEST 4: Missing composite_id**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "experience_config": {
      "max_assets_per_layer": 4
    }
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "composite_id is required",
    "error": "Bad Request",
    "statusCode": 400
  },
  "timestamp": "2025-10-11T20:21:00.000Z",
  "path": "/api/v1/reviz/composite/complete-experience",
  "method": "POST"
}
```

### **🔧 TEST 5: Invalid composite_id**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "composite_id": "INVALID_COMPOSITE",
    "experience_config": {
      "max_assets_per_layer": 4
    }
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Invalid composite_id: INVALID_COMPOSITE",
    "error": "Bad Request",
    "statusCode": 400
  },
  "timestamp": "2025-10-11T20:21:00.000Z",
  "path": "/api/v1/reviz/composite/complete-experience",
  "method": "POST"
}
```

### **🔧 TEST 6: Missing JWT Token**

**Request:**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "COMPOSITE_001",
    "experience_config": {
      "max_assets_per_layer": 4
    }
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "status": 401,
    "message": "Unauthorized",
    "error": "Unauthorized",
    "statusCode": 401
  },
  "timestamp": "2025-10-11T20:21:00.000Z",
  "path": "/api/v1/reviz/composite/complete-experience",
  "method": "POST"
}
```

## 🔍 **GCP URL VERIFICATION**

### **🔧 TEST 7: Verify GCP URLs are Real**

**Script to verify GCP URLs:**
```bash
#!/bin/bash

# Test GCP URL accessibility
echo "🔍 Verifying GCP URLs..."

# Test composite URL
COMPOSITE_URL="https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_001.mp4"
echo "Testing composite URL: $COMPOSITE_URL"
curl -I "$COMPOSITE_URL" | head -1

# Test asset URLs
STAR_URL="https://storage.googleapis.com/algorhythm-assets/stars/STAR_001.mp4"
echo "Testing star asset URL: $STAR_URL"
curl -I "$STAR_URL" | head -1

# Test thumbnail URLs
THUMBNAIL_URL="https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_001.jpg"
echo "Testing thumbnail URL: $THUMBNAIL_URL"
curl -I "$THUMBNAIL_URL" | head -1
```

## 📊 **PERFORMANCE TESTING**

### **🔧 TEST 8: Response Time Testing**

**Script to measure response times:**
```bash
#!/bin/bash

echo "⏱️  Testing response times..."

for i in {1..10}; do
  echo "Test $i:"
  time curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <your-jwt-token>" \
    -d '{
      "composite_id": "COMPOSITE_001",
      "experience_config": {
        "max_assets_per_layer": 4,
        "include_variants": true
      }
    }' \
    -o /dev/null -s -w "HTTP Status: %{http_code}, Time: %{time_total}s\n"
done
```

## 🎯 **SUCCESS CRITERIA**

### **✅ FUNCTIONAL REQUIREMENTS**

1. **✅ composite_id Parameter**: API accepts `composite_id` instead of `song_id`
2. **✅ No max_composites**: Parameter is removed from request
3. **✅ Single Composite Response**: Only returns assets for one composite
4. **✅ Real GCP URLs**: All URLs are actual GCP storage URLs
5. **✅ Proper Error Handling**: Returns appropriate error messages

### **✅ PERFORMANCE REQUIREMENTS**

1. **✅ Response Time**: <200ms (cached), <500ms (uncached)
2. **✅ Response Size**: 2-5MB (with real GCP URLs)
3. **✅ Cache Hit Rate**: >80% for repeated requests
4. **✅ Asset Loading**: All assets load from CDN

### **✅ SECURITY REQUIREMENTS**

1. **✅ JWT Authentication**: All requests require valid JWT token
2. **✅ Input Validation**: Proper validation of all parameters
3. **✅ Error Handling**: Secure error messages without sensitive data

## 🚀 **AUTOMATED TESTING SCRIPT**

```bash
#!/bin/bash

# ReViz Composite API Automated Testing Script
echo "🧪 Starting ReViz Composite API Tests..."

BASE_URL="https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/reviz/composite/complete-experience"
JWT_TOKEN="<your-jwt-token>"

# Test 1: Mobile Configuration
echo "📱 Test 1: Mobile Configuration"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "composite_id": "COMPOSITE_001",
    "user_context": {
      "user_id": "user_123",
      "device_type": "mobile",
      "connection_speed": "medium"
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "layers": ["stars", "looks", "moves", "worlds"]
    }
  }' | jq '.'

# Test 2: Desktop Configuration
echo "🖥️  Test 2: Desktop Configuration"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "composite_id": "COMPOSITE_002",
    "user_context": {
      "user_id": "user_456",
      "device_type": "desktop",
      "connection_speed": "fast"
    },
    "experience_config": {
      "max_assets_per_layer": 8,
      "include_variants": true,
      "layers": ["stars", "looks", "moves", "worlds"]
    }
  }' | jq '.'

# Test 3: Minimal Configuration
echo "⚡ Test 3: Minimal Configuration"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "composite_id": "COMPOSITE_003",
    "experience_config": {
      "max_assets_per_layer": 2,
      "include_variants": false
    }
  }' | jq '.'

# Test 4: Error - Missing composite_id
echo "❌ Test 4: Missing composite_id"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "experience_config": {
      "max_assets_per_layer": 4
    }
  }' | jq '.'

# Test 5: Error - Invalid composite_id
echo "❌ Test 5: Invalid composite_id"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "composite_id": "INVALID_COMPOSITE",
    "experience_config": {
      "max_assets_per_layer": 4
    }
  }' | jq '.'

echo "✅ All tests completed!"
```

---

**🔧 This testing guide ensures the ReViz Composite API meets all developer requirements and provides comprehensive testing coverage.**
