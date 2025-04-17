# Etapa 1: build
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY . .

RUN npm install
RUN npm run build

# Etapa 2: produção
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /app/build ./build
COPY .env .env

CMD ["node", "build/server.js"]
