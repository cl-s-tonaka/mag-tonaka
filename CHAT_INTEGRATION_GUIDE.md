# チャット統合ガイド

このガイドでは、ユーザーがチャットを通してエージェント管理できるようにする方法を説明します。

## 📋 目次

1. [概要](#概要)
2. [実装済み機能](#実装済み機能)
3. [アーキテクチャ](#アーキテクチャ)
4. [使用方法](#使用方法)
5. [API統合](#api統合)
6. [エージェント詳細](#エージェント詳細)

## 概要

チャット統合により、以下が可能になります：

✅ **チャット経由でエージェント一覧を取得**
✅ **チャット経由でエージェント詳細を確認**
✅ **チャット経由でエージェントを作成**
✅ **チャット経由でエージェントを検索・削除**
✅ **Supervisorエージェントによるリクエストルーティング**

## 実装済み機能

### 1. エージェント管理ツール

`apps/server/src/dynamic/tools/agentManagementTools.ts`

チャットインターフェースからエージェント管理を行うための5つのツール：

| ツール | 説明 | 使用例 |
|-------|------|--------|
| `listAgents` | 全エージェント一覧を取得 | "どんなエージェントが使えますか？" |
| `getAgentDetails` | エージェント詳細を取得 | "weatherAgentについて教えて" |
| `createAgent` | 新しいエージェントを作成 | "計算エージェントを作って" |
| `deleteAgent` | エージェントを削除 | "testAgentを削除して" |
| `searchAgents` | キーワードでエージェント検索 | "Slackに関連するエージェントを探して" |

### 2. Supervisorエージェント

`apps/server/src/agents/SupervisorAgent.ts`

**役割**: ユーザーのリクエストを解釈し、適切なエージェントやツールに割り振る

**機能**:
- ユーザーリクエストの分析
- エージェント管理ツールの実行
- 結果のフォーマットと返却
- サブエージェントへのタスク委譲（将来実装）

**使用例**:
```typescript
const supervisor = new SupervisorAgent(memory, dynamicAgentManager);
const result = await supervisor.run("どんなエージェントが使えますか？");
console.log(result.output);
```

### 3. AgentGeneratorエージェント

`apps/server/src/agents/AgentGeneratorAgent.ts`

**役割**: 対話的に新しいエージェントの作成を支援

**プロセス**:
1. 要求分析: ユーザーの要求を理解
2. 設計書生成: エージェント仕様を作成
3. 確認: ユーザーに設計書を提示
4. 生成: 承認後にエージェントを作成

**使用例**:
```typescript
const agentGenerator = new AgentGeneratorAgent(memory, dynamicAgentManager);
const result = await agentGenerator.run("天気情報を取得するエージェントを作って");
```

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│           ユーザー（チャット）            │
└──────────────┬──────────────────────────┘
               │
               │ "どんなエージェントが使えますか？"
               │
┌──────────────▼──────────────────────────┐
│       Supervisorエージェント             │
│    (リクエスト解釈・ルーティング)         │
└──────────────┬──────────────────────────┘
               │
               ├─► listAgentsツール
               │   └─► DynamicAgentManager
               │       └─► エージェント一覧取得
               │
               ├─► createAgentツール
               │   └─► DynamicAgentManager
               │       └─► 新規エージェント作成
               │
               └─► AgentGeneratorエージェント
                   └─► 対話的なエージェント作成支援
```

## 使用方法

### セットアップ

1. **環境変数を設定**

```bash
cat > .env << EOF
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
EOF
```

2. **サーバーを起動**

```bash
# サンプル統合コードを実行
npx ts-node apps/server/src/index.chat-integration.sample.ts
```

### チャット使用例

#### 例1: エージェント一覧の取得

```
ユーザー: どんなエージェントが使えますか？

Supervisor:
## 利用可能なエージェント（3個）

### Supervisor Agent (supervisor)
- 説明: ユーザーのリクエストを解釈し、適切なエージェントに割り振る
- タイプ: 静的
- ステータス: active
- モデル: openai/gpt-4o
- ツール数: 5

### Agent Generator (agentGenerator)
- 説明: 対話的に新しいエージェントの作成を支援
- タイプ: 静的
- ステータス: active
- モデル: openai/gpt-4o
- ツール数: 2

### Weather Agent (weatherAgent)
- 説明: 天気情報を取得するエージェント
- タイプ: 動的
- ステータス: active
- モデル: openai/gpt-4o-mini
- ツール数: 1
```

#### 例2: エージェント詳細の確認

```
ユーザー: weatherAgentについて教えて

Supervisor:
## Weather Agent (weatherAgent)

**説明**: 天気情報を取得するエージェント

**指示**: あなたは天気情報を提供するエージェントです。
ユーザーが指定した場所の天気を正確に返してください。

**モデル**: openai/gpt-4o-mini

**ツール**:
- getCurrentWeather: 指定地点の現在の天気を取得

**ステータス**: active
**タイプ**: 動的エージェント
```

#### 例3: エージェントの作成

```
ユーザー: 計算エージェントを作成したい

AgentGenerator:
了解しました。計算エージェントを作成します。

以下の情報を教えてください：
1. エージェントID（例: calculatorAgent）
2. 表示名（例: Calculator Agent）
3. 説明（例: 基本的な算術計算を実行するエージェント）
4. 指示（エージェントへのシステムプロンプト）

---

ユーザー:
ID: calculatorAgent
表示名: Calculator Agent
説明: 四則演算を実行するエージェント
指示: あなたは計算を実行するエージェントです。

AgentGenerator:
設計書を確認します：

【エージェント設計書】
- ID: calculatorAgent
- 表示名: Calculator Agent
- 説明: 四則演算を実行するエージェント
- モデル: gpt-4o-mini
- ツール: なし（LLMの計算能力を使用）

この設計で作成してよろしいですか？

---

ユーザー: はい

AgentGenerator:
✓ エージェント 'Calculator Agent' を作成しました！
これで calculatorAgent が利用可能になりました。
```

#### 例4: エージェントの検索

```
ユーザー: 天気に関連するエージェントを探して

Supervisor:
'天気' で検索した結果、1個のエージェントが見つかりました：

### Weather Agent (weatherAgent)
- 説明: 天気情報を取得するエージェント
- タイプ: 動的
```

## API統合

### チャットエンドポイント

```typescript
// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { message, agentId = 'supervisor' } = req.body;

  try {
    // Supervisorエージェントを使用
    const supervisor = allAgents['supervisor'];
    const result = await supervisor.run(message);

    res.json({
      success: true,
      output: result.output,
      toolCalls: result.toolCalls || [],
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});
```

**リクエスト例**:
```bash
curl -X POST http://localhost:4310/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "どんなエージェントが使えますか？",
    "agentId": "supervisor"
  }'
```

**レスポンス例**:
```json
{
  "success": true,
  "output": "## 利用可能なエージェント（3個）\n\n...",
  "toolCalls": [
    {
      "name": "listAgents",
      "result": {
        "success": true,
        "agents": [...]
      }
    }
  ]
}
```

## エージェント詳細

### Supervisorエージェントの機能

#### 1. リクエスト解釈

Supervisorは以下のパターンを認識します：

| パターン | 実行される処理 |
|---------|--------------|
| "エージェント一覧" | `listAgents`ツールを実行 |
| "〇〇について教えて" | `getAgentDetails`ツールを実行 |
| "エージェントを作成" | AgentGeneratorエージェントを提案 |
| "〇〇を検索" | `searchAgents`ツールを実行 |
| "〇〇を削除" | `deleteAgent`ツールを実行（確認付き） |

#### 2. ツール実行

Supervisorは5つのエージェント管理ツールにアクセス可能：

```typescript
// ツール一覧
const tools = [
  listAgentsTool,      // エージェント一覧
  getAgentDetailsTool, // エージェント詳細
  createAgentTool,     // エージェント作成
  deleteAgentTool,     // エージェント削除
  searchAgentsTool,    // エージェント検索
];
```

#### 3. 結果フォーマット

Supervisorは結果を分かりやすくフォーマットして返します：

- マークダウン形式
- 階層構造
- 絵文字やアイコンで視覚的に
- エラーの場合は原因と解決策を提示

### AgentGeneratorエージェントの機能

#### プロセスフロー

```
1. 要求分析
   ↓
   ユーザーの要求を理解
   必要なツール・機能を特定

2. 設計書生成
   ↓
   エージェントID、表示名、説明を決定
   システムプロンプトを生成
   必要なツールを定義

3. ユーザー確認
   ↓
   設計書を提示
   承認を待つ

4. エージェント作成
   ↓
   createAgentツールを実行
   DynamicAgentManagerに委譲
   作成完了を通知
```

#### ツール

```typescript
// AgentGeneratorが使用するツール
const tools = [
  analyzeRequirementsTool,  // 要求分析
  generateAgentSpecTool,    // 設計書生成
];
```

## 将来の拡張

### 1. サブエージェントへのタスク委譲

Supervisorが他のエージェントにタスクを委譲する機能：

```typescript
// 将来実装
if (task requires specific agent) {
  const targetAgent = allAgents[targetAgentId];
  const result = await targetAgent.run(subTask);
  return supervisor.formatResult(result);
}
```

### 2. マルチエージェント協調

複数のエージェントが協力してタスクを完了：

```
User: "Slackのメッセージを分析してレポートを作成"
  ↓
Supervisor → SlackAgent (メッセージ取得)
          → AnalyzerAgent (分析)
          → ReportAgent (レポート生成)
```

### 3. エージェント学習

ユーザーのフィードバックから改善：

```typescript
// ユーザーフィードバックを収集
feedbackTool.execute({
  agentId: 'weatherAgent',
  rating: 5,
  comment: '素晴らしい！',
});

// AgentGeneratorが学習して次回の生成に活用
```

## トラブルシューティング

### Q: Supervisorが応答しない

**確認事項**:
1. `ENABLE_DYNAMIC_AGENTS=true` が設定されているか
2. DynamicAgentManagerが正しく初期化されているか
3. エージェント管理ツールがSupervisorに渡されているか

### Q: エージェント作成が失敗する

**確認事項**:
1. エージェントIDが重複していないか
2. 必要なフィールド（displayName、description、instructions）が入力されているか
3. DynamicAgentManagerが正しく動作しているか

### Q: ツールが実行されない

**確認事項**:
1. ツール名が正しいか
2. パラメータが正しく渡されているか
3. ログでエラーメッセージを確認

## サンプルコード

完全な統合例は以下を参照：
- `apps/server/src/index.chat-integration.sample.ts`

## 関連ドキュメント

- [動的エージェントシステム README](apps/server/README.md)
- [実装ガイド](docs/dynamic-agent-system/06-implementation-guide.md)
- [AgentGenerator設計書](pre-projct-docs /08_agent_generator_design.md)

---

これで、ユーザーはチャットを通して完全にエージェント管理ができるようになります！
