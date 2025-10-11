import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetCreatedEventDto, CompositeCreatedEventDto, AssetUpdatedEventDto, AssetDeletedEventDto } from '../webhooks/dto/webhook-events.dto';
// import { RealTimeIndexService } from '../indexing/real-time-index.service'; // Optional dependency

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    // private readonly realTimeIndex: RealTimeIndexService, // Optional dependency
  ) {}

  async processAssetCreated(event: AssetCreatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset created event: ${event.assetId}`);

      // Process with real-time indexing (if available)
      // await this.realTimeIndex.handleAssetCreated({
      //   assetId: event.assetId,
      //   layer: event.layer,
      //   category: event.category,
      //   subcategory: event.subcategory,
      //   name: event.name,
      //   gcpStorageUrl: event.gcpStorageUrl,
      //   metadata: event.metadata,
      //   timestamp: event.timestamp
      // });
      
      // Emit internal event for processing
      this.eventEmitter.emit('asset.created', {
        assetId: event.assetId,
        layer: event.layer,
        category: event.category,
        subcategory: event.subcategory,
        name: event.name,
        gcpStorageUrl: event.gcpStorageUrl,
        metadata: event.metadata,
        timestamp: event.timestamp
      });
      
      this.logger.log(`📝 Asset created event processed and emitted: ${event.assetId}`);

      this.logger.log(`✅ Asset created event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset created event: ${error.message}`);
      throw error;
    }
  }

  async processAssetUpdated(event: AssetUpdatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset updated event: ${event.assetId}`);

      // Process with real-time indexing (if available)
      // await this.realTimeIndex.handleAssetUpdated({
      //   assetId: event.assetId,
      //   layer: event.layer,
      //   category: event.category,
      //   subcategory: event.subcategory,
      //   name: event.name,
      //   gcpStorageUrl: event.gcpStorageUrl,
      //   metadata: event.metadata,
      //   changes: event.changes,
      //   timestamp: event.timestamp
      // });
      
      // Emit internal event for processing
      this.eventEmitter.emit('asset.updated', {
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
      
      this.logger.log(`📝 Asset updated event processed and emitted: ${event.assetId}`);

      this.logger.log(`✅ Asset updated event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset updated event: ${error.message}`);
      throw error;
    }
  }

  async processAssetDeleted(event: AssetDeletedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing asset deleted event: ${event.assetId}`);

      // Process with real-time indexing (if available)
      // await this.realTimeIndex.handleAssetDeleted({
      //   assetId: event.assetId,
      //   timestamp: event.timestamp
      // });
      
      // Emit internal event for processing
      this.eventEmitter.emit('asset.deleted', {
        assetId: event.assetId,
        timestamp: event.timestamp
      });
      
      this.logger.log(`📝 Asset deleted event processed and emitted: ${event.assetId}`);

      this.logger.log(`✅ Asset deleted event processed: ${event.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset deleted event: ${error.message}`);
      throw error;
    }
  }

  async processCompositeCreated(event: CompositeCreatedEventDto): Promise<void> {
    try {
      this.logger.log(`🔄 Processing composite created event: ${event.compositeId}`);

      // Process with real-time indexing (if available)
      // await this.realTimeIndex.handleCompositeCreated({
      //   compositeId: event.compositeId,
      //   layer: event.layer,
      //   category: event.category,
      //   subcategory: event.subcategory,
      //   name: event.name,
      //   gcpStorageUrl: event.gcpStorageUrl,
      //   compositeType: event.compositeType,
      //   componentCount: event.componentCount,
      //   componentLayers: event.componentLayers,
      //   componentIds: event.componentIds,
      //   metadata: event.metadata,
      //   components: event.components,
      //   timestamp: event.timestamp
      // });
      
      // Emit internal event for processing
      this.eventEmitter.emit('composite.created', {
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
      
      this.logger.log(`📝 Composite created event processed and emitted: ${event.compositeId}`);

      this.logger.log(`✅ Composite created event processed: ${event.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite created event: ${error.message}`);
      throw error;
    }
  }
}
