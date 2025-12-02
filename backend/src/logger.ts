import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const httpLogger = pinoHttp({ logger });
export default logger;
