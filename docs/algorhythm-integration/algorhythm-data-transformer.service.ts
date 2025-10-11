import { Injectable, Logger } from '@nestjs/common';
import { Asset } from '../../../models/asset.schema';
import { AlgorhythmTemplate } from './algorhythm-webhook.service';

@Injectable()
export class AlgorhythmDataTransformerService {
  private readonly logger = new Logger(AlgorhythmDataTransformerService.name);

  /**
   * Transform NNA Registry asset to Algorhythm template format
   */
  async transformToAlgorhythmTemplate(asset: Asset): Promise<AlgorhythmTemplate> {
    this.logger.log(`🔄 [TRANSFORM] Converting asset ${asset._id} to Algorhythm format`);
    
    const songId = this.extractSongId(asset.name);
    
    const template: AlgorhythmTemplate = {
      templateId: (asset as any)._id.toString(),
      songId: songId || 'unknown',
      name: asset.name,
      metadata: {
        performanceContext: this.normalizeArray(asset.algorhythmMetadata?.performanceContext),
        targetAudience: this.normalizeArray(asset.algorhythmMetadata?.targetAudience),
        culturalContext: this.normalizeArray(asset.algorhythmMetadata?.culturalContext),
        musicalStyle: this.normalizeArray(asset.algorhythmMetadata?.musicalStyle),
        energyLevel: this.normalizeEnergyLevel(asset.algorhythmMetadata?.energyLevel)
      },
      aggregatedMetadata: {
        synergyScore: this.normalizeNumber(asset.aggregatedMetadata?.synergyScore),
        visualCohesion: this.normalizeNumber(asset.aggregatedMetadata?.visualCohesion),
        culturalAlignment: this.normalizeNumber(asset.aggregatedMetadata?.culturalAlignment),
        energyBalance: this.normalizeNumber(asset.aggregatedMetadata?.energyBalance),
        audienceMatch: this.normalizeNumber(asset.aggregatedMetadata?.audienceMatch),
        thematicCoherence: this.normalizeNumber(asset.aggregatedMetadata?.thematicCoherence)
      },
      components: this.transformComponents(asset.components || []),
      gcpStorageUrl: asset.gcpStorageUrl || '',
      thumbnailUrl: (asset as any).thumbnailUrl,
      description: asset.description || '',
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };

    this.logger.log(`✅ [TRANSFORM] Successfully transformed asset ${asset._id} for song ${songId}`);
    return template;
  }

  /**
   * Transform multiple assets to Algorhythm format
   */
  async transformMultipleAssets(assets: Asset[]): Promise<AlgorhythmTemplate[]> {
    this.logger.log(`🔄 [TRANSFORM] Converting ${assets.length} assets to Algorhythm format`);
    
    const templates = await Promise.all(
      assets.map(asset => this.transformToAlgorhythmTemplate(asset))
    );

    this.logger.log(`✅ [TRANSFORM] Successfully transformed ${templates.length} assets`);
    return templates;
  }

  /**
   * Group templates by song ID
   */
  groupTemplatesBySong(templates: AlgorhythmTemplate[]): Record<string, AlgorhythmTemplate[]> {
    const grouped: Record<string, AlgorhythmTemplate[]> = {};
    
    templates.forEach(template => {
      const songId = template.songId;
      if (!grouped[songId]) {
        grouped[songId] = [];
      }
      grouped[songId].push(template);
    });

    this.logger.log(`📊 [TRANSFORM] Grouped templates by song: ${Object.keys(grouped).length} songs`);
    Object.entries(grouped).forEach(([songId, templates]) => {
      this.logger.log(`   🎵 Song ${songId}: ${templates.length} templates`);
    });

    return grouped;
  }

  /**
   * Extract song ID from Composite asset name
   * Format: C.FUL.ALL.XXX:songId+...
   */
  private extractSongId(assetName: string): string | null {
    const match = assetName.match(/:(\d+\.\d+\.\d+\.\d+)\+/);
    return match ? match[1] : null;
  }

  /**
   * Transform component assets to Algorhythm format
   */
  private transformComponents(components: any[]): Array<{
    id: string;
    name: string;
    layer: string;
    category: string;
    subcategory: string;
  }> {
    return components.map(comp => ({
      id: (comp as any)._id?.toString() || 'unknown',
      name: comp.name || 'unknown',
      layer: comp.layer || 'unknown',
      category: comp.category || 'unknown',
      subcategory: comp.subcategory || 'unknown'
    }));
  }

  /**
   * Normalize array fields to ensure they're arrays
   */
  private normalizeArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()];
    }
    return [];
  }

  /**
   * Normalize number fields to ensure they're numbers
   */
  private normalizeNumber(value: any): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
    return 0;
  }

  /**
   * Normalize energy level to valid values
   */
  private normalizeEnergyLevel(value: any): string {
    const validLevels = ['low', 'medium', 'high', 'variable'];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (validLevels.includes(normalized)) {
        return normalized;
      }
    }
    return 'medium'; // Default fallback
  }

  /**
   * Validate template data before sending to Algorhythm
   */
  validateTemplate(template: AlgorhythmTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!template.templateId || template.templateId.trim().length === 0) {
      errors.push('templateId is required');
    }

    if (!template.songId || template.songId.trim().length === 0) {
      errors.push('songId is required');
    }

    if (!template.name || template.name.trim().length === 0) {
      errors.push('name is required');
    }

    if (!template.gcpStorageUrl || template.gcpStorageUrl.trim().length === 0) {
      errors.push('gcpStorageUrl is required');
    }

    // Validate metadata arrays
    if (!Array.isArray(template.metadata.performanceContext)) {
      errors.push('performanceContext must be an array');
    }

    if (!Array.isArray(template.metadata.targetAudience)) {
      errors.push('targetAudience must be an array');
    }

    if (!Array.isArray(template.metadata.culturalContext)) {
      errors.push('culturalContext must be an array');
    }

    if (!Array.isArray(template.metadata.musicalStyle)) {
      errors.push('musicalStyle must be an array');
    }

    // Validate aggregated metadata numbers
    if (typeof template.aggregatedMetadata.synergyScore !== 'number') {
      errors.push('synergyScore must be a number');
    }

    if (template.aggregatedMetadata.synergyScore < 0 || template.aggregatedMetadata.synergyScore > 1) {
      errors.push('synergyScore must be between 0 and 1');
    }

    // Validate components array
    if (!Array.isArray(template.components)) {
      errors.push('components must be an array');
    }

    template.components.forEach((comp, index) => {
      if (!comp.id || comp.id.trim().length === 0) {
        errors.push(`components[${index}].id is required`);
      }
      if (!comp.layer || comp.layer.trim().length === 0) {
        errors.push(`components[${index}].layer is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get transformation statistics
   */
  getTransformationStats(templates: AlgorhythmTemplate[]): {
    totalTemplates: number;
    songsWithTemplates: number;
    templatesWithMetadata: number;
    templatesWithComponents: number;
    averageSynergyScore: number;
  } {
    const songs = new Set(templates.map(t => t.songId));
    const withMetadata = templates.filter(t => 
      t.metadata.performanceContext.length > 0 ||
      t.metadata.targetAudience.length > 0 ||
      t.metadata.culturalContext.length > 0 ||
      t.metadata.musicalStyle.length > 0
    );
    const withComponents = templates.filter(t => t.components.length > 0);
    const synergyScores = templates.map(t => t.aggregatedMetadata.synergyScore);
    const averageSynergyScore = synergyScores.length > 0 
      ? synergyScores.reduce((sum, score) => sum + score, 0) / synergyScores.length 
      : 0;

    return {
      totalTemplates: templates.length,
      songsWithTemplates: songs.size,
      templatesWithMetadata: withMetadata.length,
      templatesWithComponents: withComponents.length,
      averageSynergyScore: Math.round(averageSynergyScore * 100) / 100
    };
  }
}
