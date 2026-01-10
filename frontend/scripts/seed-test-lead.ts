/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test data...')

  // 1. Create Campaign first (Lead requires campaignId)
  const campaign = await prisma.campaign.upsert({
    where: { id: 'test-campaign-001' },
    create: {
      id: 'test-campaign-001',
      name: 'Test Campaign - Dec 2025',
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
    update: {},
  })
  console.log('✅ Campaign:', campaign.id)

  // 2. Create Property
  const property = await prisma.property.upsert({
    where: {
      addressLine1_city_state: {
        addressLine1: '1847 Westchester Dr',
        city: 'High Point',
        state: 'NC',
      },
    },
    create: {
      id: randomUUID(),
      addressLine1: '1847 Westchester Dr',
      city: 'High Point',
      state: 'NC',
      postalCode: '27262',
      units: 8,
      year_built: 1985,
      owner_1_name: 'Test Owner LLC',
      updatedAt: new Date(),
    },
    update: {},
  })
  console.log('✅ Property:', property.id)

  // 3. Create Contact (phoneE164 is unique key)
  const contact = await prisma.contact.upsert({
    where: { phoneE164: '+13363109065' },
    create: {
      id: randomUUID(),
      phoneE164: '+13363109065',
      phone_1: '3363109065',
      phone_1_type: 'WIRELESS',
      phoneType: 'WIRELESS',
      phoneValid: true,
      firstName: 'Test',
      lastName: 'Owner',
      first_name: 'Test',
      last_name: 'Owner',
      full_name: 'Test Owner',
      email: 'alec@monthavencapital.com',
      score: 75,
      priority: 'HIGH',
      smsAllowed: true,
      doNotContact: false,
      ownerMatch: true,
      decision_maker: true,
      dm_score: 85.0,
      dm_tier: 'A',
      is_primary: true,
      propertyId: property.id,
      updatedAt: new Date(),
    },
    update: {},
  })
  console.log('✅ Contact:', contact.id)

  // 4. Create Lead (requires campaignId + contactId)
  const lead = await prisma.lead.upsert({
    where: {
      campaignId_contactId_propertyId: {
        campaignId: campaign.id,
        contactId: contact.id,
        propertyId: property.id,
      },
    },
    create: {
      id: randomUUID(),
      campaignId: campaign.id,
      contactId: contact.id,
      propertyId: property.id,
      status: 'NEW',
      sentimentScore: 0,
      updatedAt: new Date(),
    },
    update: {},
  })
  console.log('✅ Lead:', lead.id)

  console.log('\n🎉 Test data ready! Refresh /sms/queue')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
