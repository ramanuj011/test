import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class Logger {
    private server?: McpServer;

    constructor(server?: McpServer) {
        this.server = server;
    }

    public setServer(server: McpServer) {
        this.server = server;
    }

    public info(message: string, ...args: any[]) {
        const formattedMessage = `[INFO] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        console.log(formattedMessage);
        this.sendToMcp("info", formattedMessage);
    }

    public warn(message: string, ...args: any[]) {
        const formattedMessage = `[WARN] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        console.warn(formattedMessage);
        this.sendToMcp("warning", formattedMessage);
    }

    public error(message: string, ...args: any[]) {
        const formattedMessage = `[ERROR] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        console.error(formattedMessage);
        this.sendToMcp("error", formattedMessage);
    }

    private sendToMcp(level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency", message: string) {
        if (this.server) {
            try {
                this.server.sendLoggingMessage({
                    level,
                    data: message,
                });
            } catch (err) {
                // Ignore errors during logging to prevent infinite loops
            }
        }
    }
}

export const logger = new Logger();
