import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserPreference extends Document {
  @Prop({ required: true, unique: true, index: true })
  user_id: string;

  @Prop({ type: Object })
  preferences: {
    energy_preference?: 'low' | 'moderate' | 'high';
    style_preference?: string;
    genre_preferences?: string[];
    preferred_stars?: string[];
    preferred_looks?: string[];
    preferred_moves?: string[];
    preferred_worlds?: string[];
  };

  @Prop({ type: Object })
  behavior_patterns: {
    most_selected_genres?: string[];
    avg_energy_level?: number;
    completion_rate?: number;
    skip_rate?: number;
  };

  @Prop({ default: Date.now })
  last_updated: Date;

  @Prop({ default: 0 })
  total_recommendations: number;

  @Prop({ default: 0 })
  total_selections: number;

  @Prop({ default: 0 })
  total_completions: number;
}

export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference);
