# 🎯 NOTION DATABASE SETUP - MONTHAVEN CAPITAL SMS FOUNDATION

## Import Your Master Data

### Step 1: Create Main Database
**Database Name:** "SMS Outreach Master"

**Properties to Add:**
```
Phone (Phone) - Primary key for deduping
Owner Name (Title) - Property owner name  
Property Type (Select) - Commercial/Multi-family/Single Family/Unknown
Response Type (Select) - HOT/WARM/COLD/OPT_OUT
Last Message (Text) - Their actual response
Value Discussed (Number) - $ amount if mentioned
Date Contacted (Date) - When we last texted
Next Action (Select) - Call Now/Call Today/Follow Up/Do Not Contact
Source Campaign (Select) - Historical/Current/Manual
Message Count (Number) - How many times contacted
Handler (Person) - Who's calling them
Notes (Text) - Call outcomes and details
```

### Step 2: Import the CSV
1. Upload `notion-import-master.csv` (6,621 contacts)
2. This becomes your "never double-text" foundation
3. All future campaigns check against this first

### Step 3: Create Essential Views

**🔥 HOT NOW** (Call immediately)
- Filter: Response Type = HOT
- Sort: Date Contacted (newest first)
- Shows: Name, Phone, Last Message, Value

**🟡 WARM TODAY** (Call within 24h)  
- Filter: Response Type = WARM
- Sort: Date Contacted (newest first)
- Shows: Name, Phone, Property Type, Next Action

**💰 HIGH VALUE** (Big deals)
- Filter: Value Discussed > 1000000
- Sort: Value Discussed (highest first)
- Shows: Name, Phone, Value, Response Type

**🚫 DO NOT CONTACT** (Compliance)
- Filter: Response Type = OPT_OUT
- Shows: Phone, Name, Last Message
- Use for campaign exclusions

**📞 CALL QUEUE TODAY**
- Filter: Next Action contains "Call"
- Sort: Response Type, Value Discussed  
- Shows: Name, Phone, Handler, Next Action

## Your Daily Workflow

### Morning (9 AM):
1. Open "HOT NOW" view - call immediately
2. Check "CALL QUEUE TODAY" - prioritize by value
3. Update Handler field with your name

### Throughout Day:
1. Log call outcomes in Notes field
2. Update Next Action after each call
3. Mark Response Type based on conversation

### Evening:
1. Set Next Action for tomorrow's calls
2. Add any new contacts from day's responses
3. Plan follow-up timing

## Campaign Integration

### Before ANY New Campaign:
```javascript
// Pseudo-logic for your pipeline
function beforeSending(phoneNumber, propertyAddress) {
    // Check 1: Is this phone number opted out?
    if (isOptedOut(phoneNumber)) return "BLOCK";
    
    // Check 2: Have we contacted about this exact property?
    if (hasSameProperty(phoneNumber, propertyAddress)) return "BLOCK";
    
    // Check 3: Different property, same owner? 
    if (hasDifferentProperty(phoneNumber)) return "ALLOW_WITH_CONTEXT";
    
    // Check 4: Time-based re-engagement rules
    if (canReengage(phoneNumber, propertyAddress)) return "ALLOW_REENGAGEMENT";
    
    return "ALLOW_NEW";
}
```

### Message Customization:
- **New Contact:** Standard opener
- **Different Property:** "Hi again [Name], different property..."
- **Re-engagement:** "Market update on [Address]..."

This foundation prevents double-texting while maximizing opportunities! 🎯