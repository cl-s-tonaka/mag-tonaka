# LiteLLM統合ガイド

このドキュメントでは、VoltAgentアプリケーションでLiteLLMプロキシサーバーを使用する方法を説明します。

## 概要

LiteLLMを使用することで、複数のLLMプロバイダー（Anthropic Claude、Google Gemini、Meta Llama など）を統一されたOpenAI互換のインターフェースで利用できます。

## セットアップ手順

### 1. LiteLLMのインストール

```bash
pip install litellm[proxy]
```

### 2. 設定ファイルの作成

プロジェクトルートに `litellm_config.yaml` を作成します:

```yaml
model_list:
  # Anthropic Claude
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: ${ANTHROPIC_API_KEY}

  - model_name: claude-3-opus-20240229
    litellm_params:
      model: anthropic/claude-3-opus-20240229
      api_key: ${ANTHROPIC_API_KEY}

  # OpenAI GPT
  - model_name: gpt-4-turbo
    litellm_params:
      model: openai/gpt-4-turbo
      api_key: ${OPENAI_API_KEY}

  - model_name: gpt-3.5-turbo
    litellm_params:
      model: openai/gpt-3.5-turbo
      api_key: ${OPENAI_API_KEY}

  # Google Gemini
  - model_name: gemini-1.5-pro
    litellm_params:
      model: gemini/gemini-1.5-pro
      api_key: ${GOOGLE_API_KEY}

# オプション設定
general_settings:
  master_key: sk-1234  # プロキシサーバーのマスターキー
  # database_url: "postgresql://..."  # 使用状況の記録
```

### 3. 必要なAPIキーを環境変数に設定

```bash
# Anthropic Claude用
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI用（既に設定済みの場合は不要）
export OPENAI_API_KEY=sk-...

# Google Gemini用
export GOOGLE_API_KEY=...
```

### 4. LiteLLMプロキシサーバーの起動

```bash
litellm --config litellm_config.yaml --port 4000

# バックグラウンドで起動する場合
nohup litellm --config litellm_config.yaml --port 4000 > litellm.log 2>&1 &
```

サーバーが起動すると、`http://localhost:4000` でアクセス可能になります。

### 5. VoltAgentアプリケーションの設定

`.env` ファイルに以下を追加:

```env
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_API_KEY=sk-1234
```

## 使用方法

### 既存のエージェントをLiteLLMに移行

```typescript
import { Agent, Memory } from "@voltagent/core";
import { litellmProvider } from "./providers/litellm";

export class MyAgent extends Agent {
  constructor(memory: Memory) {
    super({
      name: "my-agent",
      instructions: "エージェントの指示",
      model: litellmProvider("claude-3-5-sonnet-20241022"), // LiteLLM経由でClaudeを使用
      memory,
    } as any);
  }
}
```

### 新しいエージェントの作成

`src/examples/LiteLLMExampleAgent.ts` を参考にしてください:

```typescript
import { litellmProvider } from "../providers/litellm";

const agent = new Agent({
  name: "claude-agent",
  model: litellmProvider("claude-3-5-sonnet-20241022"),
  instructions: "あなたはClaude 3.5 Sonnetを使用するAIアシスタントです。",
  // ...
});
```

## 利用可能なモデル

設定ファイルで定義したモデル名を使用できます:

| モデル名 | プロバイダー | 説明 |
|---------|-------------|------|
| `claude-3-5-sonnet-20241022` | Anthropic | Claude 3.5 Sonnet |
| `claude-3-opus-20240229` | Anthropic | Claude 3 Opus |
| `gpt-4-turbo` | OpenAI | GPT-4 Turbo |
| `gpt-3.5-turbo` | OpenAI | GPT-3.5 Turbo |
| `gemini-1.5-pro` | Google | Gemini 1.5 Pro |

## プロバイダーの切り替え

エージェントごとに異なるプロバイダーを使用できます:

```typescript
// エージェント1: Claude使用
const claudeAgent = new Agent({
  model: litellmProvider("claude-3-5-sonnet-20241022"),
  // ...
});

// エージェント2: GPT-4使用
const gptAgent = new Agent({
  model: litellmProvider("gpt-4-turbo"),
  // ...
});

// エージェント3: 従来のOpenAI直接接続
const openaiAgent = new Agent({
  model: "openai/gpt-4o-mini", // 文字列形式（非推奨だが動作する）
  // ...
});
```

## トラブルシューティング

### LiteLLMサーバーに接続できない

1. サーバーが起動しているか確認:
   ```bash
   curl http://localhost:4000/health
   ```

2. ファイアウォール設定を確認

3. `.env`のURLが正しいか確認

### モデルが見つからない

1. `litellm_config.yaml`でモデルが定義されているか確認
2. 対応するAPIキーが環境変数に設定されているか確認
3. LiteLLMサーバーを再起動

### APIキーのエラー

1. 環境変数が正しく設定されているか確認:
   ```bash
   echo $ANTHROPIC_API_KEY
   echo $OPENAI_API_KEY
   ```

2. APIキーの有効性を確認（有効期限、クォータなど）

## 高度な設定

### ロードバランシング

複数のAPIキーでロードバランシング:

```yaml
model_list:
  - model_name: gpt-4-turbo
    litellm_params:
      model: openai/gpt-4-turbo
      api_key: ${OPENAI_API_KEY_1}

  - model_name: gpt-4-turbo
    litellm_params:
      model: openai/gpt-4-turbo
      api_key: ${OPENAI_API_KEY_2}
```

### フォールバック設定

プライマリモデルが失敗した場合のフォールバック:

```yaml
model_list:
  - model_name: smart-model
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: ${ANTHROPIC_API_KEY}
      fallbacks:
        - model: openai/gpt-4-turbo
          api_key: ${OPENAI_API_KEY}
```

### 使用状況の記録

PostgreSQLを使用して使用状況を記録:

```yaml
general_settings:
  database_url: "postgresql://user:pass@localhost/litellm"
```

## 参考リンク

- [LiteLLM公式ドキュメント](https://docs.litellm.ai/)
- [VoltAgent Providers & Models](https://voltagent.dev/docs/getting-started/providers-models/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

## サポートされているプロバイダー

LiteLLMは100以上のLLMプロバイダーをサポート:

- Anthropic (Claude)
- OpenAI (GPT)
- Google (Gemini, PaLM)
- Meta (Llama)
- Cohere
- Mistral AI
- Amazon Bedrock
- Azure OpenAI
- Ollama (ローカル実行)
- その他多数

詳細は[LiteLLMのプロバイダー一覧](https://docs.litellm.ai/docs/providers)を参照してください。
