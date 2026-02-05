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
                    const data = await wfClient.getSystemInfo();
                    return {
                        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                    };
                }
            );

            server.registerTool(
                "get_schedules",
                {
                    description: "Get WebFOCUS report schedules",
                    inputSchema: {},
                },
                async () => {
                    const data = await wfClient.getSchedules();
                    return {
                        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                    };
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

        // Standard MCP SDK doesn't have a simple 'stop' on server/transport yet in some versions
        // but we can null them out and let GC handle it, or implement a proper close if available.
        server = undefined;
        transport = undefined;
        vscode.window.showInformationMessage('IBI WebFOCUS MCP Server stopped.');
    });

    context.subscriptions.push(startCommand, stopCommand);
}

export function deactivate() {
    server = undefined;
    transport = undefined;
}
