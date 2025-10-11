import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RootHealthController } from './root-health.controller';
import { SimpleHealthController } from './simple-health.controller';

@Module({
  controllers: [HealthController, RootHealthController, SimpleHealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}