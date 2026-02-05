import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { OsloClient } from "./osloClient";

// Create server instance
const server = new McpServer({
    name: "caster-mcp-server",
    version: "1.0.0",
});

// Define tool using registerTool
server.registerTool(
    "calculate_sum",
    {
        description: "Add two numbers together",
        inputSchema: {
            a: z.number(),
            b: z.number(),
        },
    },
    async ({ a, b }) => {
        // Send a log message to the client
        const logMessage = `Calculating sum of ${a} and ${b}`;
        console.log(logMessage);
        server.sendLoggingMessage({
            level: "info",
            data: logMessage,
        });

        return {
            content: [
                {
                    type: "text",
                    text: String(a + b),
                },
            ],
        };
    }
);

server.registerTool(
    "caster_get_system_info",
    {
        description: "Get system info, use this to get the system info, get default values, get list of distribution methods supported, default file formats",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getCasterSystemInfo("");
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {

            const errorMessage = await error.cause.json();
            console.error("caster_get_system_info error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: errorMessage,
                    },
                ],
                isError: true,
            };
        }
    }
);

// Start server
async function main() {
    const app = express();
    app.use(cors());

    const transport = new StreamableHTTPServerTransport();

    await server.connect(transport);

    // Perform initial login
    await OsloClient.login();
    await OsloClient.init();

    app.all("/mcp", async (req, res) => {
        console.log(`Received request: ${req.method} ${req.url}`);
        try {
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error("Transport error:", error);
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
    });
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

