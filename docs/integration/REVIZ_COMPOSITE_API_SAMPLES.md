# 📋 **REVIZ COMPOSITE API SAMPLE REQUESTS & RESPONSES**

## 🎯 **OVERVIEW**

This document provides comprehensive sample requests and responses for the ReViz Composite API, demonstrating the implementation of the ReViz developer's request to replace `song_id` with `composite_id` and remove `max_composites` parameter.

## 🔧 **API ENDPOINT**

```
POST /api/v1/reviz/composite/complete-experience
```

## 📱 **SAMPLE 1: MOBILE CONFIGURATION (CELLULAR)**

### **Request:**
```json
{
  "composite_id": "COMPOSITE_001",
  "user_context": {
    "user_id": "user_123",
    "device_type": "mobile",
    "connection_speed": "medium",
    "preferences": {
      "preferred_genres": ["pop", "rock"],
      "excluded_assets": ["STAR_OLD_001"],
      "favorite_styles": ["modern", "trendy"],
      "energy_preference": "high",
      "style_preference": "modern"
    }
  },
  "experience_config": {
    "max_assets_per_layer": 4,
    "include_variants": true,
    "variant_depth": 2,
    "layers": ["stars", "looks", "moves", "worlds"]
  },
  "request_id": "req_mobile_001"
}
```

### **Response:**
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
            "metadata": {
              "energy_level": "high",
              "style": "modern",
              "difficulty": "intermediate",
              "genre": "pop",
              "mood": "energetic"
            },
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
          },
          {
            "asset_id": "STAR_002",
            "asset_name": "Rock Star Performance",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/STAR_002.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_002.jpg",
            "duration_seconds": 35,
            "file_size_mb": 9.2,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.89,
            "layer": "stars",
            "category": "performance",
            "subcategory": "singing",
            "metadata": {
              "energy_level": "high",
              "style": "rock",
              "difficulty": "advanced",
              "genre": "rock",
              "mood": "intense"
            }
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
            "subcategory": "casual",
            "metadata": {
              "style": "modern",
              "color_scheme": "neutral",
              "formality": "casual"
            }
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
            "subcategory": "hip_hop",
            "metadata": {
              "difficulty": "intermediate",
              "style": "hip_hop",
              "energy_level": "high"
            }
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
            "subcategory": "indoor",
            "metadata": {
              "venue_type": "concert_hall",
              "lighting": "stage_lights",
              "atmosphere": "energetic"
            }
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
        },
        "STAR_002": {
          "LOOK_001": 0.89,
          "MOVE_001": 0.91,
          "WORLD_001": 0.93
        }
      },
      "base_to_variants": {
        "STAR_001": ["STAR_001_V1"]
      },
      "layer_dependencies": {
        "stars": ["looks", "moves"],
        "looks": ["worlds"],
        "moves": ["worlds"]
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
    "request_id": "req_mobile_001",
    "timestamp": "2025-10-11T20:21:00.000Z",
    "version": "2.0.0",
    "partial_response": false
  }
}
```

## 🖥️ **SAMPLE 2: DESKTOP CONFIGURATION (WIFI)**

### **Request:**
```json
{
  "composite_id": "COMPOSITE_002",
  "user_context": {
    "user_id": "user_456",
    "device_type": "desktop",
    "connection_speed": "fast",
    "preferences": {
      "preferred_genres": ["electronic", "indie"],
      "excluded_assets": [],
      "favorite_styles": ["trendy", "experimental"],
      "energy_preference": "medium",
      "style_preference": "trendy"
    }
  },
  "experience_config": {
    "max_assets_per_layer": 8,
    "include_variants": true,
    "variant_depth": 4,
    "layers": ["stars", "looks", "moves", "worlds"]
  },
  "request_id": "req_desktop_002"
}
```

### **Response:**
```json
{
  "success": true,
  "data": {
    "composite_info": {
      "composite_id": "COMPOSITE_002",
      "composite_name": "Electronic Experience",
      "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_002.mp4",
      "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_002.jpg",
      "duration_seconds": 240,
      "file_size_mb": 62.8,
      "resolution": "1920x1080",
      "format": "mp4",
      "compatibility_score": 0.92
    },
    "layer_assets": {
      "stars": {
        "layer_type": "stars",
        "total_assets": 8,
        "assets": [
          {
            "asset_id": "STAR_003",
            "asset_name": "Electronic Artist Performance",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/STAR_003.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_003.jpg",
            "duration_seconds": 45,
            "file_size_mb": 12.5,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.94,
            "layer": "stars",
            "category": "performance",
            "subcategory": "electronic",
            "metadata": {
              "energy_level": "medium",
              "style": "electronic",
              "difficulty": "advanced",
              "genre": "electronic",
              "mood": "experimental"
            },
            "variants": [
              {
                "variant_id": "STAR_003_V1",
                "variant_name": "Electronic Artist - Ambient Version",
                "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/variants/STAR_003_V1.mp4",
                "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/variants/STAR_003_V1.jpg",
                "compatibility_score": 0.87,
                "differences": ["ambient_sound", "slower_pace"]
              },
              {
                "variant_id": "STAR_003_V2",
                "variant_name": "Electronic Artist - High Energy",
                "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/variants/STAR_003_V2.mp4",
                "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/variants/STAR_003_V2.jpg",
                "compatibility_score": 0.91,
                "differences": ["faster_beat", "more_energy"]
              }
            ]
          }
        ]
      },
      "looks": {
        "layer_type": "looks",
        "total_assets": 6,
        "assets": [
          {
            "asset_id": "LOOK_002",
            "asset_name": "Trendy Electronic Outfit",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/looks/LOOK_002.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/looks/LOOK_002.jpg",
            "duration_seconds": 30,
            "file_size_mb": 7.8,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.91,
            "layer": "looks",
            "category": "fashion",
            "subcategory": "electronic",
            "metadata": {
              "style": "trendy",
              "color_scheme": "neon",
              "formality": "casual"
            }
          }
        ]
      },
      "moves": {
        "layer_type": "moves",
        "total_assets": 8,
        "assets": [
          {
            "asset_id": "MOVE_002",
            "asset_name": "Electronic Dance Moves",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/moves/MOVE_002.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/moves/MOVE_002.jpg",
            "duration_seconds": 40,
            "file_size_mb": 11.2,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.93,
            "layer": "moves",
            "category": "dance",
            "subcategory": "electronic",
            "metadata": {
              "difficulty": "advanced",
              "style": "electronic",
              "energy_level": "medium"
            }
          }
        ]
      },
      "worlds": {
        "layer_type": "worlds",
        "total_assets": 4,
        "assets": [
          {
            "asset_id": "WORLD_002",
            "asset_name": "Electronic Club Scene",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/worlds/WORLD_002.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/worlds/WORLD_002.jpg",
            "duration_seconds": 50,
            "file_size_mb": 15.6,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.89,
            "layer": "worlds",
            "category": "venue",
            "subcategory": "club",
            "metadata": {
              "venue_type": "electronic_club",
              "lighting": "neon_lights",
              "atmosphere": "experimental"
            }
          }
        ]
      }
    },
    "asset_relationships": {
      "compatibility_matrix": {
        "STAR_003": {
          "LOOK_002": 0.94,
          "MOVE_002": 0.96,
          "WORLD_002": 0.91
        }
      },
      "base_to_variants": {
        "STAR_003": ["STAR_003_V1", "STAR_003_V2"]
      },
      "layer_dependencies": {
        "stars": ["looks", "moves"],
        "looks": ["worlds"],
        "moves": ["worlds"]
      }
    },
    "performance_metrics": {
      "total_assets_loaded": 26,
      "response_time_ms": 312,
      "response_size_bytes": 4857392,
      "cache_hit_rate": 0.78,
      "assets_from_cdn": 22
    }
  },
  "metadata": {
    "request_id": "req_desktop_002",
    "timestamp": "2025-10-11T20:22:00.000Z",
    "version": "2.0.0",
    "partial_response": false
  }
}
```

## ⚡ **SAMPLE 3: MINIMAL CONFIGURATION**

### **Request:**
```json
{
  "composite_id": "COMPOSITE_003",
  "experience_config": {
    "max_assets_per_layer": 2,
    "include_variants": false
  },
  "request_id": "req_minimal_003"
}
```

### **Response:**
```json
{
  "success": true,
  "data": {
    "composite_info": {
      "composite_id": "COMPOSITE_003",
      "composite_name": "Minimal Experience",
      "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_003.mp4",
      "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_003.jpg",
      "duration_seconds": 120,
      "file_size_mb": 28.4,
      "resolution": "1920x1080",
      "format": "mp4",
      "compatibility_score": 0.88
    },
    "layer_assets": {
      "stars": {
        "layer_type": "stars",
        "total_assets": 2,
        "assets": [
          {
            "asset_id": "STAR_004",
            "asset_name": "Simple Performance",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/STAR_004.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_004.jpg",
            "duration_seconds": 20,
            "file_size_mb": 5.2,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.85,
            "layer": "stars",
            "category": "performance",
            "subcategory": "simple"
          }
        ]
      },
      "looks": {
        "layer_type": "looks",
        "total_assets": 2,
        "assets": [
          {
            "asset_id": "LOOK_003",
            "asset_name": "Basic Outfit",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/looks/LOOK_003.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/looks/LOOK_003.jpg",
            "duration_seconds": 15,
            "file_size_mb": 3.8,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.82,
            "layer": "looks",
            "category": "fashion",
            "subcategory": "basic"
          }
        ]
      },
      "moves": {
        "layer_type": "moves",
        "total_assets": 2,
        "assets": [
          {
            "asset_id": "MOVE_003",
            "asset_name": "Basic Dance Moves",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/moves/MOVE_003.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/moves/MOVE_003.jpg",
            "duration_seconds": 25,
            "file_size_mb": 6.1,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.84,
            "layer": "moves",
            "category": "dance",
            "subcategory": "basic"
          }
        ]
      },
      "worlds": {
        "layer_type": "worlds",
        "total_assets": 2,
        "assets": [
          {
            "asset_id": "WORLD_003",
            "asset_name": "Simple Background",
            "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/worlds/WORLD_003.mp4",
            "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/worlds/WORLD_003.jpg",
            "duration_seconds": 30,
            "file_size_mb": 7.5,
            "resolution": "1920x1080",
            "format": "mp4",
            "compatibility_score": 0.86,
            "layer": "worlds",
            "category": "venue",
            "subcategory": "simple"
          }
        ]
      }
    },
    "asset_relationships": {
      "compatibility_matrix": {
        "STAR_004": {
          "LOOK_003": 0.88,
          "MOVE_003": 0.91,
          "WORLD_003": 0.85
        }
      },
      "base_to_variants": {},
      "layer_dependencies": {
        "stars": ["looks", "moves"],
        "looks": ["worlds"],
        "moves": ["worlds"]
      }
    },
    "performance_metrics": {
      "total_assets_loaded": 8,
      "response_time_ms": 156,
      "response_size_bytes": 1427392,
      "cache_hit_rate": 0.92,
      "assets_from_cdn": 8
    }
  },
  "metadata": {
    "request_id": "req_minimal_003",
    "timestamp": "2025-10-11T20:23:00.000Z",
    "version": "2.0.0",
    "partial_response": false
  }
}
```

## ❌ **ERROR RESPONSES**

### **SAMPLE 4: MISSING composite_id**

**Request:**
```json
{
  "experience_config": {
    "max_assets_per_layer": 4
  }
}
```

**Response:**
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
  "method": "POST",
  "requestId": "req_error_001"
}
```

