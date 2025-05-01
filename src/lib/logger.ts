// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Log interface
interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  includeTimestamp: boolean;
  includeStack: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  includeTimestamp: true,
  includeStack: true,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogMessage {
    const timestamp = new Date().toISOString();
    return {
      level,
      message,
      data,
      timestamp,
    };
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const logMessage = this.formatMessage(level, message, data);
    const prefix = `[${level}]${this.config.includeTimestamp ? ` [${logMessage.timestamp}]` : ''}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        if (this.config.includeStack && data instanceof Error) {
          console.error(data.stack);
        }
        break;
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }
}

// Create a singleton instance
export const logger = new Logger();

// Performance monitoring utility
export const performanceMonitor = {
  start(label: string) {
    console.time(label);
  },
  end(label: string) {
    console.timeEnd(label);
  },
  measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  },
};

// Error tracking utility
export const errorTracker = {
  track(error: Error, context?: any) {
    logger.error('Error occurred', { error, context });
    // Here you can add additional error tracking logic
    // For example, sending errors to a monitoring service
  },
}; 