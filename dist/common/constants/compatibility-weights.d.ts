export declare const COMPATIBILITY_WEIGHTS: {
    readonly tempo: 0.3;
    readonly genre: 0.25;
    readonly energy: 0.2;
    readonly style: 0.15;
    readonly mood: 0.1;
};
export declare const FRESHNESS_BOOST: {
    readonly FIRST_WEEK: 1.2;
    readonly FIRST_MONTH: 1.1;
    readonly FIRST_QUARTER: 1.05;
};
export declare const SCORING_THRESHOLDS: {
    readonly MIN_RECOMMENDATION_SCORE: 0.6;
    readonly DIVERSITY_FACTOR: 0.01;
    readonly MAX_ALTERNATIVES: 10;
    readonly MAX_LAYER_VARIATIONS: 8;
};
