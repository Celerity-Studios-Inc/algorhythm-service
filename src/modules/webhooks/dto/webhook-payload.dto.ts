import { IsString, IsObject, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebhookPayloadDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event signature', required: false })
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiProperty({ description: 'Nested data payload (NNA Registry format)', required: false })
  @IsObject()
  @IsOptional()
  data?: any;
}
