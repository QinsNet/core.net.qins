import log from 'loglevel';

const logger = log.getLogger('qins');

const envLogLevel = typeof process !== 'undefined' ? process?.env?.LOG_LEVEL : null;
logger.setLevel((envLogLevel as log.LogLevelNames) ?? 'debug');

export const Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, meta ? JSON.stringify(meta) : '');
  },

  error: (message: string, meta?: Record<string, unknown>) => {
    logger.error(message, meta ? JSON.stringify(meta) : '');
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, meta ? JSON.stringify(meta) : '');
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, meta ? JSON.stringify(meta) : '');
  },

  trace: (message: string, meta?: Record<string, unknown>) => {
    logger.trace(message, meta ? JSON.stringify(meta) : '');
  }
};

export default logger;