import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OsloClient } from "../src/osloClient";
import { registerTools } from "../src/tools";

describe('MCP Tools Registration', () => {
    let server: McpServer;
    let oslo: OsloClient;

    beforeEach(() => {
        server = new McpServer({ name: 'test', version: '1.0.0' });
        oslo = new OsloClient({ baseUrl: 'http://test' });
    });

    it('should register tools without error', () => {
        expect(() => registerTools(server, oslo)).not.toThrow();
    });
});
