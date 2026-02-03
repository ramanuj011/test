"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpRouter = mcpRouter;
const axios_1 = __importDefault(require("axios"));
const SCHEDULE_URL = process.env.SCHEDULE_URL || 'http://localhost:8081/api/schedules';
let hasZod = true;
let z;
try {
    // lazy require so tests / environments without zod still work (fallback validation)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    z = require('zod');
}
catch (e) {
    hasZod = false;
}
let MCPRequestSchema = null;
let ToolSchema = null;
if (hasZod) {
    MCPRequestSchema = z.object({ type: z.string() });
    ToolSchema = z.object({
        name: z.string(),
        description: z.string(),
        endpoint: z.string().url().optional(),
        method: z.string().optional(),
        version: z.string().optional(),
    });
}
// Internal tool registry
const toolsRegistry = [];
function registerTool(name, schema, handler, meta = {}) {
    const tool = { name, schema, handler, meta };
    toolsRegistry.push(tool);
}
// Register getSchedules tool
if (hasZod) {
    registerTool('getSchedules', z.object({}), async () => {
        const resp = await axios_1.default.get(SCHEDULE_URL, { timeout: 5000 });
        return { schedules: resp.data };
    }, { description: 'Retrieve the list of schedules from the schedule service', endpoint: SCHEDULE_URL, method: 'GET', version: '1.0.0' });
}
else {
    registerTool('getSchedules', null, async () => {
        const resp = await axios_1.default.get(SCHEDULE_URL, { timeout: 5000 });
        return { schedules: resp.data };
    }, { description: 'Retrieve the list of schedules from the schedule service', endpoint: SCHEDULE_URL, method: 'GET', version: '1.0.0' });
}
async function mcpRouter(req, res) {
    let type;
    if (hasZod) {
        const parse = MCPRequestSchema.safeParse(req.body || {});
        if (!parse.success) {
            return res.status(400).json({ error: 'invalid request', details: parse.error.errors });
        }
        type = parse.data.type;
    }
    else {
        // fallback validation
        const body = req.body || {};
        if (!body.type || typeof body.type !== 'string') {
            return res.status(400).json({ error: 'invalid request', details: 'type string required' });
        }
        type = body.type;
    }
    // If a tool with the same name exists, invoke it
    const tool = toolsRegistry.find(t => t.name === type);
    if (tool) {
        try {
            // For now tools expect no arguments; extend later for args
            const result = await tool.handler({});
            return res.json(result);
        }
        catch (err) {
            console.error('Error executing tool:', err.message || err);
            return res.status(502).json({ error: 'tool execution failed' });
        }
    }
    if (type === 'listTools') {
        // Expose a small catalog of tools the MCP server can invoke or proxy to
        const tools = toolsRegistry.map(t => ({ name: t.name, description: t.meta?.description || '', endpoint: t.meta?.endpoint, method: t.meta?.method, version: t.meta?.version }));
        if (hasZod) {
            const validated = z.array(ToolSchema).parse(tools);
            return res.json({ tools: validated });
        }
        // fallback: do lightweight manual validation
        const safe = tools.filter(t => t && typeof t.name === 'string' && typeof t.description === 'string');
        return res.json({ tools: safe });
    }
    return res.status(400).json({ error: 'unknown type' });
}
