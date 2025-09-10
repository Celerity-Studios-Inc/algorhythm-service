declare class UserPreferencesDto {
    energy_preference?: 'low' | 'moderate' | 'high';
    style_preference?: string;
    genre_preferences?: string[];
}
declare class DeviceInfoDto {
    platform?: 'ios' | 'android';
    version?: string;
}
declare class UserContextDto {
    user_id: string;
    preferences?: UserPreferencesDto;
    device_info?: DeviceInfoDto;
}
export declare class TemplateRecommendationDto {
    song_id: string;
    user_context: UserContextDto;
    max_alternatives?: number;
    include_scoring_details?: boolean;
}
export {};
