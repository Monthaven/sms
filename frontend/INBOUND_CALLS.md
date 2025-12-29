# Inbound Call System - Setup Guide

## Overview

The SMS system now supports inbound calls with:
- **Browser-based call answering** via Twilio Client SDK
- **Call forwarding** to agent's personal cell phone
- **Voicemail fallback** if no one answers
- **Real-time notifications** when calls come in
- **Automatic contact/lead creation** for new callers

## Call Flow

```
Caller dials your Twilio number
         ↓
┌─────────────────────────────────────┐
│  /api/webhooks/twilio/voice (POST)  │
│  • Look up caller in contacts       │
│  • Find assigned agent or round-robin│
│  • Send notification to agent        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Simultaneous Ring:                 │
│  • Browser (Twilio Client SDK)      │
│  • Agent's cell phone (forwardNumber)│
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  If answered:                       │
│  • Agent hears whisper: "Incoming   │
│    call from [Name]. Press any key" │
│  • Connect to caller                │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  If no answer (25s timeout):        │
│  • Play voicemail greeting          │
│  • Record message (120s max)        │
│  • Transcribe voicemail             │
│  • Notify agent of voicemail        │
└─────────────────────────────────────┘
```

## Database Changes

New fields added to `User` model:

```prisma
model User {
  // ... existing fields
  forwardNumber   String?  // Personal cell to forward calls to
  acceptsInbound  Boolean  @default(true)  // Whether agent accepts inbound
}
```

**Run migration:**
```bash
cd frontend
npx prisma db push
```

## Twilio Configuration

### 1. TwiML App Setup

In Twilio Console → Develop → Voice → TwiML Apps:

1. Click on your TwiML App (or create one)
2. Set **Voice Request URL** to:
   ```
   https://sms.monthavencapital.com/api/webhooks/twilio/voice
   ```
3. Method: `POST`
4. Save

### 2. Phone Number Configuration

In Twilio Console → Phone Numbers → Your Number:

1. Under **Voice Configuration**:
   - Configure with: **TwiML App**
   - TwiML App: Select your app from step 1
2. Save

### 3. Environment Variables

Ensure these are set:

```env
# Required
TWILIO_ACCOUNT_SID=AC...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
TWILIO_TWIML_APP_SID=AP...  # Your TwiML App SID
INBOUND_CAMPAIGN_ID=cmj...  # Campaign for new inbound leads

# URLs
NEXT_PUBLIC_APP_URL=https://sms.monthavencapital.com
```

## Agent Setup

### Option A: Browser Calls Only

1. Agent logs in to the system
2. The Twilio Client automatically registers with identity `user_{userId}`
3. When calls come in, the IncomingCallModal appears
4. Agent clicks "Answer" to accept

### Option B: Browser + Cell Phone

1. Go to Admin → Users
2. Edit the agent
3. Add their cell phone to **Forward Number** field (E.164 format: `+15551234567`)
4. Ensure **Accepts Inbound** is checked

When calls come in:
- Both browser AND cell phone ring simultaneously
- First to answer wins
- Cell phone gets a whisper announcing the caller before connecting

### Option C: Cell Phone Only

Set `forwardNumber` but agent doesn't need to be logged in.
Calls will ring their cell phone with whisper announcement.

## New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/twilio/voice` | POST | Main inbound call handler |
| `/api/webhooks/twilio/voice/dial-status` | POST | Handle dial result (voicemail fallback) |
| `/api/webhooks/twilio/voice/whisper` | POST | Whisper caller info to agent |
| `/api/webhooks/twilio/voice/whisper-accept` | POST | Handle agent accepting call |
| `/api/webhooks/twilio/voice/recording` | POST | Handle voicemail recordings |

## Testing

### Test Inbound Call

1. Ensure at least one agent has `acceptsInbound: true` and either:
   - Is logged in (for browser calls)
   - Has a `forwardNumber` set

2. Call your Twilio number from a phone

3. Expected behavior:
   - If agent is online: IncomingCallModal appears in browser
   - If agent has forwardNumber: Their cell phone rings
   - After 25 seconds with no answer: Voicemail plays

### Debugging

Check webhook logs:
```sql
SELECT * FROM "WebhookLog" 
WHERE provider = 'TWILIO' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

Check call records:
```sql
SELECT * FROM "Call" 
WHERE direction = 'inbound' 
ORDER BY "startedAt" DESC 
LIMIT 10;
```

## UI Components

### IncomingCallModal

Located at `components/IncomingCallModal.tsx`

Features:
- Animated ring effect
- Shows caller name/number
- Link to view lead details
- Answer/Decline buttons
- Auto-reject after 30 seconds

### TwilioCallProvider Updates

The `TwilioCallProvider` now:
- Listens for incoming calls via `device.on("incoming")`
- Shows IncomingCallModal when call arrives
- Handles answer/reject actions
- Tracks incoming call state

## Notifications

The system sends notifications for:
- Incoming calls (to assigned agent or all admins)
- Missed calls (when no agent available)
- New voicemails

Currently using in-memory notification stub. To enable real-time push:
1. Install Pusher/Ably SDK
2. Update `lib/notifications.ts` to push to external service
3. Add client-side subscription in the app

## Files Modified/Created

```
NEW:
├── app/api/webhooks/twilio/voice/route.ts (replaced)
├── app/api/webhooks/twilio/voice/dial-status/route.ts
├── app/api/webhooks/twilio/voice/whisper/route.ts
├── app/api/webhooks/twilio/voice/whisper-accept/route.ts
├── app/api/webhooks/twilio/voice/recording/route.ts
├── components/IncomingCallModal.tsx

MODIFIED:
├── prisma/schema.prisma (User model: forwardNumber, acceptsInbound)
├── app/api/twilio/token/route.ts (incomingAllow: true)
├── components/TwilioCallProvider.tsx (incoming call handling)
```
