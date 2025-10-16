import { Controller, Post, Body, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ReVizCompositeVariationsService } from './reviz-composite-variations.service';
import { ReVizCompositeVariationDto, ReVizCompositeVariationResponse } from './dto/reviz-composite-variation.dto';

/**
 * 🔧 REVIZ DEVELOPER REQUEST: Composite-Specific Layer Variations
 * 
 * This controller provides the missing endpoint that ReViz developers need:
 * - Get variant assets for a SPECIFIC composite (not just a song)
 * - Allows users to click on a specific video and get variants for that exact composite
 * - Maintains the composite context for proper remixing
 */
@ApiTags('reviz-composite-variations')
@Controller('reviz/composite')
export class ReVizCompositeVariationsController {
  private readonly logger = new Logger(ReVizCompositeVariationsController.name);

  constructor(
    private readonly revizCompositeVariationsService: ReVizCompositeVariationsService
  ) {}

  /**
   * 🔧 REVIZ DEVELOPER REQUEST: Get layer variations for a specific composite
   * 
   * This endpoint provides the missing functionality that ReViz developers need:
   * - Uses composite_id instead of song_id
   * - Returns variant assets for the specific composite the user clicked on
   * - Maintains composite context for proper remixing experience
   */
  @Post('variations')
  @ApiHeader({
    name: 'x-api-key',
    description: 'ReViz API key for authentication',
    required: true,
    example: 'reviz-dev-30390-13220-4896-9516-9001'
  })
  @ApiOperation({
    summary: 'Get layer variations for a specific composite (ReViz Developer Request)',
    description: `
      **🔧 REVIZ DEVELOPER REQUEST IMPLEMENTATION:**
      
      This endpoint provides the missing functionality that ReViz developers need:
      
      **Key Features:**
      - ✅ **composite_id**: Uses specific composite ID instead of song ID
      - ✅ **Composite Context**: Maintains the exact composite the user clicked on
      - ✅ **Layer Variations**: Returns variant assets for the specified layer
      - ✅ **Real GCP URLs**: All URLs are actual GCP storage URLs
      - ✅ **Compatibility Scoring**: Scores variants based on composite context
      
      **Request Structure:**
      - \`composite_id\`: The specific composite to get variations for
      - \`vary_layer\`: The layer to get variations for (stars, looks, moves, worlds)
      - \`limit\`: Maximum number of variations to return
      - \`user_context\`: User preferences for personalized results
      
      **Response Structure:**
      - \`composite_info\`: Information about the requested composite
      - \`current_layer_asset\`: The current asset in the specified layer
      - \`variations\`: Array of variant assets for the layer
      - \`compatibility_scores\`: Compatibility scores for each variant
      - \`performance_metrics\`: Response timing and caching information
      
      **Use Case:**
      User clicks on a specific composite video → Gets variants for that exact composite
      This maintains the composite context for proper remixing experience.
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Layer variations generated successfully for the specific composite',
    type: ReVizCompositeVariationResponse
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Composite not found'
  })
  @ApiBody({ type: ReVizCompositeVariationDto })
  async getCompositeVariations(
    @Body() request: ReVizCompositeVariationDto,
  ): Promise<ReVizCompositeVariationResponse> {
    const startTime = Date.now();
    
    this.logger.log(
      `🔧 ReViz Composite Variations requested for composite: ${request.composite_id}, layers: ${request.vary_layers.join(', ')}`
    );

    try {
      const result = await this.revizCompositeVariationsService.getCompositeVariations(request);
      
      const responseTime = Date.now() - startTime;
      this.logger.log(
        `✅ ReViz Composite Variations completed in ${responseTime}ms for composite: ${request.composite_id}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ ReViz Composite Variations failed for composite: ${request.composite_id}`,
        error.stack
      );
      throw error;
    }
  }
}
