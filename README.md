# Developer API Gateway & Dashboard

A production-ready API gateway that manages traffic, enforces rate limits, caches responses, and provides usage analytics. Built as a capstone project integrating backend fundamentals.

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────────────┐     ┌──────────────┐
│   Client    │────▶│            API Gateway                  │────▶│   Upstream   │
└─────────────┘     │           (NestJS)                      │     │     API      │
                    │                                         │     └──────────────┘
┌─────────────┐     │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │
│  Dashboard  │────▶│  │API Key  │▶│  Rate   │▶│  Caching  │  │
│  (Next.js)  │     │  │ Guard   │ │ Limiter │ │Interceptor│  │
└─────────────┘     └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────────┐
                    │                                         │
              ┌─────▼─────┐                           ┌───────▼───────┐
              │   Redis   │                           │  PostgreSQL   │
              │  (Cache)  │                           │    (Data)     │
              └───────────┘                           └───────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **API Key Auth** | SHA-256 hashed keys with Redis-cached validation |
| **Rate Limiting** | 10 requests/minute per key (configurable) |
| **Response Caching** | 60-second TTL for GET requests |
| **Request Logging** | Full request/response logging to PostgreSQL |
| **Security Headers** | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| **Analytics Dashboard** | Real-time usage metrics and charts |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Installation

```bash
# Clone and install
git clone <repo-url>
cd day_24_project
pnpm install

# Start infrastructure
docker compose up -d

# Setup database
pnpm db:push

# Start development servers
pnpm dev:all
```

### Access Points

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3001 |
| Backend API | http://localhost:3002/api/v1 |
| Health Check | http://localhost:3002/api/v1/health |

## Usage

### Create an API Key

```bash
curl -X POST http://localhost:3002/api/v1/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "description": "Production key"}'
```

Response:
```json
{
  "id": "uuid",
  "key": "your-api-key-save-this",
  "keyPrefix": "abcd1234",
  "message": "Save this API key securely - it will not be shown again!"
}
```

### Make Authenticated Requests

```bash
curl http://localhost:3002/api/v1/proxy/posts/1 \
  -H "Authorization: Bearer your-api-key"
```

Response headers include:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 60
X-Cache: MISS
X-Response-Time: 245ms
```

### Rate Limiting

After 10 requests within a minute:

```bash
HTTP/1.1 429 Too Many Requests

{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Project Structure

```
├── apps/
│   ├── backend/                 # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── auth/            # API key management
│   │   │   ├── gateway/         # Request proxying & caching
│   │   │   ├── rate-limiting/   # Redis-based rate limiter
│   │   │   ├── analytics/       # Usage statistics
│   │   │   ├── redis/           # Redis service
│   │   │   └── prisma/          # Database service
│   │   └── prisma/
│   │       └── schema.prisma    # Database schema
│   │
│   └── frontend/                # Next.js Dashboard
│       └── src/
│           ├── app/             # Pages (dashboard, api-keys)
│           ├── components/      # UI components
│           └── lib/api/         # API client with safe fetch
│
└── docker-compose.yml           # PostgreSQL + Redis
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/keys` | Create new API key |
| GET | `/health` | Health check |

### Authenticated (requires API key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/keys` | List all API keys |
| GET | `/auth/keys/:id` | Get key details |
| DELETE | `/auth/keys/:id` | Revoke a key |
| ALL | `/proxy/*` | Proxy to upstream API |
| GET | `/analytics/overview` | Dashboard stats |
| GET | `/analytics/requests` | Request logs |

## Configuration

### Backend Environment Variables

```bash
# .env
PORT=3002
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/api_gateway?connection_limit=10"
REDIS_HOST=localhost
REDIS_PORT=6379
UPSTREAM_URL=https://jsonplaceholder.typicode.com
DEFAULT_RATE_LIMIT=10
DEFAULT_RATE_PERIOD=60000
```

### Frontend Environment Variables

```bash
# .env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## How It Works

### Request Flow

1. **API Key Guard** - Validates the key (checks Redis cache, then PostgreSQL)
2. **Rate Limit Guard** - Increments Redis counter, rejects if over limit
3. **Caching Interceptor** - Returns cached response for GET requests if available
4. **Gateway Controller** - Proxies request to upstream API
5. **Logging Interceptor** - Saves request details to PostgreSQL

### Caching Strategy

| Cache | TTL | Purpose |
|-------|-----|---------|
| API Key Validation | 5 min | Avoid DB hit on every request |
| Response Cache | 1 min | Speed up repeated GET requests |
| Rate Limit Window | 60 sec | Sliding window counter |

### Database Indexes

```sql
-- Fast time-range queries for analytics
CREATE INDEX idx_timestamp ON request_logs (timestamp DESC);

-- Per-user analytics
CREATE INDEX idx_apikey_timestamp ON request_logs (api_key_id, timestamp DESC);

-- Endpoint usage stats
CREATE INDEX idx_method_path ON request_logs (method, path);
```

## Development

```bash
# Run backend only
pnpm dev

# Run frontend only
pnpm dev:frontend

# Run both
pnpm dev:all

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Prisma Studio

# Docker
pnpm docker:up      # Start PostgreSQL + Redis
pnpm docker:down    # Stop containers
```

## Tech Stack

### Backend
- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 + Prisma ORM
- **Cache**: Redis 7 + ioredis
- **Security**: Helmet

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Security**: next-secure-headers

## License

MIT
