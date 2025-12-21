import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimit?: number; // Requests per minute (default: 10)

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(3600000)
  ratePeriod?: number; // Period in milliseconds (default: 60000)

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
