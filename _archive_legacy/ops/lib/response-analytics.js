/**
 * EZ Texting Response Analytics - Learning from 40k+ Real Responses
 * Analyzes response patterns to optimize campaigns and improve targeting
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';

class ResponseAnalytics {
    constructor() {
        this.responses = [];
        this.insights = {};
    }

    /**
     * Load and parse EZ Texting CSV data
     */
    async loadData(csvPath) {
        console.log('🔍 Loading response data...');
        
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        this.responses = records.map(record => ({
            phone: this.normalizePhone(record['Phone Number']),
            toLine: record['To Line'],
            fullName: record['Full Name'],
            message: record['Actual Message'],
            receivedDate: new Date(record['Received date and time']),
            optedOut: record['Opted out'] === 'Y'
        }));

        console.log(`✅ Loaded ${this.responses.length} responses`);
        return this.responses;
    }

    /**
     * Normalize phone numbers to consistent format
     */
    normalizePhone(phone) {
        return phone.replace(/\D/g, '');
    }

    /**
     * Comprehensive analysis of all response patterns
     */
    analyzeResponses() {
        console.log('📊 Analyzing response patterns...');

        this.insights = {
            overview: this.getOverview(),
            hotLeads: this.findHotLeads(),
            warmLeads: this.findWarmLeads(),
            coldResponses: this.findColdResponses(),
            optOuts: this.analyzeOptOuts(),
            pricingDiscussions: this.findPricingDiscussions(),
            commercialIndicators: this.findCommercialProperties(),
            responseTimings: this.analyzeTimings(),
            messagePatterns: this.analyzeMessagePatterns(),
            carrierInfo: this.analyzeCarriers(),
            actionableLeads: this.generateActionableLeads()
        };

        return this.insights;
    }

    /**
     * High-level overview stats
     */
    getOverview() {
        const total = this.responses.length;
        const optOuts = this.responses.filter(r => r.optedOut).length;
        const unique = new Set(this.responses.map(r => r.phone)).size;

        return {
            totalResponses: total,
            uniqueNumbers: unique,
            responseRate: `${((total / 150000) * 100).toFixed(2)}%`, // Estimated sends
            optOutRate: `${((optOuts / total) * 100).toFixed(2)}%`,
            optOutCount: optOuts,
            dateRange: {
                earliest: new Date(Math.min(...this.responses.map(r => r.receivedDate))),
                latest: new Date(Math.max(...this.responses.map(r => r.receivedDate)))
            }
        };
    }

    /**
     * Find HOT leads - ready to transact now
     */
    findHotLeads() {
        const hotKeywords = [
            /make.*offer/i, /give.*offer/i, /send.*offer/i,
            /yes.*open/i, /yes.*interested/i, /call.*me/i,
            /ready.*to.*sell/i, /accepting.*offers/i,
            /\$[\d,]+.*million/i, /price.*is.*\$/i,
            /open.*for.*call/i, /schedule.*call/i
        ];

        const hotResponses = this.responses.filter(response => 
            hotKeywords.some(pattern => pattern.test(response.message)) &&
            !response.optedOut
        );

        return {
            count: hotResponses.length,
            percentage: `${((hotResponses.length / this.responses.length) * 100).toFixed(2)}%`,
            examples: hotResponses.slice(0, 10).map(r => ({
                phone: r.phone,
                name: r.fullName,
                message: r.message,
                date: r.receivedDate
            })),
            topPhrases: this.extractKeyPhrases(hotResponses, [
                'make an offer', 'give me an offer', 'send offer',
                'yes open', 'call me', 'accepting offers',
                'ready to sell', 'price is'
            ])
        };
    }

    /**
     * Find WARM leads - interested but need nurturing
     */
    findWarmLeads() {
        const warmKeywords = [
            /maybe/i, /depends/i, /might.*be/i, /possibly/i,
            /thinking.*about/i, /considering/i, /curious/i,
            /tell.*me.*more/i, /more.*info/i, /details/i,
            /what.*are.*you.*offering/i, /how.*much/i,
            /hasn.*t.*sailed/i, /still.*open/i
        ];

        const warmResponses = this.responses.filter(response => 
            warmKeywords.some(pattern => pattern.test(response.message)) &&
            !response.optedOut &&
            !this.isHotLead(response.message)
        );

        return {
            count: warmResponses.length,
            percentage: `${((warmResponses.length / this.responses.length) * 100).toFixed(2)}%`,
            examples: warmResponses.slice(0, 10).map(r => ({
                phone: r.phone,
                name: r.fullName,
                message: r.message,
                date: r.receivedDate
            }))
        };
    }

    /**
     * Find COLD responses - not interested or hostile
     */
    findColdResponses() {
        const coldKeywords = [
            /not.*interested/i, /sailed/i, /not.*for.*sale/i,
            /never.*intended/i, /wrong.*number/i, /wrong.*person/i,
            /don.*t.*own/i, /sold.*already/i, /under.*contract/i,
            /go.*away/i, /leave.*me.*alone/i, /bothers/i
        ];

        const coldResponses = this.responses.filter(response => 
            coldKeywords.some(pattern => pattern.test(response.message)) &&
            !response.optedOut
        );

        return {
            count: coldResponses.length,
            percentage: `${((coldResponses.length / this.responses.length) * 100).toFixed(2)}%`,
            commonReasons: this.categorizeRejections(coldResponses)
        };
    }

    /**
     * Analyze opt-out patterns
     */
    analyzeOptOuts() {
        const optOuts = this.responses.filter(r => r.optedOut);
        
        return {
            count: optOuts.count,
            messages: optOuts.map(r => r.message.toLowerCase()).slice(0, 20),
            triggers: [
                'STOP', 'Stop', 'stop', 'remove', 'unsubscribe',
                'wrong number', 'not interested', 'leave me alone'
            ]
        };
    }

    /**
     * Find pricing discussions and valuation data
     */
    findPricingDiscussions() {
        const pricePattern = /\$[\d,]+(?:\.\d+)?.*(?:million|mil|k|thousand)/i;
        const pricingResponses = this.responses.filter(r => 
            pricePattern.test(r.message) || 
            /price|asking|value|worth|apprais/i.test(r.message)
        );

        const prices = pricingResponses.map(r => {
            const match = r.message.match(/\$?([\d,]+(?:\.\d+)?)\s*(?:million|mil)/i);
            if (match) {
                return {
                    phone: r.phone,
                    name: r.fullName,
                    message: r.message,
                    estimatedValue: parseFloat(match[1].replace(/,/g, '')) * 1000000
                };
            }
            return null;
        }).filter(Boolean);

        return {
            count: pricingResponses.length,
            pricesDiscussed: prices.length,
            averageValue: prices.length > 0 ? 
                prices.reduce((sum, p) => sum + p.estimatedValue, 0) / prices.length : 0,
            examples: prices.slice(0, 10)
        };
    }

    /**
     * Identify commercial property types
     */
    findCommercialProperties() {
        const commercialKeywords = [
            /hotel/i, /motel/i, /office.*building/i, /retail/i,
            /warehouse/i, /industrial/i, /commercial/i, /plaza/i,
            /shopping.*center/i, /strip.*mall/i, /apartment/i,
            /units/i, /suites/i, /medical.*office/i, /restaurant/i,
            /acres/i, /square.*feet/i, /sf\b/i, /parking.*spaces/i
        ];

        const commercialResponses = this.responses.filter(r =>
            commercialKeywords.some(pattern => pattern.test(r.message))
        );

        return {
            count: commercialResponses.length,
            types: this.categorizePropertyTypes(commercialResponses),
            examples: commercialResponses.slice(0, 15).map(r => ({
                name: r.fullName,
                message: r.message,
                propertyType: this.identifyPropertyType(r.message)
            }))
        };
    }

    /**
     * Analyze response timing patterns
     */
    analyzeTimings() {
        const hourly = {};
        const daily = {};

        this.responses.forEach(r => {
            const hour = r.receivedDate.getHours();
            const day = r.receivedDate.getDay(); // 0=Sunday

            hourly[hour] = (hourly[hour] || 0) + 1;
            daily[day] = (daily[day] || 0) + 1;
        });

        return {
            peakHour: Object.keys(hourly).reduce((a, b) => hourly[a] > hourly[b] ? a : b),
            peakDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                Object.keys(daily).reduce((a, b) => daily[a] > daily[b] ? a : b)
            ],
            hourlyDistribution: hourly,
            dailyDistribution: daily
        };
    }

    /**
     * Analyze message patterns and content
     */
    analyzeMessagePatterns() {
        const messageLengths = this.responses.map(r => r.message.length);
        const averageLength = messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length;

        return {
            averageLength: Math.round(averageLength),
            shortestResponse: Math.min(...messageLengths),
            longestResponse: Math.max(...messageLengths),
            commonWords: this.getTopWords(),
            emojiUsage: this.responses.filter(r => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(r.message)).length
        };
    }

    /**
     * Analyze carrier patterns from phone numbers
     */
    analyzeCarriers() {
        const areaCodes = {};
        this.responses.forEach(r => {
            const areaCode = r.phone.substring(0, 3);
            areaCodes[areaCode] = (areaCodes[areaCode] || 0) + 1;
        });

        const topAreaCodes = Object.entries(areaCodes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            totalAreaCodes: Object.keys(areaCodes).length,
            topAreaCodes,
            geographicSpread: this.analyzeGeography(topAreaCodes)
        };
    }

    /**
     * Generate actionable leads for immediate follow-up
     */
    generateActionableLeads() {
        const actionable = this.responses.filter(r => {
            const message = r.message.toLowerCase();
            return (
                // Explicit interest
                /make.*offer|give.*offer|send.*offer/.test(message) ||
                /yes.*open|yes.*interested/.test(message) ||
                /call.*me|schedule.*call/.test(message) ||
                /price.*is|asking.*price/.test(message) ||
                // Qualified interest
                /hasn.*t.*sailed|still.*open/.test(message) ||
                /depends.*on.*price|what.*are.*you.*offering/.test(message) ||
                // Property details shared
                /\$[\d,]+.*million/.test(message) ||
                /acres|units|suites|square.*feet/.test(message)
            ) && !r.optedOut;
        });

        return {
            count: actionable.length,
            leads: actionable.map(r => ({
                phone: r.phone,
                name: r.fullName,
                message: r.message,
                receivedDate: r.receivedDate,
                priority: this.calculatePriority(r),
                nextAction: this.suggestAction(r)
            })).sort((a, b) => b.priority - a.priority).slice(0, 50)
        };
    }

    /**
     * Helper methods
     */
    isHotLead(message) {
        const hotPatterns = [
            /make.*offer/i, /give.*offer/i, /send.*offer/i,
            /yes.*open/i, /call.*me/i, /accepting.*offers/i
        ];
        return hotPatterns.some(pattern => pattern.test(message));
    }

    extractKeyPhrases(responses, phrases) {
        const counts = {};
        phrases.forEach(phrase => {
            counts[phrase] = responses.filter(r => 
                r.message.toLowerCase().includes(phrase.toLowerCase())
            ).length;
        });
        return Object.entries(counts).sort(([,a], [,b]) => b - a);
    }

    categorizeRejections(coldResponses) {
        const categories = {
            'Not for sale': 0,
            'Wrong owner': 0,
            'Already sold': 0,
            'Under contract': 0,
            'Not interested': 0,
            'Other': 0
        };

        coldResponses.forEach(r => {
            const message = r.message.toLowerCase();
            if (/not.*for.*sale|never.*intended/.test(message)) {
                categories['Not for sale']++;
            } else if (/wrong.*number|wrong.*person|don.*t.*own/.test(message)) {
                categories['Wrong owner']++;
            } else if (/sold|closed/.test(message)) {
                categories['Already sold']++;
            } else if (/under.*contract|contract/.test(message)) {
                categories['Under contract']++;
            } else if (/not.*interested/.test(message)) {
                categories['Not interested']++;
            } else {
                categories['Other']++;
            }
        });

        return categories;
    }

    categorizePropertyTypes(responses) {
        const types = {};
        const patterns = {
            'Hotel/Motel': /hotel|motel/i,
            'Office Building': /office.*building/i,
            'Retail': /retail|shopping|plaza/i,
            'Apartment/Multi-family': /apartment|units/i,
            'Industrial/Warehouse': /industrial|warehouse/i,
            'Medical': /medical.*office/i,
            'Restaurant': /restaurant/i,
            'Mixed Use': /mixed.*use/i
        };

        Object.entries(patterns).forEach(([type, pattern]) => {
            types[type] = responses.filter(r => pattern.test(r.message)).length;
        });

        return Object.entries(types).sort(([,a], [,b]) => b - a);
    }

    identifyPropertyType(message) {
        const patterns = {
            'Hotel': /hotel|motel|suites/i,
            'Office': /office.*building/i,
            'Retail': /retail|shopping|plaza/i,
            'Apartment': /apartment|units/i,
            'Industrial': /industrial|warehouse/i,
            'Medical': /medical.*office/i,
            'Restaurant': /restaurant/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(message)) return type;
        }
        return 'Unknown';
    }

    getTopWords() {
        const words = {};
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'i', 'you', 'it', 'that', 'this']);
        
        this.responses.forEach(r => {
            r.message.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .forEach(word => {
                    if (word.length > 2 && !stopWords.has(word)) {
                        words[word] = (words[word] || 0) + 1;
                    }
                });
        });

        return Object.entries(words)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);
    }

    analyzeGeography(topAreaCodes) {
        // Map area codes to regions (simplified)
        const regions = {
            'Southeast': ['704', '980', '843', '864', '803', '919', '828', '910'],
            'Northeast': ['646', '212', '718', '917', '201', '973'],
            'Southwest': ['214', '469', '972', '713', '281', '832'],
            'West': ['213', '323', '310', '424', '818', '747']
        };

        const regionCounts = {};
        topAreaCodes.forEach(([areaCode, count]) => {
            for (const [region, codes] of Object.entries(regions)) {
                if (codes.includes(areaCode)) {
                    regionCounts[region] = (regionCounts[region] || 0) + count;
                    break;
                }
            }
        });

        return regionCounts;
    }

    calculatePriority(response) {
        let score = 0;
        const message = response.message.toLowerCase();

        // Explicit interest
        if (/make.*offer|give.*offer|send.*offer/.test(message)) score += 10;
        if (/call.*me|schedule.*call/.test(message)) score += 9;
        if (/yes.*open|yes.*interested/.test(message)) score += 8;

        // Pricing discussion
        if (/\$[\d,]+.*million/.test(message)) score += 7;
        if (/price.*is|asking.*price/.test(message)) score += 6;

        // Qualified interest
        if (/hasn.*t.*sailed|still.*open/.test(message)) score += 5;
        if (/depends.*on.*price/.test(message)) score += 4;

        // Recent response (last 30 days)
        const daysSince = (Date.now() - response.receivedDate) / (1000 * 60 * 60 * 24);
        if (daysSince <= 30) score += 3;

        return score;
    }

    suggestAction(response) {
        const message = response.message.toLowerCase();
        
        if (/make.*offer|give.*offer|send.*offer/.test(message)) {
            return 'CALL NOW - Ready for offer';
        }
        if (/call.*me/.test(message)) {
            return 'CALL IMMEDIATELY - Direct request';
        }
        if (/\$[\d,]+.*million/.test(message)) {
            return 'CALL TODAY - Price discussed';
        }
        if (/yes.*open|yes.*interested/.test(message)) {
            return 'CALL WITHIN 24H - Expressed interest';
        }
        if (/hasn.*t.*sailed/.test(message)) {
            return 'FOLLOW UP - Still considering';
        }
        
        return 'WARM FOLLOW UP - General interest';
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const insights = this.analyzeResponses();
        
        const report = `
# 📊 EZ TEXTING RESPONSE ANALYTICS REPORT
**Generated:** ${new Date().toLocaleDateString()}

## 🎯 EXECUTIVE SUMMARY
- **Total Responses:** ${insights.overview.totalResponses.toLocaleString()}
- **Response Rate:** ${insights.overview.responseRate}
- **Hot Leads:** ${insights.hotLeads.count} (${insights.hotLeads.percentage})
- **Warm Leads:** ${insights.warmLeads.count} (${insights.warmLeads.percentage})
- **Opt-Out Rate:** ${insights.overview.optOutRate}

## 🔥 HOT LEADS (${insights.hotLeads.count})
**Ready to transact - call immediately**

${insights.hotLeads.examples.slice(0, 5).map(lead => 
    `- **${lead.name}**: "${lead.message}" (${lead.phone})`
).join('\n')}

## 🟡 WARM LEADS (${insights.warmLeads.count})
**Interested but need nurturing**

${insights.warmLeads.examples.slice(0, 5).map(lead => 
    `- **${lead.name}**: "${lead.message}" (${lead.phone})`
).join('\n')}

## 💰 PRICING INTELLIGENCE
- **Properties with pricing:** ${insights.pricingDiscussions.count}
- **Average value discussed:** $${(insights.pricingDiscussions.averageValue / 1000000).toFixed(1)}M

**High-value properties:**
${insights.pricingDiscussions.examples.slice(0, 3).map(p => 
    `- **${p.name}**: $${(p.estimatedValue / 1000000).toFixed(1)}M - "${p.message}"`
).join('\n')}

## 🏢 COMMERCIAL PROPERTY TYPES
${insights.commercialIndicators.types.slice(0, 5).map(([type, count]) => 
    `- **${type}**: ${count} properties`
).join('\n')}

## ⏰ OPTIMAL TIMING
- **Best response hour:** ${insights.responseTimings.peakHour}:00
- **Best response day:** ${insights.responseTimings.peakDay}

## 🚀 IMMEDIATE ACTION ITEMS

### Call Today (Priority 1):
${insights.actionableLeads.leads.filter(l => l.priority >= 8).slice(0, 10).map(lead => 
    `- **${lead.name}** (${lead.phone}): ${lead.nextAction}`
).join('\n')}

### Follow Up This Week (Priority 2):
${insights.actionableLeads.leads.filter(l => l.priority >= 5 && l.priority < 8).slice(0, 10).map(lead => 
    `- **${lead.name}** (${lead.phone}): ${lead.nextAction}`
).join('\n')}

## 📈 KEY INSIGHTS

### What's Working:
1. **Your opener is effective** - getting responses from serious owners
2. **Commercial focus paying off** - high-value properties responding
3. **Price discussions happening** - owners sharing valuations

### Optimization Opportunities:
1. **Call speed matters** - hot leads need immediate follow-up
2. **Geographic concentration** - focus on top responding regions
3. **Property type targeting** - ${insights.commercialIndicators.types[0][0]} shows highest engagement

### Message Patterns:
- **Average response length:** ${insights.messagePatterns.averageLength} characters
- **Quick responders:** ${insights.messagePatterns.shortestResponse}-${insights.messagePatterns.longestResponse} character range
- **Top response words:** ${insights.messagePatterns.commonWords.slice(0, 5).map(([word]) => word).join(', ')}

---
*This analysis covers ${insights.overview.dateRange.earliest.toDateString()} to ${insights.overview.dateRange.latest.toDateString()}*
`;

        return report;
    }

    /**
     * Save analysis to files
     */
    async saveAnalysis(outputDir = './analytics') {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        
        // Save full analysis as JSON
        const jsonPath = `${outputDir}/response-analysis-${timestamp}.json`;
        fs.writeFileSync(jsonPath, JSON.stringify(this.insights, null, 2));

        // Save readable report
        const reportPath = `${outputDir}/response-report-${timestamp}.md`;
        fs.writeFileSync(reportPath, this.generateReport());

        // Save actionable leads CSV
        const csvPath = `${outputDir}/actionable-leads-${timestamp}.csv`;
        const csvHeaders = 'Name,Phone,Message,Priority,Action,Date\n';
        const csvData = this.insights.actionableLeads.leads.map(lead =>
            `"${lead.name}","${lead.phone}","${lead.message}","${lead.priority}","${lead.nextAction}","${lead.receivedDate}"`
        ).join('\n');
        fs.writeFileSync(csvPath, csvHeaders + csvData);

        console.log(`\n✅ Analysis saved:`);
        console.log(`📊 JSON: ${jsonPath}`);
        console.log(`📄 Report: ${reportPath}`);
        console.log(`📞 Leads: ${csvPath}`);

        return { jsonPath, reportPath, csvPath };
    }
}

export default ResponseAnalytics;

// Run analysis if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const analyzer = new ResponseAnalytics();
    
    // Update this path to your CSV file
    const csvPath = '../../Incoming Messages Report-1762877906971.csv';
    
    if (fs.existsSync(csvPath)) {
        analyzer.loadData(csvPath);
        analyzer.saveAnalysis();
        
        // Print key insights
        const insights = analyzer.analyzeResponses();
        console.log('\n🎯 KEY INSIGHTS:');
        console.log(`Hot Leads: ${insights.hotLeads.count} (${insights.hotLeads.percentage})`);
        console.log(`Warm Leads: ${insights.warmLeads.count} (${insights.warmLeads.percentage})`);
        console.log(`Pricing Discussions: ${insights.pricingDiscussions.count}`);
        console.log(`Commercial Properties: ${insights.commercialIndicators.count}`);
        console.log(`Actionable Leads: ${insights.actionableLeads.count}`);
    } else {
        console.log(`❌ CSV file not found: ${csvPath}`);
        console.log('Please update the csvPath variable with the correct path to your data.');
    }
}