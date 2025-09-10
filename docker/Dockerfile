FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Production image, copy all the files and run nest
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 algorhythm
RUN adduser --system --uid 1001 algorhythm

# Copy necessary files from builder stage
COPY --from=deps --chown=algorhythm:algorhythm /app/node_modules ./node_modules
COPY --from=builder --chown=algorhythm:algorhythm /app/dist ./dist
COPY --from=builder --chown=algorhythm:algorhythm /app/package.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R algorhythm:algorhythm /app/logs

USER algorhythm

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { host: 'localhost', port: 3000, path: '/api/v1/health', timeout: 2000 }; \
  const req = http.get(options, (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }); \
  req.on('error', () => process.exit(1)); \
  req.end();"

CMD ["node", "dist/main"]
