# Multi-stage production Dockerfile for HackHub
FROM node:20-alpine AS base

# Install system dependencies needed for native modules (e.g., canvas/pdfkit)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency specifications
COPY Backend/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY Backend/ ./
COPY Frontend/ ../Frontend/

# Create uploads directories
RUN mkdir -p uploads/avatars uploads/submissions uploads/banners

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
