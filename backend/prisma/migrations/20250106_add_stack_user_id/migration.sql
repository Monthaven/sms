-- Add stackUserId column to User table for Stack Auth integration
-- This links SMS agents to their Stack Auth accounts

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stackUserId" TEXT;

-- Create unique index on stackUserId (nullable unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS "User_stackUserId_key" ON "User"("stackUserId") WHERE "stackUserId" IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "User_stackUserId_idx" ON "User"("stackUserId");

-- Add comment for documentation
COMMENT ON COLUMN "User"."stackUserId" IS 'Stack Auth user ID for unified SSO. Links to Stack Auth account.';
