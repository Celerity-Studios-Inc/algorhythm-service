import { Document } from 'mongoose';
export declare class CompatibilityScore extends Document {
    song_id: string;
    template_id: string;
    base_score: number;
    freshness_boost: number;
    final_score: number;
    score_breakdown: {
        tempo_score: number;
        genre_score: number;
        energy_score: number;
        style_score: number;
        mood_score: number;
    };
    song_metadata: {
        bpm?: number;
        genre?: string;
        energy_level?: string;
        mood?: string;
    };
    template_metadata: {
        created_at: Date;
        tags: string[];
        components: string[];
    };
    computed_at: Date;
    algorithm_version: string;
}
export declare const CompatibilityScoreSchema: import("mongoose").Schema<CompatibilityScore, import("mongoose").Model<CompatibilityScore, any, any, any, Document<unknown, any, CompatibilityScore, any, {}> & CompatibilityScore & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CompatibilityScore, Document<unknown, {}, import("mongoose").FlatRecord<CompatibilityScore>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<CompatibilityScore> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
