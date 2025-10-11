import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhookPayloadTransformerService {
  private readonly logger = new Logger(WebhookPayloadTransformerService.name);

  /**
   * Transform webhook payload from NNA Registry format to Algorhythm format
   * Handles both nested (with data wrapper) and flat formats
   */
  transformPayload(payload: any): any {
    try {
      // Check if payload has nested structure (NNA Registry format)
      if (payload.data && typeof payload.data === 'object') {
        this.logger.log('🔄 Transforming nested payload format to flat format');
        
        // Extract data from nested structure
        const transformedPayload = {
          event: payload.event,
          timestamp: payload.timestamp,
          signature: payload.signature,
          ...payload.data
        };

        this.logger.log(`✅ Payload transformed: ${transformedPayload.event}`);
        return transformedPayload;
      }

      // Payload is already in flat format (Algorhythm format)
      this.logger.log('✅ Payload already in flat format');
      return payload;

    } catch (error) {
      this.logger.error(`❌ Failed to transform payload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate that the transformed payload has required fields
   */
  validateTransformedPayload(payload: any): boolean {
    // Basic validation - just check for event and timestamp
    if (!payload.event || !payload.timestamp) {
      this.logger.error(`❌ Missing basic fields: event=${!!payload.event}, timestamp=${!!payload.timestamp}`);
      return false;
    }

    // For asset events, check for at least one identifier
    if (payload.event === 'asset.created' || payload.event === 'asset.updated' || payload.event === 'asset.deleted') {
      if (!payload.assetId && !payload.asset_id) {
        this.logger.error(`❌ Missing asset identifier for ${payload.event}`);
        return false;
      }
    }

    // For composite events, check for at least one identifier
    if (payload.event === 'composite.created') {
      if (!payload.compositeId && !payload.composite_id) {
        this.logger.error(`❌ Missing composite identifier for ${payload.event}`);
        return false;
      }
    }

    this.logger.log(`✅ Transformed payload validation passed for ${payload.event}`);
    return true;
  }
}
