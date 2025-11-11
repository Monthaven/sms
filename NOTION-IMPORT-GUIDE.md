# MONTHAVEN CAPITAL - NOTION DATABASE SETUP GUIDE
## Complete Instructions for SMS Command Center

---

## 📋 OVERVIEW

You're setting up a comprehensive SMS outreach management system for Monthaven Capital's commercial real estate acquisitions. This Notion database will:

- Manage **6,621 historical contacts** from EZ Texting campaigns (Aug-Nov 2025)
- Prevent double-texting the same owner about the same property
- Track **$789.4M in discussed property values**
- Manage **71 hot leads** ready for immediate calls
- Ensure compliance with **3,007 opt-out requests**
- Enable strategic re-engagement with same owners about different properties

---

## 🎯 DATABASE PROPERTIES

Create a table database named **"Monthaven SMS Master"** with these EXACT properties:

### Phone (Phone Number - PRIMARY KEY)
- **Type:** Phone
- **Purpose:** Unique identifier - prevents double-texting
- **Critical:** This is your deduplication key

### Owner Name (Title)
- **Type:** Title
- **Purpose:** Property owner name for personalization

### Property Type (Select)
- **Type:** Single Select
- **Options:** 
  - Commercial (🔴 Red)
  - Multi-family (🟠 Orange)
  - Single Family (🔵 Blue)
  - Unknown (⚫ Gray)

### Response Type (Select)
- **Type:** Single Select
- **Options:**
  - HOT (🔴 Red) = Ready to transact NOW
  - WARM (🟡 Yellow) = Interested, needs nurturing
  - COLD (🔵 Blue) = Not interested / No response
  - OPT_OUT (⚫ Gray) = NEVER contact again

### Last Message (Text)
- **Type:** Text
- **Purpose:** Their actual response - read before calling

### Value Discussed (Number)
- **Type:** Number
- **Format:** Dollar ($)
- **Purpose:** Property values mentioned in responses

### Date Contacted (Date)
- **Type:** Date with time
- **Purpose:** Track last interaction for timing rules

### Next Action (Select)
- **Type:** Single Select
- **Options:**
  - Call Now (🔴 Red)
  - Call Today (🟠 Orange)
  - Call This Week (🟡 Yellow)
  - Follow Up 30 Days (🔵 Blue)
  - Follow Up 90 Days (🔵 Light Blue)
  - Do Not Contact (⚫ Gray)

### Handler (Person)
- **Type:** Person
- **Purpose:** Assign calls to team members (Devin, Alec, etc.)

### Source Campaign (Select)
- **Type:** Single Select
- **Options:**
  - Historical EZ Texting (⚫ Gray)
  - Current Campaign (🔵 Blue)
  - Manual Entry (🟢 Green)
  - Referral (🟣 Purple)

### Message Count (Number)
- **Type:** Number
- **Purpose:** Track contact frequency

### Notes (Text)
- **Type:** Text
- **Purpose:** Call outcomes, deal details, next steps

### Is Opt Out (Checkbox)
- **Type:** Checkbox
- **Purpose:** CRITICAL - Never contact if checked

---

## 🔍 ESSENTIAL VIEWS

Create these 6 views EXACTLY as specified:

### View 1: 🔥 HOT NOW
**Purpose:** Your money-making priority list
- **Filter:** Response Type = HOT
- **Sort:** 
  1. Value Discussed (Descending - highest first)
  2. Date Contacted (Ascending - oldest first)
- **Show:** Owner Name, Phone, Last Message, Value Discussed, Handler, Next Action
- **Use:** Check FIRST every morning - 71 leads waiting

### View 2: 📞 TODAY'S QUEUE
**Purpose:** Your daily call dashboard
- **Filter:** 
  - Next Action = "Call Now" OR "Call Today"
  - AND Response Type ≠ OPT_OUT
- **Sort:**
  1. Response Type (HOT → WARM → COLD)
  2. Value Discussed (Descending)
- **Show:** Owner Name, Phone, Response Type, Next Action, Value Discussed, Handler, Notes
- **Use:** Your operational dashboard all day

### View 3: 💰 HIGH VALUE
**Purpose:** Track your biggest deals
- **Filter:** Value Discussed ≥ $1,000,000
- **Sort:** Value Discussed (Descending)
- **Show:** Owner Name, Phone, Value Discussed, Response Type, Property Type, Last Message, Handler
- **Use:** $789M pipeline management

