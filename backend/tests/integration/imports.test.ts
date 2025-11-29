import request from 'supertest';
import path from 'path';
import app from '../../src/server';
import { prisma } from '../../src/db';

const sampleCsv = path.resolve(__dirname, '../../test-data/sample-dealmachine.csv');

describe('Imports API idempotency', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.campaignTarget.deleteMany();
    await prisma.property.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.campaign.deleteMany();
  });

  beforeAll(() => {
    // configure API key for tests
    process.env.IMPORT_API_KEY = 'test-key';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('does not create duplicate contacts/properties/targets when importing the same CSV twice', async () => {
    // create campaign
    const createRes = await request(app)
      .post('/api/campaigns')
      .send({ name: 'import-idempotency', initialMessage: 'Hello world' })
      .set('Accept', 'application/json');
    expect(createRes.status).toBe(201);
    const campaignId = createRes.body.id as string;

    // first import (authorized)
    const res1 = await request(app)
      .post(`/api/imports/dealmachine?campaignId=${campaignId}`)
      .set('x-api-key', 'test-key')
      .attach('file', sampleCsv);
    expect(res1.status).toBe(200);
    expect(res1.body.processed).toBeGreaterThan(0);

    const counts1 = {
      contacts: await prisma.contact.count(),
      properties: await prisma.property.count(),
      targets: await prisma.campaignTarget.count()
    };

    // second import (same file, authorized)
    const res2 = await request(app)
      .post(`/api/imports/dealmachine?campaignId=${campaignId}`)
      .set('x-api-key', 'test-key')
      .attach('file', sampleCsv);
    expect(res2.status).toBe(200);

    const counts2 = {
      contacts: await prisma.contact.count(),
      properties: await prisma.property.count(),
      targets: await prisma.campaignTarget.count()
    };

    // counts should be identical
    expect(counts2).toEqual(counts1);
  });

  it('rejects imports without API key when IMPORT_API_KEY is set', async () => {
    const createRes = await request(app)
      .post('/api/campaigns')
      .send({ name: 'import-auth-test', initialMessage: 'Hello world' })
      .set('Accept', 'application/json');
    expect(createRes.status).toBe(201);
    const campaignId = createRes.body.id as string;

    // Do not attach the file here to avoid streaming large multipart payload
    // when the request should be rejected early by API key middleware.
    const res = await request(app)
      .post(`/api/imports/dealmachine?campaignId=${campaignId}`)
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
  });
});
