# Base image for building Next.js
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy the entire project
COPY . .

# Build the Next.js app
RUN npm run build

# Production image (lightweight)
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Copy built Next.js app from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose port 5050
EXPOSE 2222

# Start Next.js app
CMD ["npm", "start"]