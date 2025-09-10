import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsObject, 
  ValidateNested, 
  IsEnum,
  IsNumber,
  Min,
  Max 
} from 'class-validator';
import { Type } from 'class-transformer';

class UserPreferencesDto {
  @ApiProperty({ 
    description: 'User energy preference',
    enum: ['low', 'moderate', 'high'],
    example: 'high'
  })
  @IsOptional()
  @IsEnum(['low', 'moderate', 'high'])
  energy_preference?: 'low' | 'moderate' | 'high';

  @ApiProperty({ 
    description: 'User style preference',
    example: 'modern'
  })
  @IsOptional()
  @IsString()
  style_preference?: string;

  @ApiProperty({ 
    description: 'User genre preferences',
    example: ['pop', 'electronic']
  })
  @IsOptional()
  @IsString({ each: true })
  genre_preferences?: string[];
}

class DeviceInfoDto {
  @ApiProperty({ 
    description: 'Device platform',
    enum: ['ios', 'android'],
    example: 'ios'
  })
  @IsOptional()
  @IsEnum(['ios', 'android'])
  platform?: 'ios' | 'android';

  @ApiProperty({ 
    description: 'App version',
    example: '1.2.3'
  })
  @IsOptional()
  @IsString()
  version?: string;
}

class UserContextDto {
  @ApiProperty({ 
    description: 'User ID',
    example: 'user_12345'
  })
  @IsString()
  user_id: string;

  @ApiProperty({ 
    description: 'User preferences',
    type: UserPreferencesDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;

  @ApiProperty({ 
    description: 'Device information',
    type: DeviceInfoDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device_info?: DeviceInfoDto;
}

export class TemplateRecommendationDto {
  @ApiProperty({ 
    description: 'Song ID in NNA format',
    example: 'G.POP.TEN.001'
  })
  @IsString()
  song_id: string;

  @ApiProperty({ 
    description: 'User context for personalization',
    type: UserContextDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UserContextDto)
  user_context: UserContextDto;

  @ApiProperty({ 
    description: 'Maximum number of alternative recommendations',
    minimum: 1,
    maximum: 20,
    default: 5,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  max_alternatives?: number = 5;

  @ApiProperty({ 
    description: 'Include detailed scoring information',
    default: false,
    example: false
  })
  @IsOptional()
  include_scoring_details?: boolean = false;
}
