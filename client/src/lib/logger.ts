/**
 * Logger utility that only outputs in development mode
 * Usage: import { logger } from '@/lib/logger'
 *        logger.log('[Component] message')
 *        logger.error('[Component] error', error)
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Errors are always logged (useful for debugging production issues)
    console.error(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

export default logger;
