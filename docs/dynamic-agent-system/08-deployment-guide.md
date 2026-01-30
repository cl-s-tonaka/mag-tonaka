# デプロイメントガイド

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| **ドキュメントバージョン** | 1.0.0 |
| **最終更新日** | 2026-01-29 |
| **ステータス** | Draft |

## 1. デプロイ戦略

### 1.1 段階的ロールアウト

```
Stage 1: 開発環境
  ↓ (テスト完了)
Stage 2: ステージング環境
  ↓ (内部テスト完了)
Stage 3: プロダクション環境（10%ユーザー）
  ↓ (監視・評価)
Stage 4: プロダクション環境（50%ユーザー）
  ↓ (監視・評価)
Stage 5: プロダクション環境（100%ユーザー）
```

### 1.2 フィーチャーフラグ戦略

```typescript
// src/dynamic/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  ENABLE_DYNAMIC_AGENTS: process.env.ENABLE_DYNAMIC_AGENTS === 'true',
  ENABLE_DYNAMIC_TOOLS: process.env.ENABLE_DYNAMIC_TOOLS === 'true',
  DYNAMIC_AGENTS_USER_PERCENTAGE: parseInt(process.env.DYNAMIC_AGENTS_USER_PERCENTAGE || '0'),
};
```

---

## 2. Stage 1: 開発環境

### 2.1 準備

```bash
# リポジトリクローン
git clone <repository-url>
cd mag/apps/server

# 依存関係インストール
npm install

# 環境変数設定
cat > .env.development << EOF
NODE_ENV=development
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
LOG_LEVEL=debug
EOF
```

### 2.2 データベースセットアップ

```bash
# マイグレーション実行
node -e "require('./src/dynamic/storage/migrations').runMigrations('./dynamic_agents.db')"

# DB確認
sqlite3 dynamic_agents.db ".tables"
# 期待される出力: dynamic_agents, dynamic_tools, dynamic_test_examples, dynamic_agent_audit
```

### 2.3 サーバー起動

```bash
# 開発モードで起動
npm run dev

# ログ確認
tail -f logs/server.log | grep "dynamic"
```

### 2.4 動作確認

```bash
# ヘルスチェック
curl http://localhost:4310/health

# テストエージェント作成
curl -X POST http://localhost:4310/api/v2/dynamic-agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "testAgent",
    "displayName": "Test Agent",
    "description": "Test agent",
    "instructions": "You are a test agent."
  }'

# エージェント一覧確認
curl http://localhost:4310/api/agents-with-examples | jq '.data[] | .id'
```

---

## 3. Stage 2: ステージング環境

### 3.1 デプロイ準備

```bash
# ビルド
npm run build

# テスト実行
npm test

# カバレッジ確認
npm test -- --coverage
# 期待値: Coverage > 80%
```

### 3.2 環境変数設定（ステージング）

```bash
# .env.staging
NODE_ENV=staging
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
LOG_LEVEL=info

# データベースパス
DATABASE_PATH=./dynamic_agents_staging.db

# モニタリング
SENTRY_DSN=<sentry-dsn>
```

### 3.3 デプロイ

```bash
# ステージングサーバーにデプロイ
ssh staging-server
cd /app/mag/apps/server

# 最新コードをプル
git pull origin main

# 依存関係更新
npm install

# マイグレーション実行
npm run migrate

# サーバー再起動
pm2 restart mag-server
```

### 3.4 スモークテスト

```bash
# ヘルスチェック
curl https://staging.example.com/health

# エージェント作成テスト
curl -X POST https://staging.example.com/api/v2/dynamic-agents \
  -H "Content-Type: application/json" \
  -d @test-agent.json

# エージェント実行テスト
curl -X POST https://staging.example.com/api/agents/testAgent/execute \
  -H "Content-Type: application/json" \
  -d '{"task":"Hello"}'
```

### 3.5 内部テスト（1-2日）

