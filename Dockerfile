FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY dist ./dist

EXPOSE 3000
