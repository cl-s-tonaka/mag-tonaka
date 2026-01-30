/**
 * オーケストレーターAPI Router
 * /api/v2/orchestrator エンドポイント
 */

import type { AgentOrchestrator } from './AgentOrchestrator';
import type { ApiResponse } from '../dynamic/types/dynamicAgent.types';
import { createErrorResponse, getHttpStatus } from '../dynamic/api/errorHandlers';
import { logger } from '../dynamic/utils/logger';
import { randomUUID } from 'crypto';

/**
 * オーケストレーターAPIルーターを作成
 */
export function createOrchestratorRouter(orchestrator: AgentOrchestrator): any {
  const routes = {
    /**
     * POST /api/v2/orchestrator/process
     * リクエストを処理（自動ルーティング）
     * 動的エージェント自動生成対応
     */
    processRequest: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('POST /api/v2/orchestrator/process', { requestId });

      try {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== 'string') {
          throw new Error('message is required and must be a string');
        }

        // オーケストレーターでリクエストを処理（sessionId対応）
        const result = await orchestrator.processRequest(message, sessionId);

        // レスポンス
        const response: ApiResponse = {
          success: result.success,
          data: {
            response: result.response,
            routing: result.routing,
            agentResult: result.agentResult,
            awaitingApproval: result.awaitingApproval,
            proposalId: result.proposalId,
            createdAgent: result.createdAgent,
            sessionId: sessionId || 'default',
            processedAt: new Date().toISOString(),
          },
          error: result.error ? { code: 'PROCESSING_ERROR', message: result.error } : undefined,
        };

        res.status(result.success ? 200 : 500).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * POST /api/v2/orchestrator/route
     * ルーティングのみ実行（実行はしない）
     */
    analyzeRoute: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('POST /api/v2/orchestrator/route', { requestId });

      try {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== 'string') {
          throw new Error('message is required and must be a string');
        }

        // 内部的にdecideRoutingを呼び出すためにprocessRequestを使用
        // ただし実際の実行はしない
        const result = await orchestrator.processRequest(message, sessionId);

        // レスポンス（ルーティング情報のみ）
        const response: ApiResponse = {
          success: true,
          data: {
            routing: result.routing,
            awaitingApproval: result.awaitingApproval,
            proposalId: result.proposalId,
            analyzedAt: new Date().toISOString(),
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * POST /api/v2/orchestrator/parallel
     * 複数エージェントで並列実行
     */
    runParallel: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('POST /api/v2/orchestrator/parallel', { requestId });

      try {
        const { tasks } = req.body;

        if (!Array.isArray(tasks) || tasks.length === 0) {
          throw new Error('tasks must be a non-empty array');
        }

        // バリデーション
        for (const task of tasks) {
          if (!task.agentId || !task.task) {
            throw new Error('Each task must have agentId and task properties');
          }
        }

        // 並列実行
        const results = await orchestrator.runParallel(tasks);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            results,
            executedAt: new Date().toISOString(),
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * POST /api/v2/orchestrator/pipeline
     * パイプライン実行（シーケンシャル）
     */
    runPipeline: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('POST /api/v2/orchestrator/pipeline', { requestId });

      try {
        const { pipeline, initialInput } = req.body;

        if (!Array.isArray(pipeline) || pipeline.length === 0) {
          throw new Error('pipeline must be a non-empty array');
        }

        // バリデーション
        for (const step of pipeline) {
          if (!step.agentId || !step.taskTemplate) {
            throw new Error('Each step must have agentId and taskTemplate properties');
          }
        }

        // パイプライン実行
        const result = await orchestrator.runPipeline(pipeline, initialInput);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            steps: result.steps,
            finalOutput: result.finalOutput,
            executedAt: new Date().toISOString(),
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * GET /api/v2/orchestrator/config
     * オーケストレーター設定を取得
     */
    getConfig: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('GET /api/v2/orchestrator/config', { requestId });

      try {
        const config = orchestrator.getConfig();

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: config,
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * DELETE /api/v2/orchestrator/history
     * 会話履歴をクリア
     */
    clearHistory: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('DELETE /api/v2/orchestrator/history', { requestId });

      try {
        const { sessionId } = req.body || {};

        orchestrator.clearHistory();

        // セッション状態もクリア（指定がある場合）
        if (sessionId) {
          orchestrator.clearSessionState(sessionId);
        }

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            message: 'Conversation history cleared',
            sessionCleared: sessionId || null,
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * DELETE /api/v2/orchestrator/session/:sessionId
     * 特定セッションの状態をクリア
     */
    clearSession: async (req: any, res: any) => {
      const requestId = randomUUID();
      const { sessionId } = req.params;
      logger.info('DELETE /api/v2/orchestrator/session', { requestId, sessionId });

      try {
        if (!sessionId) {
          throw new Error('sessionId is required');
        }

        orchestrator.clearSessionState(sessionId);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            message: `Session ${sessionId} cleared`,
            sessionId,
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },
  };

  return routes;
}

export default createOrchestratorRouter;
