import { Injectable } from '@nestjs/common';
import { FRESHNESS_BOOST } from '../../../common/constants/compatibility-weights';

@Injectable()
export class FreshnessBoostService {
  calculateBoost(createdAt: Date): number {
    if (!createdAt) return 1.0;

    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      return FRESHNESS_BOOST.FIRST_WEEK; // 20% boost for first week
    } else if (ageInDays < 30) {
      return FRESHNESS_BOOST.FIRST_MONTH; // 10% boost for first month
    } else if (ageInDays < 90) {
      return FRESHNESS_BOOST.FIRST_QUARTER; // 5% boost for first quarter
    }

    return 1.0; // No boost for older content
  }

  getBoostedScore(baseScore: number, createdAt: Date): number {
    const boost = this.calculateBoost(createdAt);
    return Math.min(baseScore * boost, 1.0); // Cap at 1.0
  }

  async computeFreshnessBoost(template: any): Promise<number> {
    if (!template || !template.created_at) {
      return 1.0;
    }
    
    const createdAt = new Date(template.created_at);
    return this.calculateBoost(createdAt);
  }
}
