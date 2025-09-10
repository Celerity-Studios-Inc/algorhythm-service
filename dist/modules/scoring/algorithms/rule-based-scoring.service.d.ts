export declare class RuleBasedScoringService {
    private readonly logger;
    computeScore(song: any, template: any, userPreferences?: any): Promise<{
        tempo_score: number;
        genre_score: number;
        energy_score: number;
        style_score: number;
        mood_score: number;
    }>;
    private computeTempoCompatibility;
    private computeGenreCompatibility;
    private computeEnergyCompatibility;
    private computeStyleCompatibility;
    private computeMoodCompatibility;
    private applyUserPreferences;
}
