/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import {PrismaClient} from '@prisma/client'

const db = new PrismaClient()

async function safeCount(fn: () => Promise<number | null>, name: string) {
  try {
    const v = await fn()
    console.log(`${name}: ${v}`)
  } catch (err) {
    console.log(`${name}: ERROR (${(err as Error).message})`)
  }
}

async function main() {
  await safeCount(() => db.property.count(), 'properties')
  await safeCount(() => db.contact.count(), 'contacts')
  // try common message/interaction models
  await safeCount(() => db.interaction.count(), 'interaction (messages)')
  await safeCount(() => db.webhookLog ? db.webhookLog.count() : Promise.resolve(null), 'webhookLog')
  await safeCount(() => db.dncList.count(), 'dncList')
  // priority distribution
  try {
    const high = await db.contact.count({ where: { priority: 'HIGH' } })
    const med = await db.contact.count({ where: { priority: 'MEDIUM' } })
    const low = await db.contact.count({ where: { priority: 'LOW' } })
    console.log(`priority HIGH: ${high} | MEDIUM: ${med} | LOW: ${low}`)
  } catch (err) {
    console.log(`priority distribution: ERROR (${(err as Error).message})`)
  }

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
