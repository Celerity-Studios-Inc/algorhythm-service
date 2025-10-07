# 🚀 Trending Feature Workaround - Use Existing APIs

## Overview

Until the trending infrastructure is built, ReViz developers can simulate trending functionality using existing API endpoints with smart filtering and sorting.

---

## 📱 Mobile Implementation (React Native)

### **1. "Trending Songs" - Recent Songs**

```javascript
// Get recently added songs (simulates trending)
const getTrendingSongs = async (limit = 20) => {
  try {
    const response = await fetch(
      `https://registry.dev.reviz.dev/api/assets?layer=G&limit=${limit}&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Assets are already sorted by createdAt descending (newest first)
    return data.items.map(asset => ({
      songName: asset.songMetadata?.songName || 'Unknown',
      artistName: asset.songMetadata?.artistName || 'Unknown',
      albumArt: asset.songMetadata?.albumArtUrl || asset.albumArt,
      mfa: asset.nna_address,
      hfn: asset.name,
      genre: asset.songMetadata?.genre?.[0] || 'pop',
      bpm: asset.songMetadata?.bpm || 120,
      // Simulate trending score based on recency
      trendingScore: calculateRecencyScore(asset.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching trending songs:', error);
    return [];
  }
};

// Helper: Calculate pseudo-trending score based on how recent the asset is
const calculateRecencyScore = (createdAt) => {
  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
  
  // Assets created in last 7 days get high scores
  if (daysSinceCreation < 7) return 95 + (7 - daysSinceCreation);
  if (daysSinceCreation < 30) return 70 + (30 - daysSinceCreation) / 2;
  return 50;
};
```

### **2. "Trending Videos" - Recent Composites**

```javascript
// Get recently created composite assets (remixes)
const getTrendingVideos = async (limit = 20) => {
  try {
    const response = await fetch(
      `https://registry.dev.reviz.dev/api/assets?layer=C&limit=${limit}&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    return data.items.map(asset => ({
      compositeName: asset.compositeName || 'Untitled Remix',
      creatorEmail: asset.createdBy || asset.songMetadata?.remixedBy,
      songName: asset.songMetadata?.songName,
      albumArt: asset.songMetadata?.albumArtUrl || asset.albumArt,
      videoUrl: asset.gcpStorageUrl,
      mfa: asset.nna_address,
      hfn: asset.name,
      components: asset.componentAssets || [],
      trendingScore: calculateRecencyScore(asset.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return [];
  }
};
```

### **3. "Trending Creators" - Most Active Users**

```javascript
// Get most active creators based on recent asset creation
const getTrendingCreators = async (limit = 20) => {
  try {
    // Get recent composite assets
    const response = await fetch(
      `https://registry.dev.reviz.dev/api/assets?layer=C&limit=100&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Aggregate by creator
    const creatorMap = new Map();
    
    data.items.forEach(asset => {
      const creator = asset.createdBy || asset.songMetadata?.remixedBy || 'unknown';
      
      if (!creatorMap.has(creator)) {
        creatorMap.set(creator, {
          email: creator,
          assetCount: 0,
          recentAssets: [],
          latestActivity: asset.createdAt
        });
      }
      
      const creatorData = creatorMap.get(creator);
      creatorData.assetCount++;
      if (creatorData.recentAssets.length < 5) {
        creatorData.recentAssets.push({
          name: asset.compositeName,
          albumArt: asset.songMetadata?.albumArtUrl,
          mfa: asset.nna_address
        });
      }
      
      // Update latest activity
      if (new Date(asset.createdAt) > new Date(creatorData.latestActivity)) {
        creatorData.latestActivity = asset.createdAt;
      }
    });
    
    // Convert to array and sort by activity
    const creators = Array.from(creatorMap.values())
      .sort((a, b) => new Date(b.latestActivity) - new Date(a.latestActivity))
      .slice(0, limit);
    
    return creators;
  } catch (error) {
    console.error('Error fetching trending creators:', error);
    return [];
  }
};
```

### **4. Time-Based Filtering**

```javascript
// Get trending content for specific time periods
const getTrendingByPeriod = async (layer, period = 'week') => {
  const periodMap = {
    'today': 1,
    'week': 7,
    'month': 30,
    'all': 365
  };
  
  const days = periodMap[period] || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    // Get all assets for the layer
    const response = await fetch(
      `https://registry.dev.reviz.dev/api/assets?layer=${layer}&limit=100&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Filter by time period
    const filteredAssets = data.items.filter(asset => {
      const createdDate = new Date(asset.createdAt);
      return createdDate >= cutoffDate;
    });
    
    // Sort by recency within the period
    return filteredAssets.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (error) {
    console.error('Error fetching trending by period:', error);
    return [];
  }
};
```

### **5. Combined Trending Dashboard**

```javascript
// Complete trending dashboard data
const getTrendingDashboard = async () => {
  try {
    const [songs, videos, creators] = await Promise.all([
      getTrendingSongs(20),
      getTrendingVideos(20),
      getTrendingCreators(10)
    ]);
    
    return {
      trendingSongs: songs,
      trendingVideos: videos,
      trendingCreators: creators,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching trending dashboard:', error);
    return {
      trendingSongs: [],
      trendingVideos: [],
      trendingCreators: [],
      lastUpdated: new Date().toISOString()
    };
  }
};
```

---

## 🎨 **UI Implementation Example**

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';

const TrendingScreen = () => {
  const [trendingData, setTrendingData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  useEffect(() => {
    loadTrendingData();
  }, [selectedPeriod]);
  
  const loadTrendingData = async () => {
    const data = await getTrendingDashboard();
    setTrendingData(data);
  };
  
  const renderSongItem = ({ item }) => (
    <View style={styles.songCard}>
      <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
      <View style={styles.songInfo}>
        <Text style={styles.songName}>{item.songName}</Text>
        <Text style={styles.artistName}>{item.artistName}</Text>
        <Text style={styles.trendingScore}>🔥 Trending Score: {item.trendingScore.toFixed(0)}</Text>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔥 Trending on ReViz</Text>
      
      {/* Period selector */}
      <View style={styles.periodSelector}>
        {['today', 'week', 'month', 'all'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text>{period.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Trending Songs */}
      <Text style={styles.sectionHeader}>Trending Songs</Text>
      <FlatList
        horizontal
        data={trendingData?.trendingSongs || []}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.mfa}
      />
      
      {/* Similar sections for videos and creators */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  periodSelector: { flexDirection: 'row', marginBottom: 16 },
  periodButton: { 
    padding: 8, 
    marginRight: 8, 
    borderRadius: 8, 
    backgroundColor: '#f0f0f0' 
  },
  periodButtonActive: { backgroundColor: '#007bff' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  songCard: { 
    flexDirection: 'row', 
    marginRight: 16, 
    width: 250, 
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  albumArt: { width: 80, height: 80, borderRadius: 8 },
  songInfo: { marginLeft: 12, flex: 1 },
  songName: { fontSize: 16, fontWeight: 'bold' },
  artistName: { fontSize: 14, color: '#666', marginTop: 4 },
  trendingScore: { fontSize: 12, color: '#ff6b6b', marginTop: 8 }
});

export default TrendingScreen;
```

---

## ⚡ **Performance Tips**

1. **Cache Results**: Store trending data in AsyncStorage and refresh every 30 minutes
2. **Pagination**: Load more items as user scrolls
3. **Lazy Loading**: Load images only when visible
4. **Background Refresh**: Update trending data in background

```javascript
// Cache implementation
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'trending_dashboard';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getCachedTrendingData = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

const cacheTrendingData = async (data) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error caching trending data:', error);
  }
};
```

---

## 📊 **Limitations of Workaround**

This workaround has limitations:

1. **Not True Trending**: Based on recency, not actual engagement metrics
2. **No View Counts**: Can't sort by popularity
3. **No Real-Time Updates**: Relies on creation date only
4. **Limited Accuracy**: Doesn't account for actual user behavior

**For Production**: Implement the full trending feature with:
- Real engagement tracking (views, likes, shares, remix count)
- TikTok/social media API integration
- Time-decay algorithms for true trending scores
- Real-time analytics pipeline

---

## ✅ **When to Upgrade to Full Implementation**

Implement the full trending feature when:
1. ✅ All 5 component layers (G, S, L, M, W) are tested and working
2. ✅ Composites layer is stable
3. ✅ Basic analytics tracking is in place
4. ✅ Team has bandwidth for 2-3 week implementation

**Estimated Effort**:
- Workaround implementation: 4-8 hours
- Full trending feature: 2-3 weeks

Use this workaround to unblock ReViz development while the backend team completes layer testing!