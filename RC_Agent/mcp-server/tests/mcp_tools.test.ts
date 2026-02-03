import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { mcpRouter } from '../src/routes/mcp';

const app = express();
app.use(bodyParser.json());
app.post('/mcp', mcpRouter);

describe('MCP tools', () => {
  it('returns tools for listTools request', async () => {
    const res = await request(app).post('/mcp').send({ type: 'listTools' });
    expect(res.status).toBe(200);
    expect(res.body.tools).toBeDefined();
    expect(Array.isArray(res.body.tools)).toBeTruthy();
    expect(res.body.tools[0].name).toBe('getSchedules');
  });
});
