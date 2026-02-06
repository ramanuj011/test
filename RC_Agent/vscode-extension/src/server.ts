#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebFocusClient } from "./webfocusApi.js";
import { registerTools } from "./tools.js";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOG_FILE = path.join(os.tmpdir(), "ibi-webfocus-mcp.log");

function log(message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

async function main() {
    log("IBI WebFOCUS MCP Server starting...");
    const server = new McpServer({
        name: "ibi-webfocus-mcp-server",
        version: "1.0.0",
    });

    const wfClient = new WebFocusClient({
        baseUrl: process.env.OSLO_BASE_URL || "http://localhost:8080/webfocus",
        username: process.env.OSLO_USERNAME,
        password: process.env.OSLO_PASSWORD,
    });

    registerTools(server, wfClient);

    const transport = new StdioServerTransport();
    log("Connecting to Stdio transport...");
    await server.connect(transport);
    log("IBI WebFOCUS MCP Server running on Stdio");
    console.error("IBI WebFOCUS MCP Server running on Stdio");
}

main().catch((error) => {
    log(`Fatal error in MCP server: ${error}`);
    console.error("Fatal error in MCP server:", error);
    process.exit(1);
});
