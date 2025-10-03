# Frontend Dockerfile for Gestión de Actividad Laboral
# Multi-stage build - compiles TypeScript and creates production build

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Use --legacy-peer-deps if needed and ensure devDependencies are installed
RUN npm install --include=dev

# Copy all necessary files for build (excluding node_modules via .dockerignore)
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_APP_TITLE="Gestión de Actividad Laboral"
ARG VITE_APP_VERSION="1.0.0"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build

# Production stage - nginx
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set timezone
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime 2>/dev/null || true && \
    echo $TZ > /etc/timezone 2>/dev/null || true

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create health check endpoint
RUN echo 'OK' > /usr/share/nginx/html/health-check

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health-check || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Add labels
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Frontend web application for activity management" \
      version="1.0.0" \
      org.opencontainers.image.title="Gestión Actividad Frontend" \
      org.opencontainers.image.description="Production frontend container for activity management"
