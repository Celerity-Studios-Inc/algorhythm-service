import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  layer: string;

  @Prop({ required: true })
  assetType: string;

  @Prop()
  baseAssetId?: string;

  @Prop()
  fileUrl?: string;

  // 🔧 V2.0: GCP URL fields (core of new architecture)
  @Prop()
  gcpStorageUrl?: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  previewUrl?: string;

  @Prop()
  fileSizeMb?: number;

  @Prop()
  durationSeconds?: number;

  @Prop()
  format?: string;

  @Prop()
  resolution?: string;

  @Prop({ type: Object })
  metadata?: any;

  @Prop({ type: Object })
  trendingScore?: {
    score: number;
    expiresAt: Date;
  };

  @Prop({ type: Object })
  engagementMetrics?: {
    viewCount: number;
    shareCount: number;
    likeCount: number;
    lastUpdated: Date;
  };

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: 0 })
  popularityScore: number;

  @Prop({ default: false })
  trending: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
