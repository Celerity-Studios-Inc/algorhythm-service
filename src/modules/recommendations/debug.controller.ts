import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import axios from 'axios';

@Controller('debug')
@ApiTags('Debug')
export class DebugController {
  
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

  private logger = {
    log: (message: string) => console.log(`[DEBUG] ${message}`),
    error: (message: string) => console.error(`[DEBUG] ${message}`)
  };

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
}
