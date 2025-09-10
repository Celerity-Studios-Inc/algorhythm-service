import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  ParseDatePipe,
  DefaultValuePipe,
  ParseIntPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get recommendation metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiQuery({ name: 'start', type: Date, description: 'Start date for metrics' })
  @ApiQuery({ name: 'end', type: Date, description: 'End date for metrics' })
  @Get('metrics/recommendations')
  @Roles('admin', 'analyst')
  async getRecommendationMetrics(
    @Query('start', new DefaultValuePipe(new Date(Date.now() - 24 * 60 * 60 * 1000)), new ParseDatePipe()) start: Date,
    @Query('end', new DefaultValuePipe(new Date()), new ParseDatePipe()) end: Date,
  ) {
    const metrics = await this.analyticsService.getRecommendationMetrics({ start, end });
    
    return {
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date().toISOString(),
        time_range: { start, end },
      },
    };
  }

  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @Get('metrics/performance')
  @Roles('admin', 'analyst')
  async getPerformanceMetrics(
    @Query('start', new DefaultValuePipe(new Date(Date.now() - 60 * 60 * 1000)), new ParseDatePipe()) start: Date,
    @Query('end', new DefaultValuePipe(new Date()), new ParseDatePipe()) end: Date,
  ) {
    const metrics = await this.analyticsService.getPerformanceMetrics({ start, end });
    
    return {
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date().toISOString(),
        time_range: { start, end },
      },
    };
  }

  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({ status: 200, description: 'Popular templates retrieved successfully' })
  @Get('popular/templates')
  async getPopularTemplates(
    @Query('song_id') songId?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const templates = await this.analyticsService.getPopularTemplates(songId, limit);
    
    return {
      success: true,
      data: templates,
      metadata: {
        timestamp: new Date().toISOString(),
        filters: { song_id: songId, limit },
      },
    };
  }
}
