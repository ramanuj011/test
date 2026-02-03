# RC Agent Workspace

This workspace contains three services:

- `agent` - Node TypeScript CLI acting as the AI agent (calls MCP server).
- `mcp-server` - Node TypeScript Express server exposing `/mcp` and proxying to `schedule-service`.
- `schedule-service` - Java Spring Boot service exposing `/api/schedules`.

Architecture: Agent -> MCP Server -> Schedule Service

Quick start (local):

1. Start the schedule service (local java) or use docker compose.
2. Start the MCP server:
   - npm --prefix mcp-server run dev
3. Use the agent:
   - npm --prefix agent run start -- list-schedules

Quick start (docker):

- docker compose up --build
- npm --prefix agent run start -- list-schedules

See each service README for more details.
