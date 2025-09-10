#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { SeedingService } from '../src/modules/seeding/seeding.service';

async function warmupCache() {
  const logger = new Logger('CacheWarmup');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const seedingService = app.get(SeedingService);

    logger.log('Starting cache warmup...');
    await seedingService.warmupCache();
    logger.log('✅ Cache warmup complete!');
    
    await app.close();
  } catch (error) {
    logger.error('❌ Cache warmup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  warmupCache();
}
