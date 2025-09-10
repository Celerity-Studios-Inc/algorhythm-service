import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NnaRegistryService } from './nna-registry.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    }),
  ],
  providers: [NnaRegistryService],
  exports: [NnaRegistryService],
})
export class NnaIntegrationModule {}
