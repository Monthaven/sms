/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import request from 'supertest';
import { prisma } from '../../src/db';

describe('Campaigns API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // clean relevant tables to keep tests deterministic
    // delete in dependency-safe order to avoid foreign key violations
    await prisma.message.deleteMany();
    await prisma.campaignTarget.deleteMany();
    await prisma.property.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.campaign.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a campaign and initial message template', async () => {
    const payload = {
      name: 'test-campaign-1',
      initialMessage: 'Hello from integration test'
    } as any;

    const server = (global as any).__TEST_SERVER__;
    const res = await request(server).post('/api/campaigns').send(payload).set('Accept', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    const id = res.body.id as string;

    const camp = await prisma.campaign.findUnique({ where: { id }, include: { messages: true } });
    expect(camp).not.toBeNull();
    expect(camp?.name).toBe(payload.name);
    expect(camp?.messages?.length).toBeGreaterThanOrEqual(1);
    expect(camp?.messages?.[0].body).toBe(payload.initialMessage);
  });
});
