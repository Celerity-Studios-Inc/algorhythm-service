import { Document } from 'mongoose';
export declare class UserPreference extends Document {
    user_id: string;
    preferences: {
        energy_preference?: 'low' | 'moderate' | 'high';
        style_preference?: string;
        genre_preferences?: string[];
        preferred_stars?: string[];
        preferred_looks?: string[];
        preferred_moves?: string[];
        preferred_worlds?: string[];
    };
    behavior_patterns: {
        most_selected_genres?: string[];
        avg_energy_level?: number;
        completion_rate?: number;
        skip_rate?: number;
    };
    last_updated: Date;
    total_recommendations: number;
    total_selections: number;
    total_completions: number;
}
export declare const UserPreferenceSchema: import("mongoose").Schema<UserPreference, import("mongoose").Model<UserPreference, any, any, any, Document<unknown, any, UserPreference, any, {}> & UserPreference & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserPreference, Document<unknown, {}, import("mongoose").FlatRecord<UserPreference>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<UserPreference> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
