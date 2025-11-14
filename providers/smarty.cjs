// providers/smarty.cjs
// Template module for SmartyStreets / USPS integration.
// Exports an async `verifyAddress(prompt)` function.

module.exports = {
  async verifyPrompt(prompt, options = {}) {
    if (!process.env.SMARTY_AUTH_ID || !process.env.SMARTY_AUTH_TOKEN) {
      throw new Error('Missing SMARTY_AUTH_ID/SMARTY_AUTH_TOKEN env vars');
    }

    return {
      address_candidates: [{ address: 'Provider not implemented in template', confidence: 0, reason: 'Template placeholder' }],
      final_classification: 'UNKNOWN',
      confidence_score: 0,
      notes: 'Implement SmartyStreets verification logic here'
    };
  }
};