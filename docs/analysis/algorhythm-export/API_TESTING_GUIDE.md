# API Testing Guide for Algorhythm Team
**Date**: October 10, 2025  
**Purpose**: Test enhanced metadata endpoints and validate data quality

---

## 🔗 **API Base URL**
```
https://registry.dev.reviz.dev/api
```

---

## 🧪 **Test Credentials**
```bash
# Get JWT Token
curl -X POST https://registry.dev.reviz.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "phase1test@example.com", "password": "TestPhase1!"}'

# Response will include JWT token for authenticated requests
```

---

## 📊 **Enhanced Metadata Endpoints**

### **1. Individual Assets with Algorhythm Metadata**

#### **Get All Enhanced Assets**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata[exists]=true"
```

#### **Filter by Layer**
```bash
# Songs (G layer)
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=G&algorhythmMetadata[exists]=true"

# Stars (S layer)  
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=S&algorhythmMetadata[exists]=true"
```

#### **Filter by Energy Level**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata.energyLevel=high"
```

#### **Filter by Target Audience**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata.targetAudience=teens"
```

#### **Filter by Cultural Context**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata.culturalContext=western"
```

### **2. Composite Assets with Aggregated Metadata**

#### **Get All Composite Assets**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C"
```

#### **Filter by Synergy Score**
```bash
# High synergy Composites (>= 80%)
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&aggregatedMetadata.synergyScore[gte]=80"
```

#### **Filter by Energy Balance**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&aggregatedMetadata.synergyBreakdown.energyBalance[gte]=0.8"
```

### **3. Batch Component Fetching**

#### **Fetch Multiple Assets by IDs**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["68e8d336857213fc2aa44545", "68e8d052857213fc2aa4450c"]}' \
  "https://registry.dev.reviz.dev/api/assets/batch"
```

---

## 🔍 **Data Validation Tests**

### **Test 1: Verify Algorhythm Metadata Structure**
```bash
# Get a single asset and verify structure
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=S&limit=1" | \
  jq '.data[0].algorhythmMetadata'
```

**Expected Response**:
```json
{
  "performanceContext": ["studio", "concert"],
  "targetAudience": ["teens", "young_adults"],
  "culturalContext": ["western", "k_pop"],
  "musicalStyle": ["pop", "electronic"],
  "energyLevel": "high"
}
```

### **Test 2: Verify Composite Aggregated Metadata**
```bash
# Get a Composite asset and verify structure
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&limit=1" | \
  jq '.data[0].aggregatedMetadata'
```

**Expected Response**:
```json
{
  "synergyScore": 85,
  "synergyBreakdown": {
    "visualCohesion": 0.8,
    "culturalAlignment": 0.9,
    "energyBalance": 0.7,
    "audienceMatch": 0.85,
    "thematicCoherence": 0.75
  }
}
```

### **Test 3: Verify Component Relationships**
```bash
# Check Composite components
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&limit=1" | \
  jq '.data[0].components'
```

**Expected Response**:
```json
[
  {
    "id": "68e80577cb2cf372c7a6f87f",
    "name": "G.POP.TEE.003",
    "layer": "G",
    "category": "POP",
    "subcategory": "TEE"
  },
  // ... 4 more components
]
```

---

## 📈 **Performance Testing**

### **Test Query Performance**
```bash
# Time complex queries
time curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata.energyLevel=high&algorhythmMetadata.targetAudience=teens"
```

### **Test Batch Performance**
```bash
# Time batch requests
time curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["68e8d336857213fc2aa44545", "68e8d052857213fc2aa4450c", "68e8cecd857213fc2aa444c9"]}' \
  "https://registry.dev.reviz.dev/api/assets/batch"
```

---

## 🎯 **Expected Results**

### **Data Quality Checks**
- ✅ All enhanced assets have `algorhythmMetadata` field
- ✅ All Composite assets have `aggregatedMetadata` field
- ✅ Field values follow standardized schema
- ✅ Synergy scores are between 0-100
- ✅ Energy levels are valid enum values

### **Performance Expectations**
- ✅ Individual asset queries: <100ms
- ✅ Composite asset queries: <200ms
- ✅ Batch requests: <300ms
- ✅ Complex filters: <500ms

### **Coverage Expectations**
- ✅ 90% of assets have Algorhythm metadata
- ✅ 94% of Composites have aggregated metadata
- ✅ All layers represented (G, S, L, M, W, C)
- ✅ Consistent field structure across all assets

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **401 Unauthorized**
```bash
# Re-authenticate and get fresh token
curl -X POST https://registry.dev.reviz.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "phase1test@example.com", "password": "TestPhase1!"}'
```

#### **Empty Results**
```bash
# Check if assets exist
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?limit=5"
```

#### **Missing Metadata**
```bash
# Check specific asset
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets/68e8d336857213fc2aa44545"
```

---

## 📊 **Sample Test Script**

```bash
#!/bin/bash
# Complete API test script

# Get token
TOKEN=$(curl -s -X POST https://registry.dev.reviz.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "phase1test@example.com", "password": "TestPhase1!"}' \
  | jq -r '.data.token')

echo "🔑 Token: $TOKEN"

# Test 1: Individual assets with Algorhythm metadata
echo "🧪 Test 1: Individual assets with Algorhythm metadata"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?algorhythmMetadata[exists]=true&limit=3" | \
  jq '.data | length'

# Test 2: Composite assets with aggregated metadata
echo "🧪 Test 2: Composite assets with aggregated metadata"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&limit=3" | \
  jq '.data | length'

# Test 3: High synergy Composites
echo "🧪 Test 3: High synergy Composites"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry.dev.reviz.dev/api/assets?layer=C&aggregatedMetadata.synergyScore[gte]=80" | \
  jq '.data | length'

# Test 4: Batch fetch
echo "🧪 Test 4: Batch fetch"
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["68e8d336857213fc2aa44545", "68e8d052857213fc2aa4450c"]}' \
  "https://registry.dev.reviz.dev/api/assets/batch" | \
  jq '.data.assets | length'

echo "✅ All tests completed!"
```

---

**🎯 Ready for Algorhythm team API testing and validation!**
