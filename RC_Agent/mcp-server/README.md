# MCP Server

Express server that exposes `POST /mcp` and proxies `getSchedules` requests to the schedule service.

Run locally:

- npm install
- npm run dev

Endpoints:
- POST /mcp { type: 'getSchedules' }
- GET /health
