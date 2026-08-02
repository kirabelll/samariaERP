# Multi-stage Dockerfile for Next.js 14 ERP application with NPM
# ================================================================

# Stage 1: Install ALL dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies using npm
RUN npm ci --legacy-peer-deps --only=production && \
    npm ci --legacy-peer-deps

# Stage 2: Build the application
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set env for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build Next.js
RUN npm run build

# Stage 3: Production runner
FROM node:18-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy prisma for migrations/seeding
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start-with-seed.js ./start-with-seed.js

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
exec npm start
EOF

RUN chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]