import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { WebhookPayloadTransformerService } from './webhook-payload-transformer.service';
import { AssetCreatedEventDto, CompositeCreatedEventDto, AssetUpdatedEventDto, AssetDeletedEventDto } from './dto/webhook-events.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly payloadTransformer: WebhookPayloadTransformerService
  ) {}

  @Post('assets/created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset creation webhook from NNA Registry' })
  @ApiResponse({ status: 200, description: 'Asset created webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleAssetCreated(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset created webhook`);
    
    try {
      // Transform payload from NNA Registry format to Algorhythm format
      const transformedPayload = this.payloadTransformer.transformPayload(payload);
      
      // Validate transformed payload
      if (!this.payloadTransformer.validateTransformedPayload(transformedPayload)) {
        throw new Error('Invalid transformed payload');
      }
      
      const assetId = transformedPayload.assetId || transformedPayload.asset_id;
      this.logger.log(`🔄 Processing asset created webhook: ${assetId}`);
      
      const result = await this.webhookService.processAssetCreated(transformedPayload, signature, timestamp);
      this.logger.log(`✅ Asset created webhook processed successfully: ${assetId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Asset created webhook failed: ${error.message}`);
      throw error;
    }
  }

  @Post('assets/updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset update webhook from NNA Registry' })
  @ApiResponse({ status: 200, description: 'Asset updated webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleAssetUpdated(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset updated webhook`);
    
    try {
      // Transform payload from NNA Registry format to Algorhythm format
      const transformedPayload = this.payloadTransformer.transformPayload(payload);
      
      // Validate transformed payload
      if (!this.payloadTransformer.validateTransformedPayload(transformedPayload)) {
        throw new Error('Invalid transformed payload');
      }
      
      const assetId = transformedPayload.assetId || transformedPayload.asset_id;
      this.logger.log(`🔄 Processing asset updated webhook: ${assetId}`);
      
      const result = await this.webhookService.processAssetUpdated(transformedPayload, signature, timestamp);
      this.logger.log(`✅ Asset updated webhook processed successfully: ${assetId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Asset updated webhook failed: ${error.message}`);
      throw error;
    }
  }

  @Post('assets/deleted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset deletion webhook from NNA Registry' })
  @ApiResponse({ status: 200, description: 'Asset deleted webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleAssetDeleted(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset deleted webhook`);
    
    try {
      // Transform payload from NNA Registry format to Algorhythm format
      const transformedPayload = this.payloadTransformer.transformPayload(payload);
      
      // Validate transformed payload
      if (!this.payloadTransformer.validateTransformedPayload(transformedPayload)) {
        throw new Error('Invalid transformed payload');
      }
      
      const assetId = transformedPayload.assetId || transformedPayload.asset_id;
      this.logger.log(`🔄 Processing asset deleted webhook: ${assetId}`);
      
      const result = await this.webhookService.processAssetDeleted(transformedPayload, signature, timestamp);
      this.logger.log(`✅ Asset deleted webhook processed successfully: ${assetId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Asset deleted webhook failed: ${error.message}`);
      throw error;
    }
  }

  @Post('composites/created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle composite creation webhook from NNA Registry' })
  @ApiResponse({ status: 200, description: 'Composite created webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleCompositeCreated(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing composite created webhook`);
    
    try {
      // Transform payload from NNA Registry format to Algorhythm format
      const transformedPayload = this.payloadTransformer.transformPayload(payload);
      
      // Validate transformed payload
      if (!this.payloadTransformer.validateTransformedPayload(transformedPayload)) {
        throw new Error('Invalid transformed payload');
      }
      
      const compositeId = transformedPayload.compositeId || transformedPayload.composite_id;
      this.logger.log(`🔄 Processing composite created webhook: ${compositeId}`);
      
      const result = await this.webhookService.processCompositeCreated(transformedPayload, signature, timestamp);
      this.logger.log(`✅ Composite created webhook processed successfully: ${compositeId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Composite created webhook failed: ${error.message}`);
      throw error;
    }
  }
}
