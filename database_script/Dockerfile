# Dockerfile for Database Seeding Scripts
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all seeding scripts and utilities
COPY . .

# Make seed script executable
RUN chmod +x seed_all_services_enhanced_v3.py

# Environment variables will be provided at runtime
# DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# MONGODB_URI, CLOUDINARY_CLOUD_NAME, etc.

# Default command - runs the main seeding orchestrator
# Non-interactive mode (auto-confirm with 'y')
CMD echo "y" | python3 seed_all_services_enhanced_v3.py
