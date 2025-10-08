import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompositeDocument = Composite & Document;

@Schema({ timestamps: true })
export class Composite {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  songId: string;

  @Prop({ default: 0 })
  compatibilityScore: number;

  @Prop({ type: Object })
  components: {
    starId: string;
    lookId: string;
    moveId: string;
    worldId: string;
    star?: Types.ObjectId;
    look?: Types.ObjectId;
    move?: Types.ObjectId;
    world?: Types.ObjectId;
  };

  @Prop()
  previewVideoUrl?: string;

  @Prop()
  thumbnailUrl?: string;

  // 🔧 V2.0: GCP URL fields for composite videos
  @Prop()
  gcpStorageUrl?: string;

  @Prop()
  fullVideoUrl?: string;

  @Prop()
  durationSeconds?: number;

  @Prop()
  resolution?: string;

  @Prop()
  fileSizeMb?: number;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop()
  mood?: string;

  @Prop()
  energyLevel?: number;

  @Prop()
  style?: string;

  @Prop()
  recommendedContext?: string;

  @Prop()
  viralPotentialScore?: number;

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  shareCount: number;

  @Prop({ default: 0 })
  remixCount: number;

  @Prop({ default: 0 })
  trendingScore: number;
}

export const CompositeSchema = SchemaFactory.createForClass(Composite);
