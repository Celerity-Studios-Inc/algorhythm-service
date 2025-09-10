import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';

@Injectable()
export class AnalyticsCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  async getRecentEvents(): Promise<any[] | null> {
    const key = `${CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
    return await this.cacheService.get(key);
  }

  async setRecentEvents(events: any[]): Promise<boolean> {
    const key = `${CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
    return await this.cacheService.set(key, events, CACHE_TTL.ANALYTICS_EVENTS);
  }

  async addRecentEvent(event: any): Promise<boolean> {
    const key = `${CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
    const existingEvents = await this.cacheService.get(key) || [];
    
    (existingEvents as any[]).unshift(event);
    // Keep only last 100 events
    if ((existingEvents as any[]).length > 100) {
      (existingEvents as any[]).splice(100);
    }

    return await this.cacheService.set(key, existingEvents, CACHE_TTL.ANALYTICS_EVENTS);
  }

  async getUserPreferences(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.USER_PREFERENCES}:${userId}`;
    return await this.cacheService.get(key);
  }

  async setUserPreferences(userId: string, preferences: any): Promise<boolean> {
    const key = `${CACHE_KEYS.USER_PREFERENCES}:${userId}`;
    return await this.cacheService.set(key, preferences, CACHE_TTL.USER_PREFERENCES);
  }

  async invalidateUserPreferences(userId: string): Promise<boolean> {
    const key = `${CACHE_KEYS.USER_PREFERENCES}:${userId}`;
    return await this.cacheService.delete(key);
  }
}
