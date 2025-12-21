import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Generate a new API key
   * Note: The raw key is only returned once - save it securely!
   */
  @Public() // Allow unauthenticated access to create keys
  @Post('keys')
  async createApiKey(@Body() dto: CreateApiKeyDto) {
    const result = await this.authService.generateApiKey(dto);

    return {
      id: result.id,
      key: result.key,
      keyPrefix: result.prefix,
      name: dto.name,
      message:
        'Save this API key securely - it will not be shown again!',
    };
  }

  /**
   * List all API keys (for management dashboard)
   */
  @Get('keys')
  async listApiKeys() {
    const keys = await this.authService.listApiKeys();
    return { keys };
  }

  /**
   * Get a single API key by ID
   */
  @Get('keys/:id')
  async getApiKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.getApiKey(id);
  }

  /**
   * Revoke an API key
   */
  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(@Param('id', ParseUUIDPipe) id: string) {
    await this.authService.revokeApiKey(id);
  }
}
