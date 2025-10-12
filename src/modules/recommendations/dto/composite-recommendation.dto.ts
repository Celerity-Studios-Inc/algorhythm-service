import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CompositeUserContext {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

export class CompositeRecommendationDto {
  @IsString()
  composite_id: string;

  @ValidateNested()
  @Type(() => CompositeUserContext)
  user_context: CompositeUserContext;

  @IsOptional()
  @IsObject()
  experience_config?: {
    max_assets_per_layer?: number;
    include_metadata?: boolean;
    quality_preference?: 'high' | 'medium' | 'low';
  };
}
