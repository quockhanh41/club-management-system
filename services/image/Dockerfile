# ============================================
# Stage 1: Base image with system dependencies
# ============================================
FROM node:18-alpine AS base

# Install health check tools
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# ============================================
# Stage 2: Production dependencies
# ============================================
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 3: Development dependencies
# ============================================
FROM deps AS deps-dev

# Install all dependencies (including dev)
RUN npm ci && npm cache clean --force

# ============================================
# Stage 4: Production runtime
# ============================================
FROM base AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create uploads and logs directories with correct permissions
RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/health || exit 1

# Start the service
CMD ["npm", "start"]

# ============================================
# Stage 5: Development runtime
# ============================================
FROM deps-dev AS development

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3004

# Start development server
CMD ["npm", "run", "dev"]
