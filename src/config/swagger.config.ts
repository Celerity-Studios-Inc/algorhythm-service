import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('AlgoRhythm Recommendation Engine')
  .setDescription(`
    AI-powered recommendation engine for ReViz video remixing platform.
    
    **V2.0 Features:**
    - ✅ GCP URL-based architecture (95% smaller responses)
    - ✅ Complete ReViz experience in single API call
    - ✅ Parallel CDN loading support
    - ✅ Mobile-optimized performance
    - ✅ Real-time recommendations with instant caching
    - ✅ HTTP keep-alive and request/response caching (Phase 1 optimizations)
    
    **Key Endpoints:**
    - \`/api/v1/reviz/complete-experience\` - Complete ReViz experience (V2.0)
    - \`/api/v1/recommend/template\` - Template recommendations
    - \`/api/v1/recommend/variations\` - Layer variations
    - \`/api/v1/health\` - Service health monitoring
    - \`/api/v1/daemon/trigger-index-build\` - Manual index rebuild (admin)
    
    **Performance Notes:**
    - Registry by-song: ~1.5–1.7s (dev) after fix 2dc7bfe
    - Template endpoint: targeting <2.5s cold / <0.8s warm (Phase 1)
  `)
  .setVersion('2.0.0')
  .addBearerAuth()
  .addTag('reviz', 'ReViz Complete Experience API (V2.0)')
  .addTag('recommendations', 'Template and layer recommendation APIs')
  .addTag('analytics', 'Analytics and tracking APIs')
  .addTag('health', 'Health monitoring APIs')
  .addTag('daemon', 'Operational maintenance (admin)')
  .addServer('https://dev.algorhythm.media', 'Development')
  .addServer('https://stg.algorhythm.media', 'Staging')
  .addServer('https://algorhythm.media', 'Production')
  .build();
