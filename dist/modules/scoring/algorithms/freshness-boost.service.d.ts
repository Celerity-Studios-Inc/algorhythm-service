export declare class FreshnessBoostService {
    calculateBoost(createdAt: Date): number;
    getBoostedScore(baseScore: number, createdAt: Date): number;
    computeFreshnessBoost(template: any): Promise<number>;
}
