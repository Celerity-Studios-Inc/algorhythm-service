import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CompatibilityScore extends Document {
  @Prop({ required: true, index: true })
  song_id: string;

  @Prop({ required: true, index: true })
  template_id: string;

  @Prop({ required: true, min: 0, max: 1 })
  base_score: number;

  @Prop({ required: true, min: 0, max: 2 })
  freshness_boost: number;

  @Prop({ required: true, min: 0, max: 2 })
  final_score: number;

  @Prop({ type: Object, required: true })
  score_breakdown: {
    tempo_score: number;
    genre_score: number;
    energy_score: number;
    style_score: number;
    mood_score: number;
  };

  @Prop({ type: Object })
  song_metadata: {
    bpm?: number;
    genre?: string;
    energy_level?: string;
    mood?: string;
  };

  @Prop({ type: Object })
  template_metadata: {
    created_at: Date;
    tags: string[];
    components: string[];
  };

  @Prop({ default: Date.now, expires: '30d' }) // Auto-expire after 30 days
  computed_at: Date;

  @Prop({ default: '1.0.0' })
  algorithm_version: string;
}

export const CompatibilityScoreSchema = SchemaFactory.createForClass(CompatibilityScore);
export type CompatibilityScoreDocument = CompatibilityScore & Document;

// Create compound indexes for efficient querying
CompatibilityScoreSchema.index({ song_id: 1, template_id: 1 }, { unique: true });
CompatibilityScoreSchema.index({ song_id: 1, final_score: -1 }); // For getting top recommendations
CompatibilityScoreSchema.index({ computed_at: 1 }); // For cleanup/maintenance
