import { Document } from 'mongoose';
export declare class RecommendationCache extends Document {
    song_id: string;
    user_id: string;
    recommended_template_id: string;
    alternatives: string[];
    compatibility_score: number;
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
    created_at: Date;
    was_selected: boolean;
    selected_at?: Date;
}
export declare const RecommendationCacheSchema: import("mongoose").Schema<RecommendationCache, import("mongoose").Model<RecommendationCache, any, any, any, Document<unknown, any, RecommendationCache, any, {}> & RecommendationCache & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RecommendationCache, Document<unknown, {}, import("mongoose").FlatRecord<RecommendationCache>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<RecommendationCache> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
