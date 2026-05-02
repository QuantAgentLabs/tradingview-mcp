FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV TRADINGVIEW_CDP_HOST=0.250.250.254
ENV TRADINGVIEW_CDP_PORT=9222

CMD ["node", "src/server.js"]
