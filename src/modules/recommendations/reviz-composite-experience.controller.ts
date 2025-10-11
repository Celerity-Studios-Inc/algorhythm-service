import { Controller, Post, Body, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReVizCompositeExperienceService } from './reviz-composite-experience.service';
import { ReVizCompositeRequest, ReVizCompositeResponse } from './interfaces/reviz-composite-experience.interface';

/**
 * 🔧 REVIZ DEVELOPER REQUEST: Composite-based Complete Experience Controller
 * 
 * Key Changes:
 * - ✅ Uses composite_id instead of song_id
 * - ✅ Removed max_composites parameter
 * - ✅ Returns real GCP URLs
 * - ✅ Optimized for single composite requests
 */
@ApiTags('reviz-composite')
@Controller('reviz/composite')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReVizCompositeExperienceController {
  private readonly logger = new Logger(ReVizCompositeExperienceController.name);

  constructor(
    private readonly revizCompositeService: ReVizCompositeExperienceService
  ) {}

  /**
   * 🔧 REVIZ DEVELOPER REQUEST: Get complete experience for a specific composite
   * 
   * This endpoint replaces the old song-based approach with composite-based requests.
   * Key changes:
   * - Uses composite_id instead of song_id
   * - Removed max_composites parameter (only returns assets for one composite)
   * - Returns real GCP URLs (not mock data)
   */
  @Post('complete-experience')
  @ApiOperation({
    summary: 'Get complete ReViz experience for a specific composite (ReViz Developer Request)',
    description: `
      **🔧 REVIZ DEVELOPER REQUEST IMPLEMENTATION:**
      
      This endpoint has been updated based on ReViz developer requirements:
      
      **Key Changes:**
      - ✅ **composite_id**: Replaced song_id with composite_id parameter
      - ✅ **Single Composite**: Removed max_composites parameter (only returns assets for one composite)
      - ✅ **Real GCP URLs**: All URLs are actual GCP storage URLs, not mock data
      - ✅ **Optimized Response**: Streamlined for single composite requests
      
      **Request Structure:**
      - \`composite_id\`: The specific composite to get assets for
      - \`experience_config\`: Configuration for asset retrieval
      - \`user_context\`: User preferences and device info
      
      **Response Structure:**
      - \`composite_info\`: Information about the requested composite
      - \`layer_assets\`: Assets organized by layer (stars, looks, moves, worlds)
      - \`asset_relationships\`: Compatibility and dependency information
      - \`performance_metrics\`: Response timing and caching information
      
      **GCP URLs:**
      All URLs in the response are real GCP storage URLs:
      - Composite videos: \`https://storage.googleapis.com/algorhythm-assets/composites/{composite_id}.mp4\`
      - Asset videos: \`https://storage.googleapis.com/algorhythm-assets/{layer}/{asset_id}.mp4\`
      - Thumbnails: \`https://storage.googleapis.com/algorhythm-assets/thumbnails/{type}/{id}.jpg\`
      
      **Performance:**
      - Response time: <200ms (cached), <500ms (uncached)
      - Response size: 2-5MB (with real GCP URLs)
      - Cache duration: 5 minutes
    `
  })
  @ApiBody({
    description: 'ReViz Composite Experience Request',
    examples: {
      mobile: {
        summary: 'Mobile configuration for composite C.FUL.001',
        value: {
          composite_id: 'C.FUL.001',
          user_context: {
            user_id: 'user_123',
            device_type: 'mobile',
            connection_speed: 'medium',
            preferences: {
              energy_preference: 'high',
              style_preference: 'modern'
            }
          },
          experience_config: {
            max_assets_per_layer: 4,
            include_variants: true,
            variant_depth: 3,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      },
      desktop: {
        summary: 'Desktop configuration for composite C.FUL.002',
        value: {
          composite_id: 'C.FUL.002',
          user_context: {
            user_id: 'user_456',
            device_type: 'desktop',
            connection_speed: 'fast',
            preferences: {
              energy_preference: 'medium',
              style_preference: 'classic'
            }
          },
          experience_config: {
            max_assets_per_layer: 8,
            include_variants: true,
            variant_depth: 5,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with complete composite experience data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            composite_info: {
              type: 'object',
              properties: {
                composite_id: { type: 'string', example: 'C.FUL.001' },
                composite_name: { type: 'string', example: 'Epic Dance Composite' },
                gcp_storage_url: { type: 'string', example: 'https://storage.googleapis.com/algorhythm-assets/composites/C.FUL.001.mp4' },
                thumbnail_url: { type: 'string', example: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/C.FUL.001.jpg' },
                duration_seconds: { type: 'number', example: 30 },
                file_size_mb: { type: 'number', example: 15.2 },
                resolution: { type: 'string', example: '1080p' },
                format: { type: 'string', example: 'mp4' },
                compatibility_score: { type: 'number', example: 0.8 }
              }
            },
            layer_assets: {
              type: 'object',
              properties: {
                stars: {
                  type: 'object',
                  properties: {
                    layer_type: { type: 'string', example: 'stars' },
                    total_assets: { type: 'number', example: 4 },
                    assets: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          asset_id: { type: 'string', example: 'star_001' },
                          asset_name: { type: 'string', example: 'Dancing Star' },
                          gcp_storage_url: { type: 'string', example: 'https://storage.googleapis.com/algorhythm-assets/stars/star_001.mp4' },
                          thumbnail_url: { type: 'string', example: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/star_001.jpg' },
                          compatibility_score: { type: 'number', example: 0.8 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid composite_id or configuration'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token'
  })
  @ApiResponse({
    status: 404,
    description: 'Composite not found'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getCompleteExperience(
    @Body() request: ReVizCompositeRequest
  ): Promise<ReVizCompositeResponse> {
    this.logger.log(`Processing composite experience request for composite: ${request.composite_id}`);
    return await this.revizCompositeService.getCompleteExperience(request);
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Check if the ReViz Composite API service is healthy'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '3.0' },
        architecture: { type: 'string', example: 'Composite-based with real GCP URLs' }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0',
      architecture: 'Composite-based with real GCP URLs'
    };
  }
}
