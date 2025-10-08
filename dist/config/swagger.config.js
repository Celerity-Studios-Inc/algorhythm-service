"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerConfig = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.swaggerConfig = new swagger_1.DocumentBuilder()
    .setTitle('AlgoRhythm Recommendation Engine')
    .setDescription(`
    AI-powered recommendation engine for ReViz video remixing platform.
    
    **V2.0 Features:**
    - ✅ GCP URL-based architecture (95% smaller responses)
    - ✅ Complete ReViz experience in single API call
    - ✅ Parallel CDN loading support
    - ✅ Mobile-optimized performance
    - ✅ Real-time recommendations with instant caching
    
    **Key Endpoints:**
    - \`/api/v1/reviz/complete-experience\` - Complete ReViz experience (V2.0)
    - \`/api/v1/recommend/template\` - Template recommendations
    - \`/api/v1/recommend/variations\` - Layer variations
    - \`/api/v1/health\` - Service health monitoring
  `)
    .setVersion('2.0.0')
    .addBearerAuth()
    .addTag('reviz', 'ReViz Complete Experience API (V2.0)')
    .addTag('recommendations', 'Template and layer recommendation APIs')
    .addTag('analytics', 'Analytics and tracking APIs')
    .addTag('health', 'Health monitoring APIs')
    .addServer('https://dev.algorhythm.media', 'Development')
    .addServer('https://stg.algorhythm.media', 'Staging')
    .addServer('https://algorhythm.media', 'Production')
    .build();
//# sourceMappingURL=swagger.config.js.map