/**
 * 統合モジュールレジストリ
 * 統合モジュールの管理と検索を担当
 */

import { logger } from '../dynamic/utils/logger';
import type {
  IntegrationConfig,
  IntegrationStatus,
  IntegrationTool,
  IIntegrationRegistry,
} from './types';

/**
 * 統合モジュールレジストリ（シングルトン）
 */
export class IntegrationRegistry implements IIntegrationRegistry {
  private static instance: IntegrationRegistry;
  private integrations: Map<string, IntegrationConfig> = new Map();

  private constructor() {
    // シングルトン
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  /**
   * 統合モジュールを登録
   */
  register(integration: IntegrationConfig): void {
    if (this.integrations.has(integration.id)) {
      logger.warn('Integration already registered, overwriting', { id: integration.id });
    }

    this.integrations.set(integration.id, integration);
    logger.info('Integration registered', {
      id: integration.id,
      displayName: integration.displayName,
      toolCount: integration.tools.length,
    });
  }

  /**
   * 複数の統合モジュールを一括登録
   */
  registerAll(integrations: IntegrationConfig[]): void {
    for (const integration of integrations) {
      this.register(integration);
    }
  }

  /**
   * IDで統合モジュールを取得
   */
  get(id: string): IntegrationConfig | undefined {
    return this.integrations.get(id);
  }

  /**
   * ツール名で統合モジュールを検索
   */
  findByToolName(toolName: string): IntegrationConfig | undefined {
    for (const integration of this.integrations.values()) {
      const tool = integration.tools.find((t) => t.name === toolName);
      if (tool) {
        return integration;
      }
    }
    return undefined;
  }

  /**
   * ツール名でツールを取得
   */
  getToolByName(toolName: string): IntegrationTool | undefined {
    for (const integration of this.integrations.values()) {
      const tool = integration.tools.find((t) => t.name === toolName);
      if (tool) {
        return tool;
      }
    }
    return undefined;
  }

  /**
   * すべての統合モジュールを取得
   */
  getAll(): IntegrationConfig[] {
    return Array.from(this.integrations.values());
  }

  /**
   * 設定済みの統合モジュールのみ取得
   */
  getConfigured(): IntegrationConfig[] {
    return this.getAll().filter((integration) => {
      return integration.requiredEnvVars.every((envVar) => !!process.env[envVar]);
    });
  }

  /**
   * すべての許可ドメインを取得（設定済みの統合モジュールのみ）
   */
  getAllAllowedDomains(): string[] {
    const domains = new Set<string>();

    for (const integration of this.getConfigured()) {
      for (const domain of integration.allowedDomains) {
        domains.add(domain);
      }
    }

    return Array.from(domains);
  }

  /**
   * すべての利用可能なツール名を取得（設定済みの統合モジュールのみ）
   */
  getAllAvailableToolNames(): string[] {
    const toolNames: string[] = [];

    for (const integration of this.getConfigured()) {
      for (const tool of integration.tools) {
        toolNames.push(tool.name);
      }
    }

    return toolNames;
  }

  /**
   * 統合モジュールのステータスを取得
   */
  getStatus(id: string): IntegrationStatus | undefined {
    const integration = this.integrations.get(id);
    if (!integration) {
      return undefined;
    }

    const missingEnvVars = integration.requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    return {
      id: integration.id,
      isConfigured: missingEnvVars.length === 0,
      missingEnvVars,
      availableTools: integration.tools.map((t) => t.name),
    };
  }

  /**
   * すべての統合モジュールのステータスを取得
   */
  getAllStatuses(): IntegrationStatus[] {
    return this.getAll().map((integration) => this.getStatus(integration.id)!);
  }

  /**
   * 統合モジュールの概要を取得（LLMプロンプト用）
   */
  getSummaryForPrompt(): string {
    const configured = this.getConfigured();

    if (configured.length === 0) {
      return '(利用可能な統合モジュールはありません)';
    }

    return configured
      .map((integration) => {
        const toolNames = integration.tools.map((t) => t.name).join(', ');
        return `- ${integration.displayName} (${integration.id}): ${integration.description}\n  ツール: ${toolNames}`;
      })
      .join('\n');
  }

  /**
   * 統合モジュールの詳細情報を取得（LLMプロンプト用）
   */
  getDetailedInfoForPrompt(): string {
    const configured = this.getConfigured();

    if (configured.length === 0) {
      return '(利用可能な統合モジュールはありません)';
    }

    return configured
      .map((integration) => {
        const toolsInfo = integration.tools
          .map((tool) => {
            const params = tool.parameters
              .map((p) => `${p.name}: ${p.type}${p.optional ? '?' : ''}`)
              .join(', ');
            return `  - ${tool.name}(${params}): ${tool.description}`;
          })
          .join('\n');

        return `### ${integration.displayName} (${integration.id})\n${integration.description}\n${toolsInfo}`;
      })
      .join('\n\n');
  }

  /**
   * レジストリをクリア（テスト用）
   */
  clear(): void {
    this.integrations.clear();
    logger.info('Integration registry cleared');
  }
}

export default IntegrationRegistry;
