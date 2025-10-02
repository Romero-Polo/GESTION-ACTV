# Frontend Dockerfile for Gestión de Actividad Laboral
# Multi-stage build for optimized production image

# Stage 1: Base stage with Node.js
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache git

# Create app user
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 -G frontend

# Set working directory
WORKDIR /app

# Change ownership
RUN chown -R frontend:frontend /app

# Stage 2: Dependencies stage
FROM base AS dependencies

# Switch to app user
USER frontend

# Copy package files
COPY --chown=frontend:frontend package*.json ./

# Install all dependencies for building
RUN npm ci --ignore-scripts

# Stage 3: Build stage
FROM dependencies AS build

# Set build-time environment variables for production
ARG VITE_API_URL=/api
ARG VITE_APP_TITLE="Gestión de Actividad Laboral"
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_TITLE=$VITE_APP_TITLE \
    VITE_APP_VERSION=$VITE_APP_VERSION

# Copy source code
COPY --chown=frontend:frontend . .

# Build the application with optimizations
RUN npm run build

# Run tests (optional - comment out if causing issues)
# RUN npm run test || true

# Stage 4: Production stage with Nginx
FROM nginx:1.25-alpine AS production

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    tini \
    tzdata

# Set timezone to Europe/Madrid (Spain)
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create non-root nginx user
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Copy built application from builder stage
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY --chown=root:root nginx.conf /etc/nginx/conf.d/app.conf

# Create required directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /tmp/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx \
        /var/cache/nginx \
        /var/log/nginx \
        /tmp/nginx \
        /var/run/nginx.pid \
        /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chmod 755 /var/cache/nginx /var/log/nginx /tmp/nginx

# Modify main nginx.conf to run as nginx user
RUN sed -i 's/user  nginx;/user nginx;/' /etc/nginx/nginx.conf || \
    sed -i '1i user nginx;' /etc/nginx/nginx.conf

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check with proper endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health-check || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Add labels for better container management
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Frontend web application for activity management" \
      version="1.0.0" \
      org.opencontainers.image.title="Gestión Actividad Frontend" \
      org.opencontainers.image.description="Production frontend container for activity management" \
      org.opencontainers.image.documentation="https://github.com/your-org/gestion-actividad"