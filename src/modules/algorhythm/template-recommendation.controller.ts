import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TemplateRecommendationService } from './template-recommendation.service';

@Controller('api/v1/algorhythm')
@ApiTags('Template Recommendations')
export class TemplateRecommendationController {
  constructor(
    private readonly templateService: TemplateRecommendationService
  ) {}

  @Post('recommend/template')
  @ApiOperation({ summary: 'Get template recommendations for a song' })
  @ApiResponse({ 
    status: 200, 
    description: 'Template recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            song_id: { type: 'string' },
            recommendations: { type: 'array' },
            total_recommendations: { type: 'number' },
            response_time_ms: { type: 'number' }
          }
        }
      }
    }
  })
  async recommendTemplate(@Body() request: {
    song_id: string;
    user_context: { 
      user_id: string; 
      preferences?: any; 
      history?: any[] 
    };
  }) {
    const startTime = Date.now();
    
    try {
      const recommendations = await this.templateService.getRecommendations(
        request.song_id,
        request.user_context
      );
      
      return {
        success: true,
        data: {
          song_id: request.song_id,
          recommendations,
          total_recommendations: recommendations.length,
          response_time_ms: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Failed to get template recommendations',
          details: error.message
        },
        response_time_ms: Date.now() - startTime
      };
    }
  }
}
