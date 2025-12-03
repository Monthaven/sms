/**
 * Call Queue Generator - Human-First Priority System
 * Generates daily call queues with simple HOT/WARM/COLD/OPT_OUT classification
 */

const fs = require('fs');
const path = require('path');

class CallQueueGenerator {
    constructor() {
        this.timezone = 'America/New_York'; // Adjust as needed
        this.hotCutoff = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
        this.warmCutoff = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    }

    /**
     * Generate today's call queue from response data
     */
    generateQueue(responses = []) {
        const now = new Date();
        const queue = {
            hot: [],
            warm: [],
            cold: [],
            optOuts: [],
            metrics: this.calculateMetrics(responses)
        };

        // Sort responses by priority and time
        responses.forEach(response => {
            const category = this.categorizeResponse(response, now);
            queue[category].push(this.formatLead(response));
        });

        // Sort each category by priority/time
        queue.hot.sort((a, b) => a.minutesAgo - b.minutesAgo);
        queue.warm.sort((a, b) => a.minutesAgo - b.minutesAgo);

        return queue;
    }

    /**
     * Categorize response based on content and timing
     */
    categorizeResponse(response, now = new Date()) {
        const responseTime = new Date(response.timestamp);
        const timeDiff = now - responseTime;

        // Check for opt-out keywords first
        if (this.isOptOut(response.message)) {
            return 'optOuts';
        }

        // Check for hot keywords
        if (this.isHotResponse(response.message)) {
            return timeDiff <= this.hotCutoff ? 'hot' : 'warm';
        }

        // Check for warm keywords  
        if (this.isWarmResponse(response.message)) {
            return timeDiff <= this.warmCutoff ? 'warm' : 'cold';
        }

        // Default to cold
        return 'cold';
    }

