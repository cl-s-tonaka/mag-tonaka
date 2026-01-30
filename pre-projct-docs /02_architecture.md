# アーキテクチャ設計（第一段階）

## 1. 全体構成

```
[ Browser ]
    |
    | チャット画面 & エージェント一覧画面（タブ切替）
    v
[ Next.js Frontend (apps/web) ]
    |
    | - page.tsx（タブナビゲーション）
    | - ChatInterface.tsx（チャット画面）
    | - AgentList.tsx（エージェント一覧）
    |
    | HTTP Requests
    | - POST /api/chat
    | - GET /api/agents
    v
[ Next.js API Routes (Proxy) ]
    |
    | - /api/chat → VoltAgent /agents/chat/text
    | - /api/agents → VoltAgent /agents
    |
    | 環境変数: VOLTAGENT_API_URL
    v
[ VoltAgent Server (localhost:3141) ]
    |
    | - Chat Agent
    | - Admin Agent
    | - Tools (weatherTool)
    | - Memory (LibSQL)
    |
    v
[ Response ]
    |
    | - { success, data: { output, toolCalls, toolResults } }
    | - { success, data: [agents...] }
    v
[ UI で Sources 抽出・表示 / エージェント一覧表示 ]
```

## 2. コンポーネント責務
- **UI（page.tsx）**: タブナビゲーション、画面切替、モード管理
- **ChatInterface.tsx**: チャット入力、メッセージ表示、Sources表示
- **AgentList.tsx**: エージェント一覧取得・表示、詳細情報表示
- **API Routes**: VoltAgent APIのプロキシ、環境変数管理、エラーハンドリング
- **VoltAgent Server**: エージェントの実行、ツールの呼び出し、レスポンス生成
- **Chat Agent**: ユーザーの質問に回答、ツールの使用
- **Admin Agent**: 管理者向けアシスタント

## 3. 画面構成
- **チャット画面**（タブ1）
  - CHATモード: 情報取得、質問回答
  - AGENT_BUILDモード: 未実装（エラーメッセージ表示）
  - メッセージ履歴の表示
  - Sources（参照元）の表示

- **エージェント一覧画面**（タブ2）
  - エージェント一覧の表示（左パネル）
  - エージェント詳細情報の表示（右パネル）
    - ID、Status、Description、Model、Tools
  - 更新ボタンによる再取得機能

## 4. API設計
- **GET /api/agents**
  - VoltAgent `/agents`のプロキシ
  - エージェント一覧を取得
  - Cache-Control: no-store

- **POST /api/chat**
  - VoltAgent `/agents/chat/text`のプロキシ
  - チャットメッセージを送信
  - リクエスト: `{ input: "message" }`
  - Cache-Control: no-store

## 5. 環境変数管理
- **VOLTAGENT_API_URL**: VoltAgentサーバーのベースURL
  - デフォルト: `http://localhost:3141`
  - `.env.local`で設定可能
  - API Routesで使用

## 6. 将来の拡張計画

第二段階以降では、以下の機能を追加予定:
- セッション管理とユーザー認証
- AGENT_BUILDモードの実装
- GitHub連携（エージェント生成・PR作成）
- エージェントの動的な追加・削除
- エージェントのステータス監視
