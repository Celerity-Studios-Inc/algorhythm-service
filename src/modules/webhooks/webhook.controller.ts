import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { AssetCreatedEventDto, CompositeCreatedEventDto, AssetUpdatedEventDto, AssetDeletedEventDto } from './dto/webhook-events.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('assets/created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle asset creation webhook from NNA Registry' })
  @ApiResponse({ status: 200, description: 'Asset created webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleAssetCreated(
    @Body() payload: AssetCreatedEventDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset created webhook: ${payload.assetId}`);
    
    try {
      const result = await this.webhookService.processAssetCreated(payload, signature, timestamp);
      this.logger.log(`✅ Asset created webhook processed successfully: ${payload.assetId}`);
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
    @Body() payload: AssetUpdatedEventDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset updated webhook: ${payload.assetId}`);
    
    try {
      const result = await this.webhookService.processAssetUpdated(payload, signature, timestamp);
      this.logger.log(`✅ Asset updated webhook processed successfully: ${payload.assetId}`);
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
    @Body() payload: AssetDeletedEventDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing asset deleted webhook: ${payload.assetId}`);
    
    try {
      const result = await this.webhookService.processAssetDeleted(payload, signature, timestamp);
      this.logger.log(`✅ Asset deleted webhook processed successfully: ${payload.assetId}`);
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
    @Body() payload: CompositeCreatedEventDto,
    @Headers('x-algorhythm-signature') signature: string,
    @Headers('x-algorhythm-timestamp') timestamp: string
  ) {
    this.logger.log(`🔄 Processing composite created webhook: ${payload.compositeId}`);
    
    try {
      const result = await this.webhookService.processCompositeCreated(payload, signature, timestamp);
      this.logger.log(`✅ Composite created webhook processed successfully: ${payload.compositeId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Composite created webhook failed: ${error.message}`);
      throw error;
    }
  }
}
