import winston from 'winston';

const logger = winston.createLogger({
 level: process.env.LOG_LEVEL || 'info',
 format: winston.format.combine(
 winston.format.timestamp(),
 winston.format.errors({ stack: true }),
 winston.format.json()
 ),
 transports: [
 new winston.transports.Console(),
 ],
});

if (process.env.NODE_ENV !== 'production') {
 logger.clear();
 logger.add(
 new winston.transports.Console({
 format: winston.format.combine(
 winston.format.colorize(),
 winston.format.simple()
 ),
 })
 );
}

export { logger };