**テストチェックリスト**:
- [ ] エージェント作成（10個）
- [ ] エージェント更新
- [ ] エージェント削除
- [ ] エージェント実行（100回）
- [ ] サーバー再起動後の復元
- [ ] パフォーマンステスト
- [ ] セキュリティ監査

---

## 4. Stage 3: プロダクション環境（10%ユーザー）

### 4.1 フィーチャーフラグ設定

```bash
# .env.production
NODE_ENV=production
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
DYNAMIC_AGENTS_USER_PERCENTAGE=10  # 10%ユーザー
LOG_LEVEL=info

# データベース
DATABASE_PATH=/data/dynamic_agents.db

# セキュリティ
API_KEY_REQUIRED=true

# モニタリング
SENTRY_DSN=<sentry-dsn>
PROMETHEUS_ENABLED=true
```

### 4.2 デプロイ手順

```bash
# 1. バックアップ
./scripts/backup-database.sh

# 2. デプロイ
git pull origin main
npm install
npm run build

# 3. マイグレーション（ドライラン）
npm run migrate -- --dry-run

# 4. マイグレーション実行
npm run migrate

# 5. サーバー再起動（ダウンタイムなし）
pm2 reload mag-server
```

### 4.3 カナリアデプロイ

```typescript
// index.ts
import { FEATURE_FLAGS } from './dynamic/utils/featureFlags';

function shouldEnableDynamicAgentsForUser(userId: string): boolean {
  if (!FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
    return false;
  }

  // ユーザーIDのハッシュ値で判定
  const hash = hashCode(userId);
  const percentage = FEATURE_FLAGS.DYNAMIC_AGENTS_USER_PERCENTAGE;
  return (hash % 100) < percentage;
}
```

### 4.4 監視設定

**Prometheusメトリクス**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mag-server'
    static_configs:
      - targets: ['localhost:4310']
