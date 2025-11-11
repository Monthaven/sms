# Commercial Real Estate Configuration

## Environment Variables for Commercial Focus

Add these to your GitHub Secrets or local environment:

```bash
# Commercial Property Analysis
MARKET_CAP_RATE=0.065                    # Default market cap rate for valuations
MIN_PROPERTY_VALUE=500000                # Minimum property value to target
PROPERTY_DATA_API_KEY=your_api_key       # For property data enrichment

# HUMAN-FIRST MESSAGING (Your Proven Approach)
# Use ONE template for everything - no robotic variations
PRIMARY_TEMPLATE="Hi, reaching out about your property at ${StreetAddress}. Still open to offers, or has that ship sailed? ${caller_name} Monthaven Capital ${caller_number}"

# Simple follow-up (non-intrusive)  
FOLLOWUP_TEMPLATE="Just checking up on you, wonder if minute to talk about ${StreetAddress}?"

# Your contact information
CALLER_NAME="John"                      # Your name
CALLER_NUMBER="555-123-4567"           # Your phone number

# Character limits (SMS constraints)
MAX_MESSAGE_LENGTH=160                  # GSM-7 charset limit
PRIMARY_TEMPLATE_LENGTH=135             # Estimated length (under limit)
FOLLOWUP_TEMPLATE_LENGTH=75             # Leaves room for address

# Lead Scoring Weights (0-100)
PROPERTY_VALUE_WEIGHT=30                 # Weight for property value in lead scoring  
PROPERTY_TYPE_WEIGHT=25                  # Weight for property type preference
OWNERSHIP_WEIGHT=15                      # Weight for ownership structure
DISTRESS_WEIGHT=25                       # Weight for distress indicators
MARKET_WEIGHT=5                         # Weight for market conditions

# Follow-up Timing (days)
FOLLOWUP_DAY_1=3                        # First follow-up after initial contact
FOLLOWUP_DAY_2=7                        # Second follow-up  
FOLLOWUP_DAY_3=14                       # Third follow-up
FOLLOWUP_DAY_4=30                       # Final follow-up

# Capital Stack Buyer Settings
HIGH_VALUE_THRESHOLD=5000000            # Threshold for capital partner mentions
LEAD_SCORE_THRESHOLD=70                 # Minimum score for priority treatment
AUTO_FOLLOWUP_ENABLED=true              # Enable automatic follow-up sequences
PROPERTY_ENRICHMENT_ENABLED=true        # Enable property data enrichment

# Your Contact Info (for template personalization)
CALLER_NAME=John                        # Your name for SMS signature
COMPANY_NAME=Monthaven Capital          # Your company name
CALLER_NUMBER=555-123-4567              # Your phone number

# Capital Stack Parameters
TARGET_CAP_RATE=0.065                   # Target cap rate for deals
MAX_LTV=0.80                           # Max loan-to-value with capital partners
EQUITY_PARTNER_RETURN=0.15             # Expected equity partner return
PREFERRED_RETURN=0.08                  # Preferred return to capital partners
```

## CSV Column Mapping for Commercial Properties

Your DealMachine CSV should include these columns for optimal results:

### Required Columns
- `FirstName` or `first_name`
- `LastName` or `last_name` 
- `Phone` or `phone` or `PhoneNumber`
- `Address` or `StreetAddress` or `PropertyAddress`

### Recommended Commercial Columns
- `PropertyType` - office, retail, industrial, multifamily, mixed-use
- `SquareFootage` or `SF` - Building square footage
- `AskingPrice` or `ListPrice` - Listed/asking price
- `AnnualRent` or `GrossRent` - Annual rental income
- `Expenses` or `OpEx` - Annual operating expenses  
- `OccupancyRate` - Current occupancy (0.0 to 1.0)
- `YearBuilt` - Construction year
- `YearsOwned` - How long current owner has held property
- `OwnershipType` - individual, llc, corporation, trust
- `OutOfState` - true/false if owner is out of state
- `Zoning` - Property zoning classification
- `Usage` - Current property usage

### Optional Enhancement Columns  
- `DelinquentTaxes` - true/false
- `VacancyIssues` - true/false  
- `DeferredMaintenance` - true/false
- `DistressSignals` - comma-separated list
- `LastSale` - Date of last sale
- `LastSalePrice` - Price of last sale
- `Broker` - Listing broker if applicable
- `MarketingDays` - Days on market

## Sample CSV Format

```csv
FirstName,LastName,Phone,PropertyAddress,PropertyType,SquareFootage,AskingPrice,AnnualRent,Expenses,OwnershipType,YearsOwned,OutOfState
John,Smith,555-0123,123 Main St Office Building,office,25000,3500000,450000,180000,llc,8,false
Sarah,Johnson,555-0124,456 Industrial Dr,industrial,75000,8900000,890000,220000,corporation,12,true  
Mike,Davis,555-0125,789 Retail Plaza,retail,15000,2200000,285000,95000,individual,5,false
```

## Notion Database Schema Enhancements

Add these properties to your Notion databases for commercial focus:

### Leads Database Additional Properties
- `Property Type` (Select: office, retail, industrial, multifamily, mixed-use)
- `Square Footage` (Number)  
- `Estimated Value` (Number)
- `Cap Rate` (Number)
- `Lead Score` (Number: 0-100)
- `Property Metrics` (Rich Text) - JSON with calculated metrics
- `Distress Indicators` (Multi-select: delinquent-taxes, vacancy-issues, deferred-maintenance)
- `Years Owned` (Number)
- `Ownership Type` (Select: individual, llc, corporation, trust)
- `Out of State Owner` (Checkbox)

### Batches Database Additional Properties  
- `Property Types` (Rich Text) - Comma-separated property types in batch
- `Avg Lead Score` (Number) - Average lead score for batch
- `High Value Count` (Number) - Count of properties >$5M
- `Total Estimated Value` (Number) - Sum of all property values

### Response Classification Enhancements
Update your response tracking to include:
- `Commercial Intent` (Select: sale-interest, financing-need, partnership-opportunity, service-need, rejection, unclear)
- `Priority Level` (Select: HIGH, MEDIUM, LOW)  
- `Suggested Action` (Rich Text)
- `Property Interest` (Relation to Properties if tracking separately)

## Performance Optimizations

### Batch Processing
```bash
BATCH_SIZE=50                           # Smaller batches for commercial (higher value)
SEND_PACING_MS=250                      # Slower pacing (250ms between sends)
PARALLEL_ENRICHMENT=true                # Enable parallel property data lookup
CACHE_PROPERTY_DATA=true                # Cache property lookups for 24 hours
```

### Rate Limiting
```bash  
API_RATE_LIMIT=100                      # Max API calls per minute
PROPERTY_API_RATE_LIMIT=50              # Max property API calls per minute
RETRY_ATTEMPTS=3                        # Retry failed API calls
RETRY_DELAY_MS=1000                     # Delay between retries
```

### Monitoring & Alerts
```bash
SLACK_WEBHOOK_URL=your_webhook          # For high-priority lead alerts
EMAIL_ALERTS=admin@yourcompany.com      # Email for system alerts  
HOT_LEAD_THRESHOLD=80                   # Lead score threshold for instant alerts
RESPONSE_SLA_MINUTES=30                 # SLA for responding to hot leads
```