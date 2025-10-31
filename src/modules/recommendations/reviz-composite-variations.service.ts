import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { buildCurrentByLayer, dualAddressEqual, normalizeLayerKeys, layerKeyToCode } from '../../common/layers.util';
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
    const warnings: Array<{ layer?: string; code: string; message: string }> = [];
    
    this.logger.log(
      `🔧 Getting composite variations for composite: ${request.composite_id}, layers: ${request.vary_layers.join(', ')}`
    );

    try {
      // 1. Get the specific composite information (may trigger generation)
      const compositeInfo = await this.getCompositeInfo(request.composite_id);
      
      // 🔧 ISSUE #2 FIX: Early return if composite is being generated
      // Cannot build variations for a composite that doesn't exist yet
      if (compositeInfo.generation_status === 'generating') {
        const responseTime = Date.now() - startTime;
        this.logger.log(
          `⏳ Composite generation in progress: ${request.composite_id}. Returning generating status.`
        );
        
        return {
          success: true,
          data: {
            composite_info: compositeInfo,
            layers: [], // No layers available during generation
            total_assets: 0,
            performance_metrics: {
              response_time_ms: responseTime,
              assets_evaluated: 0,
              cache_hit: false,
            },
            generation_status: 'generating' as const,
            message: 'Composite is being generated. Please retry the request once generation is complete.',
            estimated_completion_seconds: 30, // Rough estimate
          },
          metadata: {
            request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        } as ReVizCompositeVariationResponse;
      }
      
      // 🔧 ISSUE #2 FIX: Use resolved composite_id (from generation) instead of original request
      // If generation was triggered, compositeInfo.composite_id will be the new composite ID
      // Note: getCompositeInfo already handles resolution and throws NotFoundException if resolution fails,
      // so if we reach here, we have a valid composite (either existing or being generated)
      const actualCompositeId = compositeInfo.composite_id || request.composite_id;
      
      this.logger.debug(`Using composite ID: ${actualCompositeId} (original: ${request.composite_id})`);
      
      // 2. Normalize layer keys and process layers
      const requestedLayers = normalizeLayerKeys(request.vary_layers);

      // Build current-by-layer map once
      let currentByLayer = new Map<string, {nna?: string; hfn?: string}>();
      try {
        const compositeRaw = await this.optimizedNnaRegistryService.getCompositeById(actualCompositeId);
        const comps = compositeRaw?.components || compositeRaw?.data?.components || (Array.isArray(compositeRaw?.data) ? compositeRaw?.data : []);
        currentByLayer = buildCurrentByLayer(comps as any);
      } catch (e) {
        this.logger.warn(`⚠️ Unable to prefetch composite components for ${actualCompositeId}`);
        warnings.push({ code: 'COMPONENTS_PREFETCH_FAILED', message: 'Could not prefetch composite components' });
      }

      const layerResults = await Promise.all(
        requestedLayers.map(async (layerKey) => {
          // Get current asset; degrade gracefully if missing
          let currentAsset: any | null = null;
          try {
            // Prefer precomputed map if available
            const code = layerKey === 'stars' ? 'S' : layerKey === 'looks' ? 'L' : layerKey === 'moves' ? 'M' : 'W';
            const cur = currentByLayer.get(code);
            if (cur) {
              currentAsset = {
                asset_id: cur.nna || cur.hfn,
                asset_name: cur.hfn,
                nna_address: cur.nna,
                layer: layerKey,
              };
            } else {
              currentAsset = await this.getCurrentLayerAsset(actualCompositeId, layerKey);
            }
          } catch (err) {
            const msg = `Missing current component for layer ${layerKey}: ${err?.message || err}`;
            this.logger.warn(`⚠️ ${msg}`);
            warnings.push({ layer: layerKey, code: 'MISSING_CURRENT_COMPONENT', message: msg });
          }

          // Fetch candidate assets for this layer
          const assets = await this.getLayerAssets(
            actualCompositeId,
            layerKey,
            request.assets_per_layer || 5,
            request.variants_per_asset || 3,
            request.user_context
          );

          // 🔧 FIX: Deduplicate assets that are variants of each other
          const deduplicatedAssets = this.deduplicateVariantAssets(assets, currentAsset);
          if (deduplicatedAssets.length < assets.length) {
            const removedCount = assets.length - deduplicatedAssets.length;
            warnings.push({
              layer: layerKey,
              code: 'VARIANTS_DEDUPLICATED',
              message: `Removed ${removedCount} asset(s) that were variants of other assets in the list`
            });
          }

          // Ensure current asset is present and first (match by MFA or HFN)
          if (currentAsset) {
            const idx = deduplicatedAssets.findIndex((a: any) => dualAddressEqual(
              { nna_address: a?.nna_address, name: a?.asset_name || a?.name },
              { nna_address: currentAsset?.nna_address, name: currentAsset?.asset_name }
            ));
            if (idx === -1) {
              // Prepend a virtual current asset to stabilize UI
              deduplicatedAssets.unshift(currentAsset);
              warnings.push({ layer: layerKey, code: 'CURRENT_NOT_IN_ASSETS', message: 'Prepended virtual current asset' });
            } else if (idx > 0) {
              const [cur] = deduplicatedAssets.splice(idx, 1);
              deduplicatedAssets.unshift(cur);
            }
          }
          
          return {
            layer: layerKey,
            current_asset: currentAsset || null,
            assets: deduplicatedAssets,
            total_available: deduplicatedAssets.length,
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
          // Non-breaking: attach warnings for client visibility
          ...(warnings.length ? { warnings: warnings.map((w: any) => ({ layer: w.layer || 'unknown', reason: (w.reason || w.code || 'info') })) } : {}),
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
      let composite = await this.optimizedNnaRegistryService.getCompositeById(compositeId);
      
      // NEW: If caller provided a Composite HFN (e.g., C.FUL.ALL.082), resolve to actual _id first
      if ((!composite || (composite as any).statusCode === 404) && /^C\./.test(compositeId)) {
        this.logger.debug(`🔍 HFN detected (${compositeId}). Resolving to composite _id via Registry...`);
        const byHfn = await this.optimizedNnaRegistryService.getCompositeByHfn(compositeId);
        const resolvedId = byHfn?._id || byHfn?.id;
        if (resolvedId) {
          this.logger.debug(`✅ Resolved HFN ${compositeId} to _id ${resolvedId}. Fetching by id...`);
          composite = await this.optimizedNnaRegistryService.getCompositeById(resolvedId);
        }
      }
      
      if (!composite || (composite as any).statusCode === 404) {
        // 🔧 ISSUE #2 FIX: Try to resolve or generate composite when not found
        this.logger.log(`⚠️ Composite not found: ${compositeId}. Attempting to resolve or generate...`);
        
        // Check if compositeId looks like component IDs (e.g., "1.018.003.002+2.009.001.001")
        const componentIds = this.parseComponentIds(compositeId);
        
        if (componentIds && componentIds.length >= 2) {
          // Try to resolve existing composite (CUSTOMIZE flow)
          // Note: Generation (PERSONALIZE flow) is not implemented yet
          try {
            this.logger.log(`🔍 Attempting to resolve composite from component IDs: ${componentIds.join(', ')}`);
            const resolved = await this.optimizedNnaRegistryService.resolveOrGenerateComposite(componentIds);
            
            this.logger.log(`📊 [DEBUG] resolveOrGenerateComposite result: success=${resolved?.success}, status=${resolved?.status}, composite_id=${resolved?.composite_id}, error=${resolved?.error || 'none'}`);
            
            if (resolved && resolved.success) {
              if (resolved.status === 'found') {
                // Composite found via CUSTOMIZE flow - return it
                this.logger.log(`✅ Found existing composite: ${resolved.composite_id}`);
                return {
                  composite_id: resolved.composite_id || compositeId,
                  composite_name: resolved.composite_name || `Composite ${compositeId}`,
                  gcp_storage_url: resolved.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
                  thumbnail_url: resolved.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
                  duration_seconds: resolved.duration_seconds || 30,
                  file_size_mb: resolved.file_size_mb || 15.2,
                  resolution: resolved.resolution || '1080p',
                  format: resolved.format || 'mp4',
                  generation_status: undefined
                };
              } else if (resolved.status === 'generating') {
                // Composite generation in progress - return with generating status
                this.logger.log(`⏳ Composite generation in progress: ${resolved.composite_id || compositeId}`);
                return {
                  composite_id: resolved.composite_id || compositeId,
                  composite_name: resolved.composite_name || `Composite ${compositeId}`,
                  gcp_storage_url: resolved.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
                  thumbnail_url: resolved.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
                  duration_seconds: resolved.duration_seconds || 30,
                  file_size_mb: resolved.file_size_mb || 15.2,
                  resolution: resolved.resolution || '1080p',
                  format: resolved.format || 'mp4',
                  generation_status: 'generating'
                };
              }
            }
            
            // Composite not found - provide helpful error message
            const hasPersonalize = componentIds.some(id => id.startsWith('P.'));
            if (hasPersonalize) {
              // Personalize component provided but generation not implemented yet
              throw new NotFoundException(
                `Composite not found: ${compositeId}. ` +
                `Component IDs provided include Personalize component, but composite generation is not yet implemented. ` +
                `Please use an existing composite ID or provide component IDs for an existing composite.`
              );
            } else {
              // Standard components - composite doesn't exist
              throw new NotFoundException(
                `Composite not found: ${compositeId}. ` +
                `No existing composite found for the provided component IDs: ${componentIds.join(', ')}. ` +
                `Composite generation is not yet available for standard component combinations. ` +
                `Please use an existing composite ID.`
              );
            }
          } catch (resolveError) {
            // Check if it's already a NotFoundException (rethrow)
            if (resolveError instanceof NotFoundException) {
              throw resolveError;
            }
            
            // Handle unexpected errors
            this.logger.error(`Composite resolution failed: ${resolveError.message}`);
            throw new NotFoundException(
              `Composite not found: ${compositeId}. ` +
              `Failed to resolve composite from component IDs: ${resolveError.message}`
            );
          }
        }
        
        // If resolution failed or compositeId is not parseable as component IDs, throw NotFoundException
        throw new NotFoundException(`Composite not found: ${compositeId}. Please ensure the composite exists or provide valid component IDs (with Personalize component for generation).`);
      }

      // Validate that composite has valid data (not just an error response)
      // Note: If we reach here with component IDs, resolution should have been attempted above
      // If resolution failed, an error should have been thrown. This is a safety check.
      if (!composite.data && !composite._id && !composite.id) {
        // If no data and compositeId contains '+', resolution attempt should have happened above
        // If we reach here, it means getCompositeById didn't throw and resolution wasn't triggered
        if (compositeId.includes('+')) {
          this.logger.error(`⚠️ [WARNING] Component IDs detected but resolution not attempted. composite=${JSON.stringify(composite)}`);
          // Try resolution one more time
          const componentIds = this.parseComponentIds(compositeId);
          if (componentIds && componentIds.length >= 2) {
            this.logger.log(`🔄 Retrying resolution for component IDs: ${componentIds.join(', ')}`);
            const resolved = await this.optimizedNnaRegistryService.resolveOrGenerateComposite(componentIds);
            if (resolved && resolved.success && resolved.status === 'found') {
              return {
                composite_id: resolved.composite_id || compositeId,
                composite_name: resolved.composite_name || `Composite ${compositeId}`,
                gcp_storage_url: resolved.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
                thumbnail_url: resolved.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
                duration_seconds: resolved.duration_seconds || 30,
                file_size_mb: resolved.file_size_mb || 15.2,
                resolution: resolved.resolution || '1080p',
                format: resolved.format || 'mp4',
                generation_status: undefined
              };
            }
          }
          throw new NotFoundException(
            `Composite not found: ${compositeId}. ` +
            `Component IDs provided but no existing composite found. ` +
            `Please use an existing composite ID.`
          );
        }
        throw new NotFoundException(`Composite not found: ${compositeId}`);
      }

      return {
        composite_id: composite.data?._id || composite._id || compositeId,
        composite_name: composite.data?.name || composite.name || `Composite ${compositeId}`,
        gcp_storage_url: composite.data?.gcpStorageUrl || composite.gcpStorageUrl || `https://storage.googleapis.com/algorhythm-assets/composites/${compositeId}.mp4`,
        thumbnail_url: composite.data?.thumbnailUrl || composite.thumbnailUrl || `https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/${compositeId}.jpg`,
        duration_seconds: composite.data?.duration_seconds || composite.duration_seconds || 30,
        file_size_mb: composite.data?.file_size_mb || composite.file_size_mb || 15.2,
        resolution: composite.data?.resolution || composite.resolution || '1080p',
        format: composite.data?.format || composite.format || 'mp4'
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
        // Graceful degradation: let caller decide how to proceed
        this.logger.warn(`No current asset found for layer ${layer} in composite ${compositeId}`);
        return null as any;
      }

      return {
        // Prefer NNA address as stable identifier when present
        asset_id: currentAsset.nna_address || currentAsset.asset_id || currentAsset.id,
        asset_name: currentAsset.name || `${layer} Asset`,
        nna_address: currentAsset.nna_address || currentAsset.id,
        gcp_storage_url: currentAsset.gcp_storage_url || `https://storage.googleapis.com/algorhythm-assets/${layer}/${currentAsset.nna_address || currentAsset.asset_id || currentAsset.id}.mp4`,
        thumbnail_url: currentAsset.thumbnail_url || `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${currentAsset.nna_address || currentAsset.asset_id || currentAsset.id}.jpg`,
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
        return compLayer === layerCode;
      });
      
      if (component) {
        this.logger.debug(`🔍 [DEBUG] Found matching component: ${JSON.stringify(component, null, 2)}`);
        const nna = component.nna_address || component.nnaAddress;
        const name = component.name || component.friendlyName;
        return {
          id: nna || component.id || component._id,
          asset_id: nna || component.id || component._id,
          name,
          nna_address: nna,
          layer: layer,
          category: component.category,
          subcategory: component.subcategory,
          gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/${layer}/${nna || component.id || component._id}.mp4`,
          thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${layer}/${nna || component.id || component._id}.jpg`,
          tags: component.tags || [],
          ai_description: name,
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

  /**
   * 🔧 FIX: Deduplicate assets that are variants of each other
   * If two assets are variants of each other (one appears in the other's variants list),
   * keep only one in the assets array. Prefer current asset if it's one of them,
   * otherwise keep the one with higher compatibility_score.
   */
  private deduplicateVariantAssets(assets: any[], currentAsset: any | null): any[] {
    if (!assets || assets.length === 0) return assets;
    
    // Build a map: asset identifier -> list of its variant identifiers
    const variantMap = new Map<string, Set<string>>();
    
    // For each asset, collect all identifiers of its variants
    for (const asset of assets) {
      const assetId = asset.asset_id || asset.nna_address || asset.asset_name;
      if (!assetId) continue;
      
      const variantIds = new Set<string>();
      variantIds.add(assetId);
      
      // Collect all variant identifiers (nna_address, variant_id, variant_name)
      if (Array.isArray(asset.variants)) {
        for (const variant of asset.variants) {
          if (variant.variant_id) variantIds.add(variant.variant_id);
          if (variant.nna_address) variantIds.add(variant.nna_address);
          if (variant.variant_name) variantIds.add(variant.variant_name);
        }
      }
      
      variantMap.set(assetId, variantIds);
    }
    
    // Find assets that are variants of each other
    const toRemove = new Set<string>();
    const toKeep = new Set<string>();
    
    // Check each pair of assets
    for (let i = 0; i < assets.length; i++) {
      const assetA = assets[i];
      const idA = assetA.asset_id || assetA.nna_address || assetA.asset_name;
      if (!idA || toRemove.has(idA) || toKeep.has(idA)) continue;
      
      const variantsA = variantMap.get(idA);
      if (!variantsA) continue;
      
      // Check if assetA is a variant of any other asset
      for (let j = i + 1; j < assets.length; j++) {
        const assetB = assets[j];
        const idB = assetB.asset_id || assetB.nna_address || assetB.asset_name;
        if (!idB || toRemove.has(idB) || toKeep.has(idB)) continue;
        
        const variantsB = variantMap.get(idB);
        if (!variantsB) continue;
        
        // Check if assetA and assetB are variants of each other
        const aIsVariantOfB = variantsB.has(idA) || 
          (assetA.nna_address && variantsB.has(assetA.nna_address)) ||
          (assetA.asset_name && variantsB.has(assetA.asset_name));
        
        const bIsVariantOfA = variantsA.has(idB) ||
          (assetB.nna_address && variantsA.has(assetB.nna_address)) ||
          (assetB.asset_name && variantsA.has(assetB.asset_name));
        
        // Also check if they share significant overlap in variants (likely same variant group)
        const sharedVariants = Array.from(variantsA).filter(v => variantsB.has(v));
        const minVariants = Math.min(variantsA.size, variantsB.size);
        const variantOverlapThreshold = minVariants > 2 ? Math.ceil(minVariants * 0.7) : minVariants;
        const significantOverlap = sharedVariants.length >= variantOverlapThreshold;
        
        if (aIsVariantOfB || bIsVariantOfA || significantOverlap) {
          // They're variants - decide which to keep
          let keepA = false;
          
          // Prefer current asset if it matches one of them
          if (currentAsset) {
            const currentMatchesA = dualAddressEqual(
              { nna_address: assetA.nna_address, name: assetA.asset_name || assetA.name },
              { nna_address: currentAsset.nna_address, name: currentAsset.asset_name }
            );
            const currentMatchesB = dualAddressEqual(
              { nna_address: assetB.nna_address, name: assetB.asset_name || assetB.name },
              { nna_address: currentAsset.nna_address, name: currentAsset.asset_name }
            );
            
            if (currentMatchesA && !currentMatchesB) {
              keepA = true;
            } else if (currentMatchesB && !currentMatchesA) {
              keepA = false;
            } else {
              // Neither is current, prefer higher compatibility_score
              const scoreA = assetA.compatibility_score || 0;
              const scoreB = assetB.compatibility_score || 0;
              keepA = scoreA >= scoreB;
            }
          } else {
            // No current asset, prefer higher compatibility_score
            const scoreA = assetA.compatibility_score || 0;
            const scoreB = assetB.compatibility_score || 0;
            keepA = scoreA >= scoreB;
          }
          
          if (keepA) {
            toKeep.add(idA);
            toRemove.add(idB);
          } else {
            toKeep.add(idB);
            toRemove.add(idA);
          }
        }
      }
    }
    
    // Filter out removed assets
    return assets.filter((asset) => {
      const assetId = asset.asset_id || asset.nna_address || asset.asset_name;
      if (!assetId) return true; // Keep assets without IDs
      return !toRemove.has(assetId);
    });
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
