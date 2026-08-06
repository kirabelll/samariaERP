# Multi-stage Dockerfile for Next.js 14 ERP application
# =====================================================

# Stage 1: Install ALL dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json ./
# Skip postinstall (prisma generate) since schema isn't here yet
RUN npm install --legacy-peer-deps --ignore-scripts

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

# Build Next.js (standalone output)
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

USER nextjs

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

CMD ["node", "server.js"]
