import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReVizCompositeVariationDto {
  @ApiProperty({ 
    description: 'The specific composite ID to get variations for',
    example: 'C.FUL.ALL.001'
  })
  @IsString()
  composite_id: string;

  @ApiProperty({ 
    description: 'Layer to get variations for',
    enum: ['stars', 'looks', 'moves', 'worlds'],
    example: 'stars'
  })
  @IsEnum(['stars', 'looks', 'moves', 'worlds'])
  vary_layer: 'stars' | 'looks' | 'moves' | 'worlds';

  @ApiProperty({ 
    description: 'Maximum number of variations to return',
    minimum: 1,
    maximum: 20,
    default: 8,
    example: 8
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 8;

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

export class ReVizCompositeVariationResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: {
    composite_info: CompositeInfo;
    current_layer_asset: CurrentLayerAsset;
    variations: LayerVariation[];
    total_available: number;
    performance_metrics: {
      response_time_ms: number;
      variations_evaluated: number;
      cache_hit: boolean;
    };
  };

  @ApiProperty({ description: 'Response metadata' })
  metadata: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}
