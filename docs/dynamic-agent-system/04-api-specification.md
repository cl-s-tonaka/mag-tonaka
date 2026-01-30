# API仕様書

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| **ドキュメントバージョン** | 1.0.0 |
| **最終更新日** | 2026-01-29 |
| **ステータス** | Draft |
| **Base URL** | `http://localhost:4310` |

## 1. 概要

### 1.1 APIネームスペース

| ネームスペース | 説明 | システム |
|--------------|------|---------|
| `/api/agents` | 静的エージェント用API（既存） | 静的システム |
| `/api/v2/dynamic-agents` | 動的エージェント用API（新規） | 動的システム |

### 1.2 認証

**MVP**: 認証なし（開発環境のみ）

**将来**:
```
Authorization: Bearer <API_KEY>
```

### 1.3 共通ヘッダー

**リクエスト**:
```
Content-Type: application/json
Accept: application/json
```

**レスポンス**:
```
Content-Type: application/json
X-Request-ID: <UUID>
```

### 1.4 共通エラーレスポンス

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'weatherAgent' not found",
    "details": {},
    "requestId": "req-uuid-1234"
  }
}
```

---

## 2. エンドポイント一覧

### 2.1 動的エージェント管理

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|-------|
| POST | `/api/v2/dynamic-agents` | エージェント作成 | 必須 |
| GET | `/api/v2/dynamic-agents` | エージェント一覧取得 | 必須 |
| GET | `/api/v2/dynamic-agents/:id` | エージェント詳細取得 | 必須 |
| PUT | `/api/v2/dynamic-agents/:id` | エージェント更新 | 高 |
| DELETE | `/api/v2/dynamic-agents/:id` | エージェント削除 | 高 |
| POST | `/api/v2/dynamic-agents/:id/disable` | エージェント無効化 | 中 |
| POST | `/api/v2/dynamic-agents/:id/enable` | エージェント有効化 | 中 |

### 2.2 エージェント実行（既存API拡張）

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|-------|
| POST | `/api/agents/:agentId/execute` | エージェント実行（静的+動的） | 必須 |
| GET | `/api/agents-with-examples` | 全エージェント一覧（静的+動的） | 必須 |

---

## 3. エージェント作成

### POST /api/v2/dynamic-agents

**説明**: 新しい動的エージェントを作成

**リクエスト**:
```json
{
  "agentId": "weatherAgent",
  "displayName": "Weather Agent",
  "description": "Get current weather information for any location",
  "instructions": "あなたは天気情報を提供するエージェントです。ユーザーが指定した場所の天気を正確に返してください。",
  "model": "openai/gpt-4o-mini",
  "tools": [
    {
      "name": "getCurrentWeather",
      "description": "Get current weather for a location",
      "parameters": [
        {
          "name": "location",
          "zodType": "string",
          "description": "City name or zip code"
        },
        {
          "name": "units",
          "zodType": "enum",
          "zodOptions": ["celsius", "fahrenheit"],
          "description": "Temperature units",
          "optional": true
        }
      ],
      "implementation": "const response = await fetch(`https://api.weather.com?location=${location}&units=${units || 'celsius'}`); const data = await response.json(); return { temperature: data.temp, condition: data.condition };"
    }
  ],
  "testExamples": [
    {
      "input": "What's the weather in Tokyo?",
      "description": "Basic weather query",
      "expectedBehavior": "Should return current weather for Tokyo"
    }
  ]
}
```

**必須フィールド**:
- `agentId`: エージェントID（英数字、ハイフン、アンダースコアのみ）
- `displayName`: 表示名
- `description`: 説明
- `instructions`: エージェントへの指示

**オプショナルフィールド**:
- `model`: LLMモデル（デフォルト: `openai/gpt-4o-mini`）
- `tools`: ツール配列（デフォルト: `[]`）
- `testExamples`: テスト例配列（デフォルト: `[]`）

**レスポンス（成功）**:
```json
{
  "success": true,
  "data": {
    "agentId": "weatherAgent",
    "displayName": "Weather Agent",
    "status": "active",
    "version": 1,
    "createdAt": "2026-01-29T12:34:56.789Z"
  }
}
```

**エラーレスポンス**:
```json
// 400 Bad Request - バリデーションエラー
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "agentId",
      "issue": "Agent ID must be alphanumeric"
    }
  }
}

