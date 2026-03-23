export enum LoggerLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}
export interface LoggerProperties {
    level: LoggerLevel;
}