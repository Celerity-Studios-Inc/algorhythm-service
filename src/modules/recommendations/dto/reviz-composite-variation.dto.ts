import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReVizCompositeVariationDto {
  @ApiProperty({ 
    description: 'The specific composite ID to get variations for',
    example: '68ea2a3b5528304385303b8b'
  })
  @IsString()
  composite_id: string;

  @ApiProperty({ 
    description: 'Array of layers to get variations for',
    enum: ['stars', 'looks', 'moves', 'worlds'],
    isArray: true,
    example: ['stars', 'looks', 'moves', 'worlds']
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsEnum(['stars', 'looks', 'moves', 'worlds'], { each: true })
  vary_layers: ('stars' | 'looks' | 'moves' | 'worlds')[];

  @ApiProperty({ 
    description: 'Number of assets per layer to return',
    minimum: 1,
    maximum: 20,
    default: 5,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  assets_per_layer?: number = 5;

  @ApiProperty({ 
    description: 'Number of variants per asset to return',
    minimum: 1,
    maximum: 10,
    default: 3,
    example: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  variants_per_asset?: number = 3;

  @ApiProperty({ 
    description: 'User context for personalized results',
    required: false
  })
  @IsOptional()
  @IsObject()
  user_context?: {
    user_id?: string;
    device_type?: string;
    preferences?: {
      energy_preference?: string;
      style_preference?: string;
    };
  };

  @ApiProperty({ 
    description: 'Include detailed scoring information',
    default: false,
    example: false
  })
  @IsOptional()
  include_scoring_details?: boolean = false;
}

export class CompositeInfo {
  @ApiProperty({ description: 'Composite ID' })
  composite_id: string;

  @ApiProperty({ description: 'Composite name' })
  composite_name: string;

  @ApiProperty({ description: 'GCP storage URL for the composite video' })
  gcp_storage_url: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  thumbnail_url: string;

  @ApiProperty({ description: 'Duration in seconds' })
  duration_seconds: number;

  @ApiProperty({ description: 'File size in MB' })
  file_size_mb: number;

  @ApiProperty({ description: 'Resolution' })
  resolution: string;

  @ApiProperty({ description: 'Format' })
  format: string;
}

export class CurrentLayerAsset {
  @ApiProperty({ description: 'Current asset ID' })
  asset_id: string;

  @ApiProperty({ description: 'Current asset name' })
  asset_name: string;

  @ApiProperty({ description: 'NNA address' })
  nna_address: string;

  @ApiProperty({ description: 'GCP storage URL' })
  gcp_storage_url: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  thumbnail_url: string;

  @ApiProperty({ description: 'Layer type' })
  layer: string;

  @ApiProperty({ description: 'Asset metadata' })
  metadata: {
    tags: string[];
    aiGeneratedDescription?: string;
    media?: {
      duration_seconds?: number;
      file_size_mb?: number;
      resolution?: string;
      format?: string;
    };
  };
}

export class LayerVariation {
  @ApiProperty({ description: 'Variation asset ID' })
  asset_id: string;

  @ApiProperty({ description: 'Variation asset name' })
  asset_name: string;

  @ApiProperty({ description: 'NNA address' })
  nna_address: string;

  @ApiProperty({ description: 'Compatibility score' })
  compatibility_score: number;

  @ApiProperty({ description: 'GCP storage URL' })
  gcp_storage_url: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  thumbnail_url: string;

  @ApiProperty({ description: 'Layer type' })
  layer: string;

  @ApiProperty({ description: 'Asset metadata' })
  metadata: {
    tags: string[];
    aiGeneratedDescription?: string;
    media?: {
      duration_seconds?: number;
      file_size_mb?: number;
      resolution?: string;
      format?: string;
    };
  };

  @ApiProperty({ description: 'Scoring details (if requested)' })
  scoring_details?: {
    composite_compatibility: number;
    layer_compatibility: number;
    user_preference_score: number;
    overall_score: number;
  };
}

export class LayerAssets {
  @ApiProperty({ description: 'Layer name' })
  layer: string;

  @ApiProperty({ description: 'Current asset in this layer' })
  current_asset: CurrentLayerAsset;

  @ApiProperty({ description: 'Available assets for this layer' })
  assets: LayerVariation[];

  @ApiProperty({ description: 'Total assets available for this layer' })
  total_available: number;
}

export class ReVizCompositeVariationResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: {
    composite_info: CompositeInfo;
    layers: LayerAssets[];
    total_assets: number;
    performance_metrics: {
      response_time_ms: number;
      assets_evaluated: number;
      cache_hit: boolean;
    };
    generation_status?: 'generating'; // Optional: Present when composite is being generated
    message?: string; // Optional: Message for generating status
    estimated_completion_seconds?: number; // Optional: Estimated completion time for generation
    warnings?: { layer: string; reason: string }[]; // Optional: warnings per layer
  };

  @ApiProperty({ description: 'Response metadata' })
  metadata: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}