// 409 Conflict - 重複ID
{
  "error": {
    "code": "AGENT_ALREADY_EXISTS",
    "message": "Agent with ID 'weatherAgent' already exists",
    "details": {
      "existingAgentId": "weatherAgent"
    }
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create agent",
    "details": {}
  }
}
```

---

## 4. エージェント一覧取得

### GET /api/v2/dynamic-agents

**説明**: 動的エージェントの一覧を取得

**クエリパラメータ**:
```
?status=active          # フィルタ: active, inactive, deleted
&limit=20               # 取得件数（デフォルト: 20）
&offset=0               # オフセット（デフォルト: 0）
&sortBy=createdAt       # ソート: createdAt, displayName
&order=desc             # 順序: asc, desc
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "agentId": "weatherAgent",
        "displayName": "Weather Agent",
        "description": "Get current weather information",
        "status": "active",
        "version": 1,
        "createdAt": "2026-01-29T12:34:56.789Z",
        "updatedAt": "2026-01-29T12:34:56.789Z"
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 5. エージェント詳細取得

### GET /api/v2/dynamic-agents/:id

**説明**: 特定の動的エージェントの詳細を取得

**パスパラメータ**:
- `id`: エージェントID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "agentId": "weatherAgent",
    "displayName": "Weather Agent",
    "description": "Get current weather information",
    "instructions": "あなたは天気情報を提供するエージェントです...",
    "model": "openai/gpt-4o-mini",
    "status": "active",
    "version": 1,
    "createdAt": "2026-01-29T12:34:56.789Z",
    "updatedAt": "2026-01-29T12:34:56.789Z",
    "tools": [
      {
        "id": "tool-uuid-1234",
        "name": "getCurrentWeather",
        "description": "Get current weather",
        "parameters": [...],
        "implementation": "..."
      }
    ],
    "testExamples": [
      {
        "id": "test-uuid-1234",
        "input": "What's the weather in Tokyo?",
        "description": "Basic weather query",
        "expectedBehavior": "Should return current weather"
      }
    ]
  }
}
```

**エラー**:
```json
// 404 Not Found
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'unknownAgent' not found"
  }
}
```

---

## 6. エージェント更新

### PUT /api/v2/dynamic-agents/:id

**説明**: エージェントの定義を更新

**リクエスト**:
```json
{
  "displayName": "Updated Weather Agent",
  "description": "Updated description",
  "instructions": "Updated instructions...",
  "tools": [...]
}
```

**更新可能フィールド**:
- `displayName`
- `description`
- `instructions`
- `model`
- `tools`
- `testExamples`

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "agentId": "weatherAgent",
    "version": 2,
    "updatedAt": "2026-01-29T13:00:00.000Z"
  }
}
```

---

## 7. エージェント削除

### DELETE /api/v2/dynamic-agents/:id

**説明**: エージェントを論理削除

**レスポンス**:
```json
{
  "success": true,
  "message": "Agent 'weatherAgent' deleted successfully"
}
```

---

## 8. エージェント実行（既存API拡張）

### POST /api/agents/:agentId/execute

**説明**: エージェント（静的または動的）を実行

**リクエスト**:
```json
{
  "task": "What's the weather in Tokyo?",
  "context": "The user is located in Japan"
}
```

**レスポンス（ストリーミング）**:
```json
{
  "result": "The current weather in Tokyo is sunny with a temperature of 18°C.",
  "toolsUsed": [
    {
      "name": "getCurrentWeather",
      "input": { "location": "Tokyo" },
      "output": { "temperature": 18, "condition": "sunny" }
    }
  ],
  "duration": 2345
}
```

---

## 9. 全エージェント一覧取得（既存API拡張）

### GET /api/agents-with-examples

**説明**: 静的+動的エージェントの一覧を取得

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "chat",
      "displayName": "Chat Agent",
      "description": "General purpose chat agent",
      "isDynamic": false
    },
    {
      "id": "weatherAgent",
      "displayName": "Weather Agent",
      "description": "Get weather information",
      "isDynamic": true
    }
  ]
}
```

---

## 10. エラーコード一覧

| コード | HTTPステータス | 説明 |
|-------|--------------|------|
| `VALIDATION_ERROR` | 400 | リクエストバリデーションエラー |
| `AGENT_ALREADY_EXISTS` | 409 | エージェントIDが重複 |
| `AGENT_NOT_FOUND` | 404 | エージェントが見つからない |
| `TOOL_COMPILATION_ERROR` | 400 | ツールコンパイルエラー |
| `TOOL_EXECUTION_ERROR` | 500 | ツール実行エラー |
| `DATABASE_ERROR` | 500 | データベースエラー |
| `INTERNAL_ERROR` | 500 | 内部サーバーエラー |

---

**Next Steps**: [05-security-design.md](./05-security-design.md) でセキュリティ設計を確認してください。
