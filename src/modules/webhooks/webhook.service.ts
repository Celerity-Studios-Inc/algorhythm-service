import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventProcessorService } from '../events/event-processor.service';
import { WebhookValidationService } from './webhook-validation.service';
import { AssetCreatedEventDto, CompositeCreatedEventDto, AssetUpdatedEventDto, AssetDeletedEventDto } from './dto/webhook-events.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventProcessor: EventProcessorService,
    private readonly validationService: WebhookValidationService
  ) {}

  async processAssetCreated(
    payload: AssetCreatedEventDto,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string; assetId: string }> {
    try {
      this.logger.log(`🔄 Processing asset created webhook: ${payload.assetId}`);

      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process asset creation event
      await this.eventProcessor.processAssetCreated(payload);

      this.logger.log(`✅ Asset created webhook processed: ${payload.assetId}`);
      return { 
        success: true, 
        message: 'Asset created webhook processed successfully',
        assetId: payload.assetId
      };
    } catch (error) {
      this.logger.error(`❌ Asset created webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async processAssetUpdated(
    payload: AssetUpdatedEventDto,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string; assetId: string }> {
    try {
      this.logger.log(`🔄 Processing asset updated webhook: ${payload.assetId}`);

      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process asset update event
      await this.eventProcessor.processAssetUpdated(payload);

      this.logger.log(`✅ Asset updated webhook processed: ${payload.assetId}`);
      return { 
        success: true, 
        message: 'Asset updated webhook processed successfully',
        assetId: payload.assetId
      };
    } catch (error) {
      this.logger.error(`❌ Asset updated webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async processAssetDeleted(
    payload: AssetDeletedEventDto,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string; assetId: string }> {
    try {
      this.logger.log(`🔄 Processing asset deleted webhook: ${payload.assetId}`);

      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process asset deletion event
      await this.eventProcessor.processAssetDeleted(payload);

      this.logger.log(`✅ Asset deleted webhook processed: ${payload.assetId}`);
      return {
        success: true,
        message: 'Asset deleted webhook processed successfully',
        assetId: payload.assetId
      };
    } catch (error) {
      this.logger.error(`❌ Asset deleted webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async processCompositeCreated(
    payload: CompositeCreatedEventDto,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string; compositeId: string }> {
    try {
      this.logger.log(`🔄 Processing composite created webhook: ${payload.compositeId}`);

      // Validate webhook signature
      await this.validationService.validateSignature(payload, signature, timestamp);

      // Process composite creation event
      await this.eventProcessor.processCompositeCreated(payload);

      this.logger.log(`✅ Composite created webhook processed: ${payload.compositeId}`);
      return {
        success: true,
        message: 'Composite created webhook processed successfully',
        compositeId: payload.compositeId
      };
    } catch (error) {
      this.logger.error(`❌ Composite created webhook failed: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }
}
