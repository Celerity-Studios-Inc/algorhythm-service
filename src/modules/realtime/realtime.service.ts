import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * Real-Time WebSocket Service for AlgoRhythm
 * 
 * This service provides:
 * 1. Real-time recommendation updates
 * 2. Live cache warming notifications
 * 3. Performance monitoring
 * 4. Instant user feedback
 */

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeService {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeService.name);

  /**
   * Send real-time recommendation update to client
   */
  async sendRecommendationUpdate(userId: string, songId: string, recommendations: any) {
    try {
      this.server.to(`user:${userId}`).emit('recommendation_update', {
        songId,
        recommendations,
        timestamp: new Date().toISOString(),
        performance: {
          response_time_ms: recommendations.performance_metrics?.response_time_ms || 0,
          cache_hit: recommendations.cache_hit || false,
          templates_evaluated: recommendations.templates_evaluated || 0
        }
      });
      
      this.logger.debug(`Sent real-time update to user ${userId} for song ${songId}`);
    } catch (error) {
      this.logger.error(`Failed to send real-time update:`, error);
    }
  }

  /**
   * Send cache warming notification
   */
  async sendCacheWarmingNotification(status: 'started' | 'completed' | 'failed', details?: any) {
    try {
      this.server.emit('cache_warming', {
        status,
        details,
        timestamp: new Date().toISOString()
      });
      
      this.logger.debug(`Sent cache warming notification: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to send cache warming notification:`, error);
    }
  }

  /**
   * Send performance metrics to monitoring clients
   */
  async sendPerformanceMetrics(metrics: any) {
    try {
      this.server.to('monitoring').emit('performance_metrics', {
        ...metrics,
        timestamp: new Date().toISOString()
      });
      
      this.logger.debug(`Sent performance metrics`);
    } catch (error) {
      this.logger.error(`Failed to send performance metrics:`, error);
    }
  }

  /**
   * Send real-time asset update notification
   */
  async sendAssetUpdate(assetType: string, count: number, action: 'added' | 'updated' | 'removed') {
    try {
      this.server.emit('asset_update', {
        assetType,
        count,
        action,
        timestamp: new Date().toISOString()
      });
      
      this.logger.debug(`Sent asset update: ${action} ${count} ${assetType}`);
    } catch (error) {
      this.logger.error(`Failed to send asset update:`, error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      connected_clients: this.getConnectedClientsCount(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}