### View 4: 🚫 DO NOT CONTACT
**Purpose:** Compliance protection
- **Filter:** Response Type = OPT_OUT OR Is Opt Out = Checked
- **Sort:** Date Contacted (Descending)
- **Show:** Owner Name, Phone, Last Message, Date Contacted
- **Use:** Export this list before EVERY campaign - 3,007 numbers

### View 5: 🏢 COMMERCIAL FOCUS
**Purpose:** Your core market
- **Filter:**
  - Property Type = Commercial OR Multi-family
  - AND Response Type ≠ OPT_OUT
- **Sort:**
  1. Response Type (HOT first)
  2. Value Discussed (Descending)
- **Show:** Owner Name, Phone, Property Type, Response Type, Value Discussed, Last Message
- **Use:** Commercial pipeline tracking

### View 6: 🟡 WARM FOLLOW-UP
**Purpose:** Relationship building queue
- **Filter:**
  - Response Type = WARM
  - AND Next Action ≠ "Do Not Contact"
- **Sort:** Date Contacted (Ascending - oldest needs attention)
- **Show:** Owner Name, Phone, Last Message, Date Contacted, Next Action, Handler
- **Use:** Weekly nurture calls

---

## 📊 YOUR DATA SUMMARY

When you import `notion-import-master.csv`, you'll get:

- **Total Contacts:** 6,621
- **Hot Leads:** 71 (1.1% - ready NOW)
- **Warm Leads:** 34 (0.5% - nurture)
- **Opt-Outs:** 3,007 (45.4% - compliance)
- **High-Value:** 152 with $ amounts discussed
- **Commercial:** 33 identified properties
- **Pipeline Value:** $789.4 Million total

**Top Deal:** Brian Rufener - $289M property "ready to sell"

---

## 🚀 DAILY WORKFLOW

### Morning (9 AM):
1. Open **"🔥 HOT NOW"** view
2. Sort by Value Discussed (highest first)
3. Call top 5 immediately
4. Update **Handler** field to claim your calls

### During Calls:
1. Click contact to open full record
2. Read **Last Message** for context
3. Make the call
4. Update **Notes** with outcome immediately
5. Set new **Next Action** based on conversation

### End of Day:
1. Review **"📞 TODAY'S QUEUE"** for uncalled leads
2. Set **Next Action** for tomorrow
3. Add any new responses from campaigns
4. Check team's **Handler** progress

---

## 🛡️ DEDUPLICATION RULES

**Before sending ANY new campaign:**

1. Export all phone numbers from **"🚫 DO NOT CONTACT"** view (3,007 numbers)
2. Check if new campaign phone exists in master database:
   - **Same phone + same property** = ❌ BLOCK (don't double-text)
   - **Same phone + different property** = ✅ ALLOW (new opportunity)
   - **Same phone + 180+ days + no response** = 🔄 CONDITIONAL (re-engagement strategy)

---

## ⚠️ CRITICAL RULES

1. **NEVER** contact anyone with **Is Opt Out** = checked
2. **ALWAYS** read **Last Message** before calling for context
3. **UPDATE Notes** immediately after EVERY call
4. **SET Next Action** before moving to next lead
5. **RESPECT** human-first approach - no pushy tactics

---

## 📞 IMPORT STEPS

1. **Create database:** New page → Table → Name: "Monthaven SMS Master"
2. **Import CSV:** Click Import → Upload `notion-import-master.csv`
3. **Map columns:** Match CSV headers to property types exactly
4. **Verify:** Check 6,621 records imported successfully
5. **Create views:** Build all 6 views with exact filters/sorts
6. **Test:** 
   - "HOT NOW" should show 71 records
   - "DO NOT CONTACT" should show 3,007 records
   - "HIGH VALUE" should show 152 records

---

## 🎯 FIRST ACTIONS AFTER IMPORT

1. **Open "🔥 HOT NOW" view**
2. **Your first call:** Brian Rufener (14232084612) - $289M property ready to sell!
3. **Set up Handler** assignments for your team
4. **Bookmark** your top 3 views for quick access
5. **Download Notion mobile app** for on-the-go call logging

---

## 💡 SUCCESS METRICS TO TRACK

- Daily hot calls made
- Connection rate (answered / attempted)
- Appointment rate (scheduled / connected)
- Deal progression (LOIs sent / appointments)
- Average property value in pipeline
- Time-to-first-call for hot leads (target: <5 minutes)

---

**This database transforms 6,621 historical contacts into your operational revenue engine with built-in compliance protection and strategic re-engagement capability.**

Import the CSV and start calling those 71 hot leads! 🔥📞💰