# MONTHAVEN CAPITAL - SMS CONFIGURATION
# Updated: 11/11/2025
# Previous: Crown & Oak Capital (retired)

## CURRENT BRANDING
company_name: "Monthaven Capital"
caller_names: ["Kyle", "Devin", "Alex"] # Add team members as needed
phone_numbers: ["555-123-4567"] # Update with your actual numbers

## RETIRED BRANDING (Do not use)
# Crown & Oak Capital, Crown and Oak, C&O, crownandoakcapital.com
# Phone: 646-964-9686

## MESSAGE TEMPLATES (Character limits: 160 for single SMS)

### Primary Opener (Proven Effective)
standard_opener: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - {caller_name}, Monthaven Capital"

### Variations for Testing
opener_v2: "Quick one on {StreetAddress}. Open to an offer, or pass for now? - {caller_name}, Monthaven Capital"
opener_v3: "Regarding {StreetAddress}, would you consider a simple offer, or not the right time? - {caller_name}, Monthaven Capital"

### Follow-up Templates (Use after timer or response)
followup_light: "Just checking in on {StreetAddress} - worth a quick chat this week, or pass for now? - {caller_name}"
followup_value: "If helpful, I can share what nearby sales look like. Curious about {StreetAddress}? - {caller_name}"
followup_graceful: "All good if timing isn't right. If you're open to an offer on {StreetAddress}, I'll keep it simple. - {caller_name}"

### Strategic Re-engagement 
different_property: "Hi again {owner_name}, reaching out about a different property - {StreetAddress}. Still in acquisition mode? - {caller_name}, Monthaven Capital"
market_update: "Hi {owner_name}, quick market update on {StreetAddress} - values have shifted since we last spoke. Worth revisiting? - {caller_name}, Monthaven Capital"

## RESPONSE HANDLING
### Hot Response Script
hot_response: "Got it - can call now or later today. What time works? - {caller_name}"

### Warm Response Script  
warm_response: "I'll do a quick sanity check. Any recent updates to {StreetAddress}? Can call in 10 to compare notes."

### Cold Follow-up
cold_followup: "Understood. I'll check back in a few weeks. If timing changes, ping me anytime. - {caller_name}"

## COMPLIANCE
opt_out_response: "Understood - no more messages. Thanks for the heads-up."
wrong_number_response: "Sorry about that - we'll remove this number immediately."

## DELIVERY BEST PRACTICES
- Send during business hours (9 AM - 6 PM local time)
- Keep under 160 characters when possible
- Use plain ASCII (no emojis or smart quotes)
- Throttle sends to avoid carrier filtering
- Use local or regional numbers when available
