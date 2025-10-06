# Backend Dockerfile for Gestión de Actividad Laboral
# Runs TypeScript directly with tsx (no compilation needed)

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

# Copy all files
COPY . .

# Install ALL dependencies and tsx
RUN rm -f package-lock.json && \
    npm install && \
    npm install tsx && \
    chown -R nodejs:nodejs /app

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

# Run TypeScript directly with tsx
CMD ["npx", "tsx", "src/index.ts"]

# Add labels for better container management
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Backend API for activity management system" \
      version="1.0.0" \
      org.opencontainers.image.title="Gestión Actividad Backend" \
      org.opencontainers.image.description="Production backend container for activity management"
