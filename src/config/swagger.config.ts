import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('AlgoRhythm Recommendation Engine')
  .setDescription('AI-powered recommendation engine for ReViz video remixing platform')
  .setVersion('1.0.0')
  .addBearerAuth()
  .addTag('recommendations', 'Template and layer recommendation APIs')
  .addTag('analytics', 'Analytics and tracking APIs')
  .addTag('health', 'Health monitoring APIs')
  .addServer('https://dev.algorhythm.media', 'Development')
  .addServer('https://stg.algorhythm.media', 'Staging')
  .addServer('https://algorhythm.media', 'Production')
  .build();
