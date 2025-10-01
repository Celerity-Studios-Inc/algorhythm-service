import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class RecommendationCache extends Document {
  @Prop({ required: true, index: true })
  song_id: string;

  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  recommended_template_id: string;

  @Prop({ type: [String], default: [] })
  alternatives: string[];

  @Prop({ required: true, min: 0, max: 1 })
  compatibility_score: number;

  @Prop({ type: Object })
  user_context: {
    preferences?: {
      energy_preference?: string;
      style_preference?: string;
      genre_preferences?: string[];
    };
    device_info?: {
      platform?: string;
      version?: string;
    };
  };

  @Prop({ default: Date.now, expires: '7d' }) // Auto-expire after 7 days
  created_at: Date;

  @Prop({ type: Boolean, default: false })
  was_selected: boolean; // Track if user selected this recommendation

  @Prop()
  selected_at?: Date;
}

export const RecommendationCacheSchema = SchemaFactory.createForClass(RecommendationCache);
export type RecommendationCacheDocument = RecommendationCache & Document;

// Indexes for analytics and caching
RecommendationCacheSchema.index({ song_id: 1, user_id: 1, created_at: -1 });
RecommendationCacheSchema.index({ recommended_template_id: 1, was_selected: 1 });
