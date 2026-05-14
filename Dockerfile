FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev deps needed for the frontend build)
COPY package*.json ./
RUN npm install

# Copy only files needed for build
COPY index.html vite.config.js ./
COPY src ./src

# Build the frontend
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production deps for smaller runtime image
COPY package*.json ./
RUN npm install --production

# Copy server source and built frontend from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]