# --- Base Image ---
FROM node:18-alpine

# --- Install health check tools ---
RUN apk add --no-cache wget curl

# --- Set working directory ---
WORKDIR /app

# --- Install dependencies ---
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# --- Copy source code ---
COPY . .

# --- Create logs directory ---
RUN mkdir -p logs

# --- Add non-root user for better security ---
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  chown -R nodejs:nodejs /app

USER nodejs

# --- Set environment variables ---
ENV NODE_ENV=production
ENV PORT=3005

# --- Expose port ---
EXPOSE 3005

# --- Healthcheck (for Render and Docker compatibility) ---
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# --- Start application ---
CMD ["npm", "start"]
