import { Controller, Post, Body, HttpStatus, Logger, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ReVizCompositeVariationsService } from './reviz-composite-variations.service';
import { ReVizCompositeVariationDto, ReVizCompositeVariationResponse } from './dto/reviz-composite-variation.dto';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CircuitBreakerService } from '../nna-integration/circuit-breaker.service';

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
    private readonly revizCompositeVariationsService: ReVizCompositeVariationsService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly circuitBreakerService: CircuitBreakerService
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

  /**
   * 🐛 DEBUG ENDPOINT: Test composite resolution directly
   * 
   * This endpoint allows isolated testing of the composite resolution flow
   * without going through the full variations service.
   * 
   * Usage: GET /api/v1/reviz/composite/debug/test-resolution?ids=1.018.003.002,2.009.001.001,3.003.010.002
   */
  @Get('debug/test-resolution')
  @ApiOperation({
    summary: '[DEBUG] Test composite resolution directly',
    description: 'Isolated test endpoint for composite resolution. Pass component IDs as comma-separated query parameter.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resolution test result'
  })
  async testCompositeResolution(
    @Query('ids') componentIdsString: string,
  ): Promise<any> {
    this.logger.log(`🐛 [DEBUG] Testing composite resolution for: ${componentIdsString}`);
    
    try {
      const componentIds = componentIdsString.split(',').map(id => id.trim()).filter(Boolean);
      
      if (componentIds.length < 2) {
        return {
          success: false,
          error: 'Need at least 2 component IDs',
          componentIds: componentIds
        };
      }

      this.logger.log(`🐛 [DEBUG] Parsed component IDs: ${JSON.stringify(componentIds)}`);
      
      const result = await this.optimizedNnaRegistryService.resolveOrGenerateComposite(componentIds);
      
      // Get last error from circuit breaker for debugging
      const lastError = this.circuitBreakerService.getLastError();
      
      return {
        success: true,
        input: {
          componentIdsString,
          componentIds
        },
        result: result,
        debug_info: {
          circuit_breaker_status: this.circuitBreakerService.getStatus(),
          last_error: lastError
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ [DEBUG] Resolution test failed:`, error.stack);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        input: {
          componentIdsString,
          componentIds: componentIdsString.split(',').map(id => id.trim()).filter(Boolean)
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔧 CIRCUIT BREAKER STATUS: Check circuit breaker state
   */
  @Get('debug/circuit-breaker-status')
  @ApiOperation({
    summary: '[DEBUG] Check circuit breaker status',
    description: 'Returns current circuit breaker state, failure count, and reset timeout'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker status'
  })
  async getCircuitBreakerStatus(): Promise<any> {
    const status = this.circuitBreakerService.getStatus();
    const lastError = this.circuitBreakerService.getLastError();
    
    return {
      success: true,
      circuit_breaker: {
        ...status,
        state: status.isOpen ? 'OPEN' : 'CLOSED',
        message: status.isOpen 
          ? `Circuit breaker is OPEN. Will auto-close after ${status.resetTimeout - status.timeSinceLastFailure}ms`
          : 'Circuit breaker is CLOSED. Requests are being processed normally.',
        last_error: lastError
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔧 CIRCUIT BREAKER RESET: Manually reset circuit breaker
   */
  @Get('debug/reset-circuit-breaker')
  @ApiOperation({
    summary: '[DEBUG] Reset circuit breaker',
    description: 'Manually resets the circuit breaker to CLOSED state. Use this if circuit breaker is stuck OPEN.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker reset result'
  })
  async resetCircuitBreaker(): Promise<any> {
    const statusBefore = this.circuitBreakerService.getStatus();
    this.circuitBreakerService.resetCircuitBreaker();
    const statusAfter = this.circuitBreakerService.getStatus();
    
    return {
      success: true,
      message: 'Circuit breaker reset successfully',
      before: {
        state: statusBefore.isOpen ? 'OPEN' : 'CLOSED',
        failure_count: statusBefore.failureCount
      },
      after: {
        state: statusAfter.isOpen ? 'OPEN' : 'CLOSED',
        failure_count: statusAfter.failureCount
      },
      timestamp: new Date().toISOString()
    };
  }
}
