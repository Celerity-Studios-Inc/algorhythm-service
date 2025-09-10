import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RuleBasedScoringService {
  private readonly logger = new Logger(RuleBasedScoringService.name);

  async computeScore(
    song: any,
    template: any,
    userPreferences?: any,
  ): Promise<{
    tempo_score: number;
    genre_score: number;
    energy_score: number;
    style_score: number;
    mood_score: number;
  }> {
    const tempoScore = this.computeTempoCompatibility(song, template);
    const genreScore = this.computeGenreCompatibility(song, template);
    const energyScore = this.computeEnergyCompatibility(song, template);
    const styleScore = this.computeStyleCompatibility(song, template);
    const moodScore = this.computeMoodCompatibility(song, template);

    // Apply user preference adjustments
    const adjustedScores = this.applyUserPreferences({
      tempo_score: tempoScore,
      genre_score: genreScore,
      energy_score: energyScore,
      style_score: styleScore,
      mood_score: moodScore,
    }, userPreferences);

    return adjustedScores;
  }

  private computeTempoCompatibility(song: any, template: any): number {
    const songBPM = song.songMetadata?.bpm;
    if (!songBPM) return 0.5; // Default score if BPM not available

    // Extract BPM hints from template tags
    const templateTags = template.tags || [];
    const bpmHints = templateTags.filter((tag: string) => 
      tag.includes('bpm') || tag.includes('tempo')
    );

    if (bpmHints.length === 0) return 0.5; // Default score

    // Simple BPM matching - in a real implementation, this would be more sophisticated
    let maxCompatibility = 0;
    
    for (const hint of bpmHints) {
      // Extract numeric BPM from tags like "120bpm", "fast-tempo", etc.
      const bpmMatch = hint.match(/(\d+)bpm/);
      if (bpmMatch) {
        const templateBPM = parseInt(bpmMatch[1]);
        const difference = Math.abs(songBPM - templateBPM);
        
        // Score based on BPM difference (perfect match = 1.0, large difference = 0.0)
        const compatibility = Math.max(0, 1 - (difference / 60)); // 60 BPM tolerance
        maxCompatibility = Math.max(maxCompatibility, compatibility);
      }
    }

    return maxCompatibility || 0.5;
  }

  private computeGenreCompatibility(song: any, template: any): number {
    const songGenre = song.songMetadata?.genre?.toLowerCase();
    if (!songGenre) return 0.5;

    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());
    
    // Direct genre match
    if (templateTags.includes(songGenre)) return 1.0;

    // Genre family matching
    const genreFamilies = {
      'pop': ['electronic', 'dance', 'synth'],
      'rock': ['alternative', 'indie', 'punk'],
      'hip-hop': ['rap', 'urban', 'r&b'],
      'electronic': ['edm', 'techno', 'house', 'dance'],
      'jazz': ['blues', 'soul', 'funk'],
      'classical': ['orchestral', 'symphonic'],
    };

    const relatedGenres = genreFamilies[songGenre] || [];
    for (const relatedGenre of relatedGenres) {
      if (templateTags.includes(relatedGenre)) return 0.7; // Partial match
    }

    return 0.3; // No genre compatibility found
  }

  private computeEnergyCompatibility(song: any, template: any): number {
    // Extract energy level from song metadata or tags
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const energyLevels = ['low-energy', 'moderate-energy', 'high-energy'];
    
    const songEnergy = songTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';
    const templateEnergy = templateTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';

    if (songEnergy === templateEnergy) return 1.0;
    
    // Adjacent energy levels have partial compatibility
    const energyMap = { 'low-energy': 0, 'moderate-energy': 1, 'high-energy': 2 };
    const songLevel = energyMap[songEnergy];
    const templateLevel = energyMap[templateEnergy];
    const difference = Math.abs(songLevel - templateLevel);
    
    return difference === 1 ? 0.6 : 0.2; // Adjacent = 0.6, opposite = 0.2
  }

  private computeStyleCompatibility(song: any, template: any): number {
    // Style compatibility based on visual and aesthetic tags
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const styleKeywords = [
      'modern', 'vintage', 'retro', 'futuristic', 'minimalist', 'colorful',
      'dark', 'bright', 'abstract', 'realistic', 'artistic', 'commercial'
    ];

    const songStyles = songTags.filter(tag => styleKeywords.includes(tag));
    const templateStyles = templateTags.filter(tag => styleKeywords.includes(tag));

    if (songStyles.length === 0 || templateStyles.length === 0) return 0.5;

    // Calculate intersection ratio
    const intersection = songStyles.filter(style => templateStyles.includes(style));
    const union = [...new Set([...songStyles, ...templateStyles])];
    
    return intersection.length / union.length;
  }

  private computeMoodCompatibility(song: any, template: any): number {
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const moodKeywords = [
      'happy', 'sad', 'energetic', 'calm', 'intense', 'peaceful',
      'aggressive', 'romantic', 'mysterious', 'uplifting', 'dramatic'
    ];

    const songMoods = songTags.filter(tag => moodKeywords.includes(tag));
    const templateMoods = templateTags.filter(tag => moodKeywords.includes(tag));

    if (songMoods.length === 0 || templateMoods.length === 0) return 0.5;

    // Calculate mood compatibility
    const intersection = songMoods.filter(mood => templateMoods.includes(mood));
    return intersection.length > 0 ? intersection.length / Math.max(songMoods.length, templateMoods.length) : 0.3;
  }

  private applyUserPreferences(
    scores: any,
    userPreferences?: any,
  ): any {
    if (!userPreferences) return scores;

    const adjustedScores = { ...scores };

    // Apply energy preference boost
    if (userPreferences.energy_preference) {
      const energyBoost = userPreferences.energy_preference === 'high' ? 1.1 : 
                         userPreferences.energy_preference === 'low' ? 0.9 : 1.0;
      adjustedScores.energy_score *= energyBoost;
    }

    // Apply genre preference boost
    if (userPreferences.genre_preferences && userPreferences.genre_preferences.length > 0) {
      // This would require access to song/template data to check if preferred genres match
      // For now, apply a small boost to genre score
      adjustedScores.genre_score *= 1.05;
    }

    // Normalize scores to [0, 1] range
    Object.keys(adjustedScores).forEach(key => {
      adjustedScores[key] = Math.max(0, Math.min(1, adjustedScores[key]));
    });

    return adjustedScores;
  }
}
