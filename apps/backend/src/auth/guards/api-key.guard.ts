import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract API key from header
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException({
        message: 'API key is required',
        code: 'MISSING_API_KEY',
      });
    }

    // Validate key (with Redis caching - Day 19)
    const validatedKey = await this.authService.validateApiKey(apiKey);
    if (!validatedKey) {
      throw new UnauthorizedException({
        message: 'Invalid or expired API key',
        code: 'INVALID_API_KEY',
      });
    }

    // Attach to request for later use (rate limiting, logging)
    request.apiKey = validatedKey;
    return true;
  }

  private extractApiKey(request: { headers: Record<string, string> }): string | null {
    // Support Authorization: Bearer <key>
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also support X-API-Key header
    return request.headers['x-api-key'] || null;
  }
}
