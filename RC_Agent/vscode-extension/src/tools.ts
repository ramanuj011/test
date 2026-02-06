import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebFocusClient } from './webfocusApi';

export function registerTools(server: McpServer, wfClient: WebFocusClient) {
    server.registerTool(
        "get_system_info",
        {
            description: "Get WebFOCUS system information",
            inputSchema: {},
        },
        async () => {
            try {
                const data = await wfClient.getSystemInfo();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
                };
            }
        }
    );

    server.registerTool(
        "get_schedules",
        {
            description: "Get WebFOCUS report schedules",
            inputSchema: {},
        },
        async () => {
            try {
                const data = await wfClient.getSchedules();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
                };
            }
        }
    );

    server.registerTool(
        "get_domains",
        {
            description: "Get list of WebFOCUS domains",
            inputSchema: {
                pageSize: z.number().optional().describe("Number of items per page"),
            },
        },
        async ({ pageSize }) => {
            try {
                const data = await wfClient.getDomains();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getMyWorkspace();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
                };
            }
        }
    );

    server.registerTool(
        "get_recents",
        {
            description: "Get list of recent WebFOCUS domains",
            inputSchema: {},
        },
        async () => {
            try {
                const data = await wfClient.getRecents();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getReportCasterStatus();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
                };
            }
        }
    );

    server.registerTool(
        "test_google_chat_connection",
        {
            description: "Test Google Chat connection",
            inputSchema: {
                webhookUrl: z.string().describe("Profile webhook URL"),
            },
        },
        async ({ webhookUrl }) => {
            try {
                const data = await wfClient.testGoogleChatConnection({ webhookUrl });
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getMessagingProfiles();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getUserGroupLists();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getAccessLists();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.deleteJobLogs(logIds);
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
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
                const data = await wfClient.getFeatureList();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: error.message }],
                    isError: true
                };
            }
        }
    );
}
