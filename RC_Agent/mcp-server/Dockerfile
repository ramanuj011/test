FROM node:18-alpine AS build
WORKDIR /app

# Copy shared code
COPY mcp-common/src ./mcp-common/src

# Copy server package and config files
WORKDIR /app/mcp-server
COPY mcp-server/package.json mcp-server/package-lock.json* ./
COPY mcp-server/tsconfig.json ./
COPY mcp-server/jest.config.cjs ./

RUN npm ci --legacy-peer-deps || true

# Copy server source
COPY mcp-server/src ./src

# Ensure common directory is a real directory and populate it with shared code
RUN rm -rf src/common && mkdir -p src/common && cp -rf ../mcp-common/src/* src/common/

RUN npm run build

FROM node:18-alpine
WORKDIR /app/mcp-server
COPY --from=build /app/mcp-server/dist ./dist
# Copy runtime dependencies
COPY --from=build /app/mcp-server/node_modules ./node_modules
COPY mcp-server/package.json ./

# The app listens on 3000 by default
EXPOSE 3000
CMD ["node", "dist/index.js"]
