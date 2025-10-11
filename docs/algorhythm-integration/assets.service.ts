import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../../models/asset.schema';
import { AssetVersion } from '../../models/asset-version.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { SearchAssetDto } from './dto/search-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { StorageService } from '../storage/storage.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { AiService } from '../ai/ai.service';
import { AssetVersionHistoryService } from './services/asset-version-history.service';
import { ContractAutoFixer } from '../../common/contracts/contract-auto-fixer';
import { AIServiceFactory } from '../ai/ai-service.factory';
import { HybridExtractionService } from '../ai/services/hybrid-extraction.service';
import { MetadataSynchronizationService } from '../ai/services/metadata-synchronization.service';
import { VariantInheritanceService } from '../ai/services/variant-inheritance.service';
import { AiToAssetMapperService } from '../ai/services/ai-to-asset-mapper.service';
import { MongoDBMonitor } from '../../config/mongodb-optimization.config';
import { AssetStructureValidator } from '../../common/validators/asset-structure.validator';
import { VersionHistoryService } from './services/version-history.service';
import { MongoDBBloatPreventionService } from '../../common/services/mongodb-bloat-prevention.service';
import { CompositeMetadataAggregatorService } from '../ai/services/composite-metadata-aggregator.service';
import { AlgorhythmWebhookService } from './services/algorhythm-webhook.service';
import {
  LayerMetadata,
  AssetData,
  AIResponse,
  safeString,
  safeNumber,
  safeArray,
  isLayerMetadata,
  isAssetData,
} from '../../types/asset-metadata.types';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Define proper types for file uploads
interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private storageService: StorageService,
    private taxonomyService: TaxonomyService,
    private configService: ConfigService,
    private aiService: AiService,
    private aiServiceFactory: AIServiceFactory,
    @Inject(forwardRef(() => HybridExtractionService))
    private hybridExtractionService: HybridExtractionService,
    @Inject(forwardRef(() => MetadataSynchronizationService))
    private metadataSyncService: MetadataSynchronizationService,
    @Inject(forwardRef(() => VariantInheritanceService))
    private variantInheritanceService: VariantInheritanceService,
    @Inject(forwardRef(() => AiToAssetMapperService))
    private aiToAssetMapper: AiToAssetMapperService,
    private assetVersionHistoryService: AssetVersionHistoryService,
    private versionHistoryService: VersionHistoryService,
    private bloatPreventionService: MongoDBBloatPreventionService,
    @Inject(forwardRef(() => CompositeMetadataAggregatorService))
    private compositeMetadataAggregatorService: CompositeMetadataAggregatorService,
    @Inject(forwardRef(() => AlgorhythmWebhookService))
    private algorhythmWebhookService: AlgorhythmWebhookService,
  ) {
    // Initialize taxonomy data from API
    void this.initializeTaxonomyData();
  }

  /**
   * 🚀 STRUCTURAL FIX: Clean asset creation using AI-to-Asset mapper
   * Replaces the current complex sync system with a single transformation point
   */
  async createAssetWithMapper(
    createAssetDto: CreateAssetDto,
    userEmail: string,
    file?: UploadedFile,
  ): Promise<Asset> {
    this.logger.log(
      '🔄 [STRUCTURAL] Using clean AI-to-Asset mapper for asset creation',
    );

    try {
      // Step 1: Basic validation and setup (same as before)
      const {
        layer,
        category,
        subcategory,
        source,
        description,
        creatorDescription,
        starMetadata,
        // ... other fields
      } = createAssetDto;

      // Step 2: Get base asset data for variants
      let baseAssetData = null;
      if (starMetadata?.assetType === 'variant' && starMetadata?.baseStarId) {
        baseAssetData = await this.getBaseAssetData(starMetadata.baseStarId);
      }

      // Step 3: Use HybridExtractionService with mapper
      console.log('🔧 [STRUCTURAL] Starting AI extraction...');
      console.log('🔧 [STRUCTURAL] Request params:', {
        layer: layer || 'stars',
        creatorDescription: creatorDescription || '',
        fileUrl: '',
        variantName: starMetadata?.variantName,
        taxonomyContext: {
          category: starMetadata?.assetType || 'stars',
          subcategory: starMetadata?.variantName || 'default',
        },
      });

      // 🔧 CRITICAL FIX: Ensure Composite assets get AI processing
      const isCompositeLayer = layer === 'C';
      if (isCompositeLayer) {
        console.log('🎼 [COMPOSITE] Processing Composite asset with AI service');
        console.log('🎼 [COMPOSITE] Layer:', layer);
        console.log('🎼 [COMPOSITE] Creator Description:', creatorDescription);
        console.log('🎼 [COMPOSITE] Components:', createAssetDto.components?.length || 0);
      }

      const aiResponse = await this.hybridExtractionService.extractMetadata({
        layer: layer || 'stars', // Use actual layer from DTO
        creatorDescription: creatorDescription || '',
        fileUrl: '', // Will be set later
        variantName: starMetadata?.variantName,
        taxonomyContext: {
          category: starMetadata?.assetType || 'stars',
          subcategory: starMetadata?.variantName || 'default',
        },
        // 🔧 CRITICAL FIX: Pass components for Composite assets
        ...(isCompositeLayer && createAssetDto.components ? { components: createAssetDto.components } : {}),
      });

      console.log(
        '🔧 [STRUCTURAL] AI Response:',
        JSON.stringify(aiResponse, null, 2),
      );

      // Step 4: Use mapper for clean transformation
      console.log('🔧 [STRUCTURAL] Starting mapper transformation...');

      // 🔒 Enforce variant context in AI layerMetadata before mapping
      try {
        const isVariantContext =
          (createAssetDto as any)?.assetType === 'variant' ||
          (createAssetDto as any)?.starMetadata?.assetType === 'variant' ||
          (createAssetDto as any)?.baseStarId ||
          (createAssetDto as any)?.starMetadata?.baseStarId;
        if (isVariantContext && aiResponse?.data?.layerMetadata) {
          const lm: any = (aiResponse as any).data.layerMetadata;
          lm.assetType = 'variant';
          lm.baseStarId =
            (createAssetDto as any)?.baseStarId ||
            (createAssetDto as any)?.starMetadata?.baseStarId ||
            lm.baseStarId;
          lm.variantName =
            (createAssetDto as any)?.variantName ||
            (createAssetDto as any)?.starMetadata?.variantName ||
            lm.variantName;
          lm.variantType =
            (createAssetDto as any)?.variantType ||
            (createAssetDto as any)?.starMetadata?.variantType ||
            lm.variantType;
        }
      } catch {}

      let mappedAssetData;
      if (aiResponse && aiResponse.success) {
        mappedAssetData = this.aiToAssetMapper.mapAiResponseToAsset(
          aiResponse,
          baseAssetData,
          starMetadata?.assetType || 'base',
        );
        console.log('🔧 [STRUCTURAL] Mapper transformation successful');
      } else {
        console.log('🔧 [STRUCTURAL] AI extraction failed, using fallback');
        mappedAssetData = {
          tags: ['fallback-tag'],
          description: creatorDescription || 'Fallback description',
        };
      }

      console.log(
        '🔧 [STRUCTURAL] Mapped Asset Data:',
        JSON.stringify(mappedAssetData, null, 2),
      );

      // Extract AI-generated description for persistence on details page
      const aiGeneratedDescription = (aiResponse as any)?.data?.description || null;
      
      // 🔧 CRITICAL FIX: Persist AI-generated description at root level for Browse Asset display
      if (aiGeneratedDescription) {
        mappedAssetData.description = aiGeneratedDescription;
        this.logger.log(`🔧 [AI DESCRIPTION] Persisted AI description: ${aiGeneratedDescription.substring(0, 100)}...`);
      }

      // 🎨 Hair color normalization for multi-color descriptions (Stars)
      try {
        const desc = creatorDescription || '';
        const isMultiColor = /multi[- ]?color|multicolor|rainbow|colorful|colourful/i.test(
          desc,
        );
        if (
          (createAssetDto.layer === 'S' || (createAssetDto as any)?.layer === 'S') &&
          isMultiColor
        ) {
          const rootHair = (mappedAssetData as any)?.hairColor;
          if (!rootHair || /other/i.test(String(rootHair))) {
            (mappedAssetData as any).hairColor = 'Colorful/Multi-color';
          }
          // Ensure tag present if tags exist
          if (Array.isArray((mappedAssetData as any).tags)) {
            const tags: string[] = (mappedAssetData as any).tags;
            if (!tags.includes('hair-multi-color')) {
              tags.push('hair-multi-color');
            }
          }
        }
      } catch {}

      // Step 5: Build final asset data
      // 🔧 CRITICAL FIX: Prevent creator description duplication
      // Ensure AI-generated description takes precedence over user input
      const rawAssetData = {
        ...mappedAssetData, // Mapped data takes precedence (AI-generated content)
        ...createAssetDto, // User input (but won't overwrite AI content)
        aiMetadata: {
          ...(mappedAssetData as any)?.aiMetadata,
          ...(aiGeneratedDescription ? { generatedDescription: aiGeneratedDescription } : {}),
        },
        // Extract _aiMetadata from nested location if it exists
        _aiMetadata:
          aiResponse?.data?._aiMetadata ||
          aiResponse?.data?.layerMetadata?._aiMetadata ||
          null,
        // Ensure required fields are set (these are generated by the service)
        friendlyName: createAssetDto.name, // Use name as friendlyName
        nna_address: createAssetDto.name, // Use name as nna_address for now
        registeredBy: userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Initialize version fields
        version: 1,
        isLatestVersion: true,
        versionCreatedAt: new Date(),
        versionCreatedBy: userEmail,
        versionNotes: 'Initial version',
      };

      // 🔧 LAYER-SPECIFIC PERSISTENCE: Ensure Looks metadata is saved at root and in aiMetadata
      try {
        const isLooksLayer = (rawAssetData.layer || createAssetDto.layer) === 'L';
        if (isLooksLayer) {
          const aiLm: any = (aiResponse as any)?.data?.layerMetadata || (rawAssetData as any)?.aiMetadata?.layerMetadata;
          const looksFromEnhanced: any = (rawAssetData as any)?.aiMetadata?.looksMetadata;
          const looksMetadata: any = looksFromEnhanced?.layerMetadata || looksFromEnhanced || aiLm || {};

          if (Object.keys(looksMetadata || {}).length > 0) {
            // Write to root-level looksMetadata for FE View Details
            (rawAssetData as any).looksMetadata = {
              ...looksMetadata,
              assetType: looksMetadata.assetType || 'base',
            };

            // Also persist under aiMetadata.looksMetadata for parity with other layers
            (rawAssetData as any).aiMetadata = (rawAssetData as any).aiMetadata || {};
            (rawAssetData as any).aiMetadata.looksMetadata = {
              ...((rawAssetData as any).aiMetadata.looksMetadata || {}),
              ...looksMetadata,
            };

            // Keep aiMetadata.layerMetadata aligned if it represents the looks payload
            const lm = (rawAssetData as any).aiMetadata.layerMetadata;
            if (lm && lm.layerType === 'looks') {
              (rawAssetData as any).aiMetadata.layerMetadata = {
                ...lm,
                assetType: (rawAssetData as any).looksMetadata.assetType,
              };
            }
          }
        }
      } catch (looksPersistErr) {
        this.logger.warn(`⚠️ [SAVE GUARD] Failed to persist looksMetadata at root: ${String(looksPersistErr)}`);
      }

      // 🔧 LAYER-SPECIFIC PERSISTENCE: Ensure Worlds metadata is saved at root and in aiMetadata
      try {
        const isWorldsLayer = (rawAssetData.layer || createAssetDto.layer) === 'W';
        if (isWorldsLayer) {
          const aiLm: any = (aiResponse as any)?.data?.layerMetadata || (rawAssetData as any)?.aiMetadata?.layerMetadata;
          const worldsFromEnhanced: any = (rawAssetData as any)?.aiMetadata?.worldsMetadata;
          const worldsMetadata: any = worldsFromEnhanced?.layerMetadata || worldsFromEnhanced || aiLm || {};

          if (Object.keys(worldsMetadata || {}).length > 0) {
            // Write to root-level worldsMetadata
            (rawAssetData as any).worldsMetadata = {
              ...worldsMetadata,
              assetType: worldsMetadata.assetType || 'base',
            };

            // Mirror under aiMetadata.worldsMetadata
            (rawAssetData as any).aiMetadata = (rawAssetData as any).aiMetadata || {};
            (rawAssetData as any).aiMetadata.worldsMetadata = {
              ...((rawAssetData as any).aiMetadata.worldsMetadata || {}),
              ...worldsMetadata,
            };

            // Align aiMetadata.layerMetadata if it represents worlds
            const lm = (rawAssetData as any).aiMetadata.layerMetadata;
            if (lm && lm.layerType === 'worlds') {
              (rawAssetData as any).aiMetadata.layerMetadata = {
                ...lm,
                assetType: (rawAssetData as any).worldsMetadata.assetType,
              };
            }
          }
        }
      } catch (worldsPersistErr) {
        this.logger.warn(`⚠️ [SAVE GUARD] Failed to persist worldsMetadata at root: ${String(worldsPersistErr)}`);
      }

      // 🔧 LAYER-SPECIFIC PERSISTENCE: Ensure Composite metadata is saved at root and in aiMetadata
      try {
        const isCompositeLayer = (rawAssetData.layer || createAssetDto.layer) === 'C';
        if (isCompositeLayer) {
          console.log('🎼 [COMPOSITE] Processing Composite asset with components:', createAssetDto.components?.length || 0);
          console.log('🎼 [COMPOSITE] Component assets:', createAssetDto.components);

          // Ensure components are preserved
          if (createAssetDto.components && createAssetDto.components.length > 0) {
            (rawAssetData as any).components = createAssetDto.components;
            console.log('🎼 [COMPOSITE] Preserved components array:', (rawAssetData as any).components.length);
          }

          // Try to get composite metadata from AI response or generate from components
          const aiLm: any = (aiResponse as any)?.data?.layerMetadata || (rawAssetData as any)?.aiMetadata?.layerMetadata;
          const compositeFromEnhanced: any = (rawAssetData as any)?.aiMetadata?.compositeMetadata;
          let compositeMetadata: any = compositeFromEnhanced?.layerMetadata || compositeFromEnhanced || aiLm || {};

          // 🎯 CRITICAL FIX: Override AI-generated dummy componentAssets with actual user selections
          if (compositeMetadata && compositeMetadata.componentAssets && createAssetDto.components && createAssetDto.components.length > 0) {
            // Extract actual component HFNs from user selections
            const userSelectedComponentHFNs = createAssetDto.components.map((comp: any) => comp.name || comp.friendlyName || comp.id || comp._id).filter(Boolean);
            
            console.log('🎯 [COMPOSITE FIX] AI generated dummy componentAssets:', compositeMetadata.componentAssets);
            console.log('🎯 [COMPOSITE FIX] User selected components:', userSelectedComponentHFNs);
            
            // Override with actual user selections
            compositeMetadata.componentAssets = userSelectedComponentHFNs;
            console.log('✅ [COMPOSITE FIX] Overridden componentAssets with user selections:', compositeMetadata.componentAssets);
          }

          // If no composite metadata from AI, generate from components
          if (Object.keys(compositeMetadata || {}).length === 0 && createAssetDto.components && createAssetDto.components.length > 0) {
            compositeMetadata = this.generateCompositeMetadataFromComponents(createAssetDto.components, createAssetDto);
            console.log('🎼 [COMPOSITE] Generated composite metadata from components');
          }

          if (Object.keys(compositeMetadata || {}).length > 0) {
            // Write to root-level compositeMetadata
            (rawAssetData as any).compositeMetadata = {
              ...compositeMetadata,
              assetType: compositeMetadata.assetType || 'base',
            };

            // Mirror under aiMetadata.compositeMetadata
            (rawAssetData as any).aiMetadata = (rawAssetData as any).aiMetadata || {};
            (rawAssetData as any).aiMetadata.compositeMetadata = {
              ...((rawAssetData as any).aiMetadata.compositeMetadata || {}),
              ...compositeMetadata,
            };

            // Align aiMetadata.layerMetadata if it represents composites
            const lm = (rawAssetData as any).aiMetadata.layerMetadata;
            if (lm && (lm.layerType === 'composites' || lm.layerType === 'composite')) {
              (rawAssetData as any).aiMetadata.layerMetadata = {
                ...lm,
                assetType: (rawAssetData as any).compositeMetadata.assetType,
              };
            }
          }
        }
      } catch (compositePersistErr) {
        this.logger.warn(`⚠️ [SAVE GUARD] Failed to persist compositeMetadata at root: ${String(compositePersistErr)}`);
      }

      // 🎯 SAVE-TIME GUARD: For Songs (G) ensure gender fields use GenderDetectionService (_aiResponse)
      try {
        if ((rawAssetData.layer === 'G' || createAssetDto.layer === 'G') && aiResponse?.data) {
          const aiResp =
            aiResponse?.data?.layerMetadata?._aiMetadata?.raw?.layerMetadata?._aiResponse ||
            aiResponse?.data?._aiMetadata?.raw?.layerMetadata?._aiResponse ||
            null;

          if (aiResp) {
            const authoritativeGender = aiResp.originalArtistGender;
            const authoritativeSuitability = aiResp.genderSuitability;
            const authoritativeVocalType = aiResp.vocalType;

            // Ensure songMetadata exists on the final asset payload
            (rawAssetData as any).songMetadata = (rawAssetData as any).songMetadata || {};

            if (authoritativeGender) {
              (rawAssetData as any).songMetadata.originalArtistGender = authoritativeGender;
              this.logger.log(
                `🎯 [SAVE GUARD] Songs gender set from _aiResponse: originalArtistGender = "${authoritativeGender}"`,
              );
            }
            if (authoritativeSuitability) {
              (rawAssetData as any).songMetadata.genderSuitability = authoritativeSuitability;
            }
            if (authoritativeVocalType) {
              (rawAssetData as any).songMetadata.vocalType = authoritativeVocalType;
            }

            // Also align aiMetadata.layerMetadata if present for consistency
            const lm = (rawAssetData as any).aiMetadata?.layerMetadata || (rawAssetData as any).layerMetadata;
            if (lm) {
              if (authoritativeGender) lm.originalArtistGender = authoritativeGender;
              if (authoritativeSuitability) lm.genderSuitability = authoritativeSuitability;
              if (authoritativeVocalType) lm.vocalType = authoritativeVocalType;
            }
          }
        }
      } catch (saveGuardErr) {
        this.logger.warn(
          `⚠️ [SAVE GUARD] Failed to enforce Songs gender from _aiResponse: ${String(saveGuardErr)}`,
        );
      }

      // Final save-time variant guards
      try {
        const isVariant = (rawAssetData as any)?.assetType === 'variant' || (rawAssetData as any)?.starMetadata?.assetType === 'variant';
        if (isVariant) {
          // Ensure root variant fields are present
          const sm: any = (rawAssetData as any).starMetadata || {};
          if (!(rawAssetData as any).baseStarId && sm.baseStarId) (rawAssetData as any).baseStarId = sm.baseStarId;
          if (!(rawAssetData as any).variantName && sm.variantName) (rawAssetData as any).variantName = sm.variantName;
          if (!(rawAssetData as any).variantType && sm.variantType) (rawAssetData as any).variantType = sm.variantType;

          // Enforce layerMetadata variant context if present
          const lm: any = (rawAssetData as any).aiMetadata?.layerMetadata;
          if (lm) {
            lm.assetType = 'variant';
            if (!lm.baseStarId && (rawAssetData as any).baseStarId) lm.baseStarId = (rawAssetData as any).baseStarId;
            if (!lm.variantName && (rawAssetData as any).variantName) lm.variantName = (rawAssetData as any).variantName;
            if (!lm.variantType && (rawAssetData as any).variantType) lm.variantType = (rawAssetData as any).variantType;
          }
        }
      } catch {}

      console.log(
        '🔧 [STRUCTURAL] Final Asset Data:',
        JSON.stringify(rawAssetData, null, 2),
      );

      // Step 6: Prevent MongoDB bloat before saving
      const cleanedAssetData = await this.bloatPreventionService.preventBloatOnCreate(rawAssetData);
      
      // Step 7: Save to database
      const asset = new this.assetModel(cleanedAssetData);
      const savedAsset = await asset.save();

      this.logger.log(
        `✅ [STRUCTURAL] Asset created successfully with ${safeArray(rawAssetData, 'tags').length} tags`,
      );

      // 🔧 CRITICAL FIX: Automatic aggregation for Composite assets
      if (savedAsset.layer === 'C' && createAssetDto.components?.length === 5) {
        try {
          console.log('🎼 [COMPOSITE] Triggering automatic aggregation for new Composite asset');
          console.log('🎼 [COMPOSITE] Components:', createAssetDto.components);
          
          // Extract component IDs for aggregation service
          const componentIds = createAssetDto.components
            .map(comp => comp.id)
            .filter((id): id is string => Boolean(id));
          
          // Aggregate metadata from components
          const aggregatedData = await this.compositeMetadataAggregatorService.aggregateMetadata(
            componentIds
          );
          
          // Update asset with aggregated metadata
          savedAsset.algorhythmMetadata = aggregatedData.algorhythmMetadata;
          savedAsset.aggregatedMetadata = aggregatedData.aggregatedMetadata;
          
          // Generate AI description and update the description field
          const aiDescription = await this.generateCompositeDescription(savedAsset, componentIds);
          savedAsset.description = aiDescription;
          
          // Inherit song metadata from Song component
          const songComponent = await this.findComponentAsset(componentIds, 'G');
          if (songComponent?.songMetadata) {
            savedAsset.songMetadata = songComponent.songMetadata;
          }
          
          // Save updated asset
          await savedAsset.save();
          
          console.log('🎼 [COMPOSITE] Automatic aggregation completed successfully');
          console.log('🎼 [COMPOSITE] Algorhythm Metadata:', savedAsset.algorhythmMetadata);
          console.log('🎼 [COMPOSITE] Aggregated Metadata:', savedAsset.aggregatedMetadata);
          
          // 🎯 ALGORHYTHM SYNC: Notify Algorhythm of new Composite asset
          try {
            await this.algorhythmWebhookService.notifyCompositeCreated(savedAsset);
            console.log('🎯 [ALGORHYTHM] Successfully notified Algorhythm of new Composite asset');
          } catch (webhookError) {
            console.error('❌ [ALGORHYTHM] Failed to notify Algorhythm:', webhookError);
            // Don't throw - asset creation succeeded, webhook is bonus
          }
          
        } catch (error) {
          console.error('❌ [COMPOSITE] Automatic aggregation failed:', error);
          // Don't throw - asset creation succeeded, aggregation is bonus
        }
      }

      return savedAsset;
    } catch (error) {
      this.logger.error(
        `❌ [STRUCTURAL] Asset creation failed: ${safeString(error, 'message')}`,
      );
      throw error;
    }
  }

  /**
   * Find component asset by layer
   */
  private async findComponentAsset(componentIds: string[], layer: string): Promise<Asset | null> {
    try {
      // Find component by checking the actual asset layer, not the ID format
      for (const componentId of componentIds) {
        const component = await this.findById(componentId);
        if (component && component.layer === layer) {
          console.log(`🎼 [COMPOSITE] Found component for layer ${layer}:`, component?.name);
          return component;
        }
      }
      
      console.log(`🎼 [COMPOSITE] No component found for layer ${layer}`);
      return null;
    } catch (error) {
      console.error(`❌ [COMPOSITE] Error finding component for layer ${layer}:`, error);
      return null;
    }
  }

  /**
   * Generate AI description for Composite asset
   */
  private async generateCompositeDescription(asset: Asset, componentIds: string[]): Promise<string> {
    try {
      // Get component names for description
      const componentNames: string[] = [];
      for (const componentId of componentIds) {
        const component = await this.findById(componentId);
        if (component && component.name) {
          componentNames.push(component.name);
        }
      }
      
      const description = `AI-enhanced Composite asset combining ${componentNames.join(', ')}. ${asset.creatorDescription || 'This Composite brings together multiple creative elements for a cohesive performance experience.'}`;
      
      console.log('🎼 [COMPOSITE] Generated AI description:', description);
      return description;
    } catch (error) {
      console.error('❌ [COMPOSITE] Error generating AI description:', error);
      return asset.creatorDescription || 'AI-enhanced Composite asset';
    }
  }

  /**
   * Get base asset data for inheritance
   */
  private async getBaseAssetData(baseStarId: string): Promise<any> {
    try {
      let baseAsset: Asset;
      if (baseStarId.match(/^[0-9a-fA-F]{24}$/)) {
        baseAsset = await this.findById(baseStarId);
      } else {
        baseAsset = await this.findByName(baseStarId);
      }
      return baseAsset;
    } catch (error) {
      this.logger.warn(`⚠️ Could not fetch base asset: ${baseStarId}`);
      return null;
    }
  }

  /**
   * Initialize taxonomy data from API
   */
  private async initializeTaxonomyData(): Promise<void> {
    try {
      await this.taxonomyService.initializeTaxonomyData();
      console.log('[ASSETS SERVICE] Taxonomy data initialized from API');
    } catch (error) {
      console.warn(
        '[ASSETS SERVICE] Failed to initialize taxonomy from API:',
        safeString(error, 'message'),
      );
    }
  }

  /**
   * 🔧 CRITICAL FIX: Detect variant information from asset name and metadata
   * Implements the requirements from BACKEND_VARIANT_REQUIREMENTS.md
   */
  private detectVariantInfo(
    assetData: any,
    layer: string,
    aiMetadata: any,
  ): {
    isVariant: boolean;
    baseAssetId?: string;
    variantName?: string;
    variantType?: string;
  } {
    // 🔧 DEBUG: Log the input data
    console.log('🔧 [VARIANT DETECTION] detectVariantInfo called with:');
    console.log(
      '🔧 [VARIANT DETECTION] assetData:',
      JSON.stringify(assetData, null, 2),
    );
    console.log('🔧 [VARIANT DETECTION] layer:', layer);

    // Add error handling for undefined assetData
    if (!assetData) {
      console.log(
        '🔧 [VARIANT DETECTION] assetData is undefined, returning default values',
      );
      return {
        isVariant: false,
        baseAssetId: undefined,
        variantName: undefined,
        variantType: undefined,
      };
    }

    console.log(
      '🔧 [VARIANT DETECTION] assetData.assetType:',
      safeString(assetData, 'assetType'),
    );
    console.log(
      '🔧 [VARIANT DETECTION] assetData.baseStarId:',
      safeString(assetData, 'baseStarId'),
    );
    console.log(
      '🔧 [VARIANT DETECTION] assetData.baseAssetId:',
      safeString(assetData, 'baseAssetId'),
    );

    // CORRECT IMPLEMENTATION: Respect user's explicit assetType selection
    // Per Phase 2 Base/Variant Enhancement Specification

    // 1. RESPECT USER SELECTION FIRST
    if (safeString(assetData, 'assetType') === 'base') {
      console.log('🔧 [VARIANT DETECTION] Detected as BASE asset');
      return {
        isVariant: false,
        baseAssetId: undefined,
        variantName: undefined,
        variantType: undefined,
      };
    }

    // 2. If user selected variant, validate requirements
    if (safeString(assetData, 'assetType') === 'variant') {
      console.log('🔧 [VARIANT DETECTION] Detected as VARIANT asset');
      // User must provide baseAssetId for variants (check multiple field names)
      const baseAssetId =
        safeString(assetData, 'baseAssetId') ||
        safeString(assetData, 'baseStarId') ||
        safeString(assetData, 'baseSId');
      if (!baseAssetId) {
        throw new Error('Variant assets require a base asset selection');
      }

      console.log(
        '🔧 [VARIANT DETECTION] Variant confirmed with baseAssetId:',
        baseAssetId,
      );
      return {
        isVariant: true,
        baseAssetId: baseAssetId,
        variantName: safeString(assetData, 'variantName') || 'Variant',
        variantType: safeString(assetData, 'variantType') || 'mixed',
      };
    }

    // 3. CRITICAL FIX: Auto-detect variant if baseStarId/baseAssetId is present but assetType not set
    const baseAssetId =
      safeString(assetData, 'baseAssetId') ||
      safeString(assetData, 'baseStarId') ||
      safeString(assetData, 'baseSId');
    if (baseAssetId && baseAssetId !== 'auto-detect') {
      console.log(
        `🔧 [VARIANT DETECTION] Auto-detecting variant due to baseAssetId presence: ${baseAssetId}`,
      );
      return {
        isVariant: true,
        baseAssetId: baseAssetId,
        variantName: assetData.variantName || 'Variant',
        variantType: assetData.variantType || 'mixed',
      };
    }

    // 4. Default to base asset if not specified (Phase 2 spec compliance)
    return {
      isVariant: false,
      baseAssetId: undefined,
      variantName: undefined,
      variantType: undefined,
    };
  }

  async createAsset(
    createAssetDto: CreateAssetDto,
    userEmail: string,
    file?: UploadedFile,
  ): Promise<Asset> {
    // Enhanced retry logic to handle duplicate key errors
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `[ASSET CREATION] Attempt ${attempt}/${maxRetries} for asset creation`,
        );

        return await this.createAssetInternal(createAssetDto, userEmail, file);
      } catch (error) {
        lastError = error;

        // Check if it's a duplicate key error
        if (error.code === 11000 && attempt < maxRetries) {
          this.logger.warn(
            `[ASSET CREATION] Duplicate key error on attempt ${attempt}, retrying with next sequential number...`,
          );
          this.logger.warn(`[ASSET CREATION] Error details: ${error.message}`);

          // CRITICAL FIX: Clear the name field to force regeneration of sequential number
          if (createAssetDto.name) {
            createAssetDto.name = undefined as any; // Force regeneration
            this.logger.log(
              `[ASSET CREATION] Cleared name field to force sequential number regeneration`,
            );
          }

          // CRITICAL FIX: Add a small random delay to avoid immediate collision
          const randomDelay = Math.random() * 100 + 50; // 50-150ms random delay
          await new Promise((resolve) => setTimeout(resolve, randomDelay));
          continue;
        }

        // If it's not a duplicate key error, or we've exhausted retries, throw the error
        throw error;
      }
    }

    // If we get here, all retries failed
    this.logger.error(
      `[ASSET CREATION] All ${maxRetries} attempts failed. Last error: ${lastError?.message}`,
    );
    throw lastError;
  }

  /**
   * Internal asset creation logic (extracted from original createAsset method)
   */
  private async createAssetInternal(
    createAssetDto: CreateAssetDto,
    userEmail: string,
    file?: UploadedFile,
  ): Promise<Asset> {
    // 🎯 CRITICAL FIX: Override AI-generated dummy componentAssets with actual user selections
    // This must happen BEFORE validation
    if (createAssetDto.layer === 'C' && createAssetDto.components && createAssetDto.components.length > 0) {
      // Extract actual component HFNs from user selections
      const userSelectedComponentHFNs = createAssetDto.components.map((comp: any) => comp.name || comp.friendlyName || comp.id || comp._id).filter(Boolean);
      
      // Check for layerMetadata at root level (frontend format)
      if ((createAssetDto as any).layerMetadata && (createAssetDto as any).layerMetadata.componentAssets) {
        this.logger.log('🎯 [COMPOSITE FIX PRE-VALIDATION] AI generated dummy componentAssets (root level):' + JSON.stringify((createAssetDto as any).layerMetadata.componentAssets));
        this.logger.log('🎯 [COMPOSITE FIX PRE-VALIDATION] User selected components:' + JSON.stringify(userSelectedComponentHFNs));
        
        // Override with actual user selections
        (createAssetDto as any).layerMetadata.componentAssets = userSelectedComponentHFNs;
        this.logger.log('✅ [COMPOSITE FIX PRE-VALIDATION] Overridden componentAssets with user selections (root level):' + JSON.stringify((createAssetDto as any).layerMetadata.componentAssets));
      }
      
      // Check for layerMetadata inside aiMetadata (backend format)
      if (createAssetDto.aiMetadata && (createAssetDto.aiMetadata as any).layerMetadata && (createAssetDto.aiMetadata as any).layerMetadata.componentAssets) {
        this.logger.log('🎯 [COMPOSITE FIX PRE-VALIDATION] AI generated dummy componentAssets (aiMetadata):' + JSON.stringify((createAssetDto.aiMetadata as any).layerMetadata.componentAssets));
        this.logger.log('🎯 [COMPOSITE FIX PRE-VALIDATION] User selected components:' + JSON.stringify(userSelectedComponentHFNs));
        
        // Override with actual user selections
        (createAssetDto.aiMetadata as any).layerMetadata.componentAssets = userSelectedComponentHFNs;
        this.logger.log('✅ [COMPOSITE FIX PRE-VALIDATION] Overridden componentAssets with user selections (aiMetadata):' + JSON.stringify((createAssetDto.aiMetadata as any).layerMetadata.componentAssets));
      }
    }

    // ValidationPipe already handles validation globally
    this.logger.log(`[CREATE ASSET] Using global ValidationPipe for validation`);
    
    // ❌ REMOVED: AssetStructureValidator.normalizeAssetPayload() - was mutating payload
    // ❌ REMOVED: AssetStructureValidator.validateAssetStructure() - ValidationPipe handles this

    // Enhanced variant validation for Stars layer
    if (createAssetDto.layer === 'S') {
      // Check both aiMetadata.starsMetadata and top-level starMetadata
      const starMetadata =
        createAssetDto.aiMetadata?.starsMetadata || createAssetDto.starMetadata;

      if (starMetadata) {
        const { assetType, baseStarId } = starMetadata;

        if (assetType === 'variant' && baseStarId) {
          // Validate base star exists and is a base character
          // Check if baseStarId is a MongoDB ObjectId or a name
          let baseStar: Asset;
          if (baseStarId.match(/^[0-9a-fA-F]{24}$/)) {
            // It's a MongoDB ObjectId, use findById
            baseStar = await this.findById(baseStarId);
          } else {
            // It's a name, use findByName
            baseStar = await this.findByName(baseStarId);
          }

          if (!baseStar) {
            throw new HttpException(
              `Base star not found: ${baseStarId}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Check if the base star is actually a base character
          const baseStarMetadata =
            baseStar.aiMetadata?.starsMetadata || baseStar.starMetadata;

          // Support both old and new patterns: assetType: "base" OR variantType: "base"
          const isBaseCharacter =
            baseStarMetadata?.assetType === 'base' ||
            (baseStarMetadata as any)?.variantType === 'base';

          if (!isBaseCharacter) {
            throw new HttpException(
              `Base star must be a base character. Found asset type: ${baseStarMetadata?.assetType || 'unknown'}, variant type: ${(baseStarMetadata as any)?.variantType || 'unknown'}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // ✅ FIXED: Keep the user's original baseStarId selection
          // Only validate that the base star exists and is a base character
          // DO NOT override the user's selection

          console.log(
            `[SERVICE] Validating variant creation: ${createAssetDto.layer} -> ${baseStarId} (user selection preserved)`,
          );
        }
      }
    }
    // Essential logging only - avoid logging large objects
    console.log(
      '[SERVICE] Processing asset creation for layer:',
      createAssetDto.layer,
    );

    // Destructure only allowed fields (ignore any incoming 'name')
    const {
      layer,
      category,
      subcategory,
      source,
      tags,
      description,
      creatorDescription,
      albumArt,
      aiMetadata,
      songMetadata,
      starMetadata, // Add starMetadata field
      trainingData,
      rights,
      components = [],
    } = createAssetDto;

    // Convert category and subcategory to uppercase for backend compatibility
    const normalizedCategory = category?.toUpperCase();
    const normalizedSubcategory = subcategory?.toUpperCase();

    // FIX: Handle the case where layer is being transformed to a number
    // This happens when the frontend sends "C" but backend receives "1"
    let actualLayer = layer;
    if (typeof layer === 'string' && !isNaN(Number(layer))) {
      // Layer was converted to a number string, convert it back
      const layerNumber = Number(layer);
      const layerMap: Record<number, string> = {
        1: 'G',
        2: 'S',
        3: 'L',
        4: 'M',
        5: 'W',
        6: 'B',
        7: 'P',
        8: 'T',
        9: 'C',
        10: 'R',
      };
      actualLayer = layerMap[layerNumber] || layer;
      console.log(
        `[DEBUG] Layer transformation in createAsset: "${layer}" -> "${actualLayer}"`,
      );
    }

    // TEMPORARY: Skip taxonomy validation to get asset registration working
    // TODO: Fix taxonomy validation logic
    const friendlyCategory = normalizedCategory;
    const friendlySubcategory = normalizedSubcategory;

    console.log('[SERVICE] TEMPORARY: Using raw codes without validation');
    console.log('[SERVICE] Category:', friendlyCategory);
    console.log('[SERVICE] Subcategory:', friendlySubcategory);

    // CRITICAL FIX: Use findOne with sort to get the actual highest sequential number
    // This handles gaps in sequential numbering and ensures proper .001 starting point
    const lastAsset = await this.assetModel
      .findOne({
        layer: actualLayer,
        category: friendlyCategory,
        subcategory: friendlySubcategory,
      })
      .sort({ name: -1 }); // Sort by name descending to get highest number

    let sequential = '001'; // Default to 001 for new taxonomy combinations
    if (lastAsset) {
      // FIX: Handle composite assets that have component lists after colon
      // e.g., "C.FUL.ALL.004:2.009.001.001+..." should extract "004"
      const nameParts = lastAsset.name.split(':')[0]; // Remove component list
      const numberPart = nameParts.split('.').pop() || '0';
      const lastNumber = parseInt(numberPart);
      sequential = (lastNumber + 1).toString().padStart(3, '0');
    }

    console.log('[SERVICE] Sequential number generation:');
    console.log(`  Last asset: ${lastAsset?.name || 'none'}`);
    console.log(`  Generated sequential: ${sequential}`);

    const fileExtension = file?.originalname.split('.').at(-1) ?? '';

    // Generate HFN using alpha codes
    const hfn = `${actualLayer}.${friendlyCategory}.${friendlySubcategory}.${sequential}`;

    // Debug logging to see what HFN is being generated
    console.log('[SERVICE] Generated HFN:', hfn);
    console.log('[SERVICE] Layer:', layer);
    console.log('[SERVICE] FriendlyCategory (alpha code):', friendlyCategory);
    console.log(
      '[SERVICE] FriendlySubcategory (alpha code):',
      friendlySubcategory,
    );
    console.log('[SERVICE] Sequential:', sequential);

    // Convert HFN to proper MFA format using taxonomy service
    const properMfa = this.taxonomyService.convertHFNToMFA(hfn);

    // Set the name based on layer type
    let name: string;
    let finalMfa: string;

    if (actualLayer === 'C' && components.length) {
      // For composite assets, normalize component inputs to HFN strings first
      // Frontend may send component HFNs as strings or as objects { id, name, layer, category, subcategory }
      const resolveHfn = async (comp: any): Promise<string | null> => {
        try {
          if (!comp) return null;
          if (typeof comp === 'string') return comp;
          if (typeof comp.name === 'string' && comp.name.trim().length > 0) {
            return comp.name.trim();
          }
          if (comp.id) {
            const asset = await this.assetModel
              .findById(comp.id)
              .select('name')
              .lean();
            return (asset as any)?.name ?? null;
          }
          return null;
        } catch (e) {
          this.logger.warn(
            `⚠️ [COMPOSITES] Failed to resolve component to HFN: ${
              typeof comp === 'string' ? comp : JSON.stringify(comp)
            } | ${e instanceof Error ? e.message : String(e)}`,
          );
          return null;
        }
      };

      const resolvedHfns: string[] = [];
      for (const comp of components) {
        // eslint-disable-next-line no-await-in-loop
        const h = await resolveHfn(comp);
        if (h) {
          resolvedHfns.push(h);
        } else {
          this.logger.warn(
            `⚠️ [COMPOSITES] Skipping unresolved component entry: ${JSON.stringify(
              comp,
            )}`,
          );
        }
      }

      if (resolvedHfns.length === 0) {
        throw new HttpException(
          'COMPOSITES_INVALID_COMPONENTS: No valid component HFNs provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Convert component HFNs to MFAs and use + to separate
      const componentMfas = resolvedHfns.map((componentHfn) =>
        this.taxonomyService.convertHFNToMFA(componentHfn),
      );
      name = `${hfn}:${componentMfas.join('+')}`;

      // MFA should be simple (no components)
      finalMfa = properMfa;
    } else {
      name = hfn;
      finalMfa = properMfa;
    }

    // Upload file to GCP Storage or use provided URL
    let gcpStorageUrl = createAssetDto.gcpStorageUrl || null;

    // CRITICAL FIX: Don't use placeholder URLs - prioritize actual file uploads
    const isPlaceholderUrl = gcpStorageUrl && gcpStorageUrl.includes('placeholder');

    // 1) Prefer multipart file if provided
    if ((!gcpStorageUrl || isPlaceholderUrl) && file) {
      gcpStorageUrl = await this.storageService.uploadFile(
        file.buffer,
        file.mimetype,
        `${name}.${fileExtension}`,
        layer,
        friendlyCategory,
        friendlySubcategory,
      );
    }

    // 2) If no multipart file, accept base64 JSON fields (fileData, fileName, fileType)
    if ((!gcpStorageUrl || isPlaceholderUrl) && (createAssetDto as any)?.fileData) {
      try {
        this.logger.log(`🖼️ [BASE64 UPLOAD] Starting base64 upload for ${name}`);
        const raw = (createAssetDto as any).fileData as string;
        // Strip potential data URL prefix if frontend sent it (defensive)
        const base64 = raw.includes(',') ? raw.split(',').pop()! : raw;
        const buffer = Buffer.from(base64, 'base64');
        if (!buffer || buffer.length < 64) {
          // 22-char base64 header typically decodes to < 64 bytes; reject clearly for FE retry
          const errMsg = `Empty or invalid file payload received (bytes=${buffer?.length || 0}). Please reselect the file and retry.`;
          this.logger.warn(`⚠️ [BASE64 UPLOAD] ${errMsg}`);
          throw new Error(errMsg);
        }
        const baseName = (createAssetDto as any).fileName || `${name}.png`;
        const mimeType = (createAssetDto as any).fileType || 'image/png';
        const resolvedExt = baseName.includes('.')
          ? baseName.split('.').pop()
          : (fileExtension || 'png');
        const finalName = `${name}.${resolvedExt}`;

        this.logger.log(`🖼️ [BASE64 UPLOAD] Uploading ${finalName} (${buffer.length} bytes, ${mimeType})`);
        gcpStorageUrl = await this.storageService.uploadFile(
          buffer,
          mimeType,
          finalName,
          layer,
          friendlyCategory,
          friendlySubcategory,
        );
        this.logger.log(`🖼️ [BASE64 UPLOAD] Success! URL: ${gcpStorageUrl}`);
      } catch (e) {
        this.logger.error('[ASSETS] Failed base64 upload path', e as any);
        throw e;
      }
    }

    // Validate that we have either a file upload or a provided URL
    if (!gcpStorageUrl) {
      throw new Error(
        'Either a file must be uploaded or gcpStorageUrl must be provided',
      );
    }

    // CONTRACT ENFORCEMENT - Auto-fix all contract violations
    let fixedSongMetadata: any = songMetadata;
    let fixedAiMetadata: any = aiMetadata;

    if (songMetadata) {
      fixedSongMetadata = ContractAutoFixer.fixMetadata(
        songMetadata,
        'songMetadata',
      );
    }
    if (aiMetadata) {
      fixedAiMetadata = ContractAutoFixer.fixMetadata(aiMetadata, 'aiMetadata');
    }

    // Create asset

    // Suppression: Mongoose model instantiation with dynamic data is unavoidable here.
    let parsedTags: string[] = [];
    if (typeof tags === 'string' && tags) {
      try {
        const t = JSON.parse(tags);
        if (Array.isArray(t) && t.every((item) => typeof item === 'string')) {
          parsedTags = t;
        }
      } catch {
        parsedTags = [];
      }
    } else if (Array.isArray(tags)) {
      parsedTags = tags.filter((item) => typeof item === 'string');
    }

    // Generate enhanced metadata for G, S, L, M, W layers
    let enhancedAiMetadata: any = fixedAiMetadata;
    
    if (['G', 'S', 'L', 'M', 'W'].includes(actualLayer) && creatorDescription) {
      try {
        console.log(
          `[SERVICE] Generating enhanced metadata for ${actualLayer} layer`,
        );

        // 🚀 PERFORMANCE OPTIMIZATION: Process all layers in parallel
        const layerProcessingPromises: Array<{
          layer: string;
          promise: Promise<any>;
        }> = [];

        switch (actualLayer) {
          case 'G': {
            // 🎵 ENHANCED: Use HybridExtractionService for comprehensive song metadata
            const songsPromise = this.hybridExtractionService.extractMetadata({
              layer: 'songs',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              baseSongId: fixedSongMetadata?.baseSongId,
              taxonomyContext: {
                category: safeString(fixedSongMetadata, 'assetType') || 'songs',
                subcategory: fixedSongMetadata?.variantName || 'default',
              },
            });
            layerProcessingPromises.push({
              layer: 'songs',
              promise: songsPromise,
            });
            break;
          }

          case 'S': {
            // Debug: Log what's being passed
            console.log(
              '[SERVICE] Debug - starMetadata:',
              JSON.stringify(starMetadata),
            );
            console.log(
              '[SERVICE] Debug - baseStarId being passed:',
              starMetadata?.baseStarId,
            );

            // 🌟 ENHANCED: Use HybridExtractionService for comprehensive hair & makeup metadata
            console.log(
              `🔄 [ASSETS] Calling hybridExtractionService.extractMetadata for Stars layer`,
            );
            console.log(`🔄 [ASSETS] Parameters:`, {
              layer: 'stars',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              taxonomyContext: {
                category: starMetadata?.assetType || 'stars',
                subcategory: starMetadata?.variantName || 'default',
              },
            });

            const starsPromise = this.hybridExtractionService.extractMetadata({
              layer: 'stars',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              taxonomyContext: {
                category: starMetadata?.assetType || 'stars',
                subcategory: starMetadata?.variantName || 'default',
              },
            });
            layerProcessingPromises.push({
              layer: 'stars',
              promise: starsPromise,
            });
            break;
          }

          case 'L': {
            // 👗 ENHANCED: Use HybridExtractionService for comprehensive looks metadata
            const looksPromise = this.hybridExtractionService.extractMetadata({
              layer: 'looks',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              baseLookId: fixedAiMetadata?.looksMetadata?.baseLookId,
              taxonomyContext: {
                category: fixedAiMetadata?.looksMetadata?.assetType || 'looks',
                subcategory:
                  fixedAiMetadata?.looksMetadata?.variantName || 'default',
              },
            });
            layerProcessingPromises.push({
              layer: 'looks',
              promise: looksPromise,
            });
            break;
          }

          case 'M': {
            // 💃 ENHANCED: Use HybridExtractionService for comprehensive moves metadata
            const movesPromise = this.hybridExtractionService.extractMetadata({
              layer: 'moves',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              baseMovesId: fixedAiMetadata?.movesMetadata?.baseMovesId,
              taxonomyContext: {
                category: fixedAiMetadata?.movesMetadata?.assetType || 'moves',
                subcategory:
                  fixedAiMetadata?.movesMetadata?.variantName || 'default',
              },
            });
            layerProcessingPromises.push({
              layer: 'moves',
              promise: movesPromise,
            });
            break;
          }

          case 'W': {
            // 🌍 ENHANCED: Use HybridExtractionService for comprehensive worlds metadata
            const worldsPromise = this.hybridExtractionService.extractMetadata({
              layer: 'worlds',
              creatorDescription,
              fileUrl: gcpStorageUrl || '',
              baseWorldId: fixedAiMetadata?.worldsMetadata?.baseWorldId,
              taxonomyContext: {
                category:
                  fixedAiMetadata?.worldsMetadata?.assetType || 'worlds',
                subcategory:
                  fixedAiMetadata?.worldsMetadata?.variantName || 'default',
              },
            });
            layerProcessingPromises.push({
              layer: 'worlds',
              promise: worldsPromise,
            });
            break;
          }
        }

        // 🚀 PERFORMANCE OPTIMIZATION: Process all layer promises in parallel
        if (layerProcessingPromises.length > 0) {
          console.log(
            `🚀 [PERFORMANCE] Processing ${layerProcessingPromises.length} layers in parallel...`,
          );
          const startTime = Date.now();

          try {
            // Wait for all layer processing to complete in parallel
            const results = await Promise.all(
              layerProcessingPromises.map(async ({ layer, promise }) => {
                const layerStartTime = Date.now();
                const result = await promise;
                const layerTime = Date.now() - layerStartTime;
                console.log(
                  `✅ [PERFORMANCE] ${layer} layer completed in ${layerTime}ms`,
                );
                return { layer, result, processingTime: layerTime };
              }),
            );

            const totalTime = Date.now() - startTime;
            console.log(
              `🚀 [PERFORMANCE] All layers processed in parallel in ${totalTime}ms`,
            );

            // Process results and merge metadata
            for (const { layer, result } of results) {
              if (result.success) {
                const generatedMetadata = result.data;

                switch (layer) {
                  case 'songs': {
                    const mergedSongsMetadata = {
                      ...generatedMetadata,
                      ...(fixedSongMetadata || {}),
                    };
                    enhancedAiMetadata = {
                      ...fixedAiMetadata,
                      layerMetadata: mergedSongsMetadata, // ✅ FIXED: Use layerMetadata for layer-agnostic architecture
                    };
                    break;
                  }

                  case 'stars': {
                    const mergedStarsMetadata = {
                      ...generatedMetadata,
                      ...(starMetadata || {}),
                    };
                    enhancedAiMetadata = {
                      ...fixedAiMetadata,
                      layerMetadata: mergedStarsMetadata, // ✅ FIXED: Use layerMetadata for layer-agnostic architecture
                    };
                    break;
                  }

                  case 'looks': {
                    const mergedLooksMetadata = {
                      ...generatedMetadata,
                      ...(fixedAiMetadata?.looksMetadata || {}),
                    };
                    enhancedAiMetadata = {
                      ...fixedAiMetadata,
                      layerMetadata: mergedLooksMetadata, // ✅ FIXED: Use layerMetadata for layer-agnostic architecture
                    };
                    break;
                  }

                  case 'moves': {
                    const mergedMovesMetadata = {
                      ...generatedMetadata,
                      ...(fixedAiMetadata?.movesMetadata || {}),
                    };
                    enhancedAiMetadata = {
                      ...fixedAiMetadata,
                      layerMetadata: mergedMovesMetadata, // ✅ FIXED: Use layerMetadata for layer-agnostic architecture
                    };
                    break;
                  }

                  case 'worlds': {
                    const mergedWorldsMetadata = {
                      ...generatedMetadata,
                      ...(fixedAiMetadata?.worldsMetadata || {}),
                    };
                    enhancedAiMetadata = {
                      ...fixedAiMetadata,
                      layerMetadata: mergedWorldsMetadata, // ✅ FIXED: Use layerMetadata for layer-agnostic architecture
                    };
                    break;
                  }
                }
              } else {
                console.warn(
                  `⚠️ [PERFORMANCE] ${layer} layer processing failed:`,
                  result.error,
                );
              }
            }
          } catch (error) {
            console.error(
              `❌ [PERFORMANCE] Parallel processing failed:`,
              error.message,
            );
            // Fallback to original metadata if parallel processing fails
          }
        }

        console.log(
          `[SERVICE] Enhanced metadata generated for ${actualLayer} layer`,
        );
      } catch (error) {
        console.warn(
          `[SERVICE] Failed to generate enhanced metadata for ${actualLayer} layer:`,
          error.message,
        );
        // Continue with original fixedAiMetadata if enhanced generation fails
      }
    }

    // CONTRACT ENFORCEMENT: Auto-fix enhanced metadata contract violations
    if (enhancedAiMetadata) {
      enhancedAiMetadata = ContractAutoFixer.fixMetadata(
        enhancedAiMetadata,
        'enhancedAiMetadata',
      );
    }

    // 🚀 CRITICAL FIX: Extract AI-generated tags from enhancedAiMetadata
    let aiGeneratedTags: string[] = [];
    if (enhancedAiMetadata) {
      // For Stars layer, extract tags from the AI response
      if (
        actualLayer === 'S' &&
        safeString(enhancedAiMetadata, 'starsMetadata')
      ) {
        const starsData = enhancedAiMetadata.starsMetadata;
        const aiTags =
          safeArray(starsData, 'data.tags') ||
          safeArray(starsData, 'tags') ||
          [];
        if (Array.isArray(aiTags)) {
          aiGeneratedTags = aiTags.filter((tag) => typeof tag === 'string');
        }
      }
      // For other layers, extract from general AI metadata
      else if (
        safeArray(enhancedAiMetadata, 'tags') &&
        Array.isArray(safeArray(enhancedAiMetadata, 'tags'))
      ) {
        aiGeneratedTags = safeArray(enhancedAiMetadata, 'tags').filter(
          (tag) => typeof tag === 'string',
        );
      }
    }

    // 🔧 SYNC GENDER FIELDS FOR SONGS (G layer)
    // Ensure Edit page has gender-related fields under songMetadata by
    // merging from AI layerMetadata when missing in user-provided songMetadata
    if (actualLayer === 'G') {
      const aiLayerMetadata: any = (enhancedAiMetadata as any)?.layerMetadata || {};
      const genderRelatedFields = [
        'originalArtistGender',
        'genderSuitability',
        'vocalType',
        'ageAppropriateness',
        'language',
      ];
      if (!fixedSongMetadata || typeof fixedSongMetadata !== 'object') {
        fixedSongMetadata = {} as any;
      }
      for (const field of genderRelatedFields) {
        const hasInSong = Object.prototype.hasOwnProperty.call(
          fixedSongMetadata,
          field,
        );
        const aiValue = aiLayerMetadata[field];
        if (!hasInSong && aiValue !== undefined) {
          (fixedSongMetadata as any)[field] = aiValue;
        }
      }
    }

    // 🚀 CRITICAL FIX: Use AI-generated tags if available, otherwise fall back to parsed tags
    const finalTags = aiGeneratedTags.length > 0 ? aiGeneratedTags : parsedTags;

    console.log('🔍 [ASSETS SERVICE] Tag extraction:', {
      parsedTags: parsedTags.length,
      aiGeneratedTags: aiGeneratedTags.length,
      finalTags: finalTags.length,
      sampleTags: finalTags.slice(0, 5),
    });

    // CRITICAL FIX: Ensure starMetadata is populated from AI metadata if empty
    let finalStarMetadata = starMetadata;
    console.log('🔍 [DEBUG] starMetadata check:', {
      starMetadata: starMetadata,
      starMetadataKeys: starMetadata ? Object.keys(starMetadata) : 'null',
      enhancedAiMetadata: safeString(
        enhancedAiMetadata,
        'starsMetadata.layerMetadata',
      )
        ? 'exists'
        : 'missing',
      layerMetadataKeys: safeString(
        enhancedAiMetadata,
        'starsMetadata.layerMetadata',
      )
        ? Object.keys(enhancedAiMetadata.starsMetadata.layerMetadata)
        : 'null',
    });

    if (!finalStarMetadata || Object.keys(finalStarMetadata).length === 0) {
      // If starMetadata is empty, use the AI metadata
      finalStarMetadata =
        enhancedAiMetadata?.starsMetadata?.layerMetadata || {};
      console.log(
        '🔍 [DEBUG] Using AI metadata for starMetadata:',
        finalStarMetadata,
      );
    }

    // Normalize metadata structure to ensure consistency
    const normalizedStarMetadata =
      this.normalizeStarMetadata(finalStarMetadata) || {};

    // 🔧 CRITICAL FIX: Ensure variant fields are included in starMetadata for frontend compatibility
    // First, try to get variant fields from AI metadata
    if (enhancedAiMetadata?.starsMetadata) {
      const aiStarsMetadata = enhancedAiMetadata.starsMetadata;
      if (safeString(aiStarsMetadata, 'assetType')) {
        normalizedStarMetadata.assetType = safeString(
          aiStarsMetadata,
          'assetType',
        );
      }
      if (aiStarsMetadata.baseStarId) {
        normalizedStarMetadata.baseStarId = aiStarsMetadata.baseStarId;
      }
      if (aiStarsMetadata.variantName) {
        normalizedStarMetadata.variantName = aiStarsMetadata.variantName;
      }
      if (aiStarsMetadata.variantType) {
        normalizedStarMetadata.variantType = aiStarsMetadata.variantType;
      }
    }
    
    // 🔧 CRITICAL FIX: Also check frontend data for variant fields (user-provided data takes priority)
    if (createAssetDto.assetType) {
      normalizedStarMetadata.assetType = createAssetDto.assetType;
    }
    if (createAssetDto.baseStarId) {
      normalizedStarMetadata.baseStarId = createAssetDto.baseStarId;
    }
    if (createAssetDto.variantName) {
      normalizedStarMetadata.variantName = createAssetDto.variantName;
    }
    if (createAssetDto.variantType) {
      normalizedStarMetadata.variantType = createAssetDto.variantType;
    }
    
    // 🔧 CRITICAL FIX: Also check starMetadata for variant fields
    if (createAssetDto.starMetadata) {
      if (createAssetDto.starMetadata.assetType) {
        normalizedStarMetadata.assetType = createAssetDto.starMetadata.assetType;
      }
      if (createAssetDto.starMetadata.baseStarId) {
        normalizedStarMetadata.baseStarId = createAssetDto.starMetadata.baseStarId;
      }
      if (createAssetDto.starMetadata.variantName) {
        normalizedStarMetadata.variantName = createAssetDto.starMetadata.variantName;
      }
      if (createAssetDto.starMetadata.variantType) {
        normalizedStarMetadata.variantType = createAssetDto.starMetadata.variantType;
      }
    }

    // 🚀 CRITICAL FIX: The rootLevelMetadata will be populated later using normalizedStarMetadata

    // 🔧 CORRECT IMPLEMENTATION: Respect user's explicit assetType selection
    // Extract variant info from the appropriate metadata source
    // CRITICAL FIX: Use frontend metadata (starMetadata) which contains assetType and baseStarId
    // Also check root level fields for variant detection
    const variantData =
      actualLayer === 'S'
        ? {
            ...createAssetDto.starMetadata,
            ...createAssetDto.aiMetadata?.starsMetadata,
            // CRITICAL FIX: Use proper DTO fields instead of type assertions
            assetType:
              createAssetDto.assetType ||
              createAssetDto.starMetadata?.assetType,
            baseStarId:
              createAssetDto.baseStarId ||
              createAssetDto.starMetadata?.baseStarId,
            baseAssetId:
              createAssetDto.baseAssetId ||
              (createAssetDto.starMetadata as any)?.baseAssetId,
          }
        : actualLayer === 'G'
          ? fixedSongMetadata
          : actualLayer === 'L'
            ? fixedAiMetadata?.looksMetadata
            : actualLayer === 'M'
              ? fixedAiMetadata?.movesMetadata
              : actualLayer === 'W'
                ? fixedAiMetadata?.worldsMetadata
                : {};


    const variantInfo = this.detectVariantInfo(
      variantData,
      actualLayer,
      enhancedAiMetadata,
    );

    // Apply variant detection to enhanced metadata BEFORE root-level extraction
    if (variantInfo.isVariant && enhancedAiMetadata) {
      // Resolve baseAssetId to MongoDB ObjectID if it's an asset name
      let resolvedBaseAssetId = variantInfo.baseAssetId;
      if (
        variantInfo.baseAssetId &&
        variantInfo.baseAssetId !== 'auto-detect'
      ) {
        try {
          const baseAsset = await this.findByName(variantInfo.baseAssetId);
          if (baseAsset) {
            resolvedBaseAssetId = (baseAsset as any)._id.toString();
            console.log(
              `[VARIANT DETECTION] Resolved base asset: ${variantInfo.baseAssetId} -> ${resolvedBaseAssetId}`,
            );
          } else {
            console.warn(
              `[VARIANT DETECTION] Base asset not found: ${variantInfo.baseAssetId}`,
            );
          }
        } catch (error) {
          console.warn(
            `[VARIANT DETECTION] Failed to resolve base asset: ${error.message}`,
          );
        }
      }

      // Update layer-specific metadata with variant information
      if (actualLayer === 'S' && enhancedAiMetadata.starsMetadata) {
        enhancedAiMetadata.starsMetadata.assetType = 'variant';
        // 🚀 CRITICAL FIX: Keep original HFN format for baseStarId, don't convert to MongoDB ID
        enhancedAiMetadata.starsMetadata.baseStarId = variantInfo.baseAssetId;
        enhancedAiMetadata.starsMetadata.variantName = variantInfo.variantName;
        enhancedAiMetadata.starsMetadata.variantType = variantInfo.variantType;

        // 🔧 CRITICAL FIX: Also update normalizedStarMetadata with variant fields
        normalizedStarMetadata.assetType = 'variant';
        // 🚀 CRITICAL FIX: Keep original HFN format for baseStarId, don't convert to MongoDB ID
        normalizedStarMetadata.baseStarId = variantInfo.baseAssetId;
        normalizedStarMetadata.variantName = variantInfo.variantName;
        normalizedStarMetadata.variantType = variantInfo.variantType;

        console.log(
          `[VARIANT DETECTION] Stars variant detected: ${name} -> base: ${resolvedBaseAssetId}, variant: ${variantInfo.variantName}`,
        );
      } else if (actualLayer === 'G' && enhancedAiMetadata.songMetadata) {
        enhancedAiMetadata.songMetadata.assetType = 'variant';
        enhancedAiMetadata.songMetadata.baseSongId = resolvedBaseAssetId;
        enhancedAiMetadata.songMetadata.variantName = variantInfo.variantName;
        enhancedAiMetadata.songMetadata.variantType = variantInfo.variantType;
        console.log(
          `[VARIANT DETECTION] Songs variant detected: ${name} -> base: ${resolvedBaseAssetId}, variant: ${variantInfo.variantName}`,
        );
      } else if (actualLayer === 'L' && enhancedAiMetadata.looksMetadata) {
        enhancedAiMetadata.looksMetadata.assetType = 'variant';
        enhancedAiMetadata.looksMetadata.baseLookId = resolvedBaseAssetId;
        enhancedAiMetadata.looksMetadata.variantName = variantInfo.variantName;
        enhancedAiMetadata.looksMetadata.variantType = variantInfo.variantType;
        console.log(
          `[VARIANT DETECTION] Looks variant detected: ${name} -> base: ${resolvedBaseAssetId}, variant: ${variantInfo.variantName}`,
        );
      } else if (actualLayer === 'M' && enhancedAiMetadata.movesMetadata) {
        enhancedAiMetadata.movesMetadata.assetType = 'variant';
        enhancedAiMetadata.movesMetadata.baseMovesId = resolvedBaseAssetId;
        enhancedAiMetadata.movesMetadata.variantName = variantInfo.variantName;
        enhancedAiMetadata.movesMetadata.variantType = variantInfo.variantType;
        console.log(
          `[VARIANT DETECTION] Moves variant detected: ${name} -> base: ${resolvedBaseAssetId}, variant: ${variantInfo.variantName}`,
        );
      } else if (actualLayer === 'W' && enhancedAiMetadata.worldsMetadata) {
        enhancedAiMetadata.worldsMetadata.assetType = 'variant';
        enhancedAiMetadata.worldsMetadata.baseWorldId = resolvedBaseAssetId;
        enhancedAiMetadata.worldsMetadata.variantName = variantInfo.variantName;
        enhancedAiMetadata.worldsMetadata.variantType = variantInfo.variantType;
        console.log(
          `[VARIANT DETECTION] Worlds variant detected: ${name} -> base: ${resolvedBaseAssetId}, variant: ${variantInfo.variantName}`,
        );
      }
    } else if (variantInfo.isVariant === false) {
      // Ensure base assets are marked as 'base'
    if (enhancedAiMetadata) {
      if (actualLayer === 'S' && enhancedAiMetadata.starsMetadata) {
        // Do NOT overwrite variant context; only set base when this is not a variant
        if (!variantInfo.isVariant) {
          enhancedAiMetadata.starsMetadata.assetType = 'base';
        }

          // 🔧 CRITICAL FIX: Also update normalizedStarMetadata for base assets
          normalizedStarMetadata.assetType = 'base';
      } else if (actualLayer === 'G' && enhancedAiMetadata.songMetadata) {
          enhancedAiMetadata.songMetadata.assetType = 'base';
      } else if (actualLayer === 'L' && enhancedAiMetadata.looksMetadata) {
          enhancedAiMetadata.looksMetadata.assetType = 'base';
      } else if (actualLayer === 'M' && enhancedAiMetadata.movesMetadata) {
          enhancedAiMetadata.movesMetadata.assetType = 'base';
      } else if (actualLayer === 'W' && enhancedAiMetadata.worldsMetadata) {
          enhancedAiMetadata.worldsMetadata.assetType = 'base';
        }
      }
      console.log(`[VARIANT DETECTION] Base asset detected: ${name}`);
    }

    // CRITICAL FIX: Implement shared schema structure
    // Extract metadata fields from AI response and store at root level for frontend compatibility
    let rootLevelMetadata = {};

    if (enhancedAiMetadata) {
      if (actualLayer === 'L' && enhancedAiMetadata.looksMetadata) {
        // Extract Looks metadata to root level
        const looksData = enhancedAiMetadata.looksMetadata;

        // Handle both nested and flat structures from AI service
        const looksMetadata =
          looksData.layerMetadata ||
          looksData.data?.looksMetadata ||
          looksData.looksMetadata ||
          looksData;

        if (looksMetadata) {
          rootLevelMetadata = {
            // Core metadata fields at root level for frontend compatibility
            brandNames: looksMetadata.brandNames,
            primaryColor: looksMetadata.primaryColor,
            styleCategory: looksMetadata.styleCategory,
            occasion: looksMetadata.occasion,
            primaryGarment: looksMetadata.primaryGarment,
            colorScheme: looksMetadata.colorScheme,
            seasonality: looksMetadata.seasonality,
            accessories: looksMetadata.accessories || [],
            priceRange: looksMetadata.priceRange,
            energy: looksMetadata.energy,
            formality: looksMetadata.formality,

            // Additional fields
            outfitName: looksMetadata.outfitName,
            assetType: looksMetadata.assetType,
            baseLookId: looksMetadata.baseLookId,
            variantName: looksMetadata.variantName,
            primaryColors: looksMetadata.primaryColors || [],
            patterns: looksMetadata.patterns || [],
            materials: looksMetadata.materials || [],
            timeOfDay: looksMetadata.timeOfDay,
            layerType: looksMetadata.layerType,
            compatibilityScore: looksMetadata.compatibilityScore,
          };
        }
      } else if (actualLayer === 'S' && (enhancedAiMetadata.starsMetadata || normalizedStarMetadata.assetType)) {
        // Extract Stars metadata to root level
        const starsData = enhancedAiMetadata.starsMetadata;
        console.log('🔧 [DEBUG] starsData:', starsData);
        console.log('🔧 [DEBUG] starsData type:', typeof starsData);
        console.log('🔧 [DEBUG] starsData keys:', starsData ? Object.keys(starsData) : 'null');

        // 🚀 CRITICAL FIX: Use the normalized starMetadata we created earlier
        // This contains the correct values from the hybrid extraction
        const starsMetadata = normalizedStarMetadata;

        console.log('🔍 [ASSETS SERVICE] Stars data structure:', {
          hasData: !!starsData?.data,
          hasLayerMetadata: !!starsData?.data?.layerMetadata,
          hasStarsMetadata: !!starsData?.data?.starsMetadata,
          extractedHairColor: starsMetadata?.hairColor,
          extractedGender: starsMetadata?.gender,
          fullStarsData: JSON.stringify(starsData, null, 2),
        });

        // Hair color processing through AI response pipeline

        if (starsMetadata) {
          rootLevelMetadata = {
            // 🔧 CRITICAL FIX: Use normalizedStarMetadata for ALL fields (user-provided data takes priority)
            starName: normalizedStarMetadata.starName || starsMetadata.starName,
            archetype: normalizedStarMetadata.archetype || starsMetadata.archetype,
            energy: normalizedStarMetadata.energy || starsMetadata.energy,
            vibe: normalizedStarMetadata.vibe || starsMetadata.vibe,
            gender: normalizedStarMetadata.gender || starsMetadata.gender,
            ageGroup: normalizedStarMetadata.ageGroup || starsMetadata.ageGroup,
            skinTone: normalizedStarMetadata.skinTone || starsMetadata.skinTone,
            ethnicity: normalizedStarMetadata.ethnicity || starsMetadata.ethnicity,

            // 🔧 CRITICAL FIX: Use normalizedStarMetadata for variant fields (user-provided data)
            assetType: normalizedStarMetadata.assetType,
            baseStarId: normalizedStarMetadata.baseStarId,
            variantName: normalizedStarMetadata.variantName,
            variantType: normalizedStarMetadata.variantType,

            // 🌟 ENHANCED: Comprehensive Hair Metadata System (user-provided data takes priority)
            hairColor: normalizedStarMetadata.hairColor || starsMetadata.hairColor,
            hairLength: normalizedStarMetadata.hairLength || starsMetadata.hairLength,
            hairStyle: normalizedStarMetadata.hairStyle || starsMetadata.hairStyle,
            hairTexture: normalizedStarMetadata.hairTexture || starsMetadata.hairTexture,
            hairTreatment: normalizedStarMetadata.hairTreatment || starsMetadata.hairTreatment,
            hairAccessories: normalizedStarMetadata.hairAccessories || starsMetadata.hairAccessories,

            // 🌟 ENHANCED: Comprehensive Makeup Metadata System (user-provided data takes priority)
            makeupType: normalizedStarMetadata.makeupType || starsMetadata.makeupType,
            eyeMakeup: normalizedStarMetadata.eyeMakeup || starsMetadata.eyeMakeup,
            lipMakeup: normalizedStarMetadata.lipMakeup || starsMetadata.lipMakeup,
            faceMakeup: normalizedStarMetadata.faceMakeup || starsMetadata.faceMakeup,
            makeupEffects: normalizedStarMetadata.makeupEffects || starsMetadata.makeupEffects,

            // 🌟 ENHANCED: Style and Performance Metadata (user-provided data takes priority)
            musicalStyle: normalizedStarMetadata.musicalStyle || starsMetadata.musicalStyle,
            fashionStyle: normalizedStarMetadata.fashionStyle || starsMetadata.fashionStyle,
            accessoryStyle: normalizedStarMetadata.accessoryStyle || starsMetadata.accessoryStyle,

            colorPalette: normalizedStarMetadata.colorPalette || starsMetadata.colorPalette,
            performanceContext: normalizedStarMetadata.performanceContext || starsMetadata.performanceContext,

            // Additional fields (variant fields already added above)
          };

          console.log('🔍 [ASSETS SERVICE] Root level metadata extracted:', {
            hairColor: (rootLevelMetadata as any).hairColor,
            gender: (rootLevelMetadata as any).gender,
            variantName: (rootLevelMetadata as any).variantName,
          });

          // Root level metadata created from stars metadata
        }
      } else if (actualLayer === 'G' && enhancedAiMetadata.songMetadata) {
        // Extract Songs metadata to root level
        const songData = enhancedAiMetadata.songMetadata;
        const songMetadata =
          songData.data?.songMetadata || songData.songMetadata || songData;

        if (songMetadata) {
          rootLevelMetadata = {
            // Core metadata fields at root level for frontend compatibility
            songName: safeString(songMetadata, 'songName'),
            artistName: safeString(songMetadata, 'artistName'),
            albumName: safeString(songMetadata, 'albumName'),
            genre: safeString(songMetadata, 'genre'),
            tempo: safeString(songMetadata, 'tempo'),
            key: safeString(songMetadata, 'key'),
            duration: safeString(songMetadata, 'duration'),
            bpm: safeNumber(songMetadata, 'bpm'),
            mood: safeString(songMetadata, 'mood'),
            energy: safeString(songMetadata, 'energy'),
            danceability: safeString(songMetadata, 'danceability'),
            vocalType: safeString(songMetadata, 'vocalType'),
            instrumentalType: safeString(songMetadata, 'instrumentalType'),
            songCulturalOrigin: safeString(songMetadata, 'culturalOrigin'),
            releaseYear: safeNumber(songMetadata, 'releaseYear'),
            popularity: safeString(songMetadata, 'popularity'),

            // Additional fields
            assetType: safeString(songMetadata, 'assetType'),
            baseSongId: safeString(songMetadata, 'baseSongId'),
            variantName: safeString(songMetadata, 'variantName'),
            remixContext: safeString(songMetadata, 'remixContext'),
            songContext: safeString(songMetadata, 'songContext'),
          };

          // ✅ Variant Root Sync: if this is a variant and any root variant fields are missing, copy from normalizedStarMetadata
          try {
            if ((normalizedStarMetadata as any)?.assetType === 'variant') {
              if (!(rootLevelMetadata as any).baseStarId && (normalizedStarMetadata as any).baseStarId) {
                (rootLevelMetadata as any).baseStarId = (normalizedStarMetadata as any).baseStarId;
              }
              if (!(rootLevelMetadata as any).variantName && (normalizedStarMetadata as any).variantName) {
                (rootLevelMetadata as any).variantName = (normalizedStarMetadata as any).variantName;
              }
              if (!(rootLevelMetadata as any).variantType && (normalizedStarMetadata as any).variantType) {
                (rootLevelMetadata as any).variantType = (normalizedStarMetadata as any).variantType;
              }
            }
          } catch {}
        }
      } else if (actualLayer === 'M' && enhancedAiMetadata.movesMetadata) {
        // Extract Moves metadata to root level
        const movesData = enhancedAiMetadata.movesMetadata;
        const movesMetadata =
          movesData.layerMetadata ||
          movesData.data?.movesMetadata ||
          movesData.movesMetadata ||
          movesData;

        if (movesMetadata) {
          rootLevelMetadata = {
            // Core metadata fields at root level for frontend compatibility
            moveName: safeString(movesMetadata, 'moveName'),
            danceStyle: safeString(movesMetadata, 'danceStyle'),
            energy: safeString(movesMetadata, 'energy'),
            difficultyLevel: safeString(movesMetadata, 'difficultyLevel'),
            estimatedBPM: safeNumber(movesMetadata, 'estimatedBPM'),
            primaryMoves: safeArray(movesMetadata, 'primaryMoves'),
            performerCount: safeNumber(movesMetadata, 'performerCount'),
            spaceRequired: safeString(movesMetadata, 'spaceRequired'),
            movementComplexity: safeString(movesMetadata, 'movementComplexity'),
            tempoRange: safeString(movesMetadata, 'tempoRange'),
            moveCulturalOrigin: safeArray(movesMetadata, 'culturalOrigin'),
            performanceLevel: safeString(movesMetadata, 'performanceLevel'),
            choreographyType: safeString(movesMetadata, 'choreographyType'),

            // Additional fields
            assetType: safeString(movesMetadata, 'assetType'),
            baseMovesId: safeString(movesMetadata, 'baseMovesId'),
            variantName: safeString(movesMetadata, 'variantName'),
            choreographer: safeString(movesMetadata, 'choreographer'),
            performanceContext: safeString(movesMetadata, 'performanceContext'),
          };
        }
      } else if (actualLayer === 'W' && enhancedAiMetadata.worldsMetadata) {
        // Extract Worlds metadata to root level
        const worldsData = enhancedAiMetadata.worldsMetadata;
        const worldsMetadata =
          worldsData.layerMetadata ||
          worldsData.data?.worldsMetadata ||
          worldsData.worldsMetadata ||
          worldsData;

        if (worldsMetadata) {
          rootLevelMetadata = {
            // Core metadata fields at root level for frontend compatibility
            worldName: safeString(worldsMetadata, 'worldName'),
            location: safeString(worldsMetadata, 'location'),
            environmentType: safeString(worldsMetadata, 'environmentType'),
            lightingCondition: safeString(worldsMetadata, 'lightingCondition'),
            weatherCondition: safeString(worldsMetadata, 'weatherCondition'),
            worldTimeOfDay: safeString(worldsMetadata, 'timeOfDay'),
            atmosphere: safeString(worldsMetadata, 'atmosphere'),
            scale: safeString(worldsMetadata, 'scale'),
            worldCulturalContext: safeArray(worldsMetadata, 'culturalContext'),
            architecturalStyle: safeString(
              worldsMetadata,
              'architecturalStyle',
            ),
            worldColorPalette: safeArray(worldsMetadata, 'colorPalette'),
            textureElements: safeArray(worldsMetadata, 'textureElements'),
            spatialCharacteristics: safeString(
              worldsMetadata,
              'spatialCharacteristics',
            ),
            mood: safeString(worldsMetadata, 'mood'),
            energy: safeString(worldsMetadata, 'energy'),

            // Additional fields
            assetType: safeString(worldsMetadata, 'assetType'),
            baseWorldId: safeString(worldsMetadata, 'baseWorldId'),
            variantName: safeString(worldsMetadata, 'variantName'),
            performanceContext: safeString(
              worldsMetadata,
              'performanceContext',
            ),
          };
        }
      } else if (actualLayer === 'C' && enhancedAiMetadata.compositeMetadata) {
        // Extract Composites metadata to root level
        const compositeData = enhancedAiMetadata.compositeMetadata;
        const compositeMetadata =
          compositeData.data?.compositeMetadata ||
          compositeData.compositeMetadata ||
          compositeData;

        if (compositeMetadata) {
          rootLevelMetadata = {
            // Core metadata fields at root level for frontend compatibility
            compositeName: safeString(compositeMetadata, 'compositeName'),
            compositeType: safeString(compositeMetadata, 'compositeType'),
            componentAssets: safeArray(compositeMetadata, 'componentAssets'),
            compositionStyle: safeString(compositeMetadata, 'compositionStyle'),
            complexityLevel: safeString(compositeMetadata, 'complexityLevel'),
            performanceContext: safeString(
              compositeMetadata,
              'performanceContext',
            ),
            compatibilityScore: safeNumber(
              compositeMetadata,
              'compatibilityScore',
            ),
            culturalContext: safeArray(compositeMetadata, 'culturalContext'),
            mood: safeString(compositeMetadata, 'mood'),
            energy: safeString(compositeMetadata, 'energy'),

            // Additional fields
            assetType: safeString(compositeMetadata, 'assetType'),
            baseCompositeId: safeString(compositeMetadata, 'baseCompositeId'),
            variantName: safeString(compositeMetadata, 'variantName'),
          };
        }
      }
    }

    // CRITICAL FIX: Normalize root-level language field to prevent type mismatch errors
    if (rootLevelMetadata && safeString(rootLevelMetadata, 'language')) {
      if (typeof safeString(rootLevelMetadata, 'language') === 'string') {
        (rootLevelMetadata as any).language = safeString(
          rootLevelMetadata,
          'language',
        )
          ? [safeString(rootLevelMetadata, 'language')]
          : [];
      }
    }

    // 🚀 CRITICAL DEBUG: Check hair color before final asset creation
    console.log('🔍 [HAIR COLOR DEBUG] Step 3 - Before Asset Creation:', {
      normalizedStarMetadataHairColor: normalizedStarMetadata?.hairColor,
      rootLevelMetadataHairColor: (rootLevelMetadata as any).hairColor,
      finalTags: finalTags.slice(0, 5),
    });

    // Hair color processing pipeline completed

    // 🎯 ALGORHYTHM FIX: Populate top-level filter arrays for AlgoRhythm integration
    if (enhancedAiMetadata?.layerMetadata) {
      const layerMetadata = enhancedAiMetadata.layerMetadata;
      
      // Extract AlgoRhythm fields from nested metadata
      const algorhythmFields = {
        genre: this.extractArrayField(layerMetadata, 'genre'),
        mood: this.extractArrayField(layerMetadata, 'mood'),
        targetAudience: this.extractArrayField(layerMetadata, 'targetAudience'),
        ageAppropriateness: this.extractArrayField(layerMetadata, 'ageAppropriateness'),
        musicalStyle: this.extractArrayField(layerMetadata, 'musicalStyle'),
        performanceContext: this.extractArrayField(layerMetadata, 'performanceContext'),
      };

      // Populate rootLevelMetadata with AlgoRhythm fields
      Object.entries(algorhythmFields).forEach(([field, value]) => {
        if (value && value.length > 0) {
          (rootLevelMetadata as any)[field] = value;
          this.logger.log(`🎯 [ALGORHYTHM] Populated ${field}: ${value.join(', ')}`);
        }
      });
    }

    // Create asset data object
    const assetData = {
      layer: actualLayer,
      category: friendlyCategory, // ✅ Store the alpha code (SMT)
      subcategory: friendlySubcategory, // ✅ Store the alpha code (BAS)
      name,
      friendlyName: hfn, // CRITICAL FIX: Set friendlyName to the HFN format
      nna_address: finalMfa,
      gcpStorageUrl,
      source,
      tags: finalTags,
      description,
      creatorDescription,
      albumArt,
      aiMetadata: enhancedAiMetadata,
      songMetadata: fixedSongMetadata,
      starMetadata: normalizedStarMetadata, // Use normalized metadata
      trainingData,
      rights,
      components,
      registeredBy: userEmail,
      // CRITICAL: Add root-level metadata fields for frontend compatibility
      ...rootLevelMetadata,
    };

    // 🔧 VARIANT TAG CORRECTION: MOVED TO AFTER SYNCHRONIZATION (see below)

    // 🚀 COMPREHENSIVE DEBUG: Check final asset data before save
    console.log('🔍 [COMPREHENSIVE DEBUG] Final Asset Data Hair Color:', {
      assetData_hairColor: (assetData as any).hairColor,
      assetData_starMetadata_hairColor: (assetData as any).starMetadata
        ?.hairColor,
      assetData_aiMetadata_starsMetadata_hairColor: safeString(
        assetData,
        'aiMetadata.starsMetadata.hairColor',
      ),
      assetData_aiMetadata_layerMetadata_hairColor: safeString(
        assetData,
        'aiMetadata.starsMetadata.layerMetadata.hairColor',
      ),
      finalTags_sample: finalTags.slice(0, 10),
    });

    // 🔄 PHASE 3: Apply metadata synchronization
    this.logger.log('🔄 [ASSETS] Applying metadata synchronization');
    console.log(
      '🔍 [DEBUG] Before synchronization - starMetadata:',
      assetData.starMetadata,
    );
    console.log(
      '🔍 [DEBUG] Before synchronization - aiMetadata.starsMetadata:',
      assetData.aiMetadata?.starsMetadata,
    );

    const synchronizedAssetData =
      this.metadataSyncService.synchronizeMetadata(assetData);

    console.log(
      '🔍 [DEBUG] After synchronization - starMetadata:',
      synchronizedAssetData.starMetadata,
    );
    console.log('🔍 [DEBUG] After synchronization - root level fields:', {
      ageGroup: synchronizedAssetData.ageGroup,
      musicalStyle: synchronizedAssetData.musicalStyle,
      lipMakeup: synchronizedAssetData.lipMakeup,
      gender: synchronizedAssetData.gender,
    });

    // Metadata synchronization completed

    // 🔄 PHASE 4: Apply base asset inheritance if this is a variant
    let rawAssetData = synchronizedAssetData;

    // Check for baseStarId in multiple locations
    let baseStarId =
      synchronizedAssetData.baseStarId ||
      safeString(
        synchronizedAssetData,
        'aiMetadata.starsMetadata.baseStarId',
      ) ||
      safeString(synchronizedAssetData, 'starMetadata.baseStarId');

    // Enhanced debugging with console.log for visibility
    console.log(
      `🔍 [ASSETS] INHERITANCE DEBUG - assetType: "${synchronizedAssetData.assetType}"`,
    );
    console.log(
      `🔍 [ASSETS] INHERITANCE DEBUG - baseStarId found: "${baseStarId}"`,
    );
    console.log(
      `🔍 [ASSETS] INHERITANCE DEBUG - root baseStarId: ${synchronizedAssetData.baseStarId}`,
    );
    console.log(
      `🔍 [ASSETS] INHERITANCE DEBUG - aiMetadata baseStarId: ${safeString(synchronizedAssetData, 'aiMetadata.starsMetadata.baseStarId')}`,
    );
    console.log(
      `🔍 [ASSETS] INHERITANCE DEBUG - starMetadata baseStarId: ${safeString(synchronizedAssetData, 'starMetadata.baseStarId')}`,
    );

    // BACKEND FALLBACK: Pattern-based inheritance detection
    if (!baseStarId && synchronizedAssetData.assetType === 'variant') {
      console.log(
        `🔄 [ASSETS] PATTERN FALLBACK - Attempting pattern-based base asset detection`,
      );

      // Extract base asset pattern from current asset name
      // S.GRL.YOU.002 -> S.GRL.YOU.001
      const currentName = synchronizedAssetData.name;
      const nameMatch = currentName.match(/^(.+\.)(\d+)$/);

      if (nameMatch) {
        const basePattern = nameMatch[1];
        const currentNumber = parseInt(nameMatch[2]);
        const baseNumber = currentNumber - 1;

        if (baseNumber > 0) {
          const baseAssetName = `${basePattern}${baseNumber.toString().padStart(3, '0')}`;
          console.log(
            `🔄 [ASSETS] PATTERN FALLBACK - Looking for base asset: ${baseAssetName}`,
          );

          try {
            const baseAsset = await this.assetModel.findOne({
              name: baseAssetName,
            });
            if (baseAsset) {
              baseStarId = (baseAsset as any)._id.toString();
              console.log(
                `✅ [ASSETS] PATTERN FALLBACK - Found base asset: ${baseAssetName} (ID: ${baseStarId})`,
              );
            } else {
              console.log(
                `❌ [ASSETS] PATTERN FALLBACK - Base asset not found: ${baseAssetName}`,
              );
            }
          } catch (error) {
            console.log(
              `❌ [ASSETS] PATTERN FALLBACK - Error finding base asset: ${error.message}`,
            );
          }
        }
      }
    }

    // Include build revision in logs for deployment visibility
    const buildRevision =
      process.env.BUILD_REVISION ||
      process.env.REVISION ||
      process.env.COMMIT_SHA ||
      'unknown';
    this.logger.log(
      `🔍 [ASSETS] [rev:${buildRevision}] Checking inheritance conditions: assetType="${synchronizedAssetData.assetType}", baseStarId="${baseStarId}"`,
    );
    this.logger.log(
      `🔍 [ASSETS] BaseStarId locations - root: ${synchronizedAssetData.baseStarId}, aiMetadata: ${safeString(synchronizedAssetData, 'aiMetadata.starsMetadata.baseStarId')}, starMetadata: ${safeString(synchronizedAssetData, 'starMetadata.baseStarId')}`,
    );

    if (synchronizedAssetData.assetType === 'variant' && baseStarId) {
      console.log(
        `🔄 [ASSETS] INHERITANCE CALLED - Applying inheritance for variant: ${baseStarId}`,
      );
      this.logger.log(
        `🔄 [ASSETS] Applying base asset inheritance for variant: ${baseStarId}`,
      );
      rawAssetData =
        await this.variantInheritanceService.applyBaseAssetInheritance(
          synchronizedAssetData,
          baseStarId,
        );

      // Post-inheritance synchronization to ensure all metadata objects are consistent
      this.logger.log(`🔄 [ASSETS] Applying post-inheritance synchronization`);
      console.log('🔧 [FRONTEND DEBUG] BEFORE synchronization:', {
        root_hairColor: rawAssetData.hairColor,
        starMetadata_hairColor: rawAssetData.starMetadata?.hairColor,
        layerMetadata_hairColor: safeString(
          rawAssetData,
          'aiMetadata.starsMetadata.layerMetadata.hairColor',
        ),
      });

      rawAssetData =
        this.metadataSyncService.synchronizeAfterInheritance(rawAssetData);

      // 🔧 FINAL GUARD: Ensure aiMetadata.layerMetadata.assetType reflects variant status
      try {
        const isVariantFinal =
          (rawAssetData as any)?.assetType === 'variant' ||
          (rawAssetData as any)?.starMetadata?.assetType === 'variant';
        if (isVariantFinal) {
          (rawAssetData as any).aiMetadata = (rawAssetData as any).aiMetadata || {};
          const lm: any = (rawAssetData as any).aiMetadata.layerMetadata || {};
          lm.assetType = 'variant';
          if ((rawAssetData as any).baseStarId && !lm.baseStarId) lm.baseStarId = (rawAssetData as any).baseStarId;
          if ((rawAssetData as any).variantName && !lm.variantName) lm.variantName = (rawAssetData as any).variantName;
          if ((rawAssetData as any).variantType && !lm.variantType) lm.variantType = (rawAssetData as any).variantType;
          (rawAssetData as any).aiMetadata.layerMetadata = lm;
        }
      } catch {}

      console.log('🔧 [FRONTEND DEBUG] AFTER synchronization:', {
        root_hairColor: rawAssetData.hairColor,
        starMetadata_hairColor: rawAssetData.starMetadata?.hairColor,
        layerMetadata_hairColor: safeString(
          rawAssetData,
          'aiMetadata.starsMetadata.layerMetadata.hairColor',
        ),
      });

      // 🚀 COMPREHENSIVE DEBUG: Check after inheritance
      console.log('🔍 [COMPREHENSIVE DEBUG] After Inheritance:', {
        inherited_hairColor: rawAssetData.hairColor,
        inherited_starMetadata_hairColor:
          rawAssetData.starMetadata?.hairColor,
        inherited_aiMetadata_hairColor: safeString(
          rawAssetData,
          'aiMetadata.starsMetadata.hairColor',
        ),
        inherited_aiMetadata_layerMetadata_hairColor: safeString(
          rawAssetData,
          'aiMetadata.starsMetadata.layerMetadata.hairColor',
        ),
      });

      // 🔧 CRITICAL FIX: VARIANT TAG CORRECTION - Run AFTER synchronization to use correct metadata
      if (rawAssetData.assetType === 'variant') {
        const finalHairColor =
          rawAssetData.hairColor ||
          rawAssetData.starMetadata?.hairColor ||
          safeString(rawAssetData, 'aiMetadata.starsMetadata.hairColor');

        if (
          finalHairColor &&
          Array.isArray(safeArray(rawAssetData, 'tags'))
        ) {
          const colorLower = String(finalHairColor).toLowerCase();
          const colorWords = [
            'blonde',
            'brown',
            'black',
            'red',
            'blue',
            'pink',
            'purple',
            'green',
            'gray',
            'grey',
            'white',
          ];
          const hairTagRegex = new RegExp(
            `(^|-)(${colorWords.join('|')})(?=-hair)`,
            'g',
          );

          // 🔧 HIGHLIGHTS FIX: Check if this is a highlights variant
          const isHighlightsVariant =
            colorLower === 'colorful/multi-color' ||
            rawAssetData.tags.some((tag: string) =>
              tag.includes('highlights'),
            );

          this.logger.log(
            `🔧 [TAG CORRECTION] Starting tag correction for variant with hairColor: ${finalHairColor} (highlights: ${isHighlightsVariant})`,
          );

          rawAssetData.tags = rawAssetData.tags
            .map((t: string) => {
              if (/-hair/.test(t)) {
                // For highlights variants, suppress base color tags and keep highlight-specific tags
                if (isHighlightsVariant) {
                  // Keep highlight-specific tags like "brown-highlights"
                  if (t.includes('highlights')) {
                    return t;
                  }
                  // Suppress base color hair tags for highlights variants
                  if (hairTagRegex.test(t)) {
                    return null; // Will be filtered out
                  }
                } else {
                  // For non-highlights variants, replace the color token before -hair with the variant color
                  return t.replace(
                    hairTagRegex,
                    (_m, prefix) => `${prefix}${colorLower}`,
                  );
                }
              }
              if (/-wavy-hair|-long-hair|-short-hair|-curly-hair/.test(t)) {
                // ensure there is a color-specific tag present; leave style tags as-is
                return t;
              }
              return t;
            })
            .filter((tag): tag is string => tag !== null); // Remove null values

          // 🔧 HIGHLIGHTS FIX: Add appropriate tags for highlights variants
          if (isHighlightsVariant) {
            // Add a composite tag if not already present
            const hasCompositeTag = rawAssetData.tags.some(
              (tag: string) =>
                tag.includes('multi-color') ||
                tag.includes('colorful') ||
                tag.includes('highlights'),
            );
            if (!hasCompositeTag) {
              rawAssetData.tags.push('multi-color-hair');
            }
          }

          this.logger.log(
            `🔧 [TAG CORRECTION] Adjusted tags for variant (highlights: ${isHighlightsVariant}): ${rawAssetData.tags.join(', ')}`,
          );

          // Also update aiMetadata.starsMetadata.tags to keep them in sync
          if (
            rawAssetData.aiMetadata &&
            rawAssetData.aiMetadata.starsMetadata
          ) {
            rawAssetData.aiMetadata.starsMetadata.tags = rawAssetData.tags;
            this.logger.log(
              `🔧 [TAG CORRECTION] Updated aiMetadata.starsMetadata.tags`,
            );
          }
        }
      }
    } else {
      console.log(
        `⏭️ [ASSETS] INHERITANCE SKIPPED - assetType: ${synchronizedAssetData.assetType}, baseStarId: ${baseStarId}`,
      );
      this.logger.log(
        `⏭️ [ASSETS] Skipping inheritance - assetType: ${synchronizedAssetData.assetType}, baseStarId: ${baseStarId}`,
      );

      // Inheritance skipped for this asset type
    }

    // 🚀 CRITICAL FIX: Tag regeneration for variants
    if (
      rawAssetData.assetType === 'variant' &&
      rawAssetData.layerMetadata?.hairColor
    ) {
      // Get the actual variant hair color
      const variantHairColor =
        rawAssetData.layerMetadata.hairColor.toLowerCase();

      // Replace all hair color references in tags
      rawAssetData.tags = rawAssetData.tags.map((tag) => {
        // Replace any base asset hair color with variant hair color
        if (
          tag.includes('auburn') ||
          tag.includes('blonde') ||
          tag.includes('brown') ||
          tag.includes('black') ||
          tag.includes('red')
        ) {
          return tag.replace(
            /auburn|blonde|brown|black|red/gi,
            variantHairColor,
          );
        }
        return tag;
      });

      // Remove duplicates
      rawAssetData.tags = [...new Set(rawAssetData.tags)];

      this.logger.log(
        `🚀 [TAG REGENERATION] Updated tags for variant with hair color: ${variantHairColor}`,
      );
    }

    // ✅ Ensure root-level tags are populated from AI results (prefer filteredTags)
    try {
      const starsAi = safeString(rawAssetData, 'aiMetadata.starsMetadata')
        ? safeString(rawAssetData, 'aiMetadata.starsMetadata')
        : safeString(rawAssetData, 'aiMetadata.starMetadata');

      const preferredTags: string[] | undefined = Array.isArray(
        (starsAi as any)?.filteredTags,
      )
        ? (starsAi as any).filteredTags
        : Array.isArray((starsAi as any)?.tags)
          ? (starsAi as any).tags
          : Array.isArray(rawAssetData?.tags)
            ? rawAssetData.tags
            : [];

      if (preferredTags && preferredTags.length) {
        rawAssetData.tags = Array.from(new Set(preferredTags));

        // Keep AI metadata tags in sync
        if (
          rawAssetData &&
          rawAssetData.aiMetadata &&
          rawAssetData.aiMetadata.starsMetadata
        ) {
          rawAssetData.aiMetadata.starsMetadata.tags = rawAssetData.tags;
        }
        if (
          rawAssetData &&
          rawAssetData.aiMetadata &&
          rawAssetData.aiMetadata.starMetadata
        ) {
          rawAssetData.aiMetadata.starMetadata.tags = rawAssetData.tags;
        }

        this.logger.log(
          `🏷️ [TAGS] Persisting root-level tags (count: ${rawAssetData.tags.length}) from AI results`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `⚠️ [TAGS] Failed to persist root-level tags: ${String(err)}`,
      );
    }

    // Final asset data ready for database save
    // CRITICAL FIX: Add the generated name to rawAssetData
    console.log('[SERVICE] DEBUG: Adding name to rawAssetData:');
    console.log(`  name: ${name}`);
    console.log(`  finalMfa: ${finalMfa}`);
    console.log(`  hfn: ${hfn}`);
    console.log(`  sequential: ${sequential}`);

    rawAssetData.name = name;
    rawAssetData.nna_address = finalMfa;

    // Initialize version fields if not already set
    if (!rawAssetData.version) {
      rawAssetData.version = 1;
      rawAssetData.isLatestVersion = true;
      rawAssetData.versionCreatedAt = new Date();
      rawAssetData.versionCreatedBy = userEmail;
      rawAssetData.versionNotes = 'Initial version';
    }

    console.log('[SERVICE] DEBUG: rawAssetData after adding name:');
    console.log(`  rawAssetData.name: ${rawAssetData.name}`);
    console.log(`  rawAssetData.nna_address: ${rawAssetData.nna_address}`);

    // 🎯 SAVE-TIME GUARD (FINAL): Re-assert Songs gender fields from _aiResponse just before save
    try {
      const isSongsLayer =
        (rawAssetData as any).layer === 'G' || (synchronizedAssetData as any)?.layer === 'G';
      if (isSongsLayer) {
        const aiResp =
          (rawAssetData as any)?.aiMetadata?.layerMetadata?._aiMetadata?.raw?.layerMetadata?._aiResponse ||
          (rawAssetData as any)?._aiMetadata?.raw?.layerMetadata?._aiResponse ||
          null;

        if (aiResp) {
          const authoritativeGender = aiResp.originalArtistGender;
          // Business rule: default Songs suitability to Unisex at creation unless explicitly set later by user
          const authoritativeSuitability = 'Unisex';
          const authoritativeVocalType = aiResp.vocalType;

          (rawAssetData as any).songMetadata = (rawAssetData as any).songMetadata || {};
          if (authoritativeGender) {
            (rawAssetData as any).songMetadata.originalArtistGender = authoritativeGender;
            this.logger.log(
              `🎯 [SAVE GUARD:FINAL] Songs gender set from _aiResponse: originalArtistGender = "${authoritativeGender}"`,
            );
          }
          if (authoritativeSuitability) {
            (rawAssetData as any).songMetadata.genderSuitability = authoritativeSuitability;
          }
          if (authoritativeVocalType) {
            (rawAssetData as any).songMetadata.vocalType = authoritativeVocalType;
          }

          const lm = (rawAssetData as any).aiMetadata?.layerMetadata || (rawAssetData as any).layerMetadata;
          if (lm) {
            if (authoritativeGender) lm.originalArtistGender = authoritativeGender;
            if (authoritativeSuitability) lm.genderSuitability = authoritativeSuitability;
            if (authoritativeVocalType) lm.vocalType = authoritativeVocalType;
          }
        }
      }
    } catch (finalGuardErr) {
      this.logger.warn(
        `⚠️ [SAVE GUARD:FINAL] Failed to enforce Songs gender from _aiResponse: ${String(finalGuardErr)}`,
      );
    }

    // Extra debug dump for persistence investigation
    try {
      if ((rawAssetData as any).layer === 'G') {
        this.logger.log(
          `🔎 [PERSIST DEBUG] About to persist Songs metadata: originalArtistGender="${(rawAssetData as any).songMetadata?.originalArtistGender}", genderSuitability="${(rawAssetData as any).songMetadata?.genderSuitability}", vocalType="${(rawAssetData as any).songMetadata?.vocalType}"`,
        );
        this.logger.log(
          `🔎 [PERSIST DEBUG] aiMetadata.layerMetadata: originalArtistGender="${(rawAssetData as any).aiMetadata?.layerMetadata?.originalArtistGender}", genderSuitability="${(rawAssetData as any).aiMetadata?.layerMetadata?.genderSuitability}", vocalType="${(rawAssetData as any).aiMetadata?.layerMetadata?.vocalType}"`,
        );
      }
    } catch {}

    const asset = new this.assetModel(rawAssetData);

    console.log('[SERVICE] About to save asset with ID:', asset._id);
    console.log('[SERVICE] Asset name:', asset.name);

    // Log debugging information (NOT saved to database)
    const inheritanceDebugInfo = {
      assetType: synchronizedAssetData.assetType,
      baseStarId:
        synchronizedAssetData.baseStarId ||
        synchronizedAssetData.aiMetadata?.starsMetadata?.baseStarId ||
        synchronizedAssetData.starMetadata?.baseStarId,
      inheritanceCalled:
        synchronizedAssetData.assetType === 'variant' &&
        (synchronizedAssetData.baseStarId ||
          synchronizedAssetData.aiMetadata?.starsMetadata?.baseStarId ||
          synchronizedAssetData.starMetadata?.baseStarId),
      finalMusicalStyle: rawAssetData.aiMetadata?.starsMetadata?.musicalStyle,
      finalMakeupType: rawAssetData.aiMetadata?.starsMetadata?.makeupType,
    };

    console.log('🔍 [ASSETS] INHERITANCE DEBUG INFO:', inheritanceDebugInfo);

    // CRITICAL FIX: Debug info is logged only, NOT saved to database
    // This prevents MongoDB bloat while maintaining debugging capability
    console.log('[SERVICE] Asset layer:', asset.layer);

    // 🔧 CRITICAL FIX: Apply metadata synchronization for variants BEFORE saving
    if (asset.assetType === 'variant') {
      const synchronizedAsset =
        this.metadataSyncService.synchronizeAfterInheritance(asset.toObject());

      // Apply synchronized data back to the asset
      Object.keys(synchronizedAsset).forEach((key) => {
        if (
          key !== '_id' &&
          key !== '__v' &&
          synchronizedAsset[key] !== undefined
        ) {
          asset[key] = synchronizedAsset[key];
        }
      });

      // 🔧 CRITICAL FIX: VARIANT TAG CORRECTION - Run AFTER synchronization to use correct metadata
      const finalHairColor =
        asset.hairColor ||
        asset.starMetadata?.hairColor ||
        asset.aiMetadata?.starsMetadata?.hairColor;

      if (finalHairColor && Array.isArray(asset.tags)) {
        const colorLower = String(finalHairColor).toLowerCase();
        const colorWords = [
          'blonde',
          'brown',
          'black',
          'red',
          'blue',
          'pink',
          'purple',
          'green',
          'gray',
          'grey',
          'white',
        ];
        const hairTagRegex = new RegExp(
          `(^|-)(${colorWords.join('|')})(?=-hair)`,
          'g',
        );

        // 🔧 HIGHLIGHTS FIX: Check if this is a highlights variant
        const isHighlightsVariant =
          colorLower === 'colorful/multi-color' ||
          asset.tags.some((tag: string) => tag.includes('highlights'));

        asset.tags = asset.tags
          .map((t: string) => {
            if (/-hair/.test(t)) {
              // For highlights variants, suppress base color tags and keep highlight-specific tags
              if (isHighlightsVariant) {
                // Keep highlight-specific tags like "brown-highlights"
                if (t.includes('highlights')) {
                  return t;
                }
                // Suppress base color hair tags for highlights variants
                if (hairTagRegex.test(t)) {
                  return null; // Will be filtered out
                }
              } else {
                // For non-highlights variants, replace the color token before -hair with the variant color
                return t.replace(
                  hairTagRegex,
                  (_m, prefix) => `${prefix}${colorLower}`,
                );
              }
            }
            if (/-wavy-hair|-long-hair|-short-hair|-curly-hair/.test(t)) {
              // ensure there is a color-specific tag present; leave style tags as-is
              return t;
            }
            return t;
          })
          .filter((tag): tag is string => tag !== null); // Remove null values

        // 🔧 HIGHLIGHTS FIX: Add appropriate tags for highlights variants
        if (isHighlightsVariant) {
          // Add a composite tag if not already present
          const hasCompositeTag = asset.tags.some(
            (tag: string) =>
              tag.includes('multi-color') ||
              tag.includes('colorful') ||
              tag.includes('highlights'),
          );
          if (!hasCompositeTag) {
            asset.tags.push('multi-color-hair');
          }
        }

        // 🔧 GENERIC TAG FILTER: Remove generic tags that don't add value for AlgoRhythm matching
        const genericTagsToRemove = [
          'stars',
          'balanced',
          'adaptable',
          'emerging',
          'young-talent',
          'talent',
          'performer',
          'young-adult-r-star',
          'young-adult-r-performer',
          'photogenic',
          'charismatic',
          'cross-genre',
          'polished',
          'sleek',
          'versatile',
          'dynamic',
          'engaging',
          'professional',
          'quality',
          'high-quality',
          'premium',
          'standard',
          'typical',
          'common',
          'generic',
          'basic',
          'simple',
          'regular',
          'normal',
          'average',
          // Genre-specific performer tags (not useful for AlgoRhythm)
          'teen-p-talent',
          'teen-r-performer',
          'teen-p-performer',
          'teen-r-talent',
          'young-adult-p-talent',
          'young-adult-r-performer',
          'young-adult-p-performer',
          'young-adult-r-talent',
          'adult-p-talent',
          'adult-r-performer',
          'adult-p-performer',
          'adult-r-talent',
        ];

        asset.tags = asset.tags.filter(
          (tag) => !genericTagsToRemove.includes(tag),
        );

        // Also update aiMetadata.starsMetadata.tags to keep them in sync
        if (asset.aiMetadata?.starsMetadata) {
          (asset.aiMetadata.starsMetadata as any).tags = asset.tags;
        }
      }
    }

      // 🎯 COMPOSITE THUMBNAIL FIX: Upload composite asset file and use as thumbnail
      if (asset.layer === 'C' && !asset.gcpStorageUrl && file) {
        this.logger.log('🎯 [COMPOSITE THUMBNAIL] Uploading composite asset file as thumbnail');
        
        try {
          // Upload the composite asset file directly to GCS
          // This works for both images and videos, just like other layers
          const uploadedUrl = await this.storageService.uploadFile(
            file.buffer,
            file.mimetype,
            file.originalname,
            asset.layer,
            asset.category,
            asset.subcategory
          );
          
          if (uploadedUrl) {
            // Set the uploaded file as the composite asset's thumbnail
            asset.gcpStorageUrl = uploadedUrl;
            asset.albumArt = uploadedUrl;
            
            this.logger.log(`✅ [COMPOSITE THUMBNAIL] Uploaded composite asset file: ${uploadedUrl}`);
          } else {
            this.logger.warn(`⚠️ [COMPOSITE THUMBNAIL] Failed to upload composite asset file`);
          }
        } catch (error) {
          this.logger.error(`❌ [COMPOSITE THUMBNAIL] Error uploading composite asset file: ${error.message}`);
        }
      }

    // CRITICAL FIX: Wrap asset.save() in try-catch to properly handle duplicate key errors
    let savedAsset;
    try {
      savedAsset = await asset.save();
    } catch (error) {
      // Check if it's a duplicate key error and re-throw with proper error code
      if (error.code === 11000) {
        console.log(
          '[SERVICE] Duplicate key error detected during asset save:',
          error.message,
        );
        // Re-throw the error with the proper code so retry logic can catch it
        throw error;
      }
      // For other errors, re-throw as-is
      throw error;
    }

    console.log('[SERVICE] Asset saved successfully with ID:', savedAsset._id);
    console.log('[SERVICE] Saved asset name:', savedAsset.name);
    console.log(
      '[SERVICE] Saved asset songMetadata:',
      JSON.stringify(savedAsset.songMetadata),
    );

    // Add response-only debug info (NOT persisted to database)
    const responseWithDebug = savedAsset.toObject();
    responseWithDebug.debugInfo = {
      message: 'INHERITANCE DEBUG - Check browser console for details',
      assetType: synchronizedAssetData.assetType,
      baseStarId: baseStarId,
      inheritanceCalled:
        synchronizedAssetData.assetType === 'variant' && baseStarId,
      timestamp: new Date().toISOString(),
      debugVersion: '50f600219',
      deploymentStatus: 'FORCE_DEPLOYMENT_DEBUG',
    };

    return responseWithDebug;
  }

  async batchCreateAssets(
    csvData: Record<string, unknown>[],
    files: UploadedFile[],
    userEmail: string,
  ): Promise<Asset[]> {
    const assets: Asset[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const file = files[i];

      if (!file) {
        throw new HttpException(
          `No file provided for row ${i + 1}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const createAssetDto = {
        name: row.name as string, // Add required name field
        layer: row.layer as string,
        category: row.category as string,
        subcategory: row.subcategory as string,
        source: row.source as string,
        tags: Array.isArray(row.tags)
          ? row.tags
          : JSON.parse(row.tags as string),
        description: row.description as string,
        creatorDescription: row.creatorDescription as string,
        albumArt: row.albumArt as string,
        gcpStorageUrl:
          (row.gcpStorageUrl as string) || 'https://placeholder.com/file.mp3',
        aiMetadata: row.aiMetadata as Record<string, unknown>,
        songMetadata: row.songMetadata as Record<string, unknown>,
        starMetadata: row.starMetadata as Record<string, unknown>,
        trainingData: row.trainingData as Record<string, unknown>,
        rights: row.rights as Record<string, unknown>,
        components: row.components as any[],
      };

      const asset = await this.createAsset(createAssetDto, userEmail, file);
      assets.push(asset);
    }

    return assets;
  }

  /**
   * Generate composite metadata from component assets
   */
  private generateCompositeMetadataFromComponents(components: any[], createAssetDto: any): any {
    console.log('🎼 [COMPOSITE] Generating metadata from components:', components.length);
    
    const layers = components.map(c => c.layer).filter(Boolean);
    const uniqueLayers = [...new Set(layers)];
    
    // Determine composite type based on component count
    const compositeType = components.length === 2 ? 'Two_Layer' :
                         components.length === 3 ? 'Three_Layer' :
                         components.length === 4 ? 'Four_Layer' :
                         components.length >= 5 ? 'Full_Composite' : 'Partial';
    
    // Generate composite name from components
    const compositeName = this.generateCompositeName(components, createAssetDto);
    
    // Analyze component compatibility
    const crossLayerCompatibility = this.analyzeComponentCompatibility(components);
    
    return {
      compositeName,
      compositeType,
      crossLayerCompatibility,
      compositionStyle: this.determineCompositionStyle(components),
      primaryLayer: uniqueLayers[0] || 'Unknown',
      synergy: this.calculateSynergy(components),
      complexity: components.length > 5 ? 'High' : components.length > 3 ? 'Medium' : 'Low',
      targetAudience: this.determineTargetAudience(components),
      componentCount: components.length,
      layers: uniqueLayers,
    };
  }

  /**
   * Generate composite name from components
   */
  private generateCompositeName(components: any[], createAssetDto: any): string {
    if (createAssetDto.compositeName) {
      return createAssetDto.compositeName;
    }
    
    // Extract names from components
    const componentNames = components.map(c => {
      if (c.starMetadata?.starName) return c.starMetadata.starName;
      if (c.looksMetadata?.lookName) return c.looksMetadata.lookName;
      if (c.movesMetadata?.moveName) return c.movesMetadata.moveName;
      if (c.worldsMetadata?.worldName) return c.worldsMetadata.worldName;
      if (c.songMetadata?.songName) return c.songMetadata.songName;
      return c.name || c.friendlyName || 'Unknown';
    }).filter(Boolean);
    
    if (componentNames.length > 0) {
      return `${componentNames.slice(0, 2).join(' + ')}${componentNames.length > 2 ? ' + More' : ''} Composite`;
    }
    
    return 'Composite Asset';
  }

  /**
   * Analyze component compatibility
   */
  private analyzeComponentCompatibility(components: any[]): any {
    const layers = components.map(c => c.layer);
    const uniqueLayers = [...new Set(layers)];
    
    // Basic compatibility scoring
    let score = 50; // Base score
    
    // Bonus for diverse layers
    if (uniqueLayers.length > 1) score += 20;
    if (uniqueLayers.length >= 3) score += 15;
    if (uniqueLayers.length >= 4) score += 10;
    
    // Bonus for complete sets (G+S+L+M+W)
    const hasSong = layers.includes('G');
    const hasStar = layers.includes('S');
    const hasLook = layers.includes('L');
    const hasMove = layers.includes('M');
    const hasWorld = layers.includes('W');
    
    if (hasSong && hasStar) score += 10;
    if (hasLook && hasMove) score += 10;
    if (hasWorld) score += 5;
    
    return {
      score: Math.min(score, 100),
      analysis: this.getCompatibilityAnalysis(score, uniqueLayers),
      layers: uniqueLayers,
      hasCompleteSet: hasSong && hasStar && hasLook && hasMove && hasWorld,
    };
  }

  /**
   * Get compatibility analysis text
   */
  private getCompatibilityAnalysis(score: number, layers: string[]): string {
    if (score >= 90) return 'Excellent cross-layer synergy';
    if (score >= 80) return 'High compatibility across layers';
    if (score >= 70) return 'Good layer integration';
    if (score >= 60) return 'Moderate compatibility';
    return 'Basic compatibility';
  }

  /**
   * Determine composition style
   */
  private determineCompositionStyle(components: any[]): string {
    const layers = components.map(c => c.layer);
    
    if (layers.includes('G') && layers.includes('S')) {
      return 'Performance-focused';
    }
    if (layers.includes('L') && layers.includes('M')) {
      return 'Fashion-forward';
    }
    if (layers.includes('W') && layers.length >= 3) {
      return 'Immersive experience';
    }
    
    return 'Mixed composition';
  }

  /**
   * Calculate synergy score
   */
  private calculateSynergy(components: any[]): string {
    const layers = components.map(c => c.layer);
    const uniqueLayers = [...new Set(layers)];
    
    if (uniqueLayers.length >= 4) return 'High';
    if (uniqueLayers.length >= 3) return 'Medium';
    return 'Low';
  }

  /**
   * Determine target audience
   */
  private determineTargetAudience(components: any[]): string {
    const layers = components.map(c => c.layer);
    
    if (layers.includes('G') && layers.includes('S')) {
      return 'Music and performance enthusiasts';
    }
    if (layers.includes('L') && layers.includes('M')) {
      return 'Fashion and dance enthusiasts';
    }
    if (layers.includes('W')) {
      return 'Immersive experience seekers';
    }
    
    return 'General audience';
  }

  async findByName(name: string): Promise<Asset> {
    const startTime = Date.now();
    try {
      // Validate input
      if (!name || typeof name !== 'string') {
        throw new HttpException(
          'Invalid asset name provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const asset = await this.assetModel.findOne({ name }).lean(); // Use lean query to reduce document size
      const duration = Date.now() - startTime;
      MongoDBMonitor.logQueryPerformance(
        'findByName',
        duration,
        { name },
        asset ? 1 : 0,
      );

      if (!asset) {
        throw new HttpException(
          `Asset not found: ${name}`,
          HttpStatus.NOT_FOUND,
        );
      }
      return asset;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[FIND BY NAME] Error finding asset ${name} after ${duration}ms:`,
        {
          error: error.message,
          stack: error.stack,
          name,
        },
      );

      // Handle specific error types
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle database connection errors
      if (
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoTimeoutError'
      ) {
        this.logger.error(
          `[FIND BY NAME] Database connection error for asset ${name}:`,
          error,
        );
        throw new HttpException(
          'Database connection error. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Generic error handler
      this.logger.error(
        `[FIND BY NAME] Unexpected error for asset ${name}:`,
        error,
      );
      throw new HttpException(
        'An unexpected error occurred while finding the asset',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByAddress(address: string): Promise<Asset> {
    const startTime = Date.now();
    const asset = await this.assetModel
      .findOne({ nna_address: address })
      .lean(); // Use lean query for better performance
    const duration = Date.now() - startTime;
    MongoDBMonitor.logQueryPerformance(
      'findByAddress',
      duration,
      { address },
      asset ? 1 : 0,
    );

    if (!asset) {
      throw new HttpException(
        `Asset not found: ${address}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return asset;
  }

  async findById(id: string): Promise<Asset> {
    const startTime = Date.now();
    const asset = await this.assetModel.findById(id).lean(); // Use lean for consistency
    const duration = Date.now() - startTime;
    MongoDBMonitor.logQueryPerformance(
      'findById',
      duration,
      { id },
      asset ? 1 : 0,
    );

    if (!asset) {
      throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
    }
    return asset;
  }

  async findByIds(ids: string[]): Promise<Asset[]> {
    const startTime = Date.now();
    const assets = await this.assetModel.find({ _id: { $in: ids } }).lean();
    const duration = Date.now() - startTime;
    MongoDBMonitor.logQueryPerformance(
      'findByIds',
      duration,
      { ids },
      assets.length,
    );

    return assets;
  }

  async findByLayer(layer: string): Promise<Asset[]> {
    const startTime = Date.now();
    const assets = await this.assetModel.find({ layer }).lean();
    const duration = Date.now() - startTime;
    MongoDBMonitor.logQueryPerformance(
      'findByLayer',
      duration,
      { layer },
      assets.length,
    );

    return assets;
  }

  async findAll(limit?: number, offset?: number): Promise<Asset[]> {
    // Exclude snapshots from main asset listings to maintain NNA architecture integrity
    const query = this.assetModel
      .find({ isSnapshot: { $ne: true } })
      .lean()
      .sort({ createdAt: -1 });

    if (offset) {
      query.skip(offset);
    }

    if (limit) {
      query.limit(limit);
    }

    const assets = await query.exec();
    // Note: No normalization needed for lean queries as they return plain objects
    return assets;
  }

  async getAssetCounts(): Promise<{
    total: number;
    byLayer: Record<string, number>;
    lastUpdated: string;
  }> {
    try {
      const startTime = Date.now();

      // Get total count
      const total = await this.assetModel.countDocuments({});

      // Get counts by layer
      const layerCounts = await this.assetModel.aggregate([
        {
          $group: {
            _id: '$layer',
            count: { $sum: 1 },
          },
        },
      ]);

      // Convert to object format
      const byLayer: Record<string, number> = {
        G: 0,
        S: 0,
        L: 0,
        M: 0,
        W: 0,
        B: 0,
        P: 0,
        T: 0,
        C: 0,
        R: 0,
      };

      layerCounts.forEach(({ _id, count }) => {
        if (_id && Object.prototype.hasOwnProperty.call(byLayer, _id)) {
          byLayer[_id] = count;
        }
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `[ASSET COUNTS] Retrieved counts in ${duration}ms - Total: ${total}`,
      );

      return {
        total,
        byLayer,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('[ASSET COUNTS] Error retrieving asset counts:', error);
      throw error;
    }
  }

  async searchAssets(searchAssetDto: SearchAssetDto): Promise<{
    items: Asset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      layer,
      category,
      subcategory,
      excludeComposites,
      // Songs Layer Gender Search Fields
      originalArtistGender,
      genderSuitability,
      vocalType,
      ageAppropriateness,
      page = 1,
      limit = 10,
    } = searchAssetDto;

    const filter: any = {
      // Exclude snapshots from main asset listings to maintain NNA architecture integrity
      isSnapshot: { $ne: true },
    };

    // Handle layer filtering with excludeComposites
    if (layer) {
      filter.layer = layer;
    } else if (excludeComposites === true) {
      // If no specific layer is requested but excludeComposites is true, exclude layer C
      filter.layer = { $ne: 'C' };
    }

    // Handle excludeComposites parameter when a specific layer is requested
    // This ensures that when layer=G and excludeComposites=true, we still exclude C layer assets
    if (excludeComposites === true && layer && layer !== 'C') {
      // If a specific layer is requested (not C) and excludeComposites is true,
      // we need to ensure we're only getting that specific layer (which excludes C by default)
      // This is already handled by the layer filter above, so no additional logic needed
      console.log(
        `[FILTER] Layer=${layer}, excludeComposites=true - filtering for ${layer} layer only`,
      );
    }

    // Handle backward compatibility for category search
    if (category && layer) {
      // Try to find the category code for the given input
      const categoryCode = this.getCategoryCodeForSearch(layer, category);
      if (categoryCode) {
        // Search for both the code and the human-readable name
        filter.category = { $in: [categoryCode, category] };
      } else {
        // If we can't find a code, search for the input as-is
        filter.category = category;
      }
    } else if (category) {
      // If no layer provided, just search for category as-is
      filter.category = category;
    }

    // Handle backward compatibility for subcategory search
    if (subcategory && category && layer) {
      // Try to find the subcategory code for the given input
      const subcategoryCode = this.getSubcategoryCodeForSearch(
        layer,
        category,
        subcategory,
      );
      if (subcategoryCode) {
        // Search for both the code and the human-readable name
        filter.subcategory = { $in: [subcategoryCode, subcategory] };
      } else {
        // If we can't find a code, search for the input as-is
        filter.subcategory = subcategory;
      }
    } else if (subcategory) {
      // If no category or layer provided, just search for subcategory as-is
      filter.subcategory = subcategory;
    }

    if (search) filter.$text = { $search: search };

    // Songs Layer Gender Search Filters - FIXED: Case-insensitive matching
    if (originalArtistGender) {
      // Use case-insensitive regex match to handle frontend lowercase vs database capitalized
      filter['songMetadata.originalArtistGender'] = {
        $regex: new RegExp(`^${originalArtistGender}$`, 'i'),
      };
    }
    if (genderSuitability) {
      // Use case-insensitive regex match for genderSuitability as well
      filter['songMetadata.genderSuitability'] = {
        $regex: new RegExp(`^${genderSuitability}$`, 'i'),
      };
    }
    if (vocalType) {
      // Use case-insensitive regex match for vocalType as well
      filter['songMetadata.vocalType'] = {
        $regex: new RegExp(`^${vocalType}$`, 'i'),
      };
    }
    if (ageAppropriateness && ageAppropriateness.length > 0) {
      filter['songMetadata.ageAppropriateness'] = { $in: ageAppropriateness };
    }

    // Universal Asset Type Search Filters
    if (searchAssetDto.assetType) {
      // UNIVERSAL ASSET TYPE SUPPORT: Search for asset type based on layer
      // This supports base/variant relationships across ALL layers (G, S, L, M, W)
      const assetTypeFilter = this.buildAssetTypeFilter(searchAssetDto.assetType, layer);

      // Merge with existing filter
      if (filter.$and) {
        filter.$and.push(assetTypeFilter);
      } else {
        filter.$and = [assetTypeFilter];
      }
    }

    if (searchAssetDto.baseStarId) {
      // UNIVERSAL BASE ID SUPPORT: Search for base ID based on layer
      // This supports base/variant relationships across ALL layers (G, S, L, M, W)
      const baseIdFilter = this.buildBaseIdFilter(searchAssetDto.baseStarId, layer || 'G');

      // Merge with existing filter
      if (filter.$and) {
        filter.$and.push(baseIdFilter);
      } else {
        filter.$and = [baseIdFilter];
      }
    }

    // Add debug logging for troubleshooting
    console.log('[SEARCH DEBUG] Input parameters:', {
      layer,
      category,
      subcategory,
      originalArtistGender,
      genderSuitability,
      vocalType,
      ageAppropriateness,
      assetType: searchAssetDto.assetType,
      baseStarId: searchAssetDto.baseStarId,
    });
    console.log(
      '[SEARCH DEBUG] MongoDB filter:',
      JSON.stringify(filter, null, 2),
    );

    // 🚀 PERFORMANCE OPTIMIZATION: Use lean queries and parallel execution with monitoring
    const startTime = Date.now();
    const [totalAssets, assets] = await Promise.all([
      this.assetModel.countDocuments(filter),
      this.assetModel
        .find(filter)
        .lean() // Use lean queries for better performance
        .select(
          'nna_address name friendlyName layer category subcategory createdAt updatedAt gcpStorageUrl tags description albumArt songName artistName albumName genre mood tempo bpm key danceability vocalType originalArtistGender genderSuitability ageAppropriateness culturalOrigin language targetAudience starCompatibility lookCompatibility moveCompatibility worldCompatibility starName archetype gender ageGroup hairColor hairLength hairStyle makeupType colorPalette performanceContext musicalStyle lipMakeup fashionStyle accessoryStyle variantType moveName danceStyle difficultyLevel estimatedBPM primaryMoves performerCount spaceRequired movementComplexity tempoRange moveCulturalOrigin performanceLevel choreographyType baseMovesId choreographer worldName location environmentType lightingCondition weatherCondition worldTimeOfDay atmosphere scale worldCulturalContext architecturalStyle worldColorPalette textureElements spatialCharacteristics baseWorldId compositeName compositeType componentAssets compositionStyle complexityLevel baseCompositeId brandNames primaryColor styleCategory occasion primaryGarment colorScheme seasonality accessories priceRange energy formality outfitName assetType baseLookId variantName primaryColors patterns materials timeOfDay aiMetadata',
        ) // Select essential fields for ALL layers (Songs, Stars, Looks, Moves, Worlds, Composites) to ensure UI compatibility
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const duration = Date.now() - startTime;
    MongoDBMonitor.logQueryPerformance(
      'searchAssets',
      duration,
      filter,
      assets.length,
    );

    console.log(
      `[SEARCH DEBUG] Found ${assets.length} assets out of ${totalAssets} total`,
    );

    // 🚀 PERFORMANCE OPTIMIZATION: Clean up debug data and reduce response size
    const cleanedAssets = assets.map((asset) =>
      this.cleanAssetForResponse(asset),
    );

    return {
      items: cleanedAssets,
      total: totalAssets,
      page,
      limit,
      totalPages: Math.ceil(totalAssets / limit),
    };
  }

  async updateAsset(
    name: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<Asset> {
    const startTime = Date.now();
    try {
      this.logger.log(`[UPDATE ASSET] Starting update for asset: ${name}`);
      this.logger.log(
        `[UPDATE ASSET] Update DTO:`,
        JSON.stringify(updateAssetDto, null, 2),
      );

      // Validate input parameters
      if (!name || typeof name !== 'string') {
        throw new HttpException(
          'Invalid asset name provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 🚨 Normalize and validate to prevent bloat
      // 🚨 FIXED: Removed double validation that was mutating the payload
      // ValidationPipe already handles validation globally, so manual validation is redundant
      this.logger.log(`[UPDATE ASSET] Skipping manual validation - ValidationPipe handles this globally`);
      
      // ❌ REMOVED: AssetStructureValidator.normalizeAssetPayload() - was mutating payload
      // ❌ REMOVED: AssetStructureValidator.validateAssetStructure() - ValidationPipe handles this

      if (!updateAssetDto || typeof updateAssetDto !== 'object') {
        throw new HttpException(
          'Invalid update data provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get the asset as a proper Mongoose document (not lean) for updates
      const asset = await this.assetModel.findOne({ name });
      if (!asset) {
        throw new HttpException(
          `Asset not found: ${name}`,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.log(`[UPDATE ASSET] Found asset: ${asset.name}`);

      if (
        updateAssetDto.layer ||
        updateAssetDto.category ||
        updateAssetDto.subcategory
      ) {
        const layer = updateAssetDto.layer || asset.layer;
        const category = updateAssetDto.category || asset.category;
        const subcategory = updateAssetDto.subcategory || asset.subcategory;

        this.taxonomyService.validateTaxonomy(layer, category, subcategory);

        // Only update name and nna_address if taxonomy changes
        if (
          layer !== asset.layer ||
          category !== asset.category ||
          subcategory !== asset.subcategory
        ) {
          // Get the NNA category and subcategory codes for proper HFN generation
          const [nnaCategory, nnaSubcategory] =
            this.taxonomyService.getNnaCodes(layer, category, subcategory);

          const count = await this.assetModel.countDocuments({
            layer,
            category,
            subcategory,
          });
          const sequential = (count + 1).toString().padStart(3, '0');

          // Generate proper HFN format: Layer.Category.SubCategory.Sequential
          asset.name = `${layer}.${category}.${subcategory}.${sequential}`;
          asset.nna_address = `${layer}.${nnaCategory}.${nnaSubcategory}.${sequential}`;
        }
      }

      // Update other fields
      if (updateAssetDto.source) asset.source = updateAssetDto.source;
      if (updateAssetDto.tags) {
        if (Array.isArray(updateAssetDto.tags)) {
          asset.tags = updateAssetDto.tags.filter(
            (item) => typeof item === 'string',
          );
        } else if (typeof updateAssetDto.tags === 'string') {
          try {
            const t = JSON.parse(updateAssetDto.tags);
            if (
              Array.isArray(t) &&
              t.every((item) => typeof item === 'string')
            ) {
              asset.tags = t;
            }
          } catch {
            asset.tags = [];
          }
        }
      }
      if (updateAssetDto.description)
        asset.description = updateAssetDto.description;
      if (updateAssetDto.creatorDescription) {
        asset.creatorDescription = updateAssetDto.creatorDescription;
      }
      if (updateAssetDto.albumArt) asset.albumArt = updateAssetDto.albumArt;
      if (updateAssetDto.aiMetadata)
        asset.aiMetadata = updateAssetDto.aiMetadata;
      if (updateAssetDto.songMetadata) {
        try {
          this.logger.log(`[UPDATE ASSET] Processing songMetadata update`);
          // 🚀 UPDATED: Use layerMetadata structure for consistency
          const normalizedSongMetadata = this.normalizeSongMetadata(
            updateAssetDto.songMetadata,
          );
          this.logger.log(
            `[UPDATE ASSET] Normalized songMetadata:`,
            JSON.stringify(normalizedSongMetadata, null, 2),
          );

          // Store in both formats for backward compatibility
          asset.songMetadata = normalizedSongMetadata;

          // 🚀 NEW: Store in aiMetadata.layerMetadata (layer-agnostic)
          if (!asset.aiMetadata) {
            asset.aiMetadata = {} as any;
          }
          const existingLayerMetadata = (asset.aiMetadata as any).layerMetadata || {};
          (asset.aiMetadata as any).layerMetadata = {
            ...existingLayerMetadata,
            ...normalizedSongMetadata,
            layerType: 'songs',
            assetType: 'base',
          };

          // Also update aiMetadata.songMetadata if it exists
          if (asset.aiMetadata && asset.aiMetadata.songMetadata) {
            asset.aiMetadata.songMetadata = {
              ...asset.aiMetadata.songMetadata,
              ...normalizedSongMetadata, // Frontend data takes precedence
            };
          }

          // Also update aiMetadata.layerMetadata if it exists
          if (asset.aiMetadata && (asset.aiMetadata as any).layerMetadata) {
            (asset.aiMetadata as any).layerMetadata = {
              ...(asset.aiMetadata as any).layerMetadata,
              ...normalizedSongMetadata,
              layerType: 'songs',
              assetType: 'base', // Default to base asset for Songs layer
            };
          }
          this.logger.log(
            `[UPDATE ASSET] Successfully processed songMetadata update`,
          );
        } catch (error) {
          this.logger.error(
            `[UPDATE ASSET] Error processing songMetadata:`,
            error,
          );
          throw error;
        }
      }
      if (updateAssetDto.starMetadata) {
        // 🚀 UPDATED: Use layerMetadata structure for consistency
        const normalizedStarMetadata = this.normalizeStarMetadata(
          updateAssetDto.starMetadata,
        );

        // Store in both formats for backward compatibility
        asset.starMetadata = normalizedStarMetadata;

        // 🚀 NEW: Store in aiMetadata.layerMetadata (layer-agnostic)
        if (!asset.aiMetadata) {
          asset.aiMetadata = {} as any;
        }
        const existingLayerMetadataS = (asset.aiMetadata as any).layerMetadata || {};
        (asset.aiMetadata as any).layerMetadata = {
          ...existingLayerMetadataS,
          ...normalizedStarMetadata,
          layerType: 'stars',
        };

        // Also update aiMetadata.starsMetadata if it exists
        if (asset.aiMetadata && asset.aiMetadata.starsMetadata) {
          asset.aiMetadata.starsMetadata = {
            ...asset.aiMetadata.starsMetadata,
            ...normalizedStarMetadata, // Frontend data takes precedence
          };
        }
      }
      if (updateAssetDto.trainingData) {
        asset.trainingData = {
          prompts: updateAssetDto.trainingData.prompts || [],
          images: updateAssetDto.trainingData.images || [],
          videos: updateAssetDto.trainingData.videos || [],
        };
      }
      if (updateAssetDto.rights) {
        asset.rights = {
          source: updateAssetDto.rights.source || '',
          rights_split: updateAssetDto.rights.rights_split || '',
        };
      }
      if (updateAssetDto.components)
        asset.components = updateAssetDto.components;

      // Handle required field updates (for fixing legacy assets)
      if (updateAssetDto.registeredBy)
        asset.registeredBy = updateAssetDto.registeredBy;
      if (updateAssetDto.gcpStorageUrl)
        asset.gcpStorageUrl = updateAssetDto.gcpStorageUrl;
      if (updateAssetDto.nna_address)
        asset.nna_address = updateAssetDto.nna_address;

      // Handle looks metadata updates
      if (updateAssetDto.looksMetadata) {
        this.logger.log(
          `[ASSETS SERVICE] Updating looks metadata for asset ${asset.name}`,
        );
        this.logger.log(
          `[ASSETS SERVICE] New looks metadata:`,
          updateAssetDto.looksMetadata,
        );

        // Update the looks metadata
        asset.looksMetadata = {
          ...asset.looksMetadata, // Preserve existing data
          ...updateAssetDto.looksMetadata, // Apply updates
        };

        // Also update aiMetadata.looksMetadata if it exists
        if (asset.aiMetadata && asset.aiMetadata.looksMetadata) {
          asset.aiMetadata.looksMetadata = {
            ...asset.aiMetadata.looksMetadata,
            ...updateAssetDto.looksMetadata,
          };
        }

        this.logger.log(
          `[ASSETS SERVICE] Updated looks metadata:`,
          asset.looksMetadata,
        );
      }

      // Handle language field normalization to prevent type mismatch errors
      if (asset.songMetadata?.language) {
        // Ensure it's always a string (not an array)
        if (Array.isArray(asset.songMetadata.language)) {
          // If it's an array, take the first element
          asset.songMetadata.language =
            asset.songMetadata.language[0] || 'English';
        }
        // Set default value if empty (can't delete required field)
        if (
          !asset.songMetadata.language ||
          asset.songMetadata.language.trim() === ''
        ) {
          asset.songMetadata.language = 'English'; // CRITICAL FIX: Use string for MongoDB text index compatibility
        }
      }

      // CRITICAL FIX: Ensure required fields are preserved during update
      // These fields should not be changed during updates, but must be present for validation
      if (!asset.registeredBy) {
        this.logger.warn(
          `[UPDATE ASSET] Missing registeredBy field, this should not happen`,
        );
      }
      if (!asset.gcpStorageUrl) {
        this.logger.warn(
          `[UPDATE ASSET] Missing gcpStorageUrl field, this should not happen`,
        );
      }
      if (!asset.nna_address) {
        this.logger.warn(
          `[UPDATE ASSET] Missing nna_address field, this should not happen`,
        );
      }

      // 🔧 CRITICAL FIX: Apply metadata synchronization before saving
      this.logger.log(`[UPDATE ASSET] Applying metadata synchronization`);
      const synchronizedAsset = this.metadataSyncService.synchronizeMetadata(
        asset.toObject(),
      );

      // Apply synchronized data back to the asset
      Object.keys(synchronizedAsset).forEach((key) => {
        if (
          key !== '_id' &&
          key !== '__v' &&
          synchronizedAsset[key] !== undefined
        ) {
          asset[key] = synchronizedAsset[key];
        }
      });

      // Handle legacy assets with undefined/null version
      if (
        !asset.version ||
        asset.version === null ||
        asset.version === undefined
      ) {
        this.logger.log(
          `[UPDATE ASSET] Migrating legacy asset version from ${asset.version} to 1`,
        );
        asset.version = 1;
        asset.isLatestVersion = true;
        asset.versionCreatedAt = new Date();
        asset.versionCreatedBy =
          updateAssetDto.registeredBy || 'system-migration';
        asset.versionNotes = 'Legacy asset version migration';

        // Save the migration first
        await asset.save();
        this.logger.log(`[UPDATE ASSET] Legacy asset migrated successfully`);

        // For legacy assets, skip snapshot creation since this is the first version
        this.logger.log(
          `[UPDATE ASSET] Skipping snapshot creation for legacy asset migration`,
        );
      } else {
        // Create version snapshot before updating (get fresh copy to avoid concurrency issues)
        this.logger.log(
          `[UPDATE ASSET] Creating version snapshot before update`,
          {
            assetId: (asset._id as any).toString(),
            currentVersion: asset.version,
            name,
          } as any,
        );
        try {
          // Get a fresh copy of the asset to avoid concurrency issues
          const freshAsset = await this.assetModel.findById(asset._id);
          if (!freshAsset) {
            throw new HttpException(
              'Asset not found during snapshot creation',
              HttpStatus.NOT_FOUND,
            );
          }

          // CRITICAL FIX: Create version history in separate collection
          const versionRecord = await this.assetVersionHistoryService.createVersionSnapshot(
            (freshAsset._id as any).toString(),
            updateAssetDto.registeredBy || 'system',
            `Version ${freshAsset.version + 1} - Asset update`,
          );
          // Store version record ID for reference
          (asset as any).__latestVersionId = (versionRecord as any)?._id?.toString?.() || undefined;
        } catch (snapshotError: any) {
          this.logger.error(
            `❌ [UPDATE ASSET] Version snapshot failed: ${snapshotError?.name || 'Error'} - ${snapshotError?.message}`,
            snapshotError?.stack,
          );
          throw new HttpException(
            `Version snapshot failed: ${snapshotError?.message || 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Update version fields - CRITICAL: Only update the SAME asset document
      asset.version = asset.version + 1;
      asset.isLatestVersion = true;
      // Use the version record ID for proper chaining
      asset.previousVersionId = (asset as any).__latestVersionId || (asset._id as any).toString();
      // 🔧 FIX: Ensure versionCreatedAt is always a valid Date
      asset.versionCreatedAt = new Date();
      asset.versionCreatedBy = updateAssetDto.registeredBy || 'system';
      asset.versionNotes = `Version ${asset.version} - Asset update`;
      
      // 🔧 FIX: Remove any invalid versionCreatedAt from the DTO if present
      if ((updateAssetDto as any).versionCreatedAt) {
        delete (updateAssetDto as any).versionCreatedAt;
      }
      
      // 🔧 FIX: Clean any invalid date fields that might cause validation errors
      const invalidDateFields = ['versionCreatedAt', 'createdAt', 'updatedAt'];
      invalidDateFields.forEach(field => {
        if ((updateAssetDto as any)[field] && typeof (updateAssetDto as any)[field] === 'object' && !((updateAssetDto as any)[field] instanceof Date)) {
          delete (updateAssetDto as any)[field];
        }
      });

      // 🔒 Anti-bloat: strip any root layerMetadata and stray song fields before saving
      if ((asset as any).layerMetadata) {
        delete (asset as any).layerMetadata;
      }
      // Remove known song-specific fields that must not live at root
      const rootSongFields = [
        'songName','artistName','albumName','albumArt','albumArtUrl','genre','mood','tempo','energy','bpm','key','timeSignature','duration','danceability','vocalType','originalArtistGender','genderSuitability','ageAppropriateness','releaseYear','culturalOrigin','language','instruments','themes','style','production','recordingQuality','popularity','valence','acousticness','instrumentalness','liveness','speechiness','songCulturalOrigin','targetAudience','starCompatibility','lookCompatibility','moveCompatibility','worldCompatibility'
      ];
      rootSongFields.forEach((field) => {
        if ((asset as any)[field] !== undefined) {
          delete (asset as any)[field];
        }
      });

      // 🔒 BLOAT PREVENTION: Clean asset data before saving
      const cleanedAssetData = await this.bloatPreventionService.preventBloatOnUpdate((asset._id as any).toString(), asset.toObject());
      Object.assign(asset, cleanedAssetData);
      
      this.logger.log(
        `[UPDATE ASSET] Saving asset to database (version ${asset.version})`,
      );
      const savedAsset = await asset.save();
      this.logger.log(
        `[UPDATE ASSET] Successfully saved asset: ${savedAsset.name} (version ${savedAsset.version})`,
      );

      // 🚨 CRITICAL: Validate final asset structure to ensure no bloat
      this.logger.log(`[UPDATE ASSET] Validating final asset structure...`);
      AssetStructureValidator.validateFinalAssetStructure(savedAsset);

      // 🎯 FIX USER ATTRIBUTION: Create proper version history with actual user
      this.logger.log(
        `[UPDATE ASSET] Creating version history for user: ${updateAssetDto.registeredBy}`,
      );
      try {
        await this.versionHistoryService.createVersionHistory(
          (savedAsset._id as any).toString(),
          savedAsset.version,
          savedAsset.toObject(),
          updateAssetDto.registeredBy || 'system', // ACTUAL user, not "system"
          updateAssetDto,
          `Version ${savedAsset.version} - Asset update`,
        );
        this.logger.log(`[UPDATE ASSET] Version history created successfully`);
      } catch (versionHistoryError: any) {
        this.logger.error(
          `❌ [UPDATE ASSET] Version history creation failed: ${versionHistoryError?.message}`,
          versionHistoryError?.stack,
        );
        // Don't throw here - the asset update succeeded, version history is supplementary
      }

      // Return lean version for consistency with other methods
      const leanAsset = await this.assetModel.findById(savedAsset._id).lean();
      if (!leanAsset) {
        throw new HttpException(
          `Failed to retrieve updated asset: ${savedAsset.name}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return leanAsset;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[UPDATE ASSET] Error updating asset ${name} after ${duration}ms:`,
        {
          error: error.message,
          stack: error.stack,
          name,
          updateDto: updateAssetDto,
        },
      );

      // Handle specific error types
      if (error instanceof HttpException) {
        // Re-throw HTTP exceptions as-is
        throw error;
      }

      if (error.message?.includes('language override field')) {
        // The document in the database has a string value for language
        // We need to convert it first
        this.logger.log(
          `[UPDATE ASSET] Converting language field from string to array`,
        );
        await this.assetModel.updateOne(
          { name: name, 'songMetadata.language': { $type: 'string' } },
          [
            {
              $set: {
                'songMetadata.language': {
                  $cond: {
                    if: { $eq: ['$songMetadata.language', ''] },
                    then: [],
                    else: ['$songMetadata.language'],
                  },
                },
              },
            },
          ],
        );

        // Retry the update
        this.logger.log(
          `[UPDATE ASSET] Retrying update after language field conversion`,
        );
        return this.updateAsset(name, updateAssetDto);
      }

      // Handle database connection errors
      if (
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoTimeoutError'
      ) {
        this.logger.error(
          `[UPDATE ASSET] Database connection error for asset ${name}:`,
          error,
        );
        throw new HttpException(
          'Database connection error. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        this.logger.error(
          `[UPDATE ASSET] Validation error for asset ${name}:`,
          error,
        );
        throw new HttpException(
          `Validation error: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        this.logger.error(
          `[UPDATE ASSET] Duplicate key error for asset ${name}:`,
          error,
        );
        throw new HttpException(
          'Asset with this name already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Generic error handler
      this.logger.error(
        `[UPDATE ASSET] Unexpected error for asset ${name}:`,
        error,
      );
      throw new HttpException(
        'An unexpected error occurred while updating the asset',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAssetByAddress(
    address: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<Asset> {
    const asset = await this.findByAddress(address);
    return this.updateAsset(asset.name, updateAssetDto);
  }

  async deleteAsset(name: string): Promise<void> {
    const asset = await this.findByName(name);
    await this.storageService.deleteFile(asset.gcpStorageUrl);
    await asset.deleteOne();
  }

  async deleteAssetByAddress(address: string): Promise<void> {
    const asset = await this.findByAddress(address);
    await this.storageService.deleteFile(asset.gcpStorageUrl);
    await asset.deleteOne();
  }

  async curateAsset(name: string): Promise<Asset> {
    const asset = await this.findByName(name);
    // For MVP, curation is a simple validation of HFN, NNA, and description
    if (!asset.name || !asset.nna_address || !asset.description) {
      throw new HttpException(
        'Asset missing required fields for curation',
        HttpStatus.BAD_REQUEST,
      );
    }

    // In a full implementation, this would include more sophisticated curation logic
    // such as validation against content guidelines, quality checks, etc.
    return asset;
  }

  /**
   * Get category code for search backward compatibility
   */
  private getCategoryCodeForSearch(
    layer: string,
    categoryInput: string,
  ): string | null {
    try {
      // Try to find by human-readable name first
      const categories = this.taxonomyService.getCategoriesForLayer(layer);
      const category = categories.categories.find(
        (cat) =>
          cat.name.toLowerCase() === categoryInput.toLowerCase() ||
          cat.code.toLowerCase() === categoryInput.toLowerCase(),
      );

      if (category) {
        return category.code;
      }

      // If not found by name, try to get the category code using the taxonomy service
      // We need to provide a dummy subcategory since the method expects both parameters
      const [categoryCode] = this.taxonomyService.getNnaCodesByCode(
        layer,
        categoryInput,
        'DUMMY', // Dummy subcategory for the method call
      );

      return categoryCode || null;
    } catch (error) {
      console.warn(
        `Failed to get category code for ${layer}.${categoryInput}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Get subcategory code for search backward compatibility
   */
  private getSubcategoryCodeForSearch(
    layer: string,
    categoryInput: string,
    subcategoryInput: string,
  ): string | null {
    try {
      // Special handling for Composite layer (C) subcategories
      if (layer === 'C') {
        const compositeSubcategoryMapping: Record<string, string> = {
          Two_Layer_S_L: '2LY',
          Three_Layer_S_L_M: '3LY',
          Four_Layer_S_L_M_G: '4LY',
          Five_Layer_S_L_M_G_W: '5LY',
          Six_Layer_S_L_M_G_W_B: '6LY',
          // Add reverse mapping for code to name
          '2LY': 'Two_Layer_S_L',
          '3LY': 'Three_Layer_S_L_M',
          '4LY': 'Four_Layer_S_L_M_G',
          '5LY': 'Five_Layer_S_L_M_G_W',
          '6LY': 'Six_Layer_S_L_M_G_W_B',
        };

        // Check if we have a direct mapping
        const mappedCode = compositeSubcategoryMapping[subcategoryInput];
        if (mappedCode) {
          console.log(
            `[COMPOSITE MAPPING] "${subcategoryInput}" -> "${mappedCode}"`,
          );
          return mappedCode;
        }
      }

      // Try to find by human-readable name first
      const subcategories = this.taxonomyService.getSubcategoriesForCategory(
        layer,
        categoryInput,
      );
      const subcategory = subcategories.subcategories.find(
        (subcat) =>
          subcat.name.toLowerCase() === subcategoryInput.toLowerCase() ||
          subcat.code.toLowerCase() === subcategoryInput.toLowerCase(),
      );

      if (subcategory) {
        return subcategory.code;
      }

      // If not found by name, try to get the subcategory code using the taxonomy service
      const [, subcategoryCode] = this.taxonomyService.getNnaCodesByCode(
        layer,
        categoryInput,
        subcategoryInput,
      );

      return subcategoryCode || null;
    } catch (error) {
      console.warn(
        `Failed to get subcategory code for ${layer}.${categoryInput}.${subcategoryInput}:`,
        error.message,
      );
      return null;
    }
  }

  // 🌟 NEW: Enhanced Variant Management Methods

  /**
   * Build asset type filter for universal layer support
   * Supports base/variant relationships across ALL layers (G, S, L, M, W)
   */
  private buildAssetTypeFilter(assetType: string, layer?: string): any {
    const layerLower = (layer || 'G').toLowerCase();
    
    // Map layer to appropriate asset type field names
    const assetTypeFields = {
      'g': ['aiMetadata.layerMetadata.assetType', 'songMetadata.assetType', 'aiMetadata.songMetadata.assetType'],
      's': ['aiMetadata.starsMetadata.assetType', 'starMetadata.assetType', 'aiMetadata.layerMetadata.assetType'],
      'l': ['aiMetadata.looksMetadata.assetType', 'lookMetadata.assetType', 'aiMetadata.layerMetadata.assetType'],
      'm': ['aiMetadata.movesMetadata.assetType', 'moveMetadata.assetType', 'aiMetadata.layerMetadata.assetType'],
      'w': ['aiMetadata.worldsMetadata.assetType', 'worldMetadata.assetType', 'aiMetadata.layerMetadata.assetType'],
    };

    const fields = assetTypeFields[layerLower] || assetTypeFields['g']; // Default to Songs layer
    
    // Build OR filter for all possible field locations
    const orConditions = fields.map(field => ({ [field]: assetType }));
    
    this.logger.log(`[ASSET TYPE FILTER] Searching for asset type "${assetType}" in layer "${layer}" using fields:`, fields);
    
    return { $or: orConditions };
  }

  /**
   * Build base ID filter for universal layer support
   * Supports base/variant relationships across ALL layers (G, S, L, M, W)
   */
  private buildBaseIdFilter(baseId: string, layer: string): any {
    const layerLower = layer.toLowerCase();
    
    // Map layer to appropriate base ID field names
    const baseIdFields = {
      'g': ['baseSongId', 'songMetadata.baseSongId', 'aiMetadata.songMetadata.baseSongId'],
      's': ['baseStarId', 'starMetadata.baseStarId', 'aiMetadata.starsMetadata.baseStarId'],
      'l': ['baseLookId', 'lookMetadata.baseLookId', 'aiMetadata.looksMetadata.baseLookId'],
      'm': ['baseMoveId', 'moveMetadata.baseMoveId', 'aiMetadata.movesMetadata.baseMoveId'],
      'w': ['baseWorldId', 'worldMetadata.baseWorldId', 'aiMetadata.worldsMetadata.baseWorldId'],
    };

    const fields = baseIdFields[layerLower] || [];
    
    if (fields.length === 0) {
      this.logger.warn(`[BASE ID FILTER] Unsupported layer: ${layer}`);
      return { _id: null }; // Return impossible filter
    }

    // Build OR filter for all possible field locations
    const orConditions = fields.map(field => ({ [field]: baseId }));
    
    this.logger.log(`[BASE ID FILTER] Searching for base ID "${baseId}" in layer "${layer}" using fields:`, fields);
    
    return { $or: orConditions };
  }

  /**
   * Add variant information to asset response
   */
  async addVariantInfo(asset: any): Promise<any> {
    // Handle both old variantType and new assetType for backward compatibility
    const assetType =
      asset.aiMetadata?.starsMetadata?.assetType ||
      asset.aiMetadata?.starsMetadata?.variantType;

    if (!assetType) {
      return asset;
    }

    const { baseStarId } = asset.aiMetadata.starsMetadata;

    const variantInfo: any = {
      isVariant: assetType === 'variant',
      assetType,
      baseStarId,
    };

    if (assetType === 'base') {
      // Get variant count for base assets
      const variants = await this.findStarVariants(asset.name);
      variantInfo.variantCount = variants.length;
      variantInfo.variants = variants.map((v) => v.name);
    } else if (assetType === 'variant' && baseStarId) {
      // Get base asset details for variants
      // Check if baseStarId is a MongoDB ObjectId or a name
      let baseAsset: Asset;
      if (baseStarId.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a MongoDB ObjectId, use findById
        baseAsset = await this.findById(baseStarId);
      } else {
        // It's a name, use findByName
        baseAsset = await this.findByName(baseStarId);
      }

      if (baseAsset) {
        variantInfo.baseAssetDetails = {
          name: baseAsset.name,
          starName: baseAsset.aiMetadata?.starsMetadata?.starName,
          celebrityName: baseAsset.aiMetadata?.starsMetadata?.celebrityName,
        };
      }
    }

    return { ...asset, variantInfo };
  }

  /**
   * Find all variants of a base star
   */
  async findStarVariants(baseStarId: string): Promise<Asset[]> {
    return await this.assetModel
      .find({
        layer: 'S',
        $or: [
          { 'aiMetadata.starsMetadata.assetType': 'variant' },
          { 'aiMetadata.starsMetadata.variantType': 'variant' },
        ],
        'aiMetadata.starsMetadata.baseStarId': baseStarId,
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Find all base characters for Stars layer
   */
  async findBaseCharacters(query: any = {}): Promise<Asset[]> {
    const filter: any = {
      layer: 'S',
      $or: [
        { 'aiMetadata.starsMetadata.assetType': 'base' },
        { 'aiMetadata.starsMetadata.variantType': 'base' },
      ],
    };

    // Add search filters if provided
    if (query.search) {
      filter.$or = [
        {
          'aiMetadata.starsMetadata.starName': {
            $regex: query.search,
            $options: 'i',
          },
        },
        {
          'aiMetadata.starsMetadata.celebrityName': {
            $regex: query.search,
            $options: 'i',
          },
        },
        { name: { $regex: query.search, $options: 'i' } },
      ];
    }

    return await this.assetModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit || 50);
  }

  /**
   * Find recently created stars for Browse functionality
   */
  async findRecentStars(limit: number = 10): Promise<Asset[]> {
    return await this.assetModel
      .find({
        layer: 'S',
        $or: [
          { 'aiMetadata.starsMetadata.assetType': 'base' },
          { 'aiMetadata.starsMetadata.variantType': 'base' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'name aiMetadata createdAt',
      );
  }

  /**
   * Validate if a star ID can be used as a base star
   */
  async validateBaseStar(starId: string): Promise<any> {
    const star = await this.findByName(starId);

    if (!star) {
      return {
        isValid: false,
        error: 'Star not found',
      };
    }

    if (star.layer !== 'S') {
      return {
        isValid: false,
        error: 'Asset is not a Star layer asset',
      };
    }

    // Handle both old variantType and new assetType for backward compatibility
    const variantTypeLegacy: string | undefined = (
      star.aiMetadata?.starsMetadata as any
    )?.variantType;

    if (variantTypeLegacy !== 'base') {
      return {
        isValid: false,
        error: 'Asset is not a base character',
      };
    }

    return {
      isValid: true,
      star: {
        name: star.name,
        starName: star.aiMetadata?.starsMetadata?.starName,
        celebrityName: star.aiMetadata?.starsMetadata?.celebrityName,
      },
    };
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Clean asset data for API response
   * Removes debug data, unnecessary fields, and reduces document size
   */
  private cleanAssetForResponse(asset: any): any {
    if (!asset) return asset;

    const cleaned = { ...asset };
    
    // DEBUG: Log what we're cleaning
    console.log(`[CLEAN ASSET] Cleaning asset: ${asset.name}`);
    console.log(`[CLEAN ASSET] Original aiMetadata keys:`, asset.aiMetadata ? Object.keys(asset.aiMetadata) : 'No aiMetadata');
    console.log(`[CLEAN ASSET] Original aiMetadata.layerMetadata:`, asset.aiMetadata?.layerMetadata ? 'EXISTS' : 'MISSING');
    
    // TEMPORARY FIX: Preserve aiMetadata completely for Reviz developers
    // TODO: Implement proper cleaning that preserves essential metadata
    if (asset.aiMetadata && Object.keys(asset.aiMetadata).length > 0) {
      cleaned.aiMetadata = JSON.parse(JSON.stringify(asset.aiMetadata)); // Deep copy
      console.log(`[CLEAN ASSET] Preserved aiMetadata with keys:`, Object.keys(cleaned.aiMetadata));
    } else {
      console.log(`[CLEAN ASSET] No aiMetadata to preserve for asset: ${asset.name}`);
    }

    // Remove debug fields that bloat the response
    if (cleaned.aiMetadata?.starsMetadata?._debug) {
      delete cleaned.aiMetadata.starsMetadata._debug;
    }
    if (cleaned.aiMetadata?.looksMetadata?._debug) {
      delete cleaned.aiMetadata.looksMetadata._debug;
    }
    if (cleaned.aiMetadata?.movesMetadata?._debug) {
      delete cleaned.aiMetadata.movesMetadata._debug;
    }
    if (cleaned.aiMetadata?.worldsMetadata?._debug) {
      delete cleaned.aiMetadata.worldsMetadata._debug;
    }
    if (cleaned.aiMetadata?.songsMetadata?._debug) {
      delete cleaned.aiMetadata.songsMetadata._debug;
    }

    // CRITICAL FIX: Remove debug from layerMetadata and starMetadata
    if (cleaned.layerMetadata?._debug) {
      delete cleaned.layerMetadata._debug;
    }
    if (cleaned.starMetadata?._debug) {
      delete cleaned.starMetadata._debug;
    }

    // CRITICAL FIX: Remove _debug from nested layerMetadata inside aiMetadata
    if (cleaned.aiMetadata?.starsMetadata?.layerMetadata?._debug) {
      delete cleaned.aiMetadata.starsMetadata.layerMetadata._debug;
    }
    if (cleaned.aiMetadata?.looksMetadata?.layerMetadata?._debug) {
      delete cleaned.aiMetadata.looksMetadata.layerMetadata._debug;
    }
    if (cleaned.aiMetadata?.movesMetadata?.layerMetadata?._debug) {
      delete cleaned.aiMetadata.movesMetadata.layerMetadata._debug;
    }
    if (cleaned.aiMetadata?.worldsMetadata?.layerMetadata?._debug) {
      delete cleaned.aiMetadata.worldsMetadata.layerMetadata._debug;
    }
    if (cleaned.aiMetadata?.songsMetadata?.layerMetadata?._debug) {
      delete cleaned.aiMetadata.songsMetadata.layerMetadata._debug;
    }

    // CRITICAL FIX: Remove baseAssetData bloat (should be computed on-demand)
    if (cleaned.baseAssetData) {
      delete cleaned.baseAssetData;
    }
    if (cleaned.aiMetadata?.starsMetadata?.baseAssetData) {
      delete cleaned.aiMetadata.starsMetadata.baseAssetData;
    }
    if (cleaned.starMetadata?.baseAssetData) {
      delete cleaned.starMetadata.baseAssetData;
    }

    // Remove unnecessary fields that aren't used by frontend
    const fieldsToRemove = [
      '__v',
      '_normalized',
      'baseAssetData',
      'variantDescription',
      'processingMethod',
      'confidence',
      'fallbackUsed',
      'processingTimeMs',
      'approach',
      'aiEnhanced',
      'explicitValues',
      'vocabularyVersion',
    ];

    fieldsToRemove.forEach((field) => {
      if (cleaned[field] !== undefined) {
        delete cleaned[field];
      }
    });

    // Clean nested metadata objects
    if (cleaned.aiMetadata?.starsMetadata) {
      const starMeta = cleaned.aiMetadata.starsMetadata;
      fieldsToRemove.forEach((field) => {
        if (starMeta[field] !== undefined) {
          delete starMeta[field];
        }
      });
    }

    // CRITICAL FIX: Clean layerMetadata inside aiMetadata (for songs layer)
    if (cleaned.aiMetadata?.layerMetadata) {
      const layerMeta = cleaned.aiMetadata.layerMetadata;
      fieldsToRemove.forEach((field) => {
        if (layerMeta[field] !== undefined) {
          delete layerMeta[field];
        }
      });
    }

    // DEBUG: Log what we're returning
    console.log(`[CLEAN ASSET] Final aiMetadata keys:`, cleaned.aiMetadata ? Object.keys(cleaned.aiMetadata) : 'No aiMetadata');
    console.log(`[CLEAN ASSET] Final aiMetadata.layerMetadata:`, cleaned.aiMetadata?.layerMetadata ? 'EXISTS' : 'MISSING');
    
    return cleaned;
  }

  /**
   * Normalize star metadata structure to ensure consistency
   */
  private normalizeStarMetadata(starMetadata: any): any {
    if (!starMetadata) return starMetadata;

    // CRITICAL FIX: Check if already normalized to prevent double processing
    if (starMetadata._normalized) {
      return starMetadata;
    }

    // Ensure consistent structure for simple string fields
    const normalized = { ...starMetadata };

    // Ensure hairStyle is a string (not an object)
    if (normalized.hairStyle && typeof normalized.hairStyle === 'object') {
      // If it's an object, extract the style value or use a default
      normalized.hairStyle =
        normalized.hairStyle.style || normalized.hairStyle.type || 'straight';
    }

    // Ensure makeupType is a string (renamed from makeupStyle)
    if (normalized.makeupType && typeof normalized.makeupType === 'object') {
      normalized.makeupType =
        normalized.makeupType.type || normalized.makeupType.style || 'natural';
    }

    // Ensure other fields are strings
    if (normalized.hairColor && typeof normalized.hairColor === 'object') {
      normalized.hairColor =
        normalized.hairColor.color || normalized.hairColor.value || 'Unknown';
    }
    // Keep string values as-is (don't override with defaults)

    if (normalized.hairLength && typeof normalized.hairLength === 'object') {
      normalized.hairLength = normalized.hairLength.length || 'medium';
    }

    if (
      normalized.colorPalette &&
      typeof normalized.colorPalette === 'object'
    ) {
      normalized.colorPalette =
        normalized.colorPalette.colors?.[0] || 'neutral';
    }

    // Capitalize dropdown fields for frontend consistency
    // Based on frontend team note: docs/backend/BACKEND_TEAM_NOTE_DROPDOWN_VALUES.md
    if (normalized.hairLength && typeof normalized.hairLength === 'string') {
      normalized.hairLength = this.capitalizeFirst(normalized.hairLength);
    }

    if (normalized.hairStyle && typeof normalized.hairStyle === 'string') {
      normalized.hairStyle = this.capitalizeFirst(normalized.hairStyle);
    }

    if (normalized.energy && typeof normalized.energy === 'string') {
      normalized.energy = this.capitalizeFirst(normalized.energy);
    }

    if (normalized.gender && typeof normalized.gender === 'string') {
      normalized.gender = this.capitalizeFirst(normalized.gender);
    }

    // Mark as normalized to prevent double processing
    normalized._normalized = true;

    return normalized;
  }

  /**
   * Normalize song metadata for consistent structure
   */
  private normalizeSongMetadata(songMetadata: any): any {
    if (!songMetadata) return songMetadata;

    // Ensure consistent structure for simple string fields
    const normalized = { ...songMetadata };

    // Ensure ageAppropriateness is an array
    if (
      normalized.ageAppropriateness &&
      !Array.isArray(normalized.ageAppropriateness)
    ) {
      normalized.ageAppropriateness = [normalized.ageAppropriateness];
    }

    // Ensure genre is an array
    if (normalized.genre && !Array.isArray(normalized.genre)) {
      normalized.genre = [normalized.genre];
    }

    // Ensure mood is an array
    if (normalized.mood && !Array.isArray(normalized.mood)) {
      normalized.mood = [normalized.mood];
    }

    // Ensure songCulturalOrigin is an array
    if (
      normalized.songCulturalOrigin &&
      !Array.isArray(normalized.songCulturalOrigin)
    ) {
      normalized.songCulturalOrigin = [normalized.songCulturalOrigin];
    }

    // Ensure language is an array and set default to English if empty
    if (normalized.language) {
      if (Array.isArray(normalized.language)) {
        // Convert array to string (take first element)
        normalized.language = normalized.language[0] || 'English';
      }
      // Ensure it's not empty
      if (!normalized.language || normalized.language.trim() === '') {
        normalized.language = 'English';
      }
    } else {
      // Set default language to English if not provided
      normalized.language = 'English';
    }

    // Ensure string fields are properly formatted
    if (normalized.vocalType && typeof normalized.vocalType === 'string') {
      normalized.vocalType = this.capitalizeFirst(normalized.vocalType);
    }

    // Normalize energy field from numeric to descriptive
    if (normalized.energy) {
      if (
        typeof normalized.energy === 'number' ||
        normalized.energy === '1' ||
        normalized.energy === '2' ||
        normalized.energy === '3'
      ) {
        const energyValue = String(normalized.energy);
        const energyMap: Record<string, string> = {
          '1': 'Low',
          '2': 'Medium',
          '3': 'High',
        };
        normalized.energy = energyMap[energyValue] || 'Medium';
      }
    }

    // Normalize danceability field from numeric to descriptive
    if (normalized.danceability) {
      if (
        typeof normalized.danceability === 'number' ||
        normalized.danceability === '1' ||
        normalized.danceability === '2' ||
        normalized.danceability === '3'
      ) {
        const danceabilityValue = String(normalized.danceability);
        const danceabilityMap: Record<string, string> = {
          '1': 'Low',
          '2': 'Medium',
          '3': 'High',
        };
        normalized.danceability =
          danceabilityMap[danceabilityValue] || 'Medium';
      }
    }

    if (
      normalized.originalArtistGender &&
      typeof normalized.originalArtistGender === 'string'
    ) {
      normalized.originalArtistGender = this.capitalizeFirst(
        normalized.originalArtistGender,
      );
    }

    if (
      normalized.genderSuitability &&
      typeof normalized.genderSuitability === 'string'
    ) {
      normalized.genderSuitability = this.capitalizeFirst(
        normalized.genderSuitability,
      );
    }

    return normalized;
  }

  /**
   * Normalize existing database documents to handle string language fields
   * This handles the migration from string to array format for language fields
   */
  private normalizeExistingAsset(asset: Asset): void {
    if (!asset) return;

    // Normalize aiMetadata.songMetadata.language - ensure it's a string
    if (
      asset.aiMetadata?.songMetadata?.language &&
      Array.isArray(asset.aiMetadata.songMetadata.language)
    ) {
      asset.aiMetadata.songMetadata.language =
        asset.aiMetadata.songMetadata.language[0] || 'English';
    } else if (
      asset.aiMetadata?.songMetadata &&
      !asset.aiMetadata.songMetadata.language
    ) {
      asset.aiMetadata.songMetadata.language = 'English';
    }

    // Normalize aiMetadata.songMetadata.layerMetadata.language - ensure it's a string
    if (
      asset.aiMetadata?.songMetadata?.layerMetadata?.language &&
      Array.isArray(asset.aiMetadata.songMetadata.layerMetadata.language)
    ) {
      asset.aiMetadata.songMetadata.layerMetadata.language =
        asset.aiMetadata.songMetadata.layerMetadata.language[0] || 'English';
    } else if (
      asset.aiMetadata?.songMetadata?.layerMetadata &&
      !asset.aiMetadata.songMetadata.layerMetadata.language
    ) {
      asset.aiMetadata.songMetadata.layerMetadata.language = 'English';
    }

    // Normalize songMetadata.language - ensure it's a string
    if (
      asset.songMetadata?.language &&
      Array.isArray(asset.songMetadata.language)
    ) {
      asset.songMetadata.language = asset.songMetadata.language[0] || 'English';
    } else if (asset.songMetadata && !asset.songMetadata.language) {
      asset.songMetadata.language = 'English';
    }

    // Normalize layerMetadata.language - ensure it's a string
    if (
      asset.layerMetadata?.language &&
      Array.isArray((asset.layerMetadata as any).language)
    ) {
      (asset.layerMetadata as any).language =
        (asset.layerMetadata as any).language[0] || 'English';
    } else if (asset.layerMetadata && !asset.layerMetadata.language) {
      (asset.layerMetadata as any).language = 'English';
    }
  }

  /**
   * Helper function to capitalize first letter of a string
   */
  private capitalizeFirst(str: string): string {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Get base stars for variant creation
   */
  async getBaseStars(
    layer: string = 'S',
    limit: number = 50,
  ): Promise<Asset[]> {
    try {
      // 🚀 OPTIMIZED: Use MongoDB query with lean queries for better performance
      const startTime = Date.now();
      const baseStars = await this.assetModel
        .find({
          layer,
          $or: [
            { 'aiMetadata.starsMetadata.assetType': 'base' },
            { 'starMetadata.assetType': 'base' },
            { 'aiMetadata.starsMetadata.variantType': 'base' }, // Legacy support
            { 'starMetadata.variantType': 'base' }, // Legacy support
          ],
        })
        .lean() // Use lean queries for better performance
        .select(
          'name nna_address aiMetadata gcpStorageUrl createdAt',
        )
        .sort({ createdAt: -1 })
        .limit(limit);

      const duration = Date.now() - startTime;
      MongoDBMonitor.logQueryPerformance(
        'getBaseStars',
        duration,
        { layer, limit },
        baseStars.length,
      );

      console.log(
        `[SERVICE] 🚀 Found ${baseStars.length} base stars for layer ${layer} with optimized MongoDB query`,
      );
      return baseStars;
    } catch (error) {
      console.error('[SERVICE] Error fetching base stars:', error);
      // Fallback to original approach if optimized query fails
      console.log(
        '[SERVICE] Falling back to original in-memory filtering approach...',
      );
      try {
        const allAssets = await this.assetModel
          .find({ layer })
          .lean() // Use lean queries for better performance
          .select(
            'name nna_address aiMetadata starMetadata gcpStorageUrl createdAt',
          )
          .sort({ createdAt: -1 })
          .limit(limit * 2);

        const baseStars = allAssets
          .filter((asset) => {
            const starMetadata =
              asset.starMetadata || asset.aiMetadata?.starsMetadata;
            if (!starMetadata) return false;
            return (
              starMetadata.assetType === 'base' ||
              (starMetadata as any).variantType === 'base'
            );
          })
          .slice(0, limit);

        console.log(
          `[SERVICE] Fallback: Found ${baseStars.length} base stars (from ${allAssets.length} total assets)`,
        );
        return baseStars;
      } catch (fallbackError) {
        console.error('[SERVICE] Fallback query also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Fix baseStarId fields from MFA to HFN format
   */
  async fixBaseStarIdsMfaToHfn(): Promise<any> {
    console.log('[SERVICE] Starting Base Star ID MFA to HFN migration...');

    // Find all variant assets with MFA in baseStarId
    const variantAssets = await this.assetModel.find({
      layer: 'S',
      'aiMetadata.starsMetadata.baseStarId': {
        $exists: true,
        $ne: null,
        $regex: /^\d+\.\d+\.\d+\.\d+$/, // MFA format
      },
    });

    console.log(
      `[SERVICE] Found ${variantAssets.length} variant assets with MFA in baseStarId`,
    );

    if (variantAssets.length === 0) {
      return {
        fixedCount: 0,
        errorCount: 0,
        message:
          'No assets need migration - all baseStarId fields are already in HFN format',
      };
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const variant of variantAssets) {
      try {
        const mfaBaseStarId = variant.aiMetadata?.starsMetadata?.baseStarId;
        if (!mfaBaseStarId) {
          console.warn(
            `[SERVICE] No baseStarId found for variant: ${variant.name}`,
          );
          errorCount++;
          continue;
        }
        console.log(
          `[SERVICE] Processing variant: ${variant.name} -> baseStarId: ${mfaBaseStarId}`,
        );

        // Find the base star by MFA
        const baseStar = await this.assetModel
          .findOne({
            nna_address: mfaBaseStarId,
          })
          .lean();

        if (!baseStar) {
          console.warn(
            `[SERVICE] Base star not found for MFA: ${mfaBaseStarId}`,
          );
          errorCount++;
          continue;
        }

        const hfnBaseStarId = baseStar.name;
        console.log(
          `[SERVICE] Found base star: ${hfnBaseStarId} (MFA: ${mfaBaseStarId})`,
        );

        // Update the variant with HFN
        const updateResult = await this.assetModel.updateOne(
          { _id: variant._id },
          {
            $set: {
              'aiMetadata.starsMetadata.baseStarId': hfnBaseStarId,
            },
          },
        );

        if (updateResult.modifiedCount > 0) {
          console.log(
            `[SERVICE] Updated ${variant.name}: ${mfaBaseStarId} -> ${hfnBaseStarId}`,
          );
          fixedCount++;
        } else {
          console.warn(`[SERVICE] No update made for ${variant.name}`);
          errorCount++;
        }
      } catch (error) {
        console.error(
          `[SERVICE] Error processing ${variant.name}:`,
          error.message,
        );
        errorCount++;
      }
    }

    // Validation
    const remainingMfaAssets = await this.assetModel.countDocuments({
      layer: 'S',
      'aiMetadata.starsMetadata.baseStarId': {
        $exists: true,
        $ne: null,
        $regex: /^\d+\.\d+\.\d+\.\d+$/, // MFA format
      },
    });

    const hfnAssets = await this.assetModel.countDocuments({
      layer: 'S',
      'aiMetadata.starsMetadata.baseStarId': {
        $exists: true,
        $ne: null,
        $regex: /^[A-Z]\.[A-Z]{3}\.[A-Z]{3}\.\d{3}$/, // HFN format
      },
    });

    console.log('[SERVICE] Migration Results:');
    console.log(`[SERVICE] - Assets fixed: ${fixedCount}`);
    console.log(`[SERVICE] - Errors encountered: ${errorCount}`);
    console.log(`[SERVICE] - Remaining MFA format: ${remainingMfaAssets}`);
    console.log(`[SERVICE] - HFN format: ${hfnAssets}`);

    return {
      fixedCount,
      errorCount,
      remainingMfaAssets,
      hfnAssets,
      message: `Migration completed: ${fixedCount} assets fixed, ${errorCount} errors`,
    };
  }

  // Asset Version Management Methods

  /**
   * Get version history for an asset
   */
  async getAssetVersionHistory(
    assetIdentifier: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: AssetVersion[]; total: number; page: number; pages: number }> {
    // Handle both asset name (HFN) and MongoDB ID
    let assetId: string;
    
    // Check if it's a MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(assetIdentifier);
    
    if (isValidObjectId) {
      // It's a MongoDB ID, use it directly
      assetId = assetIdentifier;
    } else {
      // It's an asset name (HFN), find the asset first
      const asset = await this.findByName(assetIdentifier);
      if (!asset) {
        throw new NotFoundException(`Asset not found: ${assetIdentifier}`);
      }
      assetId = (asset._id as any).toString();
    }
    
    return this.assetVersionHistoryService.getAssetVersionHistory(
      assetId,
      page,
      limit,
    );
  }

  /**
   * Get a specific version of an asset
   */
  async getAssetVersion(assetIdentifier: string, version: number): Promise<AssetVersion | null> {
    // Handle both asset name (HFN) and MongoDB ID
    let assetId: string;
    
    // Check if it's a MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(assetIdentifier);
    
    if (isValidObjectId) {
      // It's a MongoDB ID, use it directly
      assetId = assetIdentifier;
    } else {
      // It's an asset name (HFN), find the asset first
      const asset = await this.findByName(assetIdentifier);
      if (!asset) {
        throw new NotFoundException(`Asset not found: ${assetIdentifier}`);
      }
      assetId = (asset._id as any).toString();
    }
    
    return this.assetVersionHistoryService.getAssetVersion(assetId, version);
  }

  /**
   * Get the latest version of an asset
   */
  async getLatestAssetVersion(name: string): Promise<Asset | null> {
    return this.assetVersionHistoryService.getLatestVersion(name);
  }

  /**
   * Rollback an asset to a previous version
   */
  async rollbackAsset(
    name: string,
    targetVersion: number,
    rollbackBy?: string,
    rollbackNotes?: string,
  ): Promise<Asset> {
    return this.assetVersionHistoryService.rollbackToVersion(
      name,
      targetVersion,
      rollbackBy,
      rollbackNotes,
    );
  }

  /**
   * Clean up old versions of an asset
   */
  async cleanupAssetVersions(
    name: string,
    keepVersions: number = 10,
  ): Promise<void> {
    return this.assetVersionHistoryService.cleanupOldVersions(
      name,
      keepVersions,
    );
  }

  /**
   * 🎯 ALGORHYTHM FIX: Extract array field from metadata, handling both string and array formats
   */
  private extractArrayField(metadata: any, fieldName: string): string[] {
    const value = metadata[fieldName];
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
    
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()];
    }
    
    return [];
  }

  /**
   * Get assets for health check (optimized for storage resilience monitoring)
   */
  async getAssetsForHealthCheck(limit: number = 100): Promise<any[]> {
    try {
      const assets = await this.assetModel
        .find({ gcpStorageUrl: { $exists: true, $ne: null } })
        .select('_id name gcpStorageUrl layer category subcategory createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      this.logger.log(`Retrieved ${assets.length} assets for storage health check`);
      return assets;
    } catch (error) {
      this.logger.error('Failed to get assets for health check:', error);
      return [];
    }
  }
}
