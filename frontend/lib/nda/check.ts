/**
 * Stub NDA checker for portal middleware. Returns false by default.
 */
export async function hasUserNdaForDeal(userId: string | null | undefined, dealId: string | null | undefined) {
  return false;
}
