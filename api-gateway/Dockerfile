# ============================================
# Stage 1: Builder stage with build tools
# ============================================
FROM kong:latest AS builder

# Switch to root user to install build tools
USER root

# Install gettext-base for envsubst
RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    rm -rf /var/lib/apt/lists/*

# Create and copy custom plugins
RUN mkdir -p /usr/local/share/lua/5.1/kong/plugins/jwt-claims-headers && \
    mkdir -p /usr/local/share/lua/5.1/kong/plugins/api-gateway-secret

COPY lua-plugins/jwt-claims-headers /usr/local/share/lua/5.1/kong/plugins/jwt-claims-headers/
COPY lua-plugins/api-gateway-secret /usr/local/share/lua/5.1/kong/plugins/api-gateway-secret/

# Copy configuration files
COPY kong.yml /etc/kong/kong.yml
COPY start-kong.sh /usr/local/bin/start-kong.sh

# Make startup script executable
RUN chmod +x /usr/local/bin/start-kong.sh

# ============================================
# Stage 2: Production runtime
# ============================================
FROM kong:latest AS production

# Switch to root user for setup
USER root

# Copy only the envsubst binary from builder (much smaller than full package)
COPY --from=builder /usr/bin/envsubst /usr/bin/envsubst

# Copy custom plugins from builder
COPY --from=builder /usr/local/share/lua/5.1/kong/plugins/ /usr/local/share/lua/5.1/kong/plugins/

# Copy configuration files from builder
COPY --from=builder /etc/kong/kong.yml /etc/kong/kong.yml
COPY --from=builder /usr/local/bin/start-kong.sh /usr/local/bin/start-kong.sh

# Revert to the non-privileged kong user for security
USER kong

# Set the custom startup script as the command to run
CMD ["start-kong.sh"]