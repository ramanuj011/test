FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production --legacy-peer-deps || true
COPY . .
EXPOSE 8081
CMD ["node", "src/index.js"]
