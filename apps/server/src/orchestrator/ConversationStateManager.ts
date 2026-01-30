/**
 * 会話状態マネージャー
 * セッションごとの会話状態（提案承認待ちなど）を管理
 */

import { logger } from '../dynamic/utils/logger';
import type { AgentProposal, ConversationState } from '../dynamic/types/proposal.types';

/**
 * 会話状態マネージャーの設定
 */
export interface ConversationStateManagerConfig {
  /** セッションタイムアウト（ミリ秒） */
  sessionTimeout: number;
  /** クリーンアップ間隔（ミリ秒） */
  cleanupInterval: number;
}

const DEFAULT_CONFIG: ConversationStateManagerConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30分
  cleanupInterval: 5 * 60 * 1000,  // 5分
};

/**
 * 会話状態マネージャー
 */
export class ConversationStateManager {
  private states: Map<string, ConversationState> = new Map();
  private config: ConversationStateManagerConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<ConversationStateManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * 保留中の提案を設定
   */
  setPendingProposal(sessionId: string, proposal: AgentProposal): void {
    logger.info('Setting pending proposal', {
      sessionId,
      proposalId: proposal.id,
      agentId: proposal.suggestedAgent.agentId,
    });

    const state: ConversationState = {
      sessionId,
      pendingProposal: proposal,
      lastActivity: new Date(),
    };

    this.states.set(sessionId, state);
  }

  /**
   * 保留中の提案を取得
   */
  getPendingProposal(sessionId: string): AgentProposal | undefined {
    const state = this.states.get(sessionId);
    if (!state) {
      return undefined;
    }

    // タイムアウトチェック
    const elapsed = Date.now() - state.lastActivity.getTime();
    if (elapsed > this.config.sessionTimeout) {
      logger.info('Session timed out', { sessionId });
      this.states.delete(sessionId);
      return undefined;
    }

    // アクティビティを更新
    state.lastActivity = new Date();

    return state.pendingProposal;
  }

  /**
   * 保留中の提案をクリア
   */
  clearPendingProposal(sessionId: string): void {
    logger.info('Clearing pending proposal', { sessionId });
    this.states.delete(sessionId);
  }

  /**
   * セッションの状態を取得
   */
  getState(sessionId: string): ConversationState | undefined {
    return this.states.get(sessionId);
  }

  /**
   * セッションが提案待ち状態かどうか
   */
  hasPendingProposal(sessionId: string): boolean {
    const proposal = this.getPendingProposal(sessionId);
    return proposal !== undefined;
  }

  /**
   * 全セッションの状態を取得
   */
  getAllStates(): ConversationState[] {
    return Array.from(this.states.values());
  }

  /**
   * セッション数を取得
   */
  getSessionCount(): number {
    return this.states.size;
  }

  /**
   * タイムアウトしたセッションをクリーンアップ
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, state] of this.states.entries()) {
      const elapsed = now - state.lastActivity.getTime();
      if (elapsed > this.config.sessionTimeout) {
        this.states.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired sessions', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * クリーンアップタイマーを開始
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Node.jsでプロセス終了を妨げないようにする
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * クリーンアップタイマーを停止
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 全セッションをクリア
   */
  clear(): void {
    this.states.clear();
    logger.info('All conversation states cleared');
  }

  /**
   * 設定を取得
   */
  getConfig(): ConversationStateManagerConfig {
    return { ...this.config };
  }
}

export default ConversationStateManager;
