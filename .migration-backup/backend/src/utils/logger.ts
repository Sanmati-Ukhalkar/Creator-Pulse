import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

/**
 * Pretty format for development — colorized, human-readable.
 */
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        if (stack) {
            return `${timestamp} ${level}: ${message}\n${stack}`;
        }
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

/**
 * JSON format for production — structured, parsable by log aggregators.
 */
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
    defaultMeta: { service: 'creatorpulse-backend' },
    transports: [
        new winston.transports.Console(),
    ],
});
