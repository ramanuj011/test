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

server.registerTool(
    "get_domains",
    {
        description: "Get list of domains",
        inputSchema: {
            pageSize: z.number().optional().describe("Number of items per page"),
        },
    },
    async ({ pageSize }) => {
        try {
            const resp = await OsloClient.getDomains({ pageSize });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_domains error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_myworkspace",
    {
        description: "Get user's workspace domains",
        inputSchema: {
            pageSize: z.number().optional().describe("Number of items per page"),
        },
    },
    async ({ pageSize }) => {
        try {
            const resp = await OsloClient.getMyWorkspace({ pageSize });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_myworkspace error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_recents",
    {
        description: "Get list of recent domains",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getRecents();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_recents error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_rcaster_status",
    {
        description: "Get ReportCaster health status",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getReportCasterStatus();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_rcaster_status error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "test_google_chat_connection",
    {
        description: "Test Google Chat connection",
        inputSchema: {
            name: z.string().describe("Profile name"),
            oauth2Properties: z.object({
                providerName: z.string().optional(),
                clientId: z.string().optional(),
                clientSecret: z.string().optional(),
                refreshToken: z.string().optional(),
                accessToken: z.string().optional(),
                authorizationUri: z.string().optional(),
                tokenUri: z.string().optional(),
                scope: z.string().optional(),
                authorizationCode: z.string().optional(),
                redirectUri: z.string().optional(),
            }).optional(),
            defaultSpaceName: z.object({
                name: z.string().optional(),
                id: z.string().optional(),
                type: z.string().optional(),
                description: z.string().optional(),
            }).optional(),
        },
    },
    async (config) => {
        try {
            const resp = await OsloClient.testGoogleChatConnection(config);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("test_google_chat_connection error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_messaging_profiles",
    {
        description: "Get list of messaging profiles",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getMessagingProfiles();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_messaging_profiles error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_user_group_lists",
    {
        description: "Get list of user groups",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getUserGroupLists();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_user_group_lists error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_access_lists",
    {
        description: "Get list of access lists",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getAccessLists();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_access_lists error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "delete_job_logs",
    {
        description: "Delete job logs",
        inputSchema: {
            logIds: z.array(z.string()).describe("List of log IDs to delete"),
        },
    },
    async ({ logIds }) => {
        try {
            const resp = await OsloClient.deleteJobLogs(logIds);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("delete_job_logs error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_feature_list",
    {
        description: "Get list of system features",
        inputSchema: {},
    },
    async () => {
        try {
            const resp = await OsloClient.getFeatureList();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(resp, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            const errorMessage = error.cause ? await error.cause.json() : error.message;
            console.error("get_feature_list error", errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(errorMessage, null, 2),
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

