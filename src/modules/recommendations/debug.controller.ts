import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import axios from 'axios';
import { CircuitBreakerService } from '../nna-integration/circuit-breaker.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { Logger } from '@nestjs/common';

@Controller('debug')
@ApiTags('Debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);
  
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService
  ) {}
  
  @Get('nna-test')
  @ApiOperation({ summary: 'Test NNA Registry connectivity' })
  async testNNA() {
    try {
      this.logger.log('🧪 Testing NNA Registry connectivity...');
      
      const response = await axios.get(
        'https://registry.dev.reviz.dev/health',
        { 
          timeout: 5000,
          headers: {
            'x-api-key': 'reviz-dev-30390-13220-4896-9516-9001'
          }
        }
      );
      
      this.logger.log(`✅ NNA Registry health check successful: ${response.status}`);
      
      return {
        status: 'success',
        nna_status: response.status,
        nna_data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ NNA Registry test failed: ${error.message}`);
      
      return {
        status: 'error',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('nna-composites-test')
  @ApiOperation({ summary: 'Test NNA Registry composites endpoint' })
  async testNNAComposites() {
    try {
      this.logger.log('🧪 Testing NNA Registry composites endpoint...');
      
      const response = await axios.get(
        'https://registry.dev.reviz.dev/api/v1/assets/composites/by-song/1.018.003.002',
        { 
          timeout: 10000,
          headers: {
            'x-api-key': 'reviz-dev-30390-13220-4896-9516-9001'
          }
        }
      );
      
      const compositeCount = response.data.length;
      this.logger.log(`✅ NNA Registry composites test successful: ${compositeCount} composites`);
      
      return {
        status: 'success',
        composite_count: compositeCount,
        sample_composite: response.data[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ NNA Registry composites test failed: ${error.message}`);
      
      return {
        status: 'error',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('nna-service-test')
  @ApiOperation({ summary: 'Test NNA Registry service directly' })
  async testNNAService() {
    try {
      this.logger.log('🧪 Testing NNA Registry service directly...');
      
      const composites = await this.optimizedNnaRegistryService.getCompositesForSongOptimized('1.018.003.002');
      
      this.logger.log(`✅ NNA Registry service test successful: ${composites.length} composites`);
      
      return {
        status: 'success',
        composites_count: composites.length,
        composites_preview: composites.slice(0, 2),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ NNA Registry service test failed: ${error.message}`);
      
      return {
        status: 'error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('environment')
  @ApiOperation({ summary: 'Check environment variables' })
  checkEnvironment() {
    return {
      status: 'success',
      environment: {
        NNA_REGISTRY_URL: process.env.NNA_REGISTRY_URL || 'NOT SET',
        NNA_API_KEY: process.env.NNA_API_KEY ? '***' + process.env.NNA_API_KEY.slice(-4) : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        PORT: process.env.PORT || 'NOT SET'
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('template-test')
  @ApiOperation({ summary: 'Test template endpoint with fallback data' })
  async testTemplateEndpoint() {
    try {
      this.logger.log('🧪 Testing template endpoint with fallback data...');
      
      // Simulate the fallback templates
      const fallbackTemplates = [
        {
          _id: 'test-template-1',
          nna_address: '9.000.000.001',
          name: 'Test Template 1',
          gcpStorageUrl: 'https://storage.googleapis.com/test-assets/template-1.mp4',
          thumbnailUrl: 'https://storage.googleapis.com/test-assets/template-1-thumb.jpg',
          previewUrl: 'https://storage.googleapis.com/test-assets/template-1-preview.mp4',
          description: 'A test template for debugging',
          tags: ['test', 'debug', 'fallback'],
          createdAt: new Date().toISOString(),
          star_id: '2.009.002.018',
          look_id: '3.003.001.001',
          move_id: '4.022.002.003',
          world_id: '5.015.001.001',
          duration: 30,
          fileSize: 15.2,
          resolution: '1080p',
          format: 'mp4',
          qualityScore: 0.9,
        }
      ];
      
      this.logger.log(`✅ Template test successful: ${fallbackTemplates.length} templates`);
      
      return {
        status: 'success',
        template_count: fallbackTemplates.length,
        templates: fallbackTemplates,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ Template test failed: ${error.message}`);
      
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('circuit-breaker-status')
  @ApiOperation({ summary: 'Check circuit breaker status' })
  async getCircuitBreakerStatus() {
    try {
      const status = this.circuitBreakerService.getStatus();
      
      return {
        status: 'success',
        circuit_breaker: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('circuit-breaker-reset')
  @ApiOperation({ summary: 'Reset circuit breaker' })
  async resetCircuitBreaker() {
    try {
      this.circuitBreakerService.resetCircuitBreaker();
      
      return {
        status: 'success',
        message: 'Circuit breaker reset successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
