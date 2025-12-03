/**
 * EXPERT SMS DEDUPLICATION & FOLLOW-UP STRATEGY
 * 
 * Handles the complex scenarios:
 * 1. Same owner, different properties (ALLOW)
 * 2. Same owner, same property (PREVENT) 
 * 3. Historical data mining for missed opportunities
 * 4. Address variations and matching
 * 5. Strategic re-engagement rules
 */

const DEDUPE_STRATEGY = {
    
    // LEVEL 1: PHONE-BASED BLOCKING (Absolute No-Sends)
    HARD_BLOCKS: {
        description: "Never send to these - compliance and respect",
        criteria: [
            "Opted out (STOP, remove, etc.)",
            "Wrong number confirmed", 
            "Hostile responses",
            "Legal threats"
        ],
        action: "BLOCK_ALL_FUTURE_SENDS",
        override: "NEVER"
    },

    // LEVEL 2: PROPERTY-BASED DEDUPLICATION 
    PROPERTY_MATCHING: {
        description: "Same property = don't double-text",
        matching_logic: {
            // Exact match
            exact_address: "123 Main St = 123 Main St",
            
            // Fuzzy match (common variations)
            street_variations: [
                "123 Main St = 123 Main Street",
                "123 Main St = 123 Main St.",
                "123 Main St, Unit A = 123 Main St Apt A"
            ],
            
            // Standardization rules
            normalize: {
                "remove_unit_info": "123 Main St Unit 5 → 123 Main St",
                "standardize_abbreviations": "St/Street, Ave/Avenue, Dr/Drive",
                "remove_extra_spaces": "123  Main   St → 123 Main St"
            }
        },
        action: "PREVENT_DUPLICATE_PROPERTY_OUTREACH"
    },

    // LEVEL 3: STRATEGIC RE-ENGAGEMENT (The Smart Part)
    REENGAGEMENT_RULES: {
        description: "Same owner, different property = new opportunity",
        
        scenarios: {
            "new_property_same_owner": {
                rule: "Owner at 123 Main St + Owner at 456 Oak Ave = 2 different campaigns",
                tracking: "Link campaigns by phone, separate by property",
                messaging: "Reference previous interaction positively"
            },
            
            "time_based_reengagement": {
                rule: "Same property after 180+ days if no explicit rejection", 
                conditions: [
                    "No response to original (not rejection)",
                    "Market conditions changed",
                    "New contact info available"
                ],
                messaging: "Market update / new opportunity angle"
            },
            
            "relationship_progression": {
                rule: "Cold → Warm → Hot progression over time",
                examples: [
                    "Original: 'Not interested' → 6 months later: Market update",
                    "Original: 'Maybe later' → 3 months: Check-in", 
                    "Original: No response → 90 days: Different angle"
                ]
            }
        }
    },

    // LEVEL 4: HISTORICAL DATA MINING
    RETROACTIVE_ANALYSIS: {
        description: "Mine old data for missed multi-family opportunities",
        
        signals_to_scan: [
            "Response mentioned 'units' but tagged as SFR",
            "High values ($500k+) in SFR database",
            "Owner name appears multiple times (portfolio)",
            "Commercial keywords in responses",
            "Rental income mentioned"
        ],
        
        action_plan: {
            "re_classify": "Update property type in database",
            "priority_follow_up": "Move to hot leads if commercial indicators",
            "cross_reference": "Check if owner has other properties"
        }
    }
};

// PRACTICAL IMPLEMENTATION FRAMEWORK
const SMS_WORKFLOW_LOGIC = {
    
    // STEP 1: PRE-SEND CHECKS
    before_sending: {
        "hard_block_check": "Query opt-outs, hostiles, wrong numbers",
        "property_match_check": "Normalize address and check for existing campaigns",
        "relationship_status": "Check last interaction date and outcome"
    },
    
    // STEP 2: DECISION MATRIX
    send_decision_tree: {
        "blocked_contact": "STOP - Do not send",
        "same_property_recent": "STOP - Already contacted about this property",
        "same_property_old_cold": "CONSIDER - If 180+ days and no explicit rejection",
        "same_owner_different_property": "SEND - New opportunity",
        "new_contact_new_property": "SEND - Fresh outreach"
    },
    
    // STEP 3: MESSAGE CUSTOMIZATION
    messaging_strategy: {
        "first_time_contact": "Standard opener",
        "different_property_same_owner": "Hi again [Name], reaching out about a different property - [NewAddress]. Still in acquisition mode, or has that focus shifted? - Kyle",
        "reengagement_after_time": "Hi [Name], quick market update on [Address] - values have shifted since we last spoke. Worth revisiting, or still not the right timing? - Kyle",
        "warm_relationship_progression": "Hi [Name], been thinking about our conversation on [Address]. Market's moving - good time for a quick call? - Kyle"
    }
};

// DATABASE SCHEMA FOR EXPERT TRACKING
const ENHANCED_NOTION_STRUCTURE = {
    tables: {
        "CONTACTS": {
            fields: [
                "phone (primary key)",
                "owner_name", 
                "contact_status (Active/Blocked/Opted_Out)",
                "relationship_stage (Cold/Warm/Hot/Past_Client)",
                "total_properties_contacted",
                "last_contact_date",
                "next_followup_date",
                "notes"
            ]
        },
        
        "PROPERTIES": {
            fields: [
                "property_id (auto)",
                "normalized_address",
                "original_address_variations", 
                "owner_phone (relation to CONTACTS)",
                "property_type (SFR/Multi-family/Commercial/Unknown)",
                "estimated_value",
                "contact_history",
                "campaign_status (Never_Contacted/In_Progress/Responded/Closed)"
            ]
        },
        
        "CAMPAIGNS": {
            fields: [
                "campaign_id",
                "contact_phone (relation)", 
                "property_id (relation)",
                "message_sent",
                "sent_date",
                "response_received",
                "response_type",
                "next_action",
                "outcome"
            ]
        }
    },
    
    // VIEWS FOR OPERATIONAL EFFICIENCY
    views: {
        "Hot_Leads_Today": "All hot responses needing calls",
        "Blocked_Numbers": "Never send list for compliance",
        "Reengagement_Queue": "Contacts ready for strategic follow-up",
        "New_Properties_Same_Owner": "Multi-property opportunities", 
        "Historical_Multi_Family_Candidates": "Old data to re-examine"
    }
};

module.exports = {
    DEDUPE_STRATEGY,
    SMS_WORKFLOW_LOGIC,
    ENHANCED_NOTION_STRUCTURE
};
