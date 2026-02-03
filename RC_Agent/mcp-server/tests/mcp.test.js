"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const nock_1 = __importDefault(require("nock"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mcp_1 = require("../src/routes/mcp");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.post('/mcp', mcp_1.mcpRouter);
describe('MCP /mcp', () => {
    afterEach(() => nock_1.default.cleanAll());
    it('proxies getSchedules to schedule-service', async () => {
        (0, nock_1.default)('http://localhost:8081')
            .get('/api/schedules')
            .reply(200, [{ id: '1', title: 'Test', time: '09:00' }]);
        const res = await (0, supertest_1.default)(app).post('/mcp').send({ type: 'getSchedules' });
        expect(res.status).toBe(200);
        expect(res.body.schedules).toBeDefined();
        expect(Array.isArray(res.body.schedules)).toBeTruthy();
    });
});
