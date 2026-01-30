# API仕様

## Next.js API Routes（プロキシ）

フロントエンドは、Next.jsのAPI Routesを経由してVoltAgentサーバーと通信します。
API Routesは、環境変数`VOLTAGENT_API_URL`を使用してバックエンドのURLを管理します。

---

## POST /api/chat

チャットメッセージをVoltAgentに送信します。

### Request
```json
{
  "input": "string"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "output": "string",
    "toolCalls": [
      {
        "toolName": "string",
        "input": {},
        "result": {}
      }
    ],
    "toolResults": [
      {
        "result": {
          "results": [
            {
              "title": "string",
              "locator": "string",
              "snippet": "string"
            }
          ]
        }
      }
    ]
  }
}
```

### エラー
```json
{
  "error": "Failed to send message to VoltAgent"
}
```

---

## GET /api/agents

エージェント一覧を取得します。

### Request
なし

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "idle | running",
      "model": "string",
      "tools": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "parameters": {},
          "type": "string",
          "node_id": "string"
        }
      ],
      "subAgents": [],
      "memory": {
        "type": "Memory",
        "resourceId": "string",
        "available": true,
        "status": "idle",
        "storage": {
          "adapter": "LibSQLMemoryAdapter"
        }
      },
      "isTelemetryEnabled": true
    }
  ]
}
```

### エラー
```json
{
  "error": "Failed to fetch agents from VoltAgent"
}
```

---

## VoltAgent API（バックエンド参考）

API Routesが内部的に呼び出すVoltAgentのエンドポイント。

### POST http://localhost:3141/agents/chat/text

### Request
```json
{
  "input": "string"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "output": "string",  // または "text": "string"
    "toolCalls": [
      {
        "toolName": "string",
        "input": {},
        "result": {}
      }
    ],
    "toolResults": [
      {
        "result": {
          "results": [
            {
              "title": "string",
              "locator": "string",
              "snippet": "string"
            }
          ]
        }
      }
    ]
  }
}
```

チャットメッセージを送信。

### GET http://localhost:3141/agents

エージェント一覧を取得。

---

## Sources抽出

フロントエンド（page.tsx）で、`toolResults`または`toolCalls`から`searchLocalDocs`の結果を抽出し、以下の形式に変換します。

```typescript
interface Source {
  type: "local";
  title: string;
  locator: string;
  snippet: string;
}
```

---

## 環境変数

### apps/web/.env.local
```bash
VOLTAGENT_API_URL=http://localhost:3141
```

- **VOLTAGENT_API_URL**: VoltAgentサーバーのベースURL
- デフォルト値: `http://localhost:3141`
- 本番環境では適切なURLに変更

---

## エラーハンドリング

- **400-499**: クライアントエラー（不正なリクエスト）
- **500-599**: サーバーエラー（VoltAgentの内部エラー）
- **接続エラー**: VoltAgentサーバーが起動していない場合

---

## 将来の拡張

第二段階以降では、以下の機能を追加予定:
- セッション管理とユーザー認証
- WebSocket接続によるリアルタイム通信
- ストリーミングレスポンス
- レート制限
- キャッシング戦略の最適化