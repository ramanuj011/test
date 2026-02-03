# Schedule Service (Mock)

A small Express mock that exposes `GET /api/schedules` and returns a fixed sample list.

Run locally:
- npm install
- npm start

Docker:
- docker build -t schedule-service-mock ./schedule-service-mock
- docker run -p 8081:8081 schedule-service-mock

Useful for testing MCP server / agent flows without running the Java service.
