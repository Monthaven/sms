import request from 'supertest';

describe('Health endpoint', () => {
  it('returns ok', async () => {
    const server = (global as any).__TEST_SERVER__;
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    // Accept object containing ok:true and optional db status
    expect(res.body).toMatchObject({ ok: true });
  });
});
