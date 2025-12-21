const { createSecureHeaders } = require('next-secure-headers');

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
              connectSrc: ["'self'", 'http://localhost:3000'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
            },
          },
          forceHTTPSRedirect: [
            true,
            { maxAge: 63072000, includeSubDomains: true, preload: true },
          ],
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
