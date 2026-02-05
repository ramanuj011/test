"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const webfocusApi_1 = require("./webfocusApi");
let server;
let transport;
function activate(context) {
    console.log('IBI WebFOCUS MCP Extension is now active!');
    const wfClient = new webfocusApi_1.WebFocusClient();
    // Command to start the MCP Server
    let startCommand = vscode.commands.registerCommand('ibi-webfocus.startMcpServer', async () => {
        if (server) {
            vscode.window.showInformationMessage('MCP Server is already running.');
            return;
        }
        try {
            server = new mcp_js_1.McpServer({
                name: "ibi-webfocus-vscode-server",
                version: "1.0.0",
            });
            // Register Tools
            server.registerTool("get_system_info", {
                description: "Get WebFOCUS system information",
                inputSchema: {},
            }, async () => {
                const data = await wfClient.getSystemInfo();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            });
            server.registerTool("get_schedules", {
                description: "Get WebFOCUS report schedules",
                inputSchema: {},
            }, async () => {
                const data = await wfClient.getSchedules();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            });
            // Using Stdio transport as requested for external agent connection
            // Note: In VS Code, stdio might need careful handling depending on how it's launched
            transport = new stdio_js_1.StdioServerTransport();
            await server.connect(transport);
            vscode.window.showInformationMessage('IBI WebFOCUS MCP Server started (Stdio).');
        }
        catch (error) {
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
function deactivate() {
    server = undefined;
    transport = undefined;
}
//# sourceMappingURL=extension.js.map