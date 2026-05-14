FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev deps needed for the frontend build)
COPY package*.json ./
RUN npm install

# Copy only files needed for build to keep context stable
COPY src ./src
COPY index.html ./index.html
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
CMD ["node", "src/server.js"]
