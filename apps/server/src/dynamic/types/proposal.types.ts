/**
 * エージェント提案関連の型定義
 */

import type { DynamicToolDefinition } from './dynamicAgent.types';

/**
 * ツール提案
 */
export interface ToolSuggestion {
  name: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    optional?: boolean;
  }>;
  reason: string;
}

/**
 * エージェント提案
 */
export interface AgentProposal {
  id: string;
  originalRequest: string;
  suggestedAgent: {
    agentId: string;
    displayName: string;
    description: string;
    instructions: string;
    capabilities: string[];
    suggestedTools?: ToolSuggestion[];
  };
  reasoning: string;
  createdAt: Date;
}

/**
 * 会話状態
 */
export interface ConversationState {
  sessionId: string;
  pendingProposal?: AgentProposal;
  lastActivity: Date;
}

/**
 * 承認キーワード
 */
export const APPROVAL_KEYWORDS = ['はい', 'yes', 'ok', '作成', '作って', 'お願い', 'お願いします', 'よろしく', 'いいよ', 'いいです'] as const;

/**
 * 拒否キーワード
 */
export const REJECTION_KEYWORDS = ['いいえ', 'no', 'やめる', 'キャンセル', '不要', 'やめて', '中止', 'cancel'] as const;

/**
 * オーケストレーション結果（拡張版）
 */
export interface ExtendedOrchestrationResult {
  success: boolean;
  response: string;
  routing: {
    targetAgentId: string;
    reason: string;
    confidence: number;
    reformulatedTask?: string;
  };
  agentResult?: any;
  error?: string;
  awaitingApproval?: boolean;
  proposalId?: string;
  createdAgent?: {
    agentId: string;
    displayName: string;
  };
}

/**
 * 提案生成リクエスト
 */
export interface ProposalGenerationRequest {
  userMessage: string;
  availableAgents: Array<{
    id: string;
    displayName: string;
    description: string;
  }>;
}

/**
 * 提案の設定
 */
export interface ProposalConfig {
  confidenceThreshold: number;
  autoExecuteAfterCreate: boolean;
  approvalKeywords: readonly string[];
  rejectionKeywords: readonly string[];
}

/**
 * デフォルト設定
 */
export const DEFAULT_PROPOSAL_CONFIG: ProposalConfig = {
  confidenceThreshold: parseFloat(process.env.PROPOSAL_CONFIDENCE_THRESHOLD || '0.7'),
  autoExecuteAfterCreate: process.env.AUTO_EXECUTE_AFTER_CREATE !== 'false',
  approvalKeywords: APPROVAL_KEYWORDS,
  rejectionKeywords: REJECTION_KEYWORDS,
};
