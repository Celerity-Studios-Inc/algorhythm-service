import { IsString, IsObject, IsOptional, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssetCreatedEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.created';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Asset layer' })
  @IsString()
  layer: string;

  @ApiProperty({ description: 'Asset category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Asset subcategory' })
  @IsString()
  subcategory: string;

  @ApiProperty({ description: 'Asset name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'GCP Storage URL' })
  @IsString()
  gcpStorageUrl: string;

  @ApiProperty({ description: 'Asset metadata' })
  @IsObject()
  metadata: {
    aiMetadata?: any;
    songMetadata?: any;
    starMetadata?: any;
    tags?: string[];
    description?: string;
  };

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class AssetUpdatedEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.updated';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Asset layer' })
  @IsString()
  layer: string;

  @ApiProperty({ description: 'Asset category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Asset subcategory' })
  @IsString()
  subcategory: string;

  @ApiProperty({ description: 'Asset name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'GCP Storage URL' })
  @IsString()
  gcpStorageUrl: string;

  @ApiProperty({ description: 'Asset metadata' })
  @IsObject()
  metadata: {
    aiMetadata?: any;
    songMetadata?: any;
    starMetadata?: any;
    tags?: string[];
    description?: string;
  };

  @ApiProperty({ description: 'Changes made to asset' })
  @IsObject()
  changes: {
    name?: boolean;
    gcpStorageUrl?: boolean;
    tags?: boolean;
    metadata?: boolean;
  };

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class AssetDeletedEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'asset.deleted';

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class CompositeCreatedEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: 'composite.created';

  @ApiProperty({ description: 'Composite ID' })
  @IsString()
  compositeId: string;

  @ApiProperty({ description: 'Composite layer' })
  @IsString()
  layer: string;

  @ApiProperty({ description: 'Composite category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Composite subcategory' })
  @IsString()
  subcategory: string;

  @ApiProperty({ description: 'Composite name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'GCP Storage URL' })
  @IsString()
  gcpStorageUrl: string;

  @ApiProperty({ description: 'Composite type' })
  @IsString()
  compositeType: string;

  @ApiProperty({ description: 'Number of components' })
  @IsNumber()
  componentCount: number;

  @ApiProperty({ description: 'Component layers' })
  @IsArray()
  @IsString({ each: true })
  componentLayers: string[];

  @ApiProperty({ description: 'Component IDs' })
  @IsArray()
  @IsString({ each: true })
  componentIds: string[];

  @ApiProperty({ description: 'Composite metadata' })
  @IsObject()
  metadata: {
    aiMetadata?: any;
    algorhythmMetadata?: any;
    aggregatedMetadata?: any;
    tags?: string[];
    description?: string;
  };

  @ApiProperty({ description: 'Component assets metadata' })
  @IsArray()
  components: Array<{
    id: string;
    name: string;
    layer: string;
    category: string;
    subcategory: string;
    gcpStorageUrl: string;
    metadata: {
      aiMetadata?: any;
      songMetadata?: any;
      starMetadata?: any;
      tags?: string[];
    };
  }>;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature' })
  @IsString()
  @IsOptional()
  signature?: string;
}
