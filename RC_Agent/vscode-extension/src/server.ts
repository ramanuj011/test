#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OsloClient } from "./common/osloClient.js";
import { registerTools } from "./common/tools.js";
import { registerPrompts } from "./common/prompts.js";
import { logger } from "./common/logger.js";
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

    // Initialize logger with server instance
    logger.setServer(server);
    logger.setTransport("stdio");

    const oslo = OsloClient.fromEnv();

    registerTools(server, oslo);
    registerPrompts(server);

    const transport = new StdioServerTransport();
    log("Connecting to Stdio transport...");
    await server.connect(transport);
    log("IBI WebFOCUS MCP Server running on Stdio");
    logger.info("STATUS: IBI WebFOCUS MCP Server running on Stdio");
}

main().catch((error) => {
    log(`Fatal error in MCP server: ${error}`);
    console.error("Fatal error in MCP server:", error);
    process.exit(1);
});
