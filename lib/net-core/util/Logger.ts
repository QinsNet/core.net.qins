import log, { LogLevelDesc } from 'loglevel';
import { LoggerLevel } from '../config/Logger';

export class Logger {
    private logger;
    constructor(name: string, level: LoggerLevel = LoggerLevel.Info) {
        this.logger = log.getLogger(name);
        this.logger.setLevel(level);
    }
    setLogLevel(level: LoggerLevel) {
        this.logger.setLevel(level as LogLevelDesc);
    }
    info(...msg: any[]) {
        this.logger.info(...msg);
    }
    warn(...msg: any[]) {
        this.logger.warn(...msg);
    }
    debug(...msg: any[]) {
        this.logger.debug(...msg);
    }
    error(...msg: any[]) {
        this.logger.error(...msg);
    }
    trace(...msg: any[]) {
        this.logger.trace(...msg);
    }
}