# 📊 MONTHAVEN CAPITAL - NOTION SMS COMMAND CENTER

## 🚀 STEP-BY-STEP NOTION SETUP

### **STEP 1: Create Your Master Database**

1. **Open Notion** → Create new page → "Monthaven SMS Master"
2. **Add Database** → Table → Name it "SMS Outreach Master"
3. **Import your data**: Upload `notion-import-master.csv` (6,621 contacts)

### **STEP 2: Configure Database Properties**

**Replace default properties with these EXACT configurations:**

#### **Phone** (Phone Number - Primary Key)
- Type: Phone
- Purpose: Unique identifier for deduplication
- ⚠️ CRITICAL: This prevents double-texting

#### **Owner Name** (Title) 
- Type: Title
- Purpose: Property owner name for personalization
- Shows in all views

#### **Property Type** (Select - Single Select)
- Type: Select
- Options: 
  - Commercial (Red)
  - Multi-family (Orange) 
  - Single Family (Blue)
  - Unknown (Gray)

#### **Response Type** (Select - Single Select) 
- Type: Select
- Options:
  - HOT (Red) - Ready to transact
  - WARM (Yellow) - Interested, needs nurturing
  - COLD (Blue) - Not interested/no response
  - OPT_OUT (Gray) - Do not contact

#### **Last Message** (Text)
- Type: Text
- Purpose: Store their actual response
- Used for context in calls

#### **Value Discussed** (Number)
- Type: Number
- Format: Dollar ($)
- Purpose: Track property values mentioned

#### **Date Contacted** (Date)
- Type: Date
- Include time: Yes
- Purpose: Track last interaction timing

#### **Next Action** (Select - Single Select)
- Type: Select  
- Options:
  - Call Now (Red)
  - Call Today (Orange)
  - Call This Week (Yellow)
  - Follow Up 30 Days (Blue)
  - Follow Up 90 Days (Light Blue)
  - Do Not Contact (Gray)

#### **Handler** (Person)
- Type: Person
- Purpose: Assign calls to team members
- Options: Add your team (Devin, Alec, etc.)

#### **Source Campaign** (Select - Single Select)
- Type: Select
- Options:
  - Historical EZ Texting (Gray)
  - Current Campaign (Blue)
  - Manual Entry (Green)
  - Referral (Purple)

#### **Message Count** (Number)
- Type: Number
- Purpose: Track how many times contacted
- Helps identify over-contacted prospects

#### **Notes** (Text)
- Type: Text
- Purpose: Call outcomes, next steps, deal details
- Updated after each interaction

#### **Is Opt Out** (Checkbox)
- Type: Checkbox
- Purpose: Compliance tracking
- ⚠️ CRITICAL: Never contact if checked

---

## 🔍 STEP 3: Create Essential Views

### **View 1: 🔥 HOT NOW** (Most Important)
**Purpose:** Immediate calls - money on the table

**Filter:** 
- Response Type = HOT

**Sort:**
1. Value Discussed (Descending)
2. Date Contacted (Ascending - oldest first)

**Properties Visible:**
- Owner Name
- Phone
- Last Message  
- Value Discussed
- Handler
- Next Action

**Use:** Check this FIRST every morning

---

### **View 2: 🟡 WARM TODAY**
**Purpose:** Today's follow-up calls

**Filter:**
- Response Type = WARM
- Next Action = Call Today OR Call Now

**Sort:**
1. Value Discussed (Descending)
2. Date Contacted (Ascending)

**Properties Visible:**
- Owner Name
- Phone
- Property Type
- Last Message
- Date Contacted
- Handler

**Use:** Your daily call queue

---

### **View 3: 💰 HIGH VALUE** 
**Purpose:** Big deal tracking

**Filter:**
- Value Discussed ≥ 1000000 (Million+)

**Sort:**
- Value Discussed (Descending)

**Properties Visible:**
- Owner Name
- Phone
- Value Discussed
- Response Type
- Property Type
- Last Message
- Handler

**Use:** Track your biggest opportunities

---

### **View 4: 🚫 DO NOT CONTACT**
**Purpose:** Compliance protection

**Filter:**
- Response Type = OPT_OUT OR Is Opt Out = Checked

**Sort:**
- Date Contacted (Descending)

**Properties Visible:**
- Owner Name
- Phone  
- Last Message
- Date Contacted

**Use:** Exclusion list for campaigns

---

### **View 5: 📞 TODAY'S QUEUE**
**Purpose:** Daily call management

**Filter:**
- Next Action = Call Now OR Call Today
- Response Type ≠ OPT_OUT

**Sort:**
1. Response Type (HOT first)
2. Value Discussed (Descending)

**Properties Visible:**
- Owner Name
- Phone
- Response Type
- Next Action
- Value Discussed
- Handler
- Notes

**Use:** Your daily dashboard

---

### **View 6: 🏢 COMMERCIAL FOCUS**
**Purpose:** Commercial property tracking

**Filter:**
- Property Type = Commercial OR Multi-family
- Response Type ≠ OPT_OUT

**Sort:**
1. Response Type (HOT first)  
2. Value Discussed (Descending)

**Properties Visible:**
- Owner Name
- Phone
- Property Type
- Response Type
- Value Discussed
- Last Message

**Use:** Your core target market

---

## 📱 STEP 4: Mobile Optimization

### **Create Mobile Views for Calling:**

1. **📞 Mobile Call List**
   - Filter: Next Action contains "Call"
   - Show only: Name, Phone, Response Type, Notes
   - Sort: Response Type, Value

2. **✅ Call Logging**  
   - Form view for quick updates
   - Fields: Phone lookup, Notes, Next Action
   - Use after each call

---

## 🎯 STEP 5: Daily Workflow Setup

### **Morning Routine (9 AM):**
```
1. Open "🔥 HOT NOW" view
   → Call immediately, highest value first
   
2. Check "📞 TODAY'S QUEUE"  
   → Plan your call schedule
   
3. Update "Handler" field with your name
   → Claim your calls for the day
```

### **During Calls:**
```
1. Open contact record
2. Read "Last Message" for context
3. Make the call
4. Update "Notes" with outcome
5. Set new "Next Action" 
```

### **End of Day:**
```
1. Review uncalled leads
2. Set "Next Action" for tomorrow
3. Add any new responses to database
4. Plan tomorrow's priorities
```

---

## 🔧 STEP 6: Advanced Features

### **Templates for Quick Updates:**

**Hot Lead Called:**
```
Notes Template:
"Called [DATE] - [OUTCOME]
Interest Level: [High/Medium/Low]
Next: [Action]
Property: [Details]
Timeline: [When they want to move]"
```

**Warm Follow-up:**
```
Notes Template:  
"Follow-up [DATE] - [RESPONSE]
Status: [Still considering/Need info/Timing]
Next touchpoint: [DATE]
Referrals mentioned: [Yes/No]"
```

### **Automation Rules:**

1. **Auto-assign Handler** based on area codes
2. **Auto-set Next Action** based on Response Type
3. **Flag high-value** prospects (Value > $5M)
4. **Track response times** for optimization

---

## 📊 STEP 7: Integration with Your Pipeline

### **Before Sending Any Campaign:**

1. **Export phone numbers** from "DO NOT CONTACT" view
2. **Cross-reference** against new campaign list
3. **Remove duplicates** before sending
4. **Tag source** as "Current Campaign" when importing responses

### **After Campaign Responses:**

1. **Import new responses** to database
2. **Update existing contacts** if phone number matches
3. **Set appropriate Response Type** (HOT/WARM/COLD)
4. **Assign Handler** for follow-up

---

## ✅ SUCCESS METRICS TO TRACK

### **Daily KPIs:**
- HOT calls made
- Connections achieved  
- Appointments set
- Deals progressed

### **Weekly Analysis:**
- Response rate trends
- Value pipeline growth
- Handler performance
- Call-to-appointment ratios

### **Monthly Review:**
- Database growth
- Response type distribution
- Average deal values
- Time-to-close metrics

---

## 🚀 STEP 8: Import Your Data NOW

1. **Download** `notion-import-master.csv` from your sms folder
2. **Create database** with properties above
3. **Import CSV** → Map columns to properties
4. **Verify** 6,621 contacts imported
5. **Test views** to ensure filtering works
6. **Start calling** the HOT leads immediately!

**🔥 Your first call: Brian Rufener (14232084612) - $289M property ready!**

This Notion setup transforms your 6,621 contacts into a money-making machine. Ready to import? 📞💰