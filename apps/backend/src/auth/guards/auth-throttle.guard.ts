import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Auth Throttle Guard
 * IP-based rate limiting for authentication endpoints to prevent brute force attacks
 * More restrictive limits than general API rate limiting
 */
@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use IP address as the tracker for auth endpoints
    const forwarded = req.headers?.['x-forwarded-for'] as string;
    const ip =
      (forwarded ? forwarded.split(',')[0].trim() : (req.ip as string)) ||
      'unknown';
    return ip;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    throw new ThrottlerException(
      'Too many authentication attempts. Please try again later.',
    );
  }
}
