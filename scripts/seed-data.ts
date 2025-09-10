#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { SeedingService } from '../src/modules/seeding/seeding.service';

async function seedCompatibilityScores() {
  const logger = new Logger('SeedData');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const seedingService = app.get(SeedingService);

    logger.log('Starting compatibility score seeding...');
    await seedingService.seedCompatibilityScores();
    logger.log('✅ Seeding complete!');
    
    await app.close();
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedCompatibilityScores();
}
