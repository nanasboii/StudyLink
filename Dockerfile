FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Create and ensure uploads directories exist
RUN mkdir -p /app/src/uploads/profile-pictures \
    && mkdir -p /app/src/uploads/resources \
    && mkdir -p /app/src/uploads/verifications

EXPOSE 3000
CMD ["node", "src/server.js"]
