import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetCreatedEventDto, CompositeCreatedEventDto, AssetUpdatedEventDto } from '../webhooks/dto/webhook-events.dto';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async processAssetCreated(event: AssetCreatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset created event: ${event.assetId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('asset.created', {
        assetId: event.assetId,
        layer: event.layer,
        category: event.category,
        subcategory: event.subcategory,
        name: event.name,
        gcpStorageUrl: event.gcpStorageUrl,
        metadata: event.metadata,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Asset created event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset created event: ${error.message}`);
      throw error;
    }
  }

  async processAssetUpdated(event: AssetUpdatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset updated event: ${event.assetId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('asset.updated', {
        assetId: event.assetId,
        layer: event.layer,
        category: event.category,
        subcategory: event.subcategory,
        name: event.name,
        gcpStorageUrl: event.gcpStorageUrl,
        metadata: event.metadata,
        changes: event.changes,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Asset updated event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset updated event: ${error.message}`);
      throw error;
    }
  }

  async processCompositeCreated(event: CompositeCreatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing composite created event: ${event.compositeId}`);

      // Emit internal event for processing
      await this.eventEmitter.emitAsync('composite.created', {
        compositeId: event.compositeId,
        layer: event.layer,
        category: event.category,
        subcategory: event.subcategory,
        name: event.name,
        gcpStorageUrl: event.gcpStorageUrl,
        compositeType: event.compositeType,
        componentCount: event.componentCount,
        componentLayers: event.componentLayers,
        componentIds: event.componentIds,
        metadata: event.metadata,
        components: event.components,
        timestamp: event.timestamp
      });

      this.logger.log(`✅ Composite created event processed: ${event.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite created event: ${error.message}`);
      throw error;
    }
  }
}
