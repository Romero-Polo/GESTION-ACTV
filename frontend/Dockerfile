# Frontend Dockerfile for Gestión de Actividad Laboral
# Serves source files directly with Vite (no TypeScript compilation needed)

FROM node:18-alpine

# Install necessary packages
RUN apk add --no-cache curl || true

# Create app user
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 -G frontend

# Set working directory
WORKDIR /app

# Set timezone
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime 2>/dev/null || true && \
    echo $TZ > /etc/timezone 2>/dev/null || true

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --only=production --omit=dev && \
    npm install vite @vitejs/plugin-react && \
    chown -R frontend:frontend /app

# Copy source code
COPY --chown=frontend:frontend . .

# Switch to app user
USER frontend

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    VITE_API_URL=/api

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start Vite dev server (serves files directly, compiles on-the-fly)
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "8080"]

# Add labels
LABEL maintainer="Gestión de Actividad Laboral" \
      description="Frontend web application for activity management" \
      version="1.0.0"
