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
    const requiredFields = ['event', 'timestamp'];
    
    // Check event-specific required fields
    if (payload.event === 'asset.created' || payload.event === 'asset.updated') {
      requiredFields.push('assetId', 'layer', 'category', 'subcategory', 'name', 'gcpStorageUrl', 'metadata');
    } else if (payload.event === 'asset.deleted') {
      requiredFields.push('assetId');
    } else if (payload.event === 'composite.created') {
      requiredFields.push('compositeId', 'layer', 'category', 'subcategory', 'name', 'gcpStorageUrl', 'compositeType', 'componentCount', 'componentLayers', 'componentIds', 'metadata', 'components');
    }

    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      this.logger.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    this.logger.log(`✅ Transformed payload validation passed for ${payload.event}`);
    return true;
  }
}