```

**Grafanaダッシュボード**:
- 動的エージェント総数
- エージェント作成レート
- エージェント実行レート
- ツール実行エラー率
- API応答時間（P50, P95, P99）

**アラート設定**:
```yaml
# alerts.yml
groups:
  - name: dynamic_agents
    rules:
      - alert: HighToolExecutionErrorRate
        expr: rate(dynamic_tool_execution_errors_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High tool execution error rate"

      - alert: SlowAgentCreation
        expr: histogram_quantile(0.95, dynamic_agent_creation_duration_seconds) > 5
        for: 10m
        annotations:
          summary: "Agent creation is slow"
```

### 4.5 評価期間（3-5日）

**監視項目**:
- エラーレート
- API応答時間
- リソース使用量（CPU、メモリ）
- ユーザーフィードバック

**Go/No-Go判断基準**:
- エラーレート < 1%
- P95応答時間 < 3秒
- メモリ増加 < 20%
- クリティカルなバグなし

---

## 5. Stage 4: プロダクション環境（50%ユーザー）

### 5.1 フィーチャーフラグ更新

```bash
# 環境変数更新
export DYNAMIC_AGENTS_USER_PERCENTAGE=50

# サーバー再起動不要（動的に反映）
```

### 5.2 評価期間（2-3日）

**監視継続**:
- エラーレート
- パフォーマンス
- スケーラビリティ

---

## 6. Stage 5: プロダクション環境（100%ユーザー）

### 6.1 フィーチャーフラグ更新

```bash
# 全ユーザーに有効化
export DYNAMIC_AGENTS_USER_PERCENTAGE=100
```

### 6.2 完全ロールアウト完了

**確認項目**:
- [ ] 全ユーザーが動的エージェントにアクセス可能
- [ ] エラーレート正常
- [ ] パフォーマンス問題なし
- [ ] ドキュメント更新完了

---

## 7. ロールバック手順

### 7.1 緊急ロールバック（1分以内）

```bash
# フィーチャーフラグをOFF
export ENABLE_DYNAMIC_AGENTS=false

# サーバー再起動
pm2 restart mag-server

# 確認
curl http://localhost:4310/api/agents-with-examples | jq '.data[] | select(.isDynamic)'
# 期待値: 空の配列
```

### 7.2 完全ロールバック（5分以内）

```bash
# 1. フィーチャーフラグOFF
export ENABLE_DYNAMIC_AGENTS=false
pm2 restart mag-server

# 2. データベースバックアップから復元
cp /backups/dynamic_agents_<timestamp>.db ./dynamic_agents.db

# 3. コードロールバック
git revert <commit-hash>
npm install
npm run build
pm2 restart mag-server

# 4. 確認
npm test
curl http://localhost:4310/health
```

### 7.3 部分ロールバック

```bash
# 特定機能のみ無効化
export ENABLE_DYNAMIC_TOOLS=false  # ツール実行のみ無効化

# または
export DYNAMIC_AGENTS_USER_PERCENTAGE=10  # 10%に戻す
```

---

## 8. トラブルシューティング

### 8.1 よくある問題

**問題1: エージェントが復元されない**

```bash
# 診断
ls -l dynamic_agents.db
sqlite3 dynamic_agents.db "SELECT COUNT(*) FROM dynamic_agents WHERE status='active';"
tail -f logs/server.log | grep "Loaded.*dynamic agents"

# 解決策
node -e "require('./src/dynamic/storage/migrations').runMigrations('./dynamic_agents.db')"
pm2 restart mag-server
```

**問題2: ツール実行エラー多発**

```bash
# 診断
curl http://localhost:4310/metrics | grep dynamic_tool_execution_errors

# 解決策
# ツール実行を一時的に無効化
export ENABLE_DYNAMIC_TOOLS=false
pm2 restart mag-server

# ログ確認して原因特定
tail -f logs/server.log | grep "Tool execution error"
```

**問題3: メモリリーク**

```bash
# 診断
pm2 monit  # メモリ使用量確認
node --inspect=9229 dist/index.js  # ヒープスナップショット取得

# 緊急対応
pm2 restart mag-server

# 恒久対策
# エージェント数制限、未使用エージェントのアンロード
```

---

## 9. 監視とアラート

### 9.1 ログ監視

```bash
# エラーログ監視
tail -f logs/server.log | grep "ERROR"

# 動的システムログ監視
tail -f logs/server.log | grep "dynamic"

# 監査ログ監視
sqlite3 dynamic_agents.db "SELECT * FROM dynamic_agent_audit ORDER BY created_at DESC LIMIT 10;"
```

### 9.2 メトリクス監視

**Prometheusクエリ**:
```promql
# エージェント総数
dynamic_agents_total

# エージェント作成レート（5分平均）
rate(dynamic_agent_creation_duration_seconds_count[5m])

# ツール実行エラー率
rate(dynamic_tool_execution_errors_total[5m]) / rate(dynamic_tool_executions_total[5m])

# P95応答時間
histogram_quantile(0.95, rate(dynamic_agent_creation_duration_seconds_bucket[5m]))
```

---

## 10. デプロイチェックリスト

### 10.1 デプロイ前

- [ ] 全テスト合格
- [ ] カバレッジ > 80%
- [ ] セキュリティ監査完了
- [ ] ドキュメント更新
- [ ] データベースバックアップ完了
- [ ] ロールバックプラン確認
- [ ] ステークホルダー承認

### 10.2 デプロイ中

- [ ] マイグレーション成功
- [ ] サーバー起動成功
- [ ] ヘルスチェック合格
- [ ] スモークテスト合格

### 10.3 デプロイ後

- [ ] メトリクス正常
- [ ] エラーログなし
- [ ] ユーザーフィードバック収集
- [ ] 本番環境で24時間安定稼働

---

## 11. 緊急連絡先

| 役割 | 氏名 | 連絡先 |
|-----|------|-------|
| **オンコール** | TBD | slack: @oncall |
| **テックリード** | TBD | slack: @tech-lead |
| **DevOps** | TBD | slack: @devops |

---

**Completed**: 動的エージェントシステムの仕様書作成が完了しました。[README.md](./README.md) から各ドキュメントにアクセスしてください。
