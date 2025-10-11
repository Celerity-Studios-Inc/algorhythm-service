import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for asset events
    this.eventEmitter.on('asset.created', (data) => {
      this.logger.log(`🎵 Asset created event received: ${data.assetId}`);
      this.handleAssetCreated(data);
    });

    this.eventEmitter.on('asset.updated', (data) => {
      this.logger.log(`🔄 Asset updated event received: ${data.assetId}`);
      this.handleAssetUpdated(data);
    });

    this.eventEmitter.on('asset.deleted', (data) => {
      this.logger.log(`🗑️ Asset deleted event received: ${data.assetId}`);
      this.handleAssetDeleted(data);
    });

    // Listen for composite events
    this.eventEmitter.on('composite.created', (data) => {
      this.logger.log(`🎬 Composite created event received: ${data.compositeId}`);
      this.handleCompositeCreated(data);
    });

    this.logger.log('✅ Event listeners registered successfully');
  }

  private async handleAssetCreated(data: any) {
    try {
      this.logger.log(`📦 Processing asset creation: ${data.assetId}`);
      // TODO: Add actual processing logic here
      // For now, just log the event
      this.logger.log(`✅ Asset creation processed: ${data.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset creation: ${error.message}`);
    }
  }

  private async handleAssetUpdated(data: any) {
    try {
      this.logger.log(`📦 Processing asset update: ${data.assetId}`);
      // TODO: Add actual processing logic here
      this.logger.log(`✅ Asset update processed: ${data.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset update: ${error.message}`);
    }
  }

  private async handleAssetDeleted(data: any) {
    try {
      this.logger.log(`📦 Processing asset deletion: ${data.assetId}`);
      // TODO: Add actual processing logic here
      this.logger.log(`✅ Asset deletion processed: ${data.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset deletion: ${error.message}`);
    }
  }

  private async handleCompositeCreated(data: any) {
    try {
      this.logger.log(`📦 Processing composite creation: ${data.compositeId}`);
      // TODO: Add actual processing logic here
      this.logger.log(`✅ Composite creation processed: ${data.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite creation: ${error.message}`);
    }
  }
}
