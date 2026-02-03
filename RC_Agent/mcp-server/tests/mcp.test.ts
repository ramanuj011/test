import request from 'supertest';
import nock from 'nock';
import express from 'express';
import bodyParser from 'body-parser';
import { mcpRouter } from '../src/routes/mcp';

const app = express();
app.use(bodyParser.json());
app.post('/mcp', mcpRouter);

describe('MCP /mcp', () => {
  afterEach(() => nock.cleanAll());

  it('proxies getSchedules to schedule-service', async () => {
    nock('http://localhost:8081')
      .get('/api/schedules')
      .reply(200, [{ id: '1', title: 'Test', time: '09:00' }]);

    const res = await request(app).post('/mcp').send({ type: 'getSchedules' });
    expect(res.status).toBe(200);
    expect(res.body.schedules).toBeDefined();
    expect(Array.isArray(res.body.schedules)).toBeTruthy();
  });

  it('returns 400 on invalid request body', async () => {
    const res = await request(app).post('/mcp').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid request');
  });
});
