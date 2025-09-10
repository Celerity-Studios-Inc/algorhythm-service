import { Document } from 'mongoose';
export declare class AnalyticsEvent extends Document {
    event_type: string;
    user_id?: string;
    song_id?: string;
    template_id?: string;
    layer_type?: string;
    event_data: Record<string, any>;
    performance_metrics?: {
        response_time_ms?: number;
        cache_hit?: boolean;
        scoring_time_ms?: number;
        templates_evaluated?: number;
    };
    timestamp: Date;
    session_id?: string;
    request_id?: string;
    version: string;
}
export declare const AnalyticsEventSchema: import("mongoose").Schema<AnalyticsEvent, import("mongoose").Model<AnalyticsEvent, any, any, any, Document<unknown, any, AnalyticsEvent, any, {}> & AnalyticsEvent & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AnalyticsEvent, Document<unknown, {}, import("mongoose").FlatRecord<AnalyticsEvent>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<AnalyticsEvent> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
