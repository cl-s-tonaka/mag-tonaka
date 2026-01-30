# 動的エージェント自動生成 テストフロー

このドキュメントでは、既存のシステムでは処理できないユーザーリクエストから新規エージェントを自動生成し、同じ要求に対して2度目以降は成功するという体験を確認するためのテストフローを説明します。

## 前提条件

- サーバーが起動していること
- LiteLLM/OpenAI互換APIが設定されていること

```bash
# サーバー起動
cd apps/server
PORT=3001 npm run dev:multiagent
```

## テストシナリオ

### シナリオ1: 株価分析エージェントの自動生成

既存のエージェント（天気、翻訳、計算）では対応できない「株価分析」リクエストを送信し、新しいエージェントを自動生成します。

---

## Step 1: 初期状態の確認

まず、現在登録されているエージェントを確認します。

```bash
curl -s http://localhost:3001/api/v2/dynamic-agents | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": [
    {
      "agentId": "weather-agent",
      "displayName": "Weather Agent",
      "description": "天気情報を取得するエージェント"
    },
    {
      "agentId": "translator-agent",
      "displayName": "Translator Agent",
      "description": "テキストを翻訳するエージェント"
    },
    {
      "agentId": "calculator-agent",
      "displayName": "Calculator Agent",
      "description": "数学的な計算を行うエージェント"
    }
  ]
}
```

**ポイント:** 株価分析に対応できるエージェントが存在しないことを確認

---

## Step 2: 対応不可なリクエストを送信（1回目）

株価分析のリクエストを送信します。このリクエストに対応できるエージェントがないため、システムは新エージェントの作成を提案します。

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "アップルの株価を分析して、今後の投資判断を教えて",
    "sessionId": "test-session-001"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "対応できるエージェントが見つかりませんでした。\n\n**Stock Analysis Agent** を作成しますか？\n\n📝 **説明**: 株価データの取得と分析、投資判断の支援を行うエージェント\n\n🔧 **機能**:\n  - 株価データの取得\n  - テクニカル分析\n  - 投資アドバイス生成\n\n🛠️ **ツール**:\n  - getStockPrice: 指定した銘柄の株価を取得\n  - analyzeStock: 株価データを分析\n\n💡 **理由**: ユーザーは株価分析と投資判断を求めており、既存のエージェントでは対応できません\n\n作成する場合は「はい」、しない場合は「いいえ」と回答してください。",
    "routing": {
      "targetAgentId": "orchestrator",
      "reason": "Low confidence (0.30 < 0.7)",
      "confidence": 0.3
    },
    "awaitingApproval": true,
    "proposalId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "sessionId": "test-session-001",
    "processedAt": "2026-01-30T10:00:00.000Z"
  }
}
```

**確認ポイント:**
- `awaitingApproval: true` - 承認待ち状態
- `proposalId` - 提案IDが発行されている
- `routing.confidence` - 0.7未満（既存エージェントでは対応不可と判断）

---

## Step 3: 提案を承認（エージェント作成）

「はい」と回答して、新しいエージェントの作成を承認します。

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "はい",
    "sessionId": "test-session-001"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "✅ **Stock Analysis Agent** を作成しました。\n\n📝 **元のリクエストの処理結果:**\n\nアップル（AAPL）の株価分析結果です。\n\n現在の株価は... [分析結果が続く]",
    "routing": {
      "targetAgentId": "stockAnalysisAgent",
      "reason": "Agent created from proposal",
      "confidence": 1.0
    },
    "awaitingApproval": false,
    "createdAgent": {
      "agentId": "stockAnalysisAgent",
      "displayName": "Stock Analysis Agent"
    },
    "sessionId": "test-session-001",
    "processedAt": "2026-01-30T10:00:05.000Z"
  }
}
```

**確認ポイント:**
- `createdAgent` - 新しいエージェントが作成された
- `response` - 元のリクエストが処理され、結果が含まれている
- `awaitingApproval: false` - 承認待ち状態が解除された

---

## Step 4: エージェント一覧を再確認

新しいエージェントが追加されたことを確認します。

