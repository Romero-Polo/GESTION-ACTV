# Backend Dockerfile for Gestión de Actividad Laboral
# Multi-stage build for optimized production image

# Stage 1: Base dependencies stage
FROM node:18-alpine AS base

# Install essential packages (skip upgrade to avoid repository issues)
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini \
    ca-certificates \
    tzdata

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Change ownership of working directory
RUN chown -R nodejs:nodejs /app

# Stage 2: Dependencies stage
FROM base AS dependencies

# Install build dependencies (needed for native modules, including SQL Server)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    unixodbc-dev

# Switch to app user for npm operations
USER nodejs

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install all dependencies
# Using npm install for better compatibility across npm versions
RUN npm install --only=production --no-audit --prefer-offline && \
    cp -R node_modules prod_node_modules && \
    npm install --no-audit --prefer-offline

# Stage 3: Build stage
FROM dependencies AS build

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build the application
RUN npm run build

# Run tests in separate stage to not fail build if tests fail
# Comment out if you want tests to block production builds
# RUN npm run test:unit || true

# Stage 4: Production stage
FROM base AS production

# Install only runtime dependencies (SQL Server ODBC drivers)
RUN apk add --no-cache \
    unixodbc \
    freetds \
    freetds-dev

# Set timezone to Europe/Madrid (Spain)
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Switch to app user
USER nodejs

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/prod_node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories with proper permissions
USER root
RUN mkdir -p logs tmp uploads && \
    chown -R nodejs:nodejs logs tmp uploads && \
    chmod 755 logs tmp uploads
USER nodejs

# Set proper environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps" \
    UV_THREADPOOL_SIZE=4

# Expose port
EXPOSE 3000

# Add health check with more robust testing
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Add labels for better container management
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Backend API for activity management system" \
      version="1.0.0" \
      org.opencontainers.image.title="Gestión Actividad Backend" \
      org.opencontainers.image.description="Production backend container for activity management" \
      org.opencontainers.image.documentation="https://github.com/your-org/gestion-actividad"