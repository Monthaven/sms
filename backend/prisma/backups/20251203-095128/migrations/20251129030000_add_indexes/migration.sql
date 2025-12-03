-- Add unique constraint on property owner+address to enforce deduplication
CREATE UNIQUE INDEX IF NOT EXISTS "Property_owner_address_unique" ON "Property" ("ownerId", "addressLine1", "city", "state", "postalCode");

-- Add index on Property.ownerId for faster owner lookups
CREATE INDEX IF NOT EXISTS "Property_ownerId_idx" ON "Property" ("ownerId");

-- Add indexes for campaign and contact lookups on CampaignTarget
CREATE INDEX IF NOT EXISTS "CampaignTarget_campaignId_idx" ON "CampaignTarget" ("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignTarget_contactId_idx" ON "CampaignTarget" ("contactId");
