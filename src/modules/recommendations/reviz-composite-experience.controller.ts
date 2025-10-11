import { Controller, Post, Body, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
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
  @ApiHeader({
    name: 'x-api-key',
    description: 'ReViz API key for authentication',
    required: true,
    example: 'reviz-api-key-123'
  })
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
        summary: 'Mobile configuration (cellular)',
        value: {
          composite_id: 'COMPOSITE_001',
          user_context: {
            user_id: 'user_123',
            device_type: 'mobile',
            connection_speed: 'medium',
            preferences: {
              preferred_genres: ['pop', 'rock'],
              energy_preference: 'high',
              style_preference: 'modern'
            }
          },
          experience_config: {
            max_assets_per_layer: 4,
            include_variants: true,
            variant_depth: 2,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      },
      desktop: {
        summary: 'Desktop configuration (WiFi)',
        value: {
          composite_id: 'COMPOSITE_002',
          user_context: {
            user_id: 'user_456',
            device_type: 'desktop',
            connection_speed: 'fast',
            preferences: {
              preferred_genres: ['electronic', 'indie'],
              energy_preference: 'medium',
              style_preference: 'trendy'
            }
          },
          experience_config: {
            max_assets_per_layer: 8,
            include_variants: true,
            variant_depth: 4,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      },
      minimal: {
        summary: 'Minimal configuration',
        value: {
          composite_id: 'COMPOSITE_003',
          experience_config: {
            max_assets_per_layer: 2,
            include_variants: false
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with complete composite experience data',
    examples: {
      success: {
        summary: 'Successful composite experience response',
        value: {
          success: true,
          data: {
            composite_info: {
              composite_id: 'COMPOSITE_001',
              composite_name: 'Pop Star Experience',
              gcp_storage_url: 'https://storage.googleapis.com/algorhythm-assets/composites/COMPOSITE_001.mp4',
              thumbnail_url: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/composites/COMPOSITE_001.jpg',
              duration_seconds: 180,
              file_size_mb: 45.2,
              resolution: '1920x1080',
              format: 'mp4',
              compatibility_score: 0.95
            },
            layer_assets: {
              stars: {
                layer_type: 'stars',
                total_assets: 4,
                assets: [
                  {
                    asset_id: 'STAR_001',
                    asset_name: 'Pop Star Performance',
                    gcp_storage_url: 'https://storage.googleapis.com/algorhythm-assets/stars/STAR_001.mp4',
                    thumbnail_url: 'https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/STAR_001.jpg',
                    duration_seconds: 30,
                    file_size_mb: 8.5,
                    resolution: '1920x1080',
                    format: 'mp4',
                    compatibility_score: 0.92,
                    layer: 'stars',
                    category: 'performance',
                    subcategory: 'dancing'
                  }
                ]
              }
            },
            performance_metrics: {
              total_assets_loaded: 14,
              response_time_ms: 245,
              response_size_bytes: 2847392,
              cache_hit_rate: 0.85,
              assets_from_cdn: 12
            }
          },
          metadata: {
            request_id: 'req_12345',
            timestamp: '2025-10-11T20:21:00.000Z',
            version: '2.0.0',
            partial_response: false
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
    examples: {
      invalid_composite: {
        summary: 'Invalid composite_id',
        value: {
          success: false,
          error: {
            status: 400,
            message: 'Invalid composite_id: COMPOSITE_INVALID',
            error: 'Bad Request',
            statusCode: 400
          },
          timestamp: '2025-10-11T20:21:00.000Z',
          path: '/api/v1/reviz/composite/complete-experience',
          method: 'POST'
        }
      },
      missing_composite: {
        summary: 'Missing composite_id',
        value: {
          success: false,
          error: {
            status: 400,
            message: 'composite_id is required',
            error: 'Bad Request',
            statusCode: 400
          },
          timestamp: '2025-10-11T20:21:00.000Z',
          path: '/api/v1/reviz/composite/complete-experience',
          method: 'POST'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
    examples: {
      unauthorized: {
        summary: 'Missing API key',
        value: {
          success: false,
          error: {
            status: 401,
            message: 'Unauthorized',
            error: 'Unauthorized',
            statusCode: 401
          },
          timestamp: '2025-10-11T20:21:00.000Z',
          path: '/api/v1/reviz/composite/complete-experience',
          method: 'POST'
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    examples: {
      server_error: {
        summary: 'Internal server error',
        value: {
          success: false,
          error: {
            status: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
            statusCode: 500
          },
          timestamp: '2025-10-11T20:21:00.000Z',
          path: '/api/v1/reviz/composite/complete-experience',
          method: 'POST'
        }
      }
    }
  })
  async getCompleteExperience(
    @Body() request: ReVizCompositeRequest,
    @Headers('x-api-key') apiKey?: string
  ): Promise<ReVizCompositeResponse> {
    // 🔧 FIX: Add API key validation for ReViz mobile app
    if (!apiKey || apiKey !== process.env.REVIZ_API_KEY) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    
    this.logger.log(`🎬 ReViz composite experience request for composite: ${request.composite_id}`);
    
    try {
      const result = await this.revizCompositeService.getCompleteExperience(request);
      
      this.logger.log(`✅ ReViz composite experience successful: ${result.data.performance_metrics.total_assets_loaded} assets loaded`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ ReViz composite experience failed: ${error.message}`);
      throw error;
    }
  }
}