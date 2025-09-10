import { Injectable } from '@nestjs/common';
import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';
import { SCORING_THRESHOLDS } from '../../../common/constants/compatibility-weights';

@Injectable()
export class DiversityService {
  applyDiversityBoost(
    recommendations: TemplateRecommendation[],
    maxResults: number = 10,
  ): TemplateRecommendation[] {
    if (recommendations.length <= maxResults) {
      return this.addRandomTieBreaker(recommendations);
    }

    // Group by similar characteristics to ensure diversity
    const diverseRecommendations: TemplateRecommendation[] = [];
    const used = new Set<string>();

    // First pass: include top recommendations from different "style families"
    const styleFamilies = this.groupByStyleFamily(recommendations);
    
    for (const [family, templates] of styleFamilies.entries()) {
      if (diverseRecommendations.length >= maxResults) break;
      
      // Take the best recommendation from each style family
      const bestFromFamily = templates
        .filter(t => !used.has(t.template_id))
        .sort((a, b) => b.compatibility_score - a.compatibility_score)[0];
      
      if (bestFromFamily) {
        diverseRecommendations.push(bestFromFamily);
        used.add(bestFromFamily.template_id);
      }
    }

    // Second pass: fill remaining slots with highest scoring unused templates
    const remainingSlots = maxResults - diverseRecommendations.length;
    if (remainingSlots > 0) {
      const remaining = recommendations
        .filter(t => !used.has(t.template_id))
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, remainingSlots);
      
      diverseRecommendations.push(...remaining);
    }

    return this.addRandomTieBreaker(diverseRecommendations);
  }

  private groupByStyleFamily(
    recommendations: TemplateRecommendation[],
  ): Map<string, TemplateRecommendation[]> {
    const families = new Map<string, TemplateRecommendation[]>();

    for (const recommendation of recommendations) {
      const family = this.determineStyleFamily(recommendation);
      
      if (!families.has(family)) {
        families.set(family, []);
      }
      
      families.get(family)!.push(recommendation);
    }

    return families;
  }

  private determineStyleFamily(recommendation: TemplateRecommendation): string {
    const tags = recommendation.metadata.tags || [];
    const lowerTags = tags.map(tag => tag.toLowerCase());

    // Determine style family based on tags
    if (lowerTags.some(tag => ['modern', 'futuristic', 'tech'].includes(tag))) {
      return 'modern';
    } else if (lowerTags.some(tag => ['vintage', 'retro', 'classic'].includes(tag))) {
      return 'vintage';
    } else if (lowerTags.some(tag => ['colorful', 'vibrant', 'bright'].includes(tag))) {
      return 'vibrant';
    } else if (lowerTags.some(tag => ['dark', 'moody', 'dramatic'].includes(tag))) {
      return 'dramatic';
    } else if (lowerTags.some(tag => ['minimal', 'clean', 'simple'].includes(tag))) {
      return 'minimal';
    }

    return 'general'; // Default family
  }

  private addRandomTieBreaker(
    recommendations: TemplateRecommendation[],
  ): TemplateRecommendation[] {
    // Add small random factor for tie-breaking
    return recommendations.map(rec => ({
      ...rec,
      compatibility_score: rec.compatibility_score * (1 + Math.random() * SCORING_THRESHOLDS.DIVERSITY_FACTOR),
    })).sort((a, b) => b.compatibility_score - a.compatibility_score);
  }

  async computeDiversityScore(song: any, template: any): Promise<number> {
    // Simple diversity score based on template characteristics
    // This is a placeholder implementation
    if (!template || !template.tags) {
      return 0.5; // Default diversity score
    }

    const tags = template.tags || [];
    const diversityFactors = {
      style_variety: tags.length / 10, // More tags = more diverse
      uniqueness: Math.random() * 0.3, // Random factor for uniqueness
    };

    // Combine factors with weights
    const diversityScore = (
      diversityFactors.style_variety * 0.7 +
      diversityFactors.uniqueness * 0.3
    );

    return Math.min(diversityScore, 1.0); // Cap at 1.0
  }
}
