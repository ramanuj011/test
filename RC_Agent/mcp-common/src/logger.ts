import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type TransportType = "stdio" | "http" | "unknown";

export class Logger {
    private server?: McpServer;
    private transport: TransportType = "unknown";

    constructor(server?: McpServer) {
        this.server = server;
    }

    public setServer(server: McpServer) {
        this.server = server;
    }

    public setTransport(transport: TransportType) {
        this.transport = transport;
    }

    public info(message: string, ...args: any[]) {
        const formattedMessage = `[INFO] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        this.logConditional(formattedMessage, "info");
        this.sendToMcp("info", formattedMessage);
    }

    public warn(message: string, ...args: any[]) {
        const formattedMessage = `[WARN] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        this.logConditional(formattedMessage, "warn");
        this.sendToMcp("warning", formattedMessage);
    }

    public error(message: string, ...args: any[]) {
        const formattedMessage = `[ERROR] ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`;
        console.error(formattedMessage); // Always safe to send to stderr
        this.sendToMcp("error", formattedMessage);
    }

    private logConditional(message: string, level: "info" | "warn") {
        if (this.transport === "stdio") {
            // In Stdio mode, stdout (console.log) corrupts the protocol stream.
            // stderr (console.error) is safe.
            console.error(message);
        } else {
            // In HTTP mode (or unknown), console.log is safe and preferred for Docker/standard logs.
            if (level === "info") {
                console.log(message);
            } else {
                console.warn(message);
            }
        }
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
