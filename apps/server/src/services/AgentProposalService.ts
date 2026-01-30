/**
 * エージェント提案サービス
 * LLMを使用してユーザーリクエストに対応する新エージェントの提案を生成
 */

import { randomUUID } from 'crypto';
import { LiteLLMService } from './LiteLLMService';
import { logger } from '../dynamic/utils/logger';
import type {
  AgentProposal,
  ToolSuggestion,
  ProposalGenerationRequest,
  ProposalConfig,
  DEFAULT_PROPOSAL_CONFIG,
} from '../dynamic/types/proposal.types';

/**
 * エージェント提案サービス
 */
export class AgentProposalService {
  private llmService: LiteLLMService;
  private config: ProposalConfig;

  constructor(llmService: LiteLLMService, config?: Partial<ProposalConfig>) {
    this.llmService = llmService;
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.7,
      autoExecuteAfterCreate: config?.autoExecuteAfterCreate ?? true,
      approvalKeywords: config?.approvalKeywords ?? ['はい', 'yes', 'ok', '作成', '作って', 'お願い', 'お願いします', 'よろしく', 'いいよ', 'いいです'],
      rejectionKeywords: config?.rejectionKeywords ?? ['いいえ', 'no', 'やめる', 'キャンセル', '不要', 'やめて', '中止', 'cancel'],
    };
  }

  /**
   * 提案を生成
   */
  async createProposal(request: ProposalGenerationRequest): Promise<AgentProposal> {
    logger.info('Creating agent proposal', { userMessage: request.userMessage.substring(0, 100) });

    const existingAgentsList = request.availableAgents
      .map((a) => `- ${a.displayName} (${a.id}): ${a.description}`)
      .join('\n');

    const systemPrompt = `あなたはマルチエージェントシステムの設計者です。
ユーザーのリクエストに対応できる既存のエージェントがないため、新しいエージェントを設計してください。

## 既存エージェント（参考）
${existingAgentsList || '(なし)'}

## タスク
ユーザーのリクエストを分析し、新しいエージェントの設計を提案してください。

## 出力形式（JSON）
{
  "agentId": "camelCaseでエージェントID（例: stockAnalysisAgent）",
  "displayName": "表示名（例: Stock Analysis Agent）",
  "description": "エージェントの説明（1-2文）",
  "instructions": "エージェントへのシステムプロンプト（詳細な指示）",
  "capabilities": ["機能1", "機能2", "機能3"],
  "suggestedTools": [
    {
      "name": "tool_name (英数字、アンダースコア、ハイフンのみ。例: get_stock_price)",
      "description": "ツールの説明",
      "parameters": [
        { "name": "param1", "type": "string", "description": "説明" }
      ],
      "reason": "このツールが必要な理由"
    }
  ],
  "reasoning": "このエージェントを提案する理由"
}

注意:
- agentIdはcamelCaseで、末尾に"Agent"を付ける
- suggestedToolsは必須ではない（LLMのみで対応可能な場合は空配列）
- 既存のエージェントと重複しないように設計
- JSONのみを出力してください`;

    try {
      const response = await this.llmService.generateText(
        `ユーザーリクエスト: ${request.userMessage}`,
        systemPrompt,
        { temperature: 0.7 }
      );

      // JSONを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const suggestion = JSON.parse(jsonMatch[0]);

      const proposal: AgentProposal = {
        id: randomUUID(),
        originalRequest: request.userMessage,
        suggestedAgent: {
          agentId: suggestion.agentId || this.generateAgentId(request.userMessage),
          displayName: suggestion.displayName || 'New Agent',
          description: suggestion.description || 'Generated agent',
          instructions: suggestion.instructions || `You are an agent for: ${request.userMessage}`,
          capabilities: suggestion.capabilities || [],
          suggestedTools: suggestion.suggestedTools || [],
        },
        reasoning: suggestion.reasoning || 'Generated based on user request',
        createdAt: new Date(),
      };

      logger.info('Proposal created', {
        proposalId: proposal.id,
        agentId: proposal.suggestedAgent.agentId,
      });

      return proposal;
    } catch (error: any) {
      logger.error('Failed to create proposal', { error: error.message });

      // フォールバック: 基本的な提案を生成
      return this.createFallbackProposal(request.userMessage);
    }
  }

  /**
   * フォールバック提案を生成
   */
  private createFallbackProposal(userMessage: string): AgentProposal {
    const agentId = this.generateAgentId(userMessage);
    const displayName = this.generateDisplayName(agentId);

    return {
      id: randomUUID(),
      originalRequest: userMessage,
      suggestedAgent: {
        agentId,
        displayName,
        description: `${userMessage}に対応するエージェント`,
        instructions: `あなたは${userMessage}を処理するエージェントです。
ユーザーの要求を理解し、適切に応答してください。`,
        capabilities: ['リクエスト処理', '回答生成'],
        suggestedTools: [],
      },
      reasoning: 'ユーザーのリクエストに基づいて自動生成された提案',
      createdAt: new Date(),
    };
  }

  /**
   * エージェントIDを生成
   */
  private generateAgentId(request: string): string {
    // キーワードを抽出してIDを生成
    const keywords = request
      .replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 3);

    if (keywords.length === 0) {
      return `customAgent_${Date.now()}`;
    }

    // 英語キーワードを優先
    const englishKeywords = keywords.filter((w) => /^[a-zA-Z]+$/.test(w));
    const baseKeywords = englishKeywords.length > 0 ? englishKeywords : ['custom'];

    const camelCase = baseKeywords
      .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join('');

    return camelCase + 'Agent';
  }

  /**
   * 表示名を生成
   */
  private generateDisplayName(agentId: string): string {
    // camelCase → Title Case
    return agentId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * 提案メッセージをフォーマット
   */
  formatProposalMessage(proposal: AgentProposal): string {
    const { suggestedAgent, reasoning } = proposal;

    let message = `対応できるエージェントが見つかりませんでした。\n\n`;
    message += `**${suggestedAgent.displayName}** を作成しますか？\n\n`;
    message += `📝 **説明**: ${suggestedAgent.description}\n\n`;
    message += `🔧 **機能**:\n`;
    suggestedAgent.capabilities.forEach((cap) => {
      message += `  - ${cap}\n`;
    });

    if (suggestedAgent.suggestedTools && suggestedAgent.suggestedTools.length > 0) {
      message += `\n🛠️ **ツール**:\n`;
      suggestedAgent.suggestedTools.forEach((tool) => {
        message += `  - ${tool.name}: ${tool.description}\n`;
      });
    }

    message += `\n💡 **理由**: ${reasoning}\n\n`;
    message += `作成する場合は「はい」、しない場合は「いいえ」と回答してください。`;

    return message;
  }

  /**
   * 承認判定
   */
  isApprovalMessage(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return this.config.approvalKeywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    );
  }

  /**
   * 拒否判定
   */
  isRejectionMessage(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return this.config.rejectionKeywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    );
  }

  /**
   * 設定を取得
   */
  getConfig(): ProposalConfig {
    return { ...this.config };
  }
}

export default AgentProposalService;
