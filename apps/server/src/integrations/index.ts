/**
 * 統合モジュール エクスポート
 */

// 型定義
export * from './types';

// レジストリ
export { IntegrationRegistry } from './IntegrationRegistry';

// プロバイダー
export { openWeatherMapIntegration } from './providers/openweathermap';

// すべての組み込み統合モジュール
import { openWeatherMapIntegration } from './providers/openweathermap';
import type { IntegrationConfig } from './types';

/**
 * 組み込み統合モジュール一覧
 */
export const builtInIntegrations: IntegrationConfig[] = [
  openWeatherMapIntegration,
  // 今後追加する統合モジュールはここに追加
  // stockApiIntegration,
  // googleDriveIntegration,
  // slackIntegration,
];

/**
 * 統合モジュールを初期化（サーバー起動時に呼び出し）
 */
export function initializeIntegrations(): void {
  const { IntegrationRegistry } = require('./IntegrationRegistry');
  const registry = IntegrationRegistry.getInstance();

  // 組み込み統合モジュールを登録
  registry.registerAll(builtInIntegrations);
}
