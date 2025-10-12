import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TemplateRecommendationService {
  private readonly logger = new Logger(TemplateRecommendationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async getRecommendations(songId: string, userContext: any) {
    const startTime = Date.now();
    const nnaRegistryUrl = this.configService.get('NNA_REGISTRY_URL');
    const apiKey = this.configService.get('NNA_API_KEY');
    
    this.logger.log(`🔍 Getting template recommendations for song: ${songId}`);
    
    try {
      // Call NNA Registry to get composite data with 5-second timeout
      const response = await firstValueFrom(
        this.httpService.get(
          `${nnaRegistryUrl}/api/v1/assets/composites/by-song/${songId}`,
          { 
            headers: { 'x-api-key': apiKey },
            timeout: 5000 // 5 second timeout
          }
        )
      );
      
      this.logger.log(`✅ NNA Registry response received in ${Date.now() - startTime}ms`);
      
      // Process NNA Registry data into template recommendations
      const recommendations = this.processCompositesToTemplates(response.data.data || []);
      
      this.logger.log(`🎯 Generated ${recommendations.length} template recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logger.warn(`⚠️ NNA Registry call failed: ${error.message}, using fallback`);
      
      // Return fallback recommendations
      return this.getFallbackRecommendations(songId, userContext);
    }
  }

  private processCompositesToTemplates(composites: any[]): any[] {
    // Transform NNA Registry composite data into template recommendations
    return composites.map((composite, index) => ({
      template_id: composite._id || `template_${index}`,
      name: composite.name || `Template ${index + 1}`,
      confidence_score: composite.aggregatedMetadata?.synergyScore || 0.5,
      metadata: composite.algorhythmMetadata || {},
      gcp_storage_url: composite.gcpStorageUrl || '',
      thumbnail_url: composite.thumbnailUrl || '',
      description: composite.description || `Template recommendation for composite ${index + 1}`,
      components: composite.components || [],
      nna_address: composite.nna_address || ''
    }));
  }

  private getFallbackRecommendations(songId: string, userContext: any): any[] {
    this.logger.log(`🔄 Providing fallback recommendations for song: ${songId}`);
    
    return [
      {
        template_id: 'fallback_template_1',
        name: 'Default Pop Template',
        confidence_score: 0.8,
        metadata: {
          genre: 'pop',
          energy_level: 'high',
          style: 'modern'
        },
        gcp_storage_url: 'https://storage.googleapis.com/algorhythm-assets/templates/default_pop.mp4',
        thumbnail_url: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/default_pop.jpg',
        description: 'Default pop template with high compatibility',
        components: [],
        nna_address: 'C.FUL.ALL.001',
        fallback: true
      },
      {
        template_id: 'fallback_template_2',
        name: 'Alternative Template',
        confidence_score: 0.7,
        metadata: {
          genre: 'pop',
          energy_level: 'medium',
          style: 'alternative'
        },
        gcp_storage_url: 'https://storage.googleapis.com/algorhythm-assets/templates/alternative.mp4',
        thumbnail_url: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/alternative.jpg',
        description: 'Alternative template with good compatibility',
        components: [],
        nna_address: 'C.FUL.ALL.002',
        fallback: true
      }
    ];
  }
}