    /**
     * Check if response indicates high interest (HOT)
     */
    isHotResponse(message) {
        const hotKeywords = [
            'yes', 'interested', 'call me', 'when can we talk',
            'tell me more', 'what are you offering', 'how much',
            'sounds good', 'lets talk', 'available', 'ready'
        ];

        return hotKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Check if response shows moderate interest (WARM)  
     */
    isWarmResponse(message) {
        const warmKeywords = [
            'maybe', 'depends', 'might be', 'possibly',
            'thinking about it', 'considering', 'tell me about',
            'more info', 'details', 'curious', 'could be'
        ];

        return warmKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Check if response is an opt-out
     */
    isOptOut(message) {
        const optOutKeywords = [
            'stop', 'unsubscribe', 'remove', 'not interested',
            'dont text', 'leave me alone', 'no thanks', 'delete'
        ];

        return optOutKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Format lead for display in queue
     */
    formatLead(response) {
        const now = new Date();
        const responseTime = new Date(response.timestamp);
        const minutesAgo = Math.floor((now - responseTime) / (1000 * 60));

        return {
            name: response.contact?.name || this.generateDisplayName(response.phone),
            phone: this.formatPhone(response.phone),
            property: response.property?.address || 'Unknown Property',
            message: response.message,
            minutesAgo: minutesAgo,
            timeDisplay: this.formatTimeAgo(minutesAgo),
            priority: this.calculatePriority(response, minutesAgo)
        };
    }

    /**
     * Generate display name from phone number
     */
    generateDisplayName(phone) {
        const lastFour = phone.slice(-4);
        return `Lead ${lastFour}`;
    }

    /**
     * Format phone number for display
     */
    formatPhone(phone) {
        if (phone.length === 10) {
            return `${phone.slice(0,3)}-${phone.slice(3,6)}-${phone.slice(6)}`;
        }
        return phone;
    }

    /**
     * Format time ago display
     */
    formatTimeAgo(minutes) {
        if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(minutes / 1440);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Calculate lead priority score
     */
    calculatePriority(response, minutesAgo) {
        let score = 0;
        
        // Recency boost
        if (minutesAgo <= 60) score += 10;
        else if (minutesAgo <= 240) score += 5;

        // Message quality boost
        if (this.isHotResponse(response.message)) score += 8;
        else if (this.isWarmResponse(response.message)) score += 4;

        // Property value boost (if available)
        if (response.property?.estimatedValue > 500000) score += 3;

        return score;
    }

    /**
     * Calculate daily metrics
     */
    calculateMetrics(responses) {
        const total = responses.length;
        const hot = responses.filter(r => this.isHotResponse(r.message)).length;
        const warm = responses.filter(r => this.isWarmResponse(r.message)).length;
        const optOuts = responses.filter(r => this.isOptOut(r.message)).length;

        return {
            totalResponses: total,
            responseRate: total > 0 ? ((total / 150) * 100).toFixed(1) : '0.0', // Assuming 150 sent
            hotCount: hot,
            warmCount: warm,
            optOutCount: optOuts,
            hotRate: total > 0 ? ((hot / total) * 100).toFixed(1) : '0.0',
            warmRate: total > 0 ? ((warm / total) * 100).toFixed(1) : '0.0'
        };
    }

    /**
     * Generate HTML call queue for easy viewing
     */
    generateHTML(queue) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Daily Call Queue - ${new Date().toLocaleDateString()}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.4;
        }
        .priority-section { 
            margin: 20px 0; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid;
        }
        .hot { border-left-color: #e74c3c; background: #fdf2f2; }
        .warm { border-left-color: #f39c12; background: #fef9e7; }
        .cold { border-left-color: #3498db; background: #f4f8fb; }
        .opt-out { border-left-color: #95a5a6; background: #f8f9fa; }
        
        .lead { 
            margin: 10px 0; 
            padding: 12px; 
            background: white; 
            border-radius: 6px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .lead-header { 
            display: flex; 
            justify-content: space-between; 
            font-weight: 600; 
            margin-bottom: 5px;
        }
        .phone { color: #2980b9; }
        .time { color: #7f8c8d; font-size: 0.9em; }
        .property { color: #27ae60; margin: 3px 0; }
        .message { 
            background: #ecf0f1; 
            padding: 8px; 
            border-radius: 4px; 
            font-style: italic;
            margin: 5px 0;
        }
        .action { 
            color: #e74c3c; 
            font-weight: 600; 
            margin-top: 5px;
        }
        .metrics { 
            background: #2c3e50; 
            color: white; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
        }
        .metric-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0;
        }
        h1 { color: #2c3e50; text-align: center; }
        h2 { margin-top: 0; }
        .emoji { font-size: 1.2em; }
    </style>
</head>
<body>
    <h1>📞 Daily Call Queue - ${new Date().toLocaleDateString()}</h1>
    
    <div class="metrics">
        <h3>📊 Today's Metrics</h3>
        <div class="metric-row">
            <span>Total Responses:</span>
            <span><strong>${queue.metrics.totalResponses} (${queue.metrics.responseRate}%)</strong></span>
        </div>
        <div class="metric-row">
            <span>🔥 Hot Leads:</span>
            <span><strong>${queue.metrics.hotCount} (${queue.metrics.hotRate}%)</strong></span>
        </div>
        <div class="metric-row">
            <span>🟡 Warm Leads:</span>
            <span><strong>${queue.metrics.warmCount} (${queue.metrics.warmRate}%)</strong></span>
        </div>
        <div class="metric-row">
            <span>🚫 Opt-Outs:</span>
            <span><strong>${queue.metrics.optOutCount}</strong></span>
        </div>
    </div>

    ${this.renderSection('🔥 HOT LEADS - Call NOW (Within 1 Hour)', queue.hot, 'hot')}
    ${this.renderSection('🟡 WARM LEADS - Call Soon (Within 4 Hours)', queue.warm, 'warm')}
    ${this.renderSection('❄️ COLD LEADS - System Follow-Up (Automated)', queue.cold, 'cold')}
    ${this.renderSection('🚫 OPT-OUTS - Compliance Tracking', queue.optOuts, 'opt-out')}

    <div class="priority-section">
        <h2>🎯 Quick Call Scripts</h2>
        <p><strong>HOT leads:</strong> "Hey [Name], got your text back about the [Address] property. Sounds like you might be open to discussing it - do you have a few minutes to chat about what you're thinking?"</p>
        <p><strong>WARM leads:</strong> "Hi [Name], following up on the [Address] property. You mentioned it depends on price - mind if I ask what ballpark you'd need to be in to make it worthwhile?"</p>
    </div>

</body>
</html>`;
    }

    /**
     * Render HTML section for each priority level
     */
    renderSection(title, leads, className) {
        if (leads.length === 0 && className !== 'cold') {
            return `
            <div class="priority-section ${className}">
                <h2>${title}</h2>
                <p>No ${className} leads right now - keep the campaigns running! 🚀</p>
            </div>`;
        }

        if (className === 'cold') {
            return `
            <div class="priority-section ${className}">
                <h2>${title}</h2>
                <p>System handling ${leads.length} cold follow-ups automatically - no action needed.</p>
            </div>`;
        }

        const leadsHTML = leads.slice(0, 10).map(lead => `
            <div class="lead">
                <div class="lead-header">
                    <span>${lead.name}</span>
                    <span class="time">${lead.timeDisplay}</span>
                </div>
                <div class="phone">📞 ${lead.phone}</div>
                <div class="property">🏢 ${lead.property}</div>
                <div class="message">"${lead.message}"</div>
                <div class="action">
                    ${className === 'hot' ? '🔥 Call immediately - high interest!' : '📞 Follow up within 4 hours'}
                </div>
            </div>
        `).join('');

        return `
        <div class="priority-section ${className}">
            <h2>${title}</h2>
            ${leadsHTML}
            ${leads.length > 10 ? `<p><em>... and ${leads.length - 10} more leads</em></p>` : ''}
        </div>`;
    }

    /**
     * Save queue to files (both HTML and JSON)
     */
    async saveQueue(queue, outputDir = './output') {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Save HTML version
        const html = this.generateHTML(queue);
        const htmlPath = path.join(outputDir, `call-queue-${today}.html`);
        fs.writeFileSync(htmlPath, html);

        // Save JSON version for processing
        const jsonPath = path.join(outputDir, `call-queue-${today}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(queue, null, 2));

        console.log(`✅ Call queue saved:`);
        console.log(`   📄 HTML: ${htmlPath}`);
        console.log(`   📊 JSON: ${jsonPath}`);
        
        return { htmlPath, jsonPath };
    }
}

module.exports = CallQueueGenerator;

// Example usage if run directly
if (require.main === module) {
    // Sample response data
    const sampleResponses = [
        {
            phone: '5551234567',
            message: 'Yes, very interested. Call me!',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
            contact: { name: 'John Smith' },
            property: { address: '123 Main St Office Building', estimatedValue: 750000 }
        },
        {
            phone: '5552345678',
            message: 'Maybe, depends on the price',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            contact: { name: 'Sarah Johnson' },
            property: { address: '456 Industrial Dr' }
        },
        {
            phone: '5553456789',
            message: 'Stop texting me',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            property: { address: '789 Retail Plaza' }
        }
    ];

    const generator = new CallQueueGenerator();
    const queue = generator.generateQueue(sampleResponses);
    generator.saveQueue(queue);
}