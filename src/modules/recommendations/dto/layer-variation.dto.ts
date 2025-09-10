import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum,
  IsNumber,
  Min,
  Max 
} from 'class-validator';

export class LayerVariationDto {
  @ApiProperty({ 
    description: 'Current template ID',
    example: 'C.001.001.001'
  })
  @IsString()
  current_template_id: string;

  @ApiProperty({ 
    description: 'Layer to vary',
    enum: ['stars', 'looks', 'moves', 'worlds'],
    example: 'stars'
  })
  @IsEnum(['stars', 'looks', 'moves', 'worlds'])
  vary_layer: 'stars' | 'looks' | 'moves' | 'worlds';

  @ApiProperty({ 
    description: 'Song ID for compatibility scoring',
    example: 'G.POP.TEN.001'
  })
  @IsString()
  song_id: string;

  @ApiProperty({ 
    description: 'Maximum number of variations to return',
    minimum: 1,
    maximum: 20,
    default: 8,
    example: 8
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 8;

  @ApiProperty({ 
    description: 'Include detailed scoring information',
    default: false,
    example: false
  })
  @IsOptional()
  include_scoring_details?: boolean = false;
}
