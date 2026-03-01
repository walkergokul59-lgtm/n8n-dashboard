// Utility to generate UUIDs
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper for random integers
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper for random floats
const randomFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

/**
 * 1. Workflow Metrics Data
 * - Generate 24-hour execution volume data
 * - Total Executions: 50-100
 * - Total Cost 24H: $0.50-$2.00
 * - Error Rate: 0-5%
 * - Average Duration: 200-1000ms
 */
export const getWorkflowMetrics = () => {
    const volumeData = Array.from({ length: 24 }).map((_, i) => {
        const d = new Date();
        d.setHours(d.getHours() - (23 - i));
        d.setMinutes(0, 0, 0); // Round down to the hour
        return {
            timestamp: d.toISOString(),
            executions: randomInt(0, 5)
        };
    });

    return {
        volumeData,
        totalExecutions: randomInt(50, 100),
        executionsChange: randomInt(-15, 25), // percentage change
        totalCost: randomFloat(0.50, 2.00, 2),
        costChange: randomFloat(-5, 10, 1),
        errorRate: randomFloat(0, 5, 1),
        errorRateChange: randomFloat(-2, 2, 1),
        averageDuration: randomInt(200, 1000),
        durationChange: randomInt(-50, 50)
    };
};

/**
 * 2. AI Agent Logs Data
 * - 15-20 conversation logs
 * - Thread IDs, user questions, agent responses, duration, cost, timestamps
 */
export const getAIAgentLogs = () => {
    const count = randomInt(15, 20);
    const userQuestions = [
        "How do I reset my password?",
        "Where is my order?",
        "Do you offer refunds?",
        "Can I speak to a human?",
        "What are your working hours?",
        "My payment failed, what should I do?"
    ];
    const agentResponses = [
        "You can reset your password by clicking 'Forgot Password' on the login screen.",
        "Please provide your order ID, and I'll check the status.",
        "Yes, we offer refunds within 30 days of purchase.",
        "I'm connecting you to a support agent now.",
        "Our support hours are 9 AM to 5 PM EST, Monday through Friday.",
        "Please try using a different payment method or contact your bank."
    ];

    return Array.from({ length: count }).map(() => {
        const qIndex = randomInt(0, userQuestions.length - 1);
        const d = new Date();
        d.setHours(d.getHours() - randomInt(0, 23));
        d.setMinutes(d.getMinutes() - randomInt(0, 59));

        return {
            threadId: generateUUID(),
            question: userQuestions[qIndex],
            response: agentResponses[qIndex],
            durationMs: randomInt(100, 500),
            cost: randomFloat(0.0040, 0.0980, 4),
            timestamp: d.toISOString()
        };
    });
};

/**
 * 3. Invoice Runs Data
 * - 15 invoice processing records
 * - Source, Status (90% success), OCR cost, Processing Time, Processed At (March 2024)
 */
export const getInvoiceRuns = () => {
    return Array.from({ length: 15 }).map((_, i) => {
        const d = new Date(2024, 2, randomInt(1, 31), randomInt(8, 18), randomInt(0, 59));
        return {
            runId: randomInt(1, 20),
            invoiceId: `INV-${randomInt(1000, 1020)}`,
            source: Math.random() > 0.5 ? 'PORTAL_UPLOAD' : 'EMAIL_UPLOAD',
            status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED',
            ocrCost: randomFloat(0.0100, 0.0200, 4),
            processingTimeMs: randomInt(800, 1700),
            processedAt: d.toISOString()
        };
    });
};

/**
 * 4. Order Sync Data
 * - 15 order sync records
 * - Order ID, Status (85% success), Retries, Duration, Cost, Synced At (March 2024)
 */
export const getOrderSyncs = () => {
    return Array.from({ length: 15 }).map(() => {
        const d = new Date(2024, 2, randomInt(1, 31), randomInt(8, 18), randomInt(0, 59));
        return {
            runId: randomInt(1, 20),
            orderId: `ORD-${randomInt(2000, 2020)}`,
            status: Math.random() > 0.15 ? 'SUCCESS' : 'FAILED',
            retries: randomInt(0, 3),
            durationMs: randomInt(800, 1300),
            cost: randomFloat(0.0060, 0.0100, 4),
            syncedAt: d.toISOString()
        };
    });
};

/**
 * 5. SMS Campaign Data
 * - Sent: 100-500, Delivery Rate: 85-99%, Total Cost: $10-$50
 * - Sample delivery timeline
 */
export const getSmsCampaigns = () => {
    const messagesSent = randomInt(100, 500);
    const deliveryRate = randomFloat(85, 99, 1);
    const totalCost = randomFloat(10, 50, 2);

    // 7-day timeline
    const timeline = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));

        // Spread the messages somewhat evenly, with some organic variation
        const daySent = Math.floor(messagesSent / 7) + randomInt(-10, 10);
        const dayDelivered = Math.floor(daySent * (deliveryRate / 100)) + randomInt(-2, 2);

        return {
            date: d.toISOString().split('T')[0],
            sent: Math.max(0, daySent), // Ensure non-negative
            delivered: Math.max(0, Math.min(daySent, dayDelivered)) // Delivered <= Sent
        };
    });

    return {
        messagesSent,
        deliveryRate,
        totalCost,
        timeline
    };
};
