import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OsloClient } from "./osloClient";
import { logger } from "./logger";

/**
 * Wrapper for tool handlers to provide consistent error handling and logging.
 */
async function wrapTool(toolName: string, handler: () => Promise<any>) {
    try {
        logger.info(`Executing tool: ${toolName}`);
        const result = await handler();
        return {
            content: [
                {
                    type: "text" as const,
                    text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error: any) {
        logger.error(`Error in tool ${toolName}:`, error.message);
        return {
            content: [
                {
                    type: "text" as const,
                    text: error.message || "An unknown error occurred",
                },
            ],
            isError: true,
        };
    }
}

export function registerTools(server: McpServer, oslo: OsloClient) {
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
            logger.info(`Calculating sum of ${a} and ${b}`);
            return {
                content: [{ type: "text", text: String(a + b) }],
            };
        }
    );

    server.registerTool(
        "get_system_info",
        {
            description: "Get general WebFOCUS system info including session details",
            inputSchema: {},
        },
        async () => wrapTool("get_system_info", () => oslo.getSystemInfo())
    );

    server.registerTool(
        "caster_get_system_info",
        {
            description: "Get ReportCaster system info, default values, distribution methods, and formats",
            inputSchema: {
                handleOrPath: z.string().optional().describe("Folder handle or path"),
            },
        },
        async ({ handleOrPath }) => wrapTool("caster_get_system_info", () => oslo.getCasterSystemInfo(handleOrPath))
    );

    server.registerTool(
        "get_domains",
        {
            description: "Get list of available domains",
            inputSchema: {
                pageSize: z.number().optional().describe("Number of items per page"),
            },
        },
        async (options) => wrapTool("get_domains", () => oslo.getDomains(options))
    );

    server.registerTool(
        "get_myworkspace",
        {
            description: "Get user's workspace domains",
            inputSchema: {
                pageSize: z.number().optional().describe("Number of items per page"),
            },
        },
        async (options) => wrapTool("get_myworkspace", () => oslo.getMyWorkspace(options))
    );

    server.registerTool(
        "get_recents",
        {
            description: "Get list of recently accessed domains",
            inputSchema: {},
        },
        async () => wrapTool("get_recents", () => oslo.getRecents())
    );

    server.registerTool(
        "get_rcaster_status",
        {
            description: "Get ReportCaster health status",
            inputSchema: {},
        },
        async () => wrapTool("get_rcaster_status", () => oslo.getReportCasterStatus())
    );

    server.registerTool(
        "test_google_chat_connection",
        {
            description: "Test Google Chat connection with provided configuration",
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
        async (config) => wrapTool("test_google_chat_connection", () => oslo.testGoogleChatConnection(config))
    );

    server.registerTool(
        "get_messaging_profiles",
        {
            description: "Get list of messaging delivery profiles",
            inputSchema: {},
        },
        async () => wrapTool("get_messaging_profiles", () => oslo.getMessagingProfiles())
    );

    server.registerTool(
        "get_user_group_lists",
        {
            description: "Get list of user groups",
            inputSchema: {},
        },
        async () => wrapTool("get_user_group_lists", () => oslo.getUserGroupLists())
    );

    server.registerTool(
        "get_access_lists",
        {
            description: "Get list of access lists",
            inputSchema: {},
        },
        async () => wrapTool("get_access_lists", () => oslo.getAccessLists())
    );

    server.registerTool(
        "delete_job_logs",
        {
            description: "Delete job logs for specified IDs",
            inputSchema: {
                logIds: z.array(z.string()).describe("List of log IDs to delete"),
            },
        },
        async ({ logIds }) => wrapTool("delete_job_logs", () => oslo.deleteJobLogs(logIds))
    );

    server.registerTool(
        "get_feature_list",
        {
            description: "Get list of enabled system features",
            inputSchema: {},
        },
        async () => wrapTool("get_feature_list", () => oslo.getFeatureList())
    );
}
