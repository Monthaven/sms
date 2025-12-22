/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const httpLogger = pinoHttp({ logger });
export default logger;
