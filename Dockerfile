# SIMPLE DOCKERFILE FOR ALGORHYTHM SERVICE
# Single-stage build to ensure dist/main.js is created

FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# 🔧 CRITICAL: Clean any existing dist directory
RUN rm -rf dist/ || true

# 🔧 CRITICAL: Build the application with error handling
RUN echo "🔨 Building TypeScript..." && \
    npm run build 2>&1 | tee build.log && \
    if [ $? -ne 0 ]; then \
        echo "❌ Build failed! Build log:"; \
        cat build.log; \
        exit 1; \
    fi && \
    echo "✅ Build completed successfully"

# 🔧 CRITICAL: Verify dist/main.js exists and is executable
RUN echo "🔍 Verifying build output..." && \
    ls -la dist/ && \
    if [ ! -f dist/main.js ]; then \
        echo "❌ dist/main.js not found after build!"; \
        echo "📁 Contents of dist/:"; \
        ls -la dist/; \
        echo "📄 Build log:"; \
        cat build.log 2>/dev/null || echo "No build log found"; \
        exit 1; \
    fi && \
    echo "✅ dist/main.js exists" && \
    echo "🔍 File size:" && \
    ls -lh dist/main.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S algorhythm -u 1001
RUN chown -R algorhythm:nodejs /usr/src/app
USER algorhythm

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/main.js"]
