#!/bin/bash

# GCP URL Verification Script
echo "🔍 Verifying GCP URLs for ReViz Composite API..."

# Test composite URLs
echo "📹 Testing composite URLs..."
COMPOSITE_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_002.mp4"
  "https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_003.mp4"
)

for url in "${COMPOSITE_URLS[@]}"; do
  echo "Testing: $url"
  response=$(curl -I -s "$url" | head -1)
  echo "Response: $response"
  echo "---"
done

# Test asset URLs
echo "🎬 Testing asset URLs..."
ASSET_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/stars/STAR_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/looks/LOOK_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/moves/MOVE_001.mp4"
  "https://storage.googleapis.com/algorhythm-assets/worlds/WORLD_001.mp4"
)

for url in "${ASSET_URLS[@]}"; do
  echo "Testing: $url"
  response=$(curl -I -s "$url" | head -1)
  echo "Response: $response"
  echo "---"
done

# Test thumbnail URLs
echo "🖼️  Testing thumbnail URLs..."
THUMBNAIL_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/looks/LOOK_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/moves/MOVE_001.jpg"
  "https://storage.googleapis.com/algorhythm-assets/thumbnails/worlds/WORLD_001.jpg"
)

for url in "${THUMBNAIL_URLS[@]}"; do
  echo "Testing: $url"
  response=$(curl -I -s "$url" | head -1)
  echo "Response: $response"
  echo "---"
done

# Test variant URLs
echo "🔄 Testing variant URLs..."
VARIANT_URLS=(
  "https://storage.googleapis.com/algorhythm-assets/stars/variants/STAR_001_V1.mp4"
  "https://storage.googleapis.com/algorhythm-assets/looks/variants/LOOK_001_V1.mp4"
  "https://storage.googleapis.com/algorhythm-assets/moves/variants/MOVE_001_V1.mp4"
)

for url in "${VARIANT_URLS[@]}"; do
  echo "Testing: $url"
  response=$(curl -I -s "$url" | head -1)
  echo "Response: $response"
  echo "---"
done

echo "✅ GCP URL verification complete!"
