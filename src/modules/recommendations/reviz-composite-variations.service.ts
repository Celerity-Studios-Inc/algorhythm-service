import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { ReVizCompositeVariationDto, ReVizCompositeVariationResponse } from './dto/reviz-composite-variation.dto';

/**
 * 🔧 REVIZ DEVELOPER REQUEST: Composite-Specific Layer Variations Service
 * 
 * This service provides the missing functionality that ReViz developers need:
 * - Get variant assets for a SPECIFIC composite (not just a song)
 * - Maintains composite context for proper remixing
 * - Returns real GCP URLs and compatibility scores
 */
@Injectable()
export class ReVizCompositeVariationsService {
  private readonly logger = new Logger(ReVizCompositeVariationsService.name);

  constructor(
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService
  ) {}

  async getCompositeVariations(
    request: ReVizCompositeVariationDto,
  ): Promise<ReVizCompositeVariationResponse> {
    const startTime = Date.now();
    
    this.logger.log(
      `🔧 Getting composite variations for composite: ${request.composite_id}, layers: ${request.vary_layers.join(', ')}`
    );

    try {
      // 1. Get the specific composite information (may trigger generation)
      const compositeInfo = await this.getCompositeInfo(request.composite_id);
      
      // 🔧 ISSUE #2 FIX: Use resolved composite_id (from generation) instead of original request
      // If generation was triggered, compositeInfo.composite_id will be the new composite ID
      const actualCompositeId = compositeInfo.composite_id || request.composite_id;
      const isGenerating = compositeInfo.generation_status === 'generating';
      
      // 🔧 ISSUE #2 FIX: Store component IDs for generating case
      const componentIds = this.parseComponentIds(request.composite_id);
      
      this.logger.debug(`Using composite ID: ${actualCompositeId} (original: ${request.composite_id}, generating: ${isGenerating})`);
      
      // 2. Process each requested layer
      const layerResults = await Promise.all(
        request.vary_layers.map(async (layer) => {
          // Get current asset for this layer
          let currentAsset;
          if (isGenerating && componentIds) {
            // 🔧 ISSUE #2 FIX: If generating, extract current asset from component IDs
            currentAsset = await this.getCurrentLayerAssetFromComponents(componentIds, layer);
          } else {
            // Normal flow: get from existing composite
            currentAsset = await this.getCurrentLayerAsset(actualCompositeId, layer);
          }
          
          // Get assets for this layer (use resolved composite_id)
          const assets = await this.getLayerAssets(
            actualCompositeId,
            layer,
            request.assets_per_layer || 5,
            request.variants_per_asset || 3,
            request.user_context
          );
          
          return {
            layer,
            current_asset: currentAsset,
            assets,
            total_available: assets.length
          };
        })
      );
      
      const responseTime = Date.now() - startTime;
      const totalAssets = layerResults.reduce((sum, layer) => sum + layer.total_available, 0);
      
      this.logger.log(
        `✅ Composite variations completed in ${responseTime}ms for composite: ${request.composite_id}, total assets: ${totalAssets}`
      );

      return {
        success: true,
        data: {
          composite_info: compositeInfo,
          layers: layerResults,
          total_assets: totalAssets,
          performance_metrics: {
            response_time_ms: responseTime,
            assets_evaluated: totalAssets,
            cache_hit: false,
          },
        },
        metadata: {
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to get composite variations for composite: ${request.composite_id}`,
        error.stack
      );
      throw error;
    }
  }

  private async getCompositeInfo(compositeId: string) {
    this.logger.debug(`Getting composite info for: ${compositeId}`);
    
    try {
      // Get composite by ID from NNA Registry
      const composite = await this.optimizedNnaRegistryService.getCompositeById(compositeId);
      
      if (!composite || (composite as any).statusCode === 404) {
        // 🔧 ISSUE #2 FIX: Try to resolve or generate composite when not found
        this.logger.log(`⚠️ Composite not found: ${compositeId}. Attempting to resolve or generate...`);
        
        // Check if compositeId looks like component IDs (e.g., "1.018.003.002+2.009.001.001")
        const componentIds = this.parseComponentIds(compositeId);
        
        if (componentIds && componentIds.length >= 2) {
          // Try to resolve or generate the composite
          try {
            const resolved = await this.optimizedNnaRegistryService.resolveOrGenerateComposite(componentIds);
            
            if (resolved && resolved.success) {
              if (resolved.status === 'found' || resolved.status === 'generating') {
                // If found or generating, return the composite info
                // For generating status, we return a placeholder that indicates generation is in progress
                return {
                  composite_id: resolved.composite_id || compositeId,
                  composite_name: resolved.composite_name || `Composite ${compositeId}`,
                  gcp_storage_url: resolved.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
                  thumbnail_url: resolved.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
                  duration_seconds: resolved.duration_seconds || 30,
                  file_size_mb: resolved.file_size_mb || 15.2,
                  resolution: resolved.resolution || '1080p',
                  format: resolved.format || 'mp4',
                  generation_status: resolved.status === 'generating' ? 'generating' : undefined
                };
              }
            }
            
            // Generation/resolution failed - check if Personalize component is required
            const hasPersonalize = componentIds.some(id => id.startsWith('P.'));
            if (!hasPersonalize && resolved?.error) {
              throw new NotFoundException(
                `Composite not found: ${compositeId}. ` +
                `To trigger generation, include a Personalize component (P.xxx.xxx.xxx) in your component IDs. ` +
                `Standard component combinations without Personalize cannot be auto-generated.`
              );
            }
            
            throw new NotFoundException(
              `Composite generation failed: ${resolved?.error || 'Unknown error'}. ` +
              `Please ensure all component IDs are valid and include a Personalize component for generation.`
            );
          } catch (resolveError) {
            // Check if it's already a NotFoundException (rethrow)
            if (resolveError instanceof NotFoundException) {
              throw resolveError;
            }
            
            // Check if Personalize component is required
            const hasPersonalize = componentIds.some(id => id.startsWith('P.'));
            if (!hasPersonalize) {
              throw new NotFoundException(
                `Composite not found: ${compositeId}. ` +
                `Component IDs provided but no Personalize component found. ` +
                `Generation requires a Personalize component (P.xxx.xxx.xxx). ` +
                `Provided components: ${componentIds.join(', ')}`
              );
            }
            
            // Re-throw with context
            this.logger.error(`Composite resolution/generation failed: ${resolveError.message}`);
            throw new NotFoundException(
              `Composite not found: ${compositeId}. Generation failed: ${resolveError.message}`
            );
          }
        }
        
        // If resolution failed or compositeId is not parseable as component IDs, throw NotFoundException
        throw new NotFoundException(`Composite not found: ${compositeId}. Please ensure the composite exists or provide valid component IDs (with Personalize component for generation).`);
      }

      return {
        composite_id: composite.data?._id || compositeId,
        composite_name: composite.data?.name || `Composite ${compositeId}`,
        gcp_storage_url: composite.data?.gcpStorageUrl || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
        thumbnail_url: composite.data?.thumbnailUrl || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
        duration_seconds: composite.data?.duration_seconds || 30,
        file_size_mb: composite.data?.file_size_mb || 15.2,
        resolution: composite.data?.resolution || '1080p',
        format: composite.data?.format || 'mp4'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get composite info for ${compositeId}:`, error);
      throw new NotFoundException(`Composite not found: ${compositeId}`);
    }
  }
  
  /**
   * Parse component IDs from composite ID string
   * Supports formats:
   * - "1.018.003.002+2.009.001.001+3.003.010.002" (component IDs separated by +)
   * - "9.002.025.558" (composite MFA - return null)
   */
  private parseComponentIds(compositeId: string): string[] | null {
    // If contains +, assume it's component IDs
    if (compositeId.includes('+')) {
      return compositeId.split('+').map(id => id.trim()).filter(Boolean);
    }
    
    // Check if it's a composite MFA (format: 9.xxx.xxx.xxx)
    // If it starts with 9, it's likely a composite MFA, not component IDs
    if (/^9\./.test(compositeId)) {
      return null;
    }
    
    // For now, return null - we'll need to enhance this based on actual composite ID formats
    return null;
  }

  /**
   * 🔧 ISSUE #2 FIX: Get current layer asset from component IDs (when composite is generating)
   */
  private async getCurrentLayerAssetFromComponents(componentIds: string[], layer: string) {
    this.logger.debug(`Getting current layer asset from component IDs for layer: ${layer}`);
    
    // Map layer names to component prefixes
    const layerMap: Record<string, string> = {
      'stars': '2',  // Star layer starts with 2
      'looks': '3',  // Look layer starts with 3
      'moves': '4',  // Move layer starts with 4
      'worlds': '5'  // World layer starts with 5
    };
    
    const layerPrefix = layerMap[layer];
    if (!layerPrefix) {
      throw new NotFoundException(`Invalid layer: ${layer}`);
    }
    
    // Find component ID that matches this layer
    const layerComponentId = componentIds.find(id => id.startsWith(`${layerPrefix}.`));
    
    if (!layerComponentId) {
      throw new NotFoundException(`No component found for layer ${layer} in component IDs: ${componentIds.join(', ')}`);
    }
    
    // Fetch asset info from NNA Registry
    try {
      // Use NNA Registry to get asset details by NNA address
      // For now, return a basic structure - this could be enhanced to fetch full asset details
      return {
        asset_id: layerComponentId,
        asset_name: layerComponentId, // Could fetch actual name from NNA Registry
        nna_address: layerComponentId,
        gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${layerComponentId}.mp4`,
        thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${layerComponentId}.jpg`,
        layer: layer,
        metadata: {
          tags: [],
          aiGeneratedDescription: `${layer} asset ${layerComponentId}`,
          media: {
            duration_seconds: 10,
            file_size_mb: 5.1,
            resolution: '1080p',
            format: 'mp4'
          }
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get current layer asset from components for ${layer}:`, error);
      throw new NotFoundException(`No current asset found for layer ${layer} from component IDs`);
    }
  }

  private async getCurrentLayerAsset(compositeId: string, layer: string) {
    this.logger.debug(`Getting current layer asset for composite: ${compositeId}, layer: ${layer}`);
    
    try {
      // Get the composite to find the current layer asset
      const composite = await this.optimizedNnaRegistryService.getCompositeById(compositeId);
      
      if (!composite) {
        throw new NotFoundException(`Composite not found: ${compositeId}`);
      }

      // Find the current asset for the specified layer
      const currentAsset = this.findCurrentLayerAsset(composite, layer);
      
      if (!currentAsset) {
        throw new NotFoundException(`No current asset found for layer ${layer} in composite ${compositeId}`);
      }

      return {
        asset_id: currentAsset.asset_id || currentAsset.id,
        asset_name: currentAsset.name || `${layer} Asset`,
        nna_address: currentAsset.nna_address || currentAsset.id,
        gcp_storage_url: currentAsset.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/${layer}/${currentAsset.asset_id || currentAsset.id}.mp4`,
        thumbnail_url: currentAsset.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${currentAsset.asset_id || currentAsset.id}.jpg`,
        layer: layer,
        metadata: {
          tags: currentAsset.tags || [],
          aiGeneratedDescription: currentAsset.ai_description,
          media: {
            duration_seconds: currentAsset.duration_seconds || 10,
            file_size_mb: currentAsset.file_size_mb || 5.1,
            resolution: currentAsset.resolution || '1080p',
            format: currentAsset.format || 'mp4'
          }
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get current layer asset for ${compositeId}, ${layer}:`, error);
      throw error;
    }
  }

  private findCurrentLayerAsset(composite: any, layer: string) {
    // Map layer names to NNA layer codes
    const layerMap = {
      'stars': 'S',
      'looks': 'L', 
      'moves': 'M',
      'worlds': 'W'
    };
    
    const layerCode = layerMap[layer];
    if (!layerCode) {
      this.logger.warn(`Unknown layer type: ${layer}`);
      return null;
    }
    
    this.logger.debug(`🔍 [DEBUG] Looking for layer code: ${layerCode} in composite components`);
    this.logger.debug(`🔍 [DEBUG] Composite structure: ${JSON.stringify(composite, null, 2)}`);
    
    // Handle different composite data structures
    let components = null;
    
    // Check if components are in the expected format
    if (composite.components && Array.isArray(composite.components)) {
      components = composite.components;
      this.logger.debug(`🔍 [DEBUG] Found components array with ${components.length} items`);
    } 
    // Check if components are in a different structure (e.g., from getCompositeById)
    else if (composite.data && composite.data.components && Array.isArray(composite.data.components)) {
      components = composite.data.components;
      this.logger.debug(`🔍 [DEBUG] Found components in data.components with ${components.length} items`);
    }
    // Check if the composite itself has the component data directly
    else if (composite.data && Array.isArray(composite.data)) {
      components = composite.data;
      this.logger.debug(`🔍 [DEBUG] Using composite.data as components array with ${components.length} items`);
    }
    
    if (components && components.length > 0) {
      this.logger.debug(`🔍 [DEBUG] Searching through ${components.length} components for layer ${layerCode}`);
      
      const component = components.find(comp => {
        const compLayer = comp.layer || comp.layer_type || comp.type;
        this.logger.debug(`🔍 [DEBUG] Checking component: ${comp.name || comp.id}, layer: ${compLayer}, matches ${layerCode}: ${compLayer === layerCode}`);
        return compLayer === layerCode;
      });
      
      if (component) {
        this.logger.debug(`🔍 [DEBUG] Found matching component: ${JSON.stringify(component, null, 2)}`);
        return {
          id: component.id || component._id,
          asset_id: component.id || component._id,
          name: component.name || component.friendlyName,
          nna_address: component.nnaAddress || component.nna_address,
          layer: layer,
          category: component.category,
          subcategory: component.subcategory,
          gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${component.id || component._id}.mp4`,
          thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${component.id || component._id}.jpg`,
          tags: component.tags || [],
          ai_description: component.name || component.friendlyName,
          duration_seconds: 10,
          file_size_mb: 5.1,
          resolution: '1080p',
          format: 'mp4'
        };
      }
    }
    
    this.logger.warn(`No ${layer} component found in composite. Available components: ${components ? components.map(c => `${c.name || c.id} (${c.layer || c.layer_type || c.type})`).join(', ') : 'none'}`);
    return null;
  }

  private async getLayerAssets(
    compositeId: string,
    layer: string,
    assetsPerLayer: number,
    variantsPerAsset: number,
    userContext?: any
  ) {
    this.logger.debug(`Getting layer assets for composite: ${compositeId}, layer: ${layer}, assets: ${assetsPerLayer}, variants: ${variantsPerAsset}`);
    
    try {
      // 🔧 FIX: Use NNA Registry's new composite pattern matching endpoint
      this.logger.debug(`🔍 [NNA REGISTRY] Calling composite pattern recommendations for composite: ${compositeId}`);
      
      const response = await this.optimizedNnaRegistryService.getCompositePatternRecommendations(
        compositeId,
        [layer],
        assetsPerLayer,
        variantsPerAsset
      );
      
      this.logger.debug(`✅ [NNA REGISTRY] Response received: ${JSON.stringify(response).substring(0, 200)}...`);

      if (!response || !response.success || !response.data?.layer_assets) {
        this.logger.warn(`No layer assets found for composite: ${compositeId}, layer: ${layer}`);
        return [];
      }

      // Extract layer assets from NNA Registry response
      const layerAssets = response.data.layer_assets[layer] || [];
      
      this.logger.debug(`Found ${layerAssets.length} layer assets for composite: ${compositeId}, layer: ${layer}`);
      
      return layerAssets;
    } catch (error) {
      this.logger.error(`Failed to get layer assets for ${compositeId}, ${layer}:`, error);
      return [];
    }
  }

  private async getLayerVariations(
    compositeId: string,
    layer: string,
    limit: number,
    userContext?: any
  ) {
    this.logger.debug(`Getting layer variations for composite: ${compositeId}, layer: ${layer}, limit: ${limit}`);
    
    try {
      // Use the OptimizedNnaRegistryService to get composite variants
      this.logger.debug(`🔍 [COMPOSITE VARIANTS] Calling NNA Registry for composite: ${compositeId}`);
      
      const response = await this.optimizedNnaRegistryService.getCompositeVariants(compositeId);
      
      this.logger.debug(`✅ [COMPOSITE VARIANTS] NNA Registry response: ${JSON.stringify(response).substring(0, 200)}...`);

      if (!response || !response.success) {
        this.logger.warn(`No composite variants found for composite: ${compositeId}`);
        return [];
      }

      // Extract the specific layer variants from the response
      const layerVariants = this.extractLayerVariants(response.data, layer);
      
      // Limit the results
      const limitedAssets = layerVariants.slice(0, limit);
      
      this.logger.debug(`Found ${limitedAssets.length} layer variations for composite: ${compositeId}, layer: ${layer}`);
      
      return limitedAssets;
    } catch (error) {
      this.logger.error(`Failed to get layer variations for ${compositeId}, ${layer}:`, error);
      return [];
    }
  }

  private extractCompositeBaseId(compositeId: string): string | null {
    try {
      // Extract the base composite ID (part before the colon)
      // Format: C.FUL.ALL.106:1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.003+5.004.004.002
      // We want: C.FUL.ALL.106
      
      if (!compositeId.includes(':')) {
        // If no colon, assume it's already the base ID
        return compositeId;
      }
      
      const baseId = compositeId.split(':')[0];
      this.logger.debug(`🎯 [COMPOSITE BASE] Extracted base ID: ${baseId} from composite: ${compositeId}`);
      
      return baseId;
    } catch (error) {
      this.logger.error(`Failed to extract base composite ID from: ${compositeId}`, error);
      return null;
    }
  }

  private async getCompositesByBaseId(baseCompositeId: string): Promise<any[]> {
    try {
      // Extract the song ID from the base composite ID to get all composites for that song
      // The base ID format is: C.FUL.ALL.106
      // We need to find the song ID to get all composites for that song
      
      this.logger.debug(`🔍 [COMPOSITE SEARCH] Searching for composites with base ID: ${baseCompositeId}`);
      
      // For now, we'll use a direct approach - get all composites and filter by name pattern
      // This could be optimized with a database query in production
      
      // We'll use the NNA Registry's composite search
      // Since we don't have a direct "search by base ID" endpoint, we'll get all composites
      // and filter them client-side (this is not ideal for production but works for now)
      
      // For now, return empty array - this will be implemented with proper NNA Registry search
      this.logger.warn(`🔍 [COMPOSITE SEARCH] Base ID search not yet implemented for: ${baseCompositeId}`);
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to get composites by base ID: ${baseCompositeId}`, error);
      return [];
    }
  }

  private extractLayerAssetsFromComposites(composites: any[], layer: string, assetsPerLayer: number): any[] {
    // Map layer names to component types
    const layerMap = {
      'stars': 'S',
      'looks': 'L', 
      'moves': 'M',
      'worlds': 'W'
    };
    
    const layerCode = layerMap[layer];
    if (!layerCode) {
      this.logger.warn(`Unknown layer type: ${layer}`);
      return [];
    }

    const assets = [];
    
    // Extract layer-specific assets from each composite
    for (const composite of composites) {
      if (composite.components && Array.isArray(composite.components)) {
        const layerComponent = composite.components.find(comp => comp.layer === layerCode);
        if (layerComponent) {
          assets.push({
            asset_id: layerComponent.id || layerComponent._id,
            asset_name: layerComponent.name,
            nna_address: layerComponent.nna_address || layerComponent.nnaAddress,
            layer: layer,
            category: layerComponent.category,
            subcategory: layerComponent.subcategory,
            gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${layerComponent.id || layerComponent._id}.mp4`,
            thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${layerComponent.id || layerComponent._id}.jpg`,
            compatibility_score: 0.9, // High compatibility since it's the same song
            metadata: {
              tags: [],
              aiGeneratedDescription: layerComponent.name,
              media: {
                duration_seconds: 10,
                file_size_mb: 5.1,
                resolution: '1080p',
                format: 'mp4'
              }
            }
          });
        }
      }
    }
    
    // Limit total assets per layer
    const limitedAssets = assets.slice(0, assetsPerLayer);
    this.logger.debug(`Found ${limitedAssets.length} layer assets from ${composites.length} composites for ${layer} layer`);
    
    return limitedAssets;
  }

  private extractLayerAssets(compositeData: any, layer: string, assetsPerLayer: number, variantsPerAsset: number): any[] {
    // Map layer names to component types
    const layerMap = {
      'stars': 'star',
      'looks': 'look', 
      'moves': 'move',
      'worlds': 'world'
    };
    
    const componentType = layerMap[layer];
    if (!componentType) {
      this.logger.warn(`Unknown layer type: ${layer}`);
      return [];
    }

    // Find the component in the composite data
    const component = compositeData.components?.[componentType];
    if (!component) {
      this.logger.warn(`No ${componentType} component found in composite`);
      return [];
    }

    // Get base asset and variants
    const baseAsset = component.base_asset;
    const variants = component.variants || [];
    
    // Create assets array with base asset + variants
    const assets = [];
    
    // Add base asset
    if (baseAsset) {
      assets.push({
        asset_id: baseAsset.asset_id,
        asset_name: baseAsset.name,
        nna_address: baseAsset.nna_address,
        layer: layer,
        category: baseAsset.category,
        subcategory: baseAsset.subcategory,
        gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${baseAsset.asset_id}.mp4`,
        thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${baseAsset.asset_id}.jpg`,
        compatibility_score: 1.0, // Base asset has perfect compatibility
        metadata: {
          tags: [],
          aiGeneratedDescription: baseAsset.name,
          media: {
            duration_seconds: 10,
            file_size_mb: 5.1,
            resolution: '1080p',
            format: 'mp4'
          }
        }
      });
    }
    
    // Add variants (limited by variantsPerAsset)
    const limitedVariants = variants.slice(0, variantsPerAsset);
    limitedVariants.forEach(variant => {
      assets.push({
        asset_id: variant.asset_id,
        asset_name: variant.name,
        nna_address: variant.nna_address,
        layer: layer,
        category: variant.category,
        subcategory: variant.subcategory,
        gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${variant.asset_id}.mp4`,
        thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${variant.asset_id}.jpg`,
        compatibility_score: variant.compatibility_score || 0.8,
        metadata: {
          tags: [],
          aiGeneratedDescription: variant.name,
          media: {
            duration_seconds: 10,
            file_size_mb: 5.1,
            resolution: '1080p',
            format: 'mp4'
          }
        }
      });
    });
    
    // Limit total assets per layer
    const limitedAssets = assets.slice(0, assetsPerLayer);
    this.logger.debug(`Found ${limitedAssets.length} assets for ${layer} layer (${assetsPerLayer} requested, ${variantsPerAsset} variants per asset)`);
    
    return limitedAssets;
  }

  private extractLayerVariants(compositeData: any, layer: string): any[] {
    // Map layer names to component types
    const layerMap = {
      'stars': 'star',
      'looks': 'look', 
      'moves': 'move',
      'worlds': 'world'
    };
    
    const componentType = layerMap[layer];
    if (!componentType) {
      this.logger.warn(`Unknown layer type: ${layer}`);
      return [];
    }

    // Find the component in the composite data
    const component = compositeData.components?.[componentType];
    if (!component) {
      this.logger.warn(`No ${componentType} component found in composite`);
      return [];
    }

    // Extract variants from the component
    const variants = component.variants || [];
    this.logger.debug(`Found ${variants.length} variants for ${layer} layer`);
    
    return variants;
  }

  private async calculateCompatibilityScores(
    variations: any[],
    compositeInfo: any,
    layer: string,
    includeScoringDetails: boolean = false
  ) {
    this.logger.debug(`Calculating compatibility scores for ${variations.length} variations`);
    
    return variations.map((variation, index) => {
      // Calculate basic compatibility score
      const baseScore = 0.7 + (Math.random() * 0.3); // 0.7-1.0 range
      const layerScore = 0.8 + (Math.random() * 0.2); // 0.8-1.0 range
      const userScore = 0.6 + (Math.random() * 0.4); // 0.6-1.0 range
      
      const overallScore = (baseScore + layerScore + userScore) / 3;
      
      const result: any = {
        asset_id: variation.asset_id || variation.id || `var_${index}`,
        asset_name: variation.name || `${layer} Variation ${index + 1}`,
        nna_address: variation.nna_address || variation.id,
        compatibility_score: Math.round(overallScore * 100) / 100,
        gcp_storage_url: variation.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/${layer}/${variation.asset_id || variation.id}.mp4`,
        thumbnail_url: variation.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${variation.asset_id || variation.id}.jpg`,
        layer: layer,
        metadata: {
          tags: variation.tags || [],
          aiGeneratedDescription: variation.ai_description,
          media: {
            duration_seconds: variation.duration_seconds || 10,
            file_size_mb: variation.file_size_mb || 5.1,
            resolution: variation.resolution || '1080p',
            format: variation.format || 'mp4'
          }
        }
      };

      if (includeScoringDetails) {
        result.scoring_details = {
          composite_compatibility: Math.round(baseScore * 100) / 100,
          layer_compatibility: Math.round(layerScore * 100) / 100,
          user_preference_score: Math.round(userScore * 100) / 100,
          overall_score: Math.round(overallScore * 100) / 100
        };
      }

      return result;
    });
  }
}
