import { config } from 'dotenv';
import { LoggerManager } from 'logging-library/lib/LoggerManager';

config();

export enum LogLevel {
  DEBUG = 'debug',
  ERROR = 'error',
  INFO = 'info',
  TRACE = 'trace',
  WARNING = 'warning',
}

export class ArchiveLogger extends LoggerManager {
  public static getDefaultBlueprintIdentifier(): string {
    return 'archive-axios-default';
  }
}
