export const COMPATIBILITY_WEIGHTS = {
  tempo: 0.30,   // BPM matching - most important for music sync
  genre: 0.25,   // Genre alignment - crucial for style consistency
  energy: 0.20,  // Energy level matching - affects user experience
  style: 0.15,   // Visual style coherence - aesthetic consistency
  mood: 0.10,    // Atmosphere/mood matching - subtle but important
} as const;

export const FRESHNESS_BOOST = {
  FIRST_WEEK: 1.20,    // 20% boost for templates < 7 days old
  FIRST_MONTH: 1.10,   // 10% boost for templates < 30 days old
  FIRST_QUARTER: 1.05, // 5% boost for templates < 90 days old
} as const;

export const SCORING_THRESHOLDS = {
  MIN_RECOMMENDATION_SCORE: 0.6,  // Minimum score to recommend
  DIVERSITY_FACTOR: 0.01,          // Random factor for tie-breaking (0-1%)
  MAX_ALTERNATIVES: 10,            // Maximum alternative templates
  MAX_LAYER_VARIATIONS: 8,         // Maximum layer variations
} as const;
