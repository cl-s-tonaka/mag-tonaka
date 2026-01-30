/**
 * ロガーユーティリティ
 * 動的エージェントシステム専用のロギング機能
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component?: string;
  message: string;
  data?: any;
}

class Logger {
  private component: string = 'DynamicSystem';

  /**
   * ログを出力
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'DEBUG':
      case 'INFO':
        console.log(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'ERROR':
        console.error(output);
        break;
    }
  }

  /**
   * DEBUGレベルログ
   */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * INFOレベルログ
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * WARNレベルログ
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * ERRORレベルログ
   */
  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  /**
   * コンポーネント名を設定
   */
  setComponent(component: string): void {
    this.component = component;
  }
}

export const logger = new Logger();
