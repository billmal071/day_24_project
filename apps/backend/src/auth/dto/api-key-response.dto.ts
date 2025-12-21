export class ApiKeyResponseDto {
  id: string;
  keyPrefix: string;
  name: string;
  description?: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export class CreateApiKeyResponseDto {
  id: string;
  key: string; // Raw key - only returned once on creation!
  keyPrefix: string;
  name: string;
  message: string;
}
