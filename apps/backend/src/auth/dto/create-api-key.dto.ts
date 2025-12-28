import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { STRING_LENGTH, RATE_LIMIT_BOUNDS } from '../../common/constants';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(STRING_LENGTH.API_KEY_NAME_MAX)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.DESCRIPTION_MAX)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(RATE_LIMIT_BOUNDS.MAX_REQUESTS)
  rateLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(RATE_LIMIT_BOUNDS.MIN_PERIOD_MS)
  @Max(RATE_LIMIT_BOUNDS.MAX_PERIOD_MS)
  ratePeriod?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
