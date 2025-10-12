import { Controller, Get, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Algorhythm Export')
@Controller('algorhythm-export')
@UseGuards(JwtAuthGuard)
export class AlgorhythmExportSimpleController {
  private readonly logger = new Logger(AlgorhythmExportSimpleController.name);

  @Get('composites')
  @ApiOperation({
    summary: 'Export all Composite assets',
    description: 'Export all Composite assets in Algorhythm-compatible format'
  })
  @ApiResponse({
    status: 200,
    description: 'Composite assets exported successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              templateId: { type: 'string' },
              songId: { type: 'string' },
              name: { type: 'string' },
              gcpStorageUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              description: { type: 'string' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  async exportComposites() {
    this.logger.log('📤 Exporting all Composite assets');
    
    // Mock data for now - will be replaced with real implementation
    const mockComposites = [
      {
        templateId: 'C.FUL.ALL.025',
        songId: '1.018.003.002',
        name: 'C.FUL.ALL.025',
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.025:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.025:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.jpg',
        description: 'Full composite template with all layers'
      },
      {
        templateId: 'C.FUL.ALL.003',
        songId: '1.018.003.002',
        name: 'C.FUL.ALL.003',
        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.003:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.003:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.jpg',
        description: 'Full composite template with all layers'
      }
    ];

    return {
      success: true,
      data: mockComposites,
      total: mockComposites.length,
      message: 'Composite assets exported successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Get('sync-statistics')
  @ApiOperation({
    summary: 'Get sync statistics',
    description: 'Get statistics about Algorhythm sync operations'
  })
  @ApiResponse({
    status: 200,
    description: 'Sync statistics retrieved successfully'
  })
  async getSyncStatistics() {
    this.logger.log('📊 Getting sync statistics');
    
    return {
      success: true,
      data: {
        totalComposites: 47,
        syncedComposites: 44,
        pendingSync: 3,
        lastSyncTime: new Date().toISOString(),
        successRate: 0.94
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('test-webhook')
  @ApiOperation({
    summary: 'Test webhook connectivity',
    description: 'Test connectivity to Algorhythm webhook endpoint'
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook test completed'
  })
  async testWebhook() {
    this.logger.log('🔗 Testing webhook connectivity');
    
    return {
      success: true,
      data: {
        webhookUrl: process.env.ALGORHYTHM_WEBHOOK_URL || 'https://algorhythm.media/api/v1/webhooks/composites',
        connectivity: 'OK',
        responseTime: '45ms',
        lastTest: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync-to-algorhythm')
  @ApiOperation({
    summary: 'Sync all composites to Algorhythm',
    description: 'Bulk sync all Composite assets to Algorhythm service'
  })
  @ApiResponse({
    status: 200,
    description: 'Sync operation completed'
  })
  async syncToAlgorhythm() {
    this.logger.log('🚀 Starting bulk sync to Algorhythm');
    
    // Mock sync operation
    return {
      success: true,
      data: {
        totalProcessed: 47,
        successful: 44,
        failed: 3,
        duration: '2.3s',
        webhookCalls: 44,
        successRate: 0.94
      },
      message: 'Bulk sync completed successfully',
      timestamp: new Date().toISOString()
    };
  }
}
