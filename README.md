# NestJS REST API Boilerplate

A production-minded NestJS REST API boilerplate for auth-backed products, dashboards, backoffices, mobile APIs, and service backends.

## Stack

- NestJS
- TypeScript strict mode
- Prisma
- PostgreSQL with Docker Compose
- JWT authentication
- `class-validator` and global `ValidationPipe`
- `ConfigModule` with Zod environment validation
- Pino request logging
- Swagger / OpenAPI
- ESLint
- Prettier
- Jest
- GitHub Actions CI

## Getting Started

```bash
git clone <repository-url> my-api
cd my-api
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run dev
```

Open <http://localhost:3001/api/v1/health>.

Swagger is available at <http://localhost:3001/docs>.

## Scripts

```bash
npm run dev            # Start local development
npm run build          # Create a production build
npm run start          # Start the production server from dist
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript without emitting files
npm run format         # Format the project
npm run format:check   # Check formatting
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run check          # Run the full local quality gate
npm run db:generate    # Generate Prisma Client
npm run db:migrate     # Create and apply a local Prisma migration
npm run db:deploy      # Apply migrations in deployed environments
npm run db:studio      # Open Prisma Studio
npm run db:reset       # Reset local database and replay migrations
```

## Project Structure

```txt
src/
  auth/                JWT auth module, DTOs, controller, service, strategy
  common/              Shared decorators, guards, and types
  config/              Environment schema and validation
  health/              Health check endpoint
  prisma/              Prisma module and service lifecycle
  users/               User lookup and profile endpoint
prisma/
  schema.prisma        Database schema
```

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env
```

The required values are:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:15432/devc_api?schema=public"
JWT_SECRET="replace-with-at-least-32-characters-secret"
```

Environment values are validated in `src/config/env.validation.ts`. The app fails fast during boot when required values are missing or malformed.

## Database

Start PostgreSQL locally:

```bash
docker compose up -d
```

Create and apply a migration:

```bash
npm run db:migrate
```

Generate Prisma Client after changing `prisma/schema.prisma`:

```bash
npm run db:generate
```

## API

The default API prefix is `api/v1`.

```txt
GET  /api/v1/health
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/users/me
```

Use the JWT returned from register or login as a bearer token:

```bash
Authorization: Bearer <accessToken>
```

## Conventions

- Use Node.js 22. The repo includes `.nvmrc` for Node version managers.
- Use `@/` imports for files inside `src`.
- Keep reusable cross-cutting pieces in `src/common`.
- Keep validated configuration in `src/config/env.validation.ts`.
- Keep database access behind module services instead of querying Prisma directly from controllers.
- Run `npm run check` before merging or deploying.

## CI

GitHub Actions runs `npm ci` and `npm run check` on pushes to `main` and pull requests.
