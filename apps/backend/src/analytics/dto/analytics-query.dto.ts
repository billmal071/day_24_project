import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ANALYTICS_LIMITS } from '../../common/constants';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ANALYTICS_LIMITS.MAX_LIMIT)
  limit?: number = ANALYTICS_LIMITS.DEFAULT_LIMIT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ANALYTICS_LIMITS.DEFAULT_OFFSET)
  offset?: number = ANALYTICS_LIMITS.DEFAULT_OFFSET;

  @IsOptional()
  @IsString()
  apiKeyId?: string;
}
