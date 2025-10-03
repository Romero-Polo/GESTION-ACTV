# Backend Dockerfile for Gestión de Actividad Laboral
# Multi-stage build - compiles TypeScript to JavaScript for production

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    unixodbc-dev \
    freetds-dev || true

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --include=dev

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build && \
    npm prune --production

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    unixodbc \
    freetds || true

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Set timezone to Europe/Madrid (Spain)
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime 2>/dev/null || true && \
    echo $TZ > /etc/timezone 2>/dev/null || true

# Copy package.json
COPY package.json ./

# Copy production node_modules and compiled code from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p logs tmp uploads && \
    chown -R nodejs:nodejs logs tmp uploads && \
    chmod 755 logs tmp uploads

# Switch to app user
USER nodejs

# Set proper environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=1024" \
    UV_THREADPOOL_SIZE=4

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the compiled application
CMD ["node", "dist/index.js"]

# Add labels for better container management
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Backend API for activity management system" \
      version="1.0.0" \
      org.opencontainers.image.title="Gestión Actividad Backend" \
      org.opencontainers.image.description="Production backend container for activity management"
