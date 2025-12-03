import { prisma } from '../db';
import { ezTextingClient } from '../eztextingClient';
import { LeadStatus } from '@prisma/client';

export class CampaignService {

  /**
   * Launches a new SMS Blast.
   * 1. Creates a Group in EzTexting.
   * 2. Adds all 'NEW' leads from the database to that group.
   * 3. Sends the initial message via EzTexting.
   * 4. Updates local Lead status to 'SENT'.
   */
  static async launchBlast(name: string, message: string) {
    console.log(`Starting Campaign: ${name}`);

    // 1. Create Local Campaign Record
    const campaign = await prisma.campaign.create({
      data: {
        name,
        status: 'PROCESSING'
      }
    });

    try {
      // 2. Fetch Leads (Status = NEW)
      // Limit to 100 for safety in this V1 test
      const leads = await prisma.lead.findMany({
        where: { status: LeadStatus.NEW },
        include: { contact: true },
        take: 100 
      });

      if (leads.length === 0) {
        throw new Error("No NEW leads found to blast.");
      }

      console.log(`Found ${leads.length} leads to process.`);

      // 3. Create EzTexting Group
      const groupName = `MAE_${campaign.id}_${Date.now()}`;
      const groupId = await ezTextingClient.createContactList(groupName);
      console.log(`Created EzTexting Group: ${groupId}`);

      // 4. Add Contacts to Group
      // Mapped to match the new EzTextingClient interface (phoneNumber)
      const contacts = leads.map(l => ({
        phoneNumber: l.contact.phoneE164,
        firstName: l.contact.firstName || '',
        lastName: l.contact.lastName || ''
      }));
      
      await ezTextingClient.addContactsToList(groupId, contacts);
      console.log(`Uploaded contacts to Group ${groupId}`);

      // 5. Send the Blast
      const ezCampaignId = await ezTextingClient.sendCampaign(groupId, message);
      console.log(`Blast Sent! Remote ID: ${ezCampaignId}`);

      // 6. Update State in DB
      await prisma.$transaction([
        prisma.campaign.update({
          where: { id: campaign.id },
          data: { 
            ezTextingGroupId: groupId,
            status: 'ACTIVE' 
          }
        }),
        prisma.lead.updateMany({
          where: { id: { in: leads.map(l => l.id) } },
          data: { status: LeadStatus.SENT }
        })
      ]);

      return { success: true, campaignId: campaign.id, leadsProcessed: leads.length };

    } catch (error: any) {
      console.error("Campaign Launch Failed:", error);
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }
}
