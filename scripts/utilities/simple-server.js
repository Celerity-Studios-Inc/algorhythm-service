const express = require("express");
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "algorhythm-service",
    version: "1.0.0"
  });
});

// Mock recommendation endpoint
app.post("/api/v1/algorhythm/recommend/template", (req, res) => {
  const { song_id, song_metadata, user_id, session_id, limit = 5 } = req.body;
  
  const mockRecommendations = [
    {
      template: {
        id: "template-001",
        name: "Hip-Hop Dance Template",
        description: "Perfect for energetic hip-hop tracks",
        avg_bpm: 120,
        primary_genre: "hip-hop",
        energy: "high",
        style: "urban",
        mood: "energetic",
        created_at: new Date(),
        tags: ["hip-hop", "urban", "energetic", "dance"],
        components: ["stars", "looks", "moves"],
        layer_type: "composite",
        category: "dance",
      },
      score: 0.95,
      breakdown: {
        tempo_score: 0.9,
        genre_score: 1.0,
        energy_score: 1.0,
        style_score: 0.8,
        mood_score: 1.0,
      },
      freshness_boost: 1.1,
    },
    {
      template: {
        id: "template-002",
        name: "Electronic Beat Template",
        description: "Great for electronic and EDM tracks",
        avg_bpm: 128,
        primary_genre: "electronic",
        energy: "high",
        style: "futuristic",
        mood: "exciting",
        created_at: new Date(),
        tags: ["electronic", "futuristic", "exciting", "edm"],
        components: ["stars", "worlds"],
        layer_type: "composite",
        category: "electronic",
      },
      score: 0.85,
      breakdown: {
        tempo_score: 0.8,
        genre_score: 0.7,
        energy_score: 1.0,
        style_score: 0.9,
        mood_score: 0.9,
      },
      freshness_boost: 1.0,
    },
  ];

  res.json({
    success: true,
    data: {
      recommendations: mockRecommendations.slice(0, limit),
      total_count: mockRecommendations.length,
      response_time_ms: 45,
      cache_status: "miss",
    },
    metadata: {
      song_id,
      user_id,
      session_id,
      timestamp: new Date().toISOString(),
    },
  });
});

// Analytics endpoints
app.get("/api/v1/algorhythm/analytics/metrics", (req, res) => {
  res.json({
    total_requests: 100,
    average_response_time: 45,
    cache_hit_rate: 0.85,
    top_genres: ["hip-hop", "pop", "electronic"],
    period: {
      start: req.query.startDate,
      end: req.query.endDate
    }
  });
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 AlgoRhythm Service running on port ${port}`);
  console.log(`🏥 Health check available at http://localhost:${port}/api/v1/health`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});
