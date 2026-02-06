import * as vscode from 'vscode';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WebFocusClient } from './webfocusApi';

let server: McpServer | undefined;
let transport: StdioServerTransport | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('IBI WebFOCUS MCP Extension is now active!');

    const wfClient = new WebFocusClient();

    // Command to start the MCP Server
    let startCommand = vscode.commands.registerCommand('ibi-webfocus.startMcpServer', async () => {
        if (server) {
            vscode.window.showInformationMessage('MCP Server is already running.');
            return;
        }

        try {
            server = new McpServer({
                name: "ibi-webfocus-mcp-server",
                version: "1.0.0",
            });

            // Register Tools
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

            // Using Stdio transport as requested for external agent connection
            // Note: In VS Code, stdio might need careful handling depending on how it's launched
            transport = new StdioServerTransport();
            await server.connect(transport);

            vscode.window.showInformationMessage('IBI WebFOCUS MCP Server started (Stdio).');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
        }
    });

    let stopCommand = vscode.commands.registerCommand('ibi-webfocus.stopMcpServer', async () => {
        if (!server) {
            vscode.window.showInformationMessage('MCP Server is not running.');
            return;
        }

        try {
            // In Stdio transport, "stopping" might just mean closing the server
            // so the next start can create a new one.
            server = undefined;
            transport = undefined;
            vscode.window.showInformationMessage('WebFOCUS MCP Server stopped.');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to stop MCP Server: ${error.message}`);
        }
    });

    let testConnectionCommand = vscode.commands.registerCommand('ibi-webfocus.testConnection', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Testing WebFOCUS Connection...",
            cancellable: false
        }, async (progress) => {
            try {
                // Re-instantiate client to pick up latest config
                const testClient = new WebFocusClient();
                await testClient.testConnection();
                vscode.window.showInformationMessage('Successfully connected to WebFOCUS!');
            } catch (error: any) {
                vscode.window.showErrorMessage(`WebFOCUS Connection Failed: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(startCommand, stopCommand, testConnectionCommand);
}

export function deactivate() {
    server = undefined;
    transport = undefined;
}
