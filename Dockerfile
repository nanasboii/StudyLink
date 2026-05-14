FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev deps needed for the frontend build)
COPY package*.json ./
RUN npm install

<<<<<<< HEAD
# Copy only files needed for build to keep context stable
=======
COPY index.html vite.config.js ./
>>>>>>> laptop
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

RUN npm run build

EXPOSE 3000
<<<<<<< HEAD
CMD ["node", "src/server.js"]
=======
>>>>>>> laptop
