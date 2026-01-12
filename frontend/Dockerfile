# Use the official Node.js 18 image as base
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies using npm (aligns with your local workflow)
COPY package.json package-lock.json* ./
# Use npm ci for faster, more reliable installs from package-lock.json
RUN npm ci --no-audit --no-fund

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments and set them as environment variables
# This makes them available to the 'pnpm run build' command
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_TIMEOUT
ENV NEXT_PUBLIC_API_TIMEOUT=$NEXT_PUBLIC_API_TIMEOUT
ARG NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
ARG NEXT_PUBLIC_JWT_STORAGE_KEY
ENV NEXT_PUBLIC_JWT_STORAGE_KEY=$NEXT_PUBLIC_JWT_STORAGE_KEY
ARG NEXT_PUBLIC_JWT_REFRESH_STORAGE_KEY
ENV NEXT_PUBLIC_JWT_REFRESH_STORAGE_KEY=$NEXT_PUBLIC_JWT_REFRESH_STORAGE_KEY
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_DEBUG
ENV NEXT_PUBLIC_DEBUG=$NEXT_PUBLIC_DEBUG

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder from the project as it contains static assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
