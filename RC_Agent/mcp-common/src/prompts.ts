import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Registers prompts with the MCP server.
 */
export function registerPrompts(server: McpServer) {
    server.prompt(
        "webfocus-assistant",
        {
            topic: z.string().describe("The WebFOCUS topic to assist with"),
        },
        ({ topic }) => ({
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Help me with the following WebFOCUS topic: ${topic}. Please provide a concise explanation. Use WebFOCUS MCP tools to get the information.`,
                    },
                },
            ],
        })
    );

    console.log("[INFO] Registered sample prompt: webfocus-assistant");
}
