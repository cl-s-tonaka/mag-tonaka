/**
 * フィーチャーフラグ管理
 * 動的エージェントシステムの有効化制御
 */

/**
 * フィーチャーフラグ
 */
export const FEATURE_FLAGS = {
  /**
   * 動的エージェントシステムの有効化
   * デフォルト: false（環境変数で制御）
   */
  ENABLE_DYNAMIC_AGENTS: process.env.ENABLE_DYNAMIC_AGENTS === 'true',

  /**
   * 動的ツールの有効化
   * デフォルト: ENABLE_DYNAMIC_AGENTSと同じ
   */
  ENABLE_DYNAMIC_TOOLS:
    process.env.ENABLE_DYNAMIC_TOOLS === 'true' ||
    process.env.ENABLE_DYNAMIC_AGENTS === 'true',

  /**
   * 詳細ログの有効化
   * デフォルト: false
   */
  ENABLE_DEBUG_LOGGING: process.env.ENABLE_DEBUG_LOGGING === 'true',

  /**
   * VM2サンドボックスの有効化
   * デフォルト: true（本番環境推奨）
   */
  ENABLE_VM2_SANDBOX: process.env.ENABLE_VM2_SANDBOX !== 'false',
};

/**
 * フィーチャーフラグの状態を取得
 */
export function getFeatureFlagsStatus(): Record<string, boolean> {
  return { ...FEATURE_FLAGS };
}

/**
 * フィーチャーフラグの状態をログ出力
 */
export function logFeatureFlagsStatus(): void {
  console.log('Feature Flags Status:', JSON.stringify(FEATURE_FLAGS, null, 2));
}
