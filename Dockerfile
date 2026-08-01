# Multi-stage Dockerfile for Next.js 14 ERP application with PNPM
# ================================================================

# Stage 1: Install ALL dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Set env for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build Next.js (standalone output)
RUN pnpm build

# Stage 3: Production runner
FROM node:18-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

# Install pnpm for runtime commands
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build (includes node_modules it needs)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma for migrations/seeding inside the container
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy .bin symlinks so npx/prisma CLI works
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# Copy seed dependencies and pdfkit for PDF generation
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/pdfkit ./node_modules/pdfkit
COPY --from=builder /app/node_modules/fontkit ./node_modules/fontkit
COPY --from=builder /app/node_modules/linebreak ./node_modules/linebreak
COPY --from=builder /app/node_modules/png-js ./node_modules/png-js
COPY --from=builder /app/node_modules/restructure ./node_modules/restructure
COPY --from=builder /app/node_modules/crypto-js ./node_modules/crypto-js
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder /app/package.json ./package.json

# Ensure uploads dir exists and add node_modules/.bin to PATH
ENV PATH="/app/node_modules/.bin:$PATH"
RUN mkdir -p /app/uploads /app/logs /app/public/uploads && \
    chown -R nextjs:nodejs /app

# Create startup script that handles database seeding
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
set -e

echo "Starting ERP application..."

# Wait for database to be ready
echo "Waiting for database connection..."
until npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy 2>/dev/null; do
  echo "Database not ready, waiting 5 seconds..."
  sleep 5
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "Migrations may have already been applied"

# Seed the database
echo "Seeding database with initial data..."
node prisma/seed.mjs || echo "Database may already be seeded"

echo "Starting Next.js server..."
exec node server.js
EOF

RUN chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]