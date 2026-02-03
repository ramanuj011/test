"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const SCHEDULE_URL = process.env.SCHEDULE_URL || 'http://localhost:8081/api/schedules';
const OSLO_USERNAME = process.env.OSLO_USERNAME || 'secret';
const OSLO_PASSWORD = process.env.OSLO_PASSWORD || 'terces';
const OSLO_BASE_URL = process.env.OSLO_BASE_URL || 'http://localhost:8080/webfocus';
const OSLO_API_URL = `${OSLO_BASE_URL}/oslo/1.0`;
const OSLO_LOGIN_URL = `${OSLO_BASE_URL}/service/wf_security_check.jsp`;
let osloCookies = "";
async function loginToOslo() {
    try {
        console.log("Attempting to login to Oslo (POST)...");
        // Using credentials in body for the POST call
        const response = await axios_1.default.post(OSLO_LOGIN_URL, null, {
            params: {
                IBIB_userid: OSLO_USERNAME,
                IBIB_password: OSLO_PASSWORD,
                IBIWF_rememberme: "false",
                "webfocus-security-direct-response": "true"
            },
            validateStatus: () => true, // Accept all status codes to see headers
        });
        console.log("Login response status:", response.status);
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            osloCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
            console.log("Successfully logged in to Oslo and retrieved cookies.");
        }
        else {
            console.warn("Login response did not contain cookies.");
        }
    }
    catch (error) {
        console.error("Failed to login to Oslo:", error);
    }
}
async function makeOsloCall() {
    console.log("Making Oslo call...");
    console.log("osloCookies", osloCookies);
    if (osloCookies.length == 0) {
        await loginToOslo();
    }
    //make a rest API call
    const response = await axios_1.default.get(OSLO_API_URL + '/rcaster/system', {
        headers: {
            Cookie: osloCookies
        }
    });
    console.log("Oslo response:", response.data);
    return response.data;
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "caster-mcp-server",
    version: "1.0.0",
});
// Define tool using registerTool
server.registerTool("calculate_sum", {
    description: "Add two numbers together",
    inputSchema: {
        a: zod_1.z.number(),
        b: zod_1.z.number(),
    },
}, async ({ a, b }) => {
    // Send a log message to the client
    const logMessage = `Calculating sum of ${a} and ${b}`;
    console.log(logMessage);
    server.sendLoggingMessage({
        level: "info",
        data: logMessage,
    });
    return {
        content: [
            {
                type: "text",
                text: String(a + b),
            },
        ],
    };
});
server.registerTool("caster_get_schedules", {
    description: "Get all schedules",
    inputSchema: {},
}, async () => {
    if (!osloCookies) {
        await loginToOslo();
    }
    const resp = await axios_1.default.get(SCHEDULE_URL, {
        timeout: 5000,
        headers: {
            Cookie: osloCookies
        }
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(resp.data, null, 2),
            },
        ],
    };
});
server.registerTool("caster_get_system_info", {
    description: "Get system info, use this to get the system info, get default values, get list of distribution methods supported, default file formats",
    inputSchema: {},
}, async () => {
    const resp = await makeOsloCall();
    console.log(resp);
    return resp;
});
// Start server
async function main() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport();
    await server.connect(transport);
    // Perform initial login
    await loginToOslo();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
    });
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
