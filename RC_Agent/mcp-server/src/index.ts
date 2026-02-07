import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { OsloClient } from "./common/osloClient.js";
import { registerTools } from "./common/tools.js";
import { logger } from "./common/logger.js";

async function main() {
    // Initialize MCP server
    const server = new McpServer({
        name: "ibi-webfocus-mcp-server",
        version: "1.0.0",
    });

    // Initialize logger with server instance
    logger.setServer(server);

    // Initialize WebFOCUS client
    const oslo = OsloClient.fromEnv();

    // Register modular tools
    registerTools(server, oslo);

    // Setup Express with Streamable HTTP transport
    const app = express();
    app.use(cors());

    const transport = new StreamableHTTPServerTransport();

    try {
        logger.info("Connecting MCP server to transport...");
        await server.connect(transport);

        // Pre-initialize basic session and metadata
        logger.info("Initializing WebFOCUS session...");
        await oslo.init();

        app.all("/mcp", async (req, res) => {
            logger.info(`Received ${req.method} request on /mcp`);
            try {
                await transport.handleRequest(req, res);
            } catch (error: any) {
                logger.error("Transport handled request error:", error.message);
            }
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            logger.info(`IBI WebFOCUS MCP Server is running on http://localhost:${PORT}`);
            logger.info(`MCP Endpoint: http://localhost:${PORT}/mcp`);
        });

    } catch (error: any) {
        logger.error("Failed to start MCP server:", error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal startup error:", error);
    process.exit(1);
});
