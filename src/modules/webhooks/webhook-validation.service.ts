import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookValidationService {
  private readonly logger = new Logger(WebhookValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  async validateSignature(
    payload: any,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.error('❌ Webhook secret not configured');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    if (!signature) {
      this.logger.error('❌ Webhook signature missing');
      throw new UnauthorizedException('Webhook signature missing');
    }

    if (!timestamp) {
      this.logger.error('❌ Webhook timestamp missing');
      throw new UnauthorizedException('Webhook timestamp missing');
    }

    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const eventTime = Math.floor(new Date(timestamp).getTime() / 1000);
    const timeDiff = Math.abs(currentTime - eventTime);

    if (timeDiff > 300) { // 5 minutes tolerance
      this.logger.error(`❌ Webhook timestamp too old: ${timeDiff} seconds`);
      throw new UnauthorizedException('Webhook timestamp too old');
    }

    // Validate HMAC signature
    const expectedSignature = this.generateSignature(payload, timestamp, webhookSecret);
    
    if (signature !== expectedSignature) {
      this.logger.error(`❌ Invalid webhook signature. Expected: ${expectedSignature}, Received: ${signature}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`✅ Webhook signature validated successfully`);
    return true;
  }

  private generateSignature(payload: any, timestamp: string, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signatureString = `${timestamp}.${payloadString}`;
    return crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');
  }

  async validatePayload(payload: any): Promise<boolean> {
    if (!payload) {
      this.logger.error('❌ Webhook payload is empty');
      throw new BadRequestException('Webhook payload is empty');
    }

    if (!payload.event) {
      this.logger.error('❌ Webhook payload missing event type');
      throw new BadRequestException('Webhook payload missing event type');
    }

    if (!payload.timestamp) {
      this.logger.error('❌ Webhook payload missing timestamp');
      throw new BadRequestException('Webhook payload missing timestamp');
    }

    // Validate event types
    const validEvents = ['asset.created', 'asset.updated', 'composite.created'];
    if (!validEvents.includes(payload.event)) {
      this.logger.error(`❌ Invalid event type: ${payload.event}`);
      throw new BadRequestException(`Invalid event type: ${payload.event}`);
    }

    this.logger.log(`✅ Webhook payload validated successfully`);
    return true;
  }
}
