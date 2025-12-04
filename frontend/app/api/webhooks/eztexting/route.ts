import { NextResponse } from 'next/server';
import { PrismaClient, LeadStatus } from '@prisma/client';
import { normalizePhone } from '@/lib/utils';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🪝 Inbound:', { type: body.type, from: body.fromNumber, id: body.id });

    const { fromNumber, message, type, id } = body;

    if (id) {
      const existing = await prisma.interaction.findFirst({ where: { externalId: id } });
      if (existing) return NextResponse.json({ status: 'skipped_duplicate' });
    }

    if (type === 'inbound_text') {
      const normalized = normalizePhone(fromNumber);
      if (!normalized) return NextResponse.json({ error: 'Invalid Phone' }, { status: 400 });

      const contact = await prisma.contact.findUnique({
        where: { phoneE164: normalized },
        include: { leads: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });

      if (contact) {
        let status = LeadStatus.RESP_WARM;
        const lower = (message || '').toLowerCase();
        if (['stop', 'cancel', 'unsubscribe'].some(w => lower.includes(w))) status = LeadStatus.RESP_STOP;
        if (['price', 'offer', 'selling', 'how much'].some(w => lower.includes(w))) status = LeadStatus.RESP_HOT;

        if (contact.leads && contact.leads[0]) {
          await prisma.lead.update({ where: { id: contact.leads[0].id }, data: { status } });
        }

        await prisma.interaction.create({
          data: {
            contactId: contact.id,
            channel: 'EZTEXTING',
            direction: 'INBOUND',
            body: message,
            externalId: id || `sim_${Date.now()}`
          }
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