```bash
curl -s http://localhost:3001/api/v2/dynamic-agents | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": [
    {
      "agentId": "weather-agent",
      "displayName": "Weather Agent",
      "description": "天気情報を取得するエージェント"
    },
    {
      "agentId": "translator-agent",
      "displayName": "Translator Agent",
      "description": "テキストを翻訳するエージェント"
    },
    {
      "agentId": "calculator-agent",
      "displayName": "Calculator Agent",
      "description": "数学的な計算を行うエージェント"
    },
    {
      "agentId": "stockAnalysisAgent",
      "displayName": "Stock Analysis Agent",
      "description": "株価データの取得と分析、投資判断の支援を行うエージェント"
    }
  ]
}
```

**確認ポイント:** `stockAnalysisAgent` が追加されている

---

## Step 5: 同じリクエストを再送信（2回目）

同じ株価分析のリクエストを再度送信します。今回は新しいエージェントで処理されます。

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "アップルの株価を分析して、今後の投資判断を教えて",
    "sessionId": "test-session-002"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "アップル（AAPL）の株価分析結果をお伝えします。\n\n【現在の株価】\n... [詳細な分析結果]",
    "routing": {
      "targetAgentId": "stockAnalysisAgent",
      "reason": "株価分析のリクエストなので Stock Analysis Agent が最適",
      "confidence": 0.95
    },
    "awaitingApproval": false,
    "sessionId": "test-session-002",
    "processedAt": "2026-01-30T10:01:00.000Z"
  }
}
```

**確認ポイント:**
- `routing.targetAgentId: "stockAnalysisAgent"` - 新しいエージェントにルーティングされた
- `routing.confidence: 0.95` - 高い信頼度で処理された
- `awaitingApproval: false` - 提案なしで即座に処理された

---

## Step 6: 類似のリクエストでも動作確認

株価に関連する別のリクエストも新しいエージェントで処理されることを確認します。

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "テスラの株を買うべきか教えて",
    "sessionId": "test-session-003"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "テスラ（TSLA）への投資についてお答えします。\n\n... [分析と判断]",
    "routing": {
      "targetAgentId": "stockAnalysisAgent",
      "reason": "株の投資判断に関するリクエストなので Stock Analysis Agent が適切",
      "confidence": 0.92
    },
    "sessionId": "test-session-003"
  }
}
```

---

## シナリオ2: 提案を拒否するケース

提案を拒否した場合の動作を確認します。

### Step 1: 対応不可なリクエストを送信

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "レストランの予約をして",
    "sessionId": "test-session-reject"
  }' | jq .
```

### Step 2: 提案を拒否

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "いいえ",
    "sessionId": "test-session-reject"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "わかりました。他にお手伝いできることはありますか？",
    "routing": {
      "targetAgentId": "orchestrator",
      "reason": "User rejected proposal",
      "confidence": 1.0
    },
    "awaitingApproval": false
  }
}
```

---

## シナリオ3: 承認待ち中に別のリクエストを送信

承認待ち状態で関係ないメッセージを送信した場合の動作を確認します。

### Step 1: 提案を受け取る

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "音楽を作曲して",
    "sessionId": "test-session-pending"
  }' | jq .
```

### Step 2: 関係ないメッセージを送信

```bash
curl -s -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "こんにちは",
    "sessionId": "test-session-pending"
  }' | jq .
```

**期待される出力:**
```json
{
  "success": true,
  "data": {
    "response": "まだ提案に回答いただいていません。\n\n対応できるエージェントが見つかりませんでした。\n\n**Music Composer Agent** を作成しますか？\n\n... [提案の再表示]",
    "awaitingApproval": true
  }
}
```

---

## 自動テストスクリプト

以下のスクリプトを使用して、全体のフローを自動でテストできます。

```bash
#!/bin/bash
# test_dynamic_agent_generation.sh

BASE_URL="http://localhost:3001"
SESSION_ID="auto-test-$(date +%s)"

echo "=========================================="
echo "動的エージェント自動生成 テスト"
echo "=========================================="
echo ""

# Step 1: 初期エージェント数を確認
echo "Step 1: 初期エージェント一覧"
INITIAL_COUNT=$(curl -s "$BASE_URL/api/v2/dynamic-agents" | jq '.data | length')
echo "  エージェント数: $INITIAL_COUNT"
echo ""

