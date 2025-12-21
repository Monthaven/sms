import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request, context: any) {
  const params = await context?.params;
  const propertyId = String(params?.propertyId ?? "");
  try {
    const leads = await prisma.lead.findMany({
      where: { propertyId },
      include: {
        Contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
            phoneType: true,
            email: true,
            score: true,
            priority: true,
            // ownerMatch excluded to avoid Prisma conversion issues
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to unique contacts by contactId and sort by score desc
    const contacts = leads
      .map((l) => ({ leadId: l.id, contact: l.Contact }))
      .filter((c) => c.contact)
      .map((c) => ({ leadId: c.leadId, ...c.contact }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return NextResponse.json(contacts);
  } catch (err) {
    console.error('[api/properties/[propertyId]/contacts] error', err);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
