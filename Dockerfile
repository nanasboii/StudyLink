FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

EXPOSE 3000
