import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AnalyticsEvent extends Document {
  @Prop({ required: true, index: true })
  event_type: string;

  @Prop({ index: true })
  user_id?: string;

  @Prop({ index: true })
  song_id?: string;

  @Prop({ index: true })
  template_id?: string;

  @Prop()
  layer_type?: string;

  @Prop({ type: Object })
  event_data: Record<string, any>;

  @Prop({ type: Object })
  performance_metrics?: {
    response_time_ms?: number;
    cache_hit?: boolean;
    scoring_time_ms?: number;
    templates_evaluated?: number;
  };

  @Prop({ default: Date.now, index: true })
  timestamp: Date;

  @Prop()
  session_id?: string;

  @Prop()
  request_id?: string;

  @Prop({ default: '1.0.0' })
  version: string;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Indexes for efficient analytics queries
AnalyticsEventSchema.index({ event_type: 1, timestamp: -1 });
AnalyticsEventSchema.index({ user_id: 1, timestamp: -1 });
AnalyticsEventSchema.index({ template_id: 1, event_type: 1 });
