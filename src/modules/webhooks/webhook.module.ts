import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookValidationService } from './webhook-validation.service';
import { EventProcessorService } from '../events/event-processor.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // Set this to `true` to use wildcards
      wildcard: false,
      // The delimiter used to segment namespaces
      delimiter: '.',
      // Set this to `true` if you want to emit the newListener event
      newListener: false,
      // Set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // Show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WebhookValidationService,
    EventProcessorService,
  ],
  exports: [WebhookService, EventProcessorService],
})
export class WebhookModule {}
