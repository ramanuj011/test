import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import axios from 'axios';
import { registerJenkinsTools } from "./jenkins";

const SCHEDULE_URL = process.env.SCHEDULE_URL || 'http://localhost:8081/api/schedules';

const OSLO_USERNAME = process.env.OSLO_USERNAME || 'secret';
const OSLO_PASSWORD = process.env.OSLO_PASSWORD || 'terces';
const OSLO_BASE_URL = process.env.OSLO_BASE_URL || 'http://localhost:8080/webfocus';
const OSLO_API_URL = `${OSLO_BASE_URL}/oslo/1.0`;

const OSLO_LOGIN_URL = `${OSLO_BASE_URL}/service/wf_security_check.jsp?IBIB_userid=${OSLO_USERNAME}&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=${OSLO_PASSWORD}`;

let osloCookies: string = "";

async function loginToOslo() {
    try {
        console.log("Logging into Oslo...");
        console.log("OSLO_LOGIN_URL", OSLO_LOGIN_URL);
        const response = await axios.post(OSLO_LOGIN_URL, {
            validateStatus: () => true, // Accept all status codes to see headers
        });
        console.log("Login response:", response.data);
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            console.log("Cookies received:", setCookie);
            osloCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
            console.log("Successfully logged in and retrieved cookies.");
        } else {
            console.warn("Login response did not contain cookies.");
        }
    } catch (error) {
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
    const response = await axios.get(OSLO_API_URL + '/rcaster/system', {
        headers: {
            Cookie: osloCookies
        }
    });
    console.log("Oslo response:", response.data);
    return response.data;
}
// Create server instance
const server = new McpServer({
    name: "caster-mcp-server",
    version: "1.0.0",
});

// Define tool using registerTool
server.registerTool(
    "calculate_sum",
    {
        description: "Add two numbers together",
        inputSchema: {
            a: z.number(),
            b: z.number(),
        },
    },
    async ({ a, b }) => {
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
    }
);

server.registerTool(
    "caster_get_schedules",
    {
        description: "Get all schedules",
        inputSchema: {},
    },
    async () => {
        if (!osloCookies) {
            await loginToOslo();
        }

        const resp = await axios.get(SCHEDULE_URL, {
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
    }
);

server.registerTool(
    "caster_get_system_info",
    {
        description: "Get system info, use this to get the system info, get default values, get list of distribution methods supported, default file formats",
        inputSchema: {},
    },
    async () => {
        const resp = await makeOsloCall();
        console.log(resp);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(resp.data, null, 2),
                },
            ],
        };
    }
)

// Start server
async function main() {
    registerJenkinsTools(server);
    const app = express();
    app.use(cors());

    const transport = new StreamableHTTPServerTransport();

    await server.connect(transport);

    // Perform initial login
    await loginToOslo();

    app.all("/mcp", async (req, res) => {
        console.log(`Received request: ${req.method} ${req.url}`);
        try {
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error("Transport error:", error);
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
    });
    if (osloCookies.length == 0) {
        console.log("Oslo cookies not found");
    } else {
        loginToOslo().then(() => {
            console.log("Login to Oslo successful");
        });
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

