import { Router } from 'express';
import { prisma } from '../db';
import { LeadStatus } from '@prisma/client';

export const leadsRouter = Router();

// GET /api/leads
// Returns a list of leads. Optional query param ?status=RESP_HOT
leadsRouter.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const where: any = {};
    
    // If status is provided, filter by it. 
    // Otherwise, default to "Actionable" leads for the Inbox.
    if (status) {
      where.status = status;
    } else {
      // Default Inbox Filter: Show me things I need to work on.
      where.status = {
        in: [
          LeadStatus.RESP_HOT, 
          LeadStatus.RESP_WARM, 
          LeadStatus.CONVERSATION_ACTIVE,
          LeadStatus.SENT // Optional: Show sent items? Usually too noisy.
        ]
      };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        contact: true,   // Get Name/Phone
        property: true,  // Get Address
        campaign: true,  // Get Campaign Name
        // interactions: { take: 1, orderBy: { createdAt: 'desc' } } // Get last message? (Expensive, maybe later)
      },
      orderBy: {
        updatedAt: 'desc' // Newest activity first
      },
      take: 100 // Limit for V1
    });

    res.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});