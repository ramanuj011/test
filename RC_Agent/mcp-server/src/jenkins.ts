import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from 'axios';

const JENKINS_URL = process.env.JENKINS_URL || "http://localhost:8080";
const USER = process.env.JENKINS_USER || "admin";
const TOKEN = process.env.JENKINS_TOKEN || "your-api-token";

const client = axios.create({
    baseURL: JENKINS_URL,
    auth: { username: USER, password: TOKEN }
});

export function registerJenkinsTools(server: McpServer) {
    // 🔧 list jobs
    server.registerTool(
        "jenkins_list_jobs",
        {
            description: "List all Jenkins jobs",
            inputSchema: {},
        },
        async () => {
            const res = await client.get("/api/json");
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(res.data.jobs, null, 2)
                }]
            };
        }
    );

    // 🔧 trigger build
    server.registerTool(
        "jenkins_trigger_build",
        {
            description: "Trigger Jenkins job build",
            inputSchema: {
                job: z.string()
            },
        },
        async ({ job }) => {
            await client.post(`/job/${job}/build`);
            return {
                content: [{ type: "text", text: `Build triggered for ${job}` }]
            };
        }
    );

    // 🔧 build status
    server.registerTool(
        "jenkins_build_status",
        {
            description: "Get last build status",
            inputSchema: {
                job: z.string()
            },
        },
        async ({ job }) => {
            const res = await client.get(`/job/${job}/lastBuild/api/json`);
            return {
                content: [{
                    type: "text",
                    text: `Status: ${res.data.result}`
                }]
            };
        }
    );
}
