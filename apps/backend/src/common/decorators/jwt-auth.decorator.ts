import { SetMetadata } from '@nestjs/common';

export const USE_JWT_AUTH_KEY = 'useJwtAuth';
export const UseJwtAuth = () => SetMetadata(USE_JWT_AUTH_KEY, true);
