import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../../../models/asset.schema';

export interface AlgorhythmTemplate {
  templateId: string;
  songId: string;
  name: string;
  metadata: {
    performanceContext: string[];
    targetAudience: string[];
    culturalContext: string[];
    musicalStyle: string[];
    energyLevel: string;
  };
  aggregatedMetadata: {
    synergyScore: number;
    visualCohesion: number;
    culturalAlignment: number;
    energyBalance: number;
    audienceMatch: number;
    thematicCoherence: number;
  };
  components: Array<{
    id: string;
    name: string;
    layer: string;
    category: string;
    subcategory: string;
  }>;
  gcpStorageUrl: string;
  thumbnailUrl?: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  event: 'composite.created' | 'composite.updated' | 'composite.deleted';
  songId: string;
  template: AlgorhythmTemplate;
  timestamp: string;
  signature?: string;
}

@Injectable()
export class AlgorhythmWebhookService {
  private readonly logger = new Logger(AlgorhythmWebhookService.name);
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('ALGORHYTHM_WEBHOOK_URL');
    this.webhookSecret = this.configService.get<string>('ALGORHYTHM_WEBHOOK_SECRET');
    this.maxRetries = this.configService.get<number>('ALGORHYTHM_WEBHOOK_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('ALGORHYTHM_WEBHOOK_RETRY_DELAY', 1000);
  }

  /**
   * Notify Algorhythm when a new Composite asset is created
   */
  async notifyCompositeCreated(asset: Asset): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('⚠️ [WEBHOOK] ALGORHYTHM_WEBHOOK_URL not configured, skipping notification');
      return;
    }

    try {
      const songId = this.extractSongId(asset.name);
      if (!songId) {
        this.logger.warn(`⚠️ [WEBHOOK] Could not extract song ID from asset name: ${asset.name}`);
        return;
      }

      const template = await this.transformToAlgorhythmTemplate(asset);
      const payload: WebhookPayload = {
        event: 'composite.created',
        songId,
        template,
        timestamp: new Date().toISOString()
      };

      await this.sendWebhookWithRetry(payload);
      this.logger.log(`✅ [WEBHOOK] Successfully notified Algorhythm of Composite creation: ${asset._id}`);
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Failed to notify Algorhythm of Composite creation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify Algorhythm when a Composite asset is updated
   */
  async notifyCompositeUpdated(asset: Asset): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('⚠️ [WEBHOOK] ALGORHYTHM_WEBHOOK_URL not configured, skipping notification');
      return;
    }

    try {
      const songId = this.extractSongId(asset.name);
      if (!songId) {
        this.logger.warn(`⚠️ [WEBHOOK] Could not extract song ID from asset name: ${asset.name}`);
        return;
      }

      const template = await this.transformToAlgorhythmTemplate(asset);
      const payload: WebhookPayload = {
        event: 'composite.updated',
        songId,
        template,
        timestamp: new Date().toISOString()
      };

      await this.sendWebhookWithRetry(payload);
      this.logger.log(`✅ [WEBHOOK] Successfully notified Algorhythm of Composite update: ${asset._id}`);
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Failed to notify Algorhythm of Composite update: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify Algorhythm when a Composite asset is deleted
   */
  async notifyCompositeDeleted(assetId: string, assetName: string): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('⚠️ [WEBHOOK] ALGORHYTHM_WEBHOOK_URL not configured, skipping notification');
      return;
    }

    try {
      const songId = this.extractSongId(assetName);
      if (!songId) {
        this.logger.warn(`⚠️ [WEBHOOK] Could not extract song ID from asset name: ${assetName}`);
        return;
      }

      const template: AlgorhythmTemplate = {
        templateId: assetId,
        songId,
        name: assetName,
        metadata: {
          performanceContext: [],
          targetAudience: [],
          culturalContext: [],
          musicalStyle: [],
          energyLevel: 'unknown'
        },
        aggregatedMetadata: {
          synergyScore: 0,
          visualCohesion: 0,
          culturalAlignment: 0,
          energyBalance: 0,
          audienceMatch: 0,
          thematicCoherence: 0
        },
        components: [],
        gcpStorageUrl: '',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const payload: WebhookPayload = {
        event: 'composite.deleted',
        songId,
        template,
        timestamp: new Date().toISOString()
      };

      await this.sendWebhookWithRetry(payload);
      this.logger.log(`✅ [WEBHOOK] Successfully notified Algorhythm of Composite deletion: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Failed to notify Algorhythm of Composite deletion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform NNA Registry asset to Algorhythm template format
   */
  private async transformToAlgorhythmTemplate(asset: Asset): Promise<AlgorhythmTemplate> {
    const songId = this.extractSongId(asset.name);
    
    return {
      templateId: (asset as any)._id.toString(),
      songId: songId || 'unknown',
      name: asset.name,
      metadata: {
        performanceContext: asset.algorhythmMetadata?.performanceContext || [],
        targetAudience: asset.algorhythmMetadata?.targetAudience || [],
        culturalContext: asset.algorhythmMetadata?.culturalContext || [],
        musicalStyle: asset.algorhythmMetadata?.musicalStyle || [],
        energyLevel: asset.algorhythmMetadata?.energyLevel || 'unknown'
      },
      aggregatedMetadata: {
        synergyScore: asset.aggregatedMetadata?.synergyScore || 0,
        visualCohesion: asset.aggregatedMetadata?.visualCohesion || 0,
        culturalAlignment: asset.aggregatedMetadata?.culturalAlignment || 0,
        energyBalance: asset.aggregatedMetadata?.energyBalance || 0,
        audienceMatch: asset.aggregatedMetadata?.audienceMatch || 0,
        thematicCoherence: asset.aggregatedMetadata?.thematicCoherence || 0
      },
      components: asset.components?.map(comp => ({
        id: (comp as any)._id?.toString() || 'unknown',
        name: comp.name || 'unknown',
        layer: comp.layer || 'unknown',
        category: comp.category || 'unknown',
        subcategory: comp.subcategory || 'unknown'
      })) || [],
      gcpStorageUrl: asset.gcpStorageUrl || '',
      thumbnailUrl: (asset as any).thumbnailUrl,
      description: asset.description || '',
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };
  }

  /**
   * Extract song ID from Composite asset name
   * Format: C.FUL.ALL.XXX:songId+...
   */
  private extractSongId(assetName: string): string | null {
    const match = assetName.match(/:(\d+\.\d+\.\d+\.\d+)\+/);
    return match ? match[1] : null;
  }

  /**
   * Send webhook with retry logic and exponential backoff
   */
  private async sendWebhookWithRetry(payload: WebhookPayload): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.sendWebhook(payload);
        this.logger.log(`✅ [WEBHOOK] Successfully delivered on attempt ${attempt}`);
        return;
      } catch (error) {
        this.logger.warn(`⚠️ [WEBHOOK] Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === this.maxRetries) {
          this.logger.error(`❌ [WEBHOOK] All ${this.maxRetries} attempts failed`);
          throw new Error(`Webhook delivery failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.log(`⏳ [WEBHOOK] Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
  }

  /**
   * Send webhook to Algorhythm service
   */
  private async sendWebhook(payload: WebhookPayload): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NNA-Registry-Service/1.0'
    };

    // Add HMAC signature if secret is configured
    if (this.webhookSecret) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    this.logger.log(`🎯 [WEBHOOK] Sent ${payload.event} for song ${payload.songId} to Algorhythm`);
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.warn('⚠️ [WEBHOOK] ALGORHYTHM_WEBHOOK_URL not configured');
      return false;
    }

    try {
      const testPayload: WebhookPayload = {
        event: 'composite.created',
        songId: 'test.song.id',
        template: {
          templateId: 'test-template-id',
          songId: 'test.song.id',
          name: 'Test Composite',
          metadata: {
            performanceContext: ['test'],
            targetAudience: ['test'],
            culturalContext: ['test'],
            musicalStyle: ['test'],
            energyLevel: 'test'
          },
          aggregatedMetadata: {
            synergyScore: 1,
            visualCohesion: 1,
            culturalAlignment: 1,
            energyBalance: 1,
            audienceMatch: 1,
            thematicCoherence: 1
          },
          components: [],
          gcpStorageUrl: 'https://test.com',
          description: 'Test composite for webhook connectivity',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        timestamp: new Date().toISOString()
      };

      await this.sendWebhook(testPayload);
      this.logger.log('✅ [WEBHOOK] Test webhook successful');
      return true;
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Test webhook failed: ${error.message}`);
      return false;
    }
  }
}