# Step 2: 対応不可リクエスト送信
echo "Step 2: 対応不可リクエストを送信"
RESPONSE1=$(curl -s -X POST "$BASE_URL/api/v2/orchestrator/process" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"ビットコインの価格を分析して\", \"sessionId\": \"$SESSION_ID\"}")

AWAITING=$(echo $RESPONSE1 | jq -r '.data.awaitingApproval')
echo "  承認待ち状態: $AWAITING"

if [ "$AWAITING" != "true" ]; then
  echo "  [ERROR] 提案が生成されませんでした"
  exit 1
fi
echo "  [OK] 提案が生成されました"
echo ""

# Step 3: 提案を承認
echo "Step 3: 提案を承認"
RESPONSE2=$(curl -s -X POST "$BASE_URL/api/v2/orchestrator/process" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"はい\", \"sessionId\": \"$SESSION_ID\"}")

CREATED_AGENT=$(echo $RESPONSE2 | jq -r '.data.createdAgent.agentId')
echo "  作成されたエージェント: $CREATED_AGENT"

if [ "$CREATED_AGENT" == "null" ] || [ -z "$CREATED_AGENT" ]; then
  echo "  [ERROR] エージェントが作成されませんでした"
  exit 1
fi
echo "  [OK] エージェントが作成されました"
echo ""

# Step 4: エージェント数を再確認
echo "Step 4: エージェント数を確認"
NEW_COUNT=$(curl -s "$BASE_URL/api/v2/dynamic-agents" | jq '.data | length')
echo "  エージェント数: $NEW_COUNT (以前: $INITIAL_COUNT)"

if [ "$NEW_COUNT" -le "$INITIAL_COUNT" ]; then
  echo "  [ERROR] エージェントが増えていません"
  exit 1
fi
echo "  [OK] エージェントが追加されました"
echo ""

# Step 5: 同じリクエストを再送信
echo "Step 5: 同じリクエストを再送信（2回目）"
RESPONSE3=$(curl -s -X POST "$BASE_URL/api/v2/orchestrator/process" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"ビットコインの価格を分析して\", \"sessionId\": \"another-session\"}")

TARGET_AGENT=$(echo $RESPONSE3 | jq -r '.data.routing.targetAgentId')
CONFIDENCE=$(echo $RESPONSE3 | jq -r '.data.routing.confidence')
AWAITING2=$(echo $RESPONSE3 | jq -r '.data.awaitingApproval')

echo "  ルーティング先: $TARGET_AGENT"
echo "  信頼度: $CONFIDENCE"
echo "  承認待ち: $AWAITING2"

if [ "$AWAITING2" == "true" ]; then
  echo "  [ERROR] 2回目も提案が表示されました"
  exit 1
fi
echo "  [OK] 2回目は新エージェントで即座に処理されました"
echo ""

echo "=========================================="
echo "全テスト完了！"
echo "=========================================="
```

使用方法:

```bash
chmod +x test_dynamic_agent_generation.sh
./test_dynamic_agent_generation.sh
```

---

## トラブルシューティング

### 提案が生成されない

**原因:** confidence閾値が低く設定されている可能性

**解決策:**
```bash
# 環境変数で閾値を調整
PROPOSAL_CONFIDENCE_THRESHOLD=0.8 npm run dev:multiagent
```

### 2回目も提案が表示される

**原因:** エージェントの作成に失敗している可能性

**解決策:**
1. ログを確認
2. エージェント一覧でIDを確認
3. 作成されたエージェントのdescriptionが適切か確認

### セッション状態がリセットされる

**原因:** セッションタイムアウト（デフォルト30分）

**解決策:**
```bash
# セッション状態を明示的にクリア
curl -X DELETE "http://localhost:3001/api/v2/orchestrator/session/test-session-001"
```

---

## まとめ

このテストフローで確認できること:

1. **1回目のリクエスト**: 対応不可 → 提案生成 → 承認待ち
2. **承認**: エージェント作成 → 元リクエスト処理 → 結果返却
3. **2回目のリクエスト**: 新エージェントで即座に処理（提案なし）

これにより、システムが「学習して成長する」体験を実現しています。