### **SAMPLE 5: INVALID composite_id**

**Request:**
```json
{
  "composite_id": "INVALID_COMPOSITE",
  "experience_config": {
    "max_assets_per_layer": 4
  }
}
```

**Response:**
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
  "method": "POST",
  "requestId": "req_error_002"
}
```

### **SAMPLE 6: UNAUTHORIZED (Missing JWT)**

**Request:**
```json
{
  "composite_id": "COMPOSITE_001",
  "experience_config": {
    "max_assets_per_layer": 4
  }
}
```

**Response:**
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
  "method": "POST",
  "requestId": "req_error_003"
}
```

## 🔍 **GCP URL VERIFICATION**

### **SAMPLE 7: GCP URL STRUCTURE**

All URLs follow this pattern:

**Composite Videos:**
```
https://storage.googleapis.com/algorhythm-assets/composites/{composite_id}.mp4
```

**Asset Videos:**
```
https://storage.googleapis.com/algorhythm-assets/{layer}/{asset_id}.mp4
```

**Thumbnails:**
```
https://storage.googleapis.com/algorhythm-assets/thumbnails/{type}/{id}.jpg
```

**Variants:**
```
https://storage.googleapis.com/algorhythm-assets/{layer}/variants/{variant_id}.mp4
```

### **SAMPLE 8: URL VERIFICATION SCRIPT**

```bash
#!/bin/bash

# GCP URL Verification Script
echo "🔍 Verifying GCP URLs..."

# Test composite URLs
COMPOSITE_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_002.mp4"
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_003.mp4"
)

# Test asset URLs
ASSET_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/stars/STAR_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/looks/LOOK_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/moves/MOVE_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/worlds/WORLD_001.mp4"
)

# Test thumbnail URLs
THUMBNAIL_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/looks/LOOK_001.jpg"
)

echo "Testing composite URLs..."
for url in "${COMPOSITE_URLS[@]}"; do
  echo "Testing: $url"
  curl -I "$url" | head -1
done

echo "Testing asset URLs..."
for url in "${ASSET_URLS[@]}"; do
  echo "Testing: $url"
  curl -I "$url" | head -1
done

echo "Testing thumbnail URLs..."
for url in "${THUMBNAIL_URLS[@]}"; do
  echo "Testing: $url"
  curl -I "$url" | head -1
done

echo "✅ GCP URL verification complete!"
```

---

**🔧 This comprehensive sample documentation demonstrates the complete ReViz Composite API implementation with real GCP URLs and proper error handling.**
