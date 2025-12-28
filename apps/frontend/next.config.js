const { createSecureHeaders } = require('next-secure-headers');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security Headers (Day 20 - Security)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecureHeaders({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: "'self'",
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'", API_URL],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
            },
          },
          // Only force HTTPS in production
          forceHTTPSRedirect: isProduction
            ? [true, { maxAge: 63072000, includeSubDomains: true, preload: true }]
            : false,
          referrerPolicy: 'strict-origin-when-cross-origin',
          xContentTypeOptions: 'nosniff',
          xFrameOptions: 'DENY',
          xXSSProtection: '1; mode=block',
        }),
      },
    ];
  },
};

module.exports = nextConfig;
