# ツール一覧

このドキュメントは、MAGシステムで利用可能なすべてのツールの一覧と詳細を記載しています。

## 更新履歴

- 2026-01-26: 初版作成

---

## ツール一覧

| ツール名 | ID | カテゴリ | 説明 |
|---------|-----|---------|------|
| Weather Tool | getWeather | 外部API | 指定した場所の天気情報を取得 |
| Generate Agent Code | generateAgentCode | コード生成 | エージェント設計書からTypeScriptコードを生成 |
| Write File | writeFile | ファイル操作 | ファイルシステムにファイルを書き込み |
| Append To File | appendToFile | ファイル操作 | 既存ファイルに内容を追記 |
| Apply Modifications | applyModifications | ファイル操作 | エージェント生成時のファイル変更を自動適用 |
| Preview Code Changes | previewCodeChanges | コード検証 | エージェント生成時のコード変更をプレビュー |
| Validate TypeScript | validateTypeScript | コード検証 | 生成されたコードのTypeScript構文をチェック |
| Create Agent PR | createAgentPR | GitHub連携 | GitHub Pull Requestを作成 |

---

## 詳細情報

### 1. Weather Tool (getWeather)

**基本情報**
- **ツール名**: `getWeather`
- **エクスポート名**: `weatherTool`
- **ファイルパス**: `apps/server/src/tools/weather.ts`
- **カテゴリ**: 外部API

**説明**
指定した場所の現在の天気情報を取得します。現在はモック実装となっており、ランダムな天気データを返します。

**パラメータ**
- `location` (string, 必須): 天気情報を取得する都市または場所

**返り値**
```typescript
{
  weather: {
    location: string,
    temperature: number,  // 摂氏
    condition: string,    // "Sunny" | "Cloudy" | "Rainy" | "Snowy" | "Partly Cloudy"
    humidity: number,     // パーセント
    windSpeed: number     // km/h
  },
  message: string
}
```

**使用例**
```typescript
const result = await weatherTool.execute({ location: "東京" });
// 返り値例:
// {
//   weather: {
//     location: "東京",
//     temperature: 18,
//     condition: "Partly Cloudy",
//     humidity: 65,
//     windSpeed: 12
//   },
//   message: "Current weather in 東京: 18°C and partly cloudy with 65% humidity and wind speed of 12 km/h."
// }
```

**注意事項**
- 現在はモック実装です。実際の天気APIと連携する場合は、実装を置き換える必要があります
- 推奨API: OpenWeatherMap, WeatherAPI, AccuWeather

**使用しているエージェント**
- Admin Agent
- Chat Agent

---

### 2. Generate Agent Code (generateAgentCode)

**基本情報**
- **ツール名**: `generateAgentCode`
- **ファイルパス**: `apps/server/src/tools/codeGenerator.ts`
- **カテゴリ**: コード生成

**説明**
エージェント設計書（JSON形式）からTypeScriptコードを自動生成します。エージェントクラス、ツール、テスト例を含む完全なコードを生成し、必要なファイル変更（インポート、エクスポート、登録）の情報も返します。

**パラメータ**
- `spec` (object, 必須): エージェント設計書
  - `agentId` (string): camelCase形式のエージェントID
  - `displayName` (string): 表示名
  - `className` (string): PascalCase形式のクラス名
  - `description` (string): 説明
  - `model` (string): 使用するLLMモデル（デフォルト: "openai/gpt-4o-mini"）
  - `instructions` (string): エージェントへの詳細な指示文
  - `tools` (array, オプション): ツールの配列
  - `requiredEnvVars` (array, オプション): 必要な環境変数
  - `testExamples` (array, オプション): テスト例の配列

**返り値**
```typescript
{
  success: boolean,
  files: Array<{
    path: string,
    content: string,
    type: "agent" | "tool"
  }>,
  modifications: Array<{
    path: string,
    type: "add-export" | "add-import" | "add-instance" | "add-registration",
    content: string,
    description: string
  }>,
  spec: object
}
```

**使用例**
```typescript
const spec = {
  agentId: "csvAnalyzer",
  displayName: "CSV Analyzer",
  className: "CsvAnalyzerAgent",
  description: "CSVファイルを分析するエージェント",
  model: "openai/gpt-4o-mini",
  instructions: "CSVファイルを分析し、データの統計情報を提供します。",
  tools: [
    {
      name: "parseCSV",
      type: "new",
      description: "CSVファイルを解析",
      parameters: [
        {
          name: "filePath",
          zodType: "string",
          description: "CSVファイルのパス",
          optional: false
        }
      ]
    }
  ]
};

const result = await generateAgentCode.execute({ spec });
```

**生成されるファイル**
1. `apps/server/src/agents/[ClassName].ts` - エージェントクラス
2. `apps/server/src/tools/[agentId]Tools.ts` - ツール定義（新規ツールがある場合）

**生成されるmodifications**
1. `apps/server/src/agents/index.ts` - エクスポート追加
2. `apps/server/src/index.ts` - インポート、インスタンス化、登録追加
3. `apps/server/src/testExamplesRegistry.ts` - テスト例の登録
4. `apps/server/src/tools/index.ts` - ツールのエクスポート追加（新規ツールがある場合）

**使用しているエージェント**
- Agent Generator Agent

---

### 3. Write File (writeFile)

**基本情報**
- **ツール名**: `writeFile`
- **ファイルパス**: `apps/server/src/tools/fileWriter.ts`
- **カテゴリ**: ファイル操作

**説明**
ファイルシステムにファイルを書き込みます。セキュリティ制約付きで、許可されたディレクトリのみにファイルを作成できます。

**パラメータ**
- `filePath` (string, 必須): ファイルパス（apps/server/src/から始まる相対パス）
- `content` (string, 必須): ファイルの内容
- `mode` (enum, デフォルト: "create"): "create" | "overwrite"

**返り値**
```typescript
{
  success: boolean,
  path?: string,
  message?: string,
  error?: string
}
```

**許可されたパス**
- `apps/server/src/agents/`
- `apps/server/src/tools/`

**使用例**
```typescript
const result = await writeFile.execute({
  filePath: "apps/server/src/agents/NewAgent.ts",
  content: "// エージェントコード",
  mode: "create"
});
```

**注意事項**
- セキュリティのため、許可されたパス以外への書き込みはエラーになります
- `mode: "create"`の場合、ファイルが既に存在するとエラーになります
- ディレクトリが存在しない場合は自動的に作成されます

**使用しているエージェント**
- Agent Generator Agent

---

### 4. Append To File (appendToFile)

**基本情報**
- **ツール名**: `appendToFile`
- **ファイルパス**: `apps/server/src/tools/fileWriter.ts`
- **カテゴリ**: ファイル操作

**説明**
既存ファイルに内容を追記します。ファイルの先頭、末尾、または特定の位置に追記できます。

**パラメータ**
- `filePath` (string, 必須): ファイルパス
- `content` (string, 必須): 追加する内容
- `position` (enum, デフォルト: "end"): "start" | "end" | "before-closing-brace"

**返り値**
```typescript
{
  success: boolean,
  path?: string,
  message?: string,
  error?: string
}
```

**許可されたパス**
- `apps/server/src/agents/`
- `apps/server/src/tools/`
- `apps/server/src/index.ts`（特別許可）
- `apps/server/src/testExamplesRegistry.ts`（特別許可）
- `apps/server/src/agents/index.ts`（特別許可）

**使用例**
```typescript
const result = await appendToFile.execute({
  filePath: "apps/server/src/agents/index.ts",
  content: 'export { NewAgent } from "./NewAgent";',
  position: "end"
});
```

**position の説明**
- `start`: ファイルの先頭に追加
- `end`: ファイルの末尾に追加
- `before-closing-brace`: agents オブジェクトの閉じ括弧の前に追加（VoltAgent登録用）

**使用しているエージェント**
- Agent Generator Agent

---

### 5. Apply Modifications (applyModifications)

**基本情報**
- **ツール名**: `applyModifications`
- **ファイルパス**: `apps/server/src/tools/applyModifications.ts`
- **カテゴリ**: ファイル操作

**説明**
エージェント生成時のファイル変更（インポート、エクスポート、登録など）を自動的に適用します。`generateAgentCode`の結果から返される`modifications`配列を受け取り、複数のファイルに対して一括で変更を適用できます。

**パラメータ**
- `modifications` (array, 必須): 変更内容の配列
  - `path` (string): 変更対象のファイルパス
  - `type` (enum): "add-export" | "add-import" | "add-instance" | "add-registration"
  - `content` (string): 追加する内容
  - `description` (string, オプション): 変更の説明

**返り値**
```typescript
{
  success: boolean,
  results: Array<{
    path: string,
    success: boolean,
    message?: string,
    error?: string
  }>,
  message: string
}
```

**対応するファイルと変更タイプ**
1. **apps/server/src/agents/index.ts**
   - `add-export`: エクスポート文を追加

2. **apps/server/src/tools/index.ts**
   - `add-export`: ツールのエクスポート文を追加

3. **apps/server/src/index.ts**
   - `add-import`: インポート文に追加
   - `add-instance`: エージェントのインスタンス化を追加
   - `add-registration`: agents オブジェクトへの登録を追加

4. **apps/server/src/testExamplesRegistry.ts**
   - `add-import`: インポート文を追加
   - `add-registration`: testExamplesRegistry オブジェクトへの登録を追加

**使用例**
```typescript
const modifications = [
  {
    path: "apps/server/src/agents/index.ts",
    type: "add-export",
    content: 'export { NewAgent, newAgentTestExamples } from "./NewAgent";',
    description: "NewAgentをエクスポート"
  },
  {
    path: "apps/server/src/index.ts",
    type: "add-import",
    content: "NewAgent",
    description: "NewAgentをインポートに追加"
  }
];

const result = await applyModifications.execute({ modifications });
```

**注意事項**
- 既に同じ内容が存在する場合は重複追加されません
- 正規表現でファイル内の適切な位置を検出して追加します
- すべての変更が成功した場合のみ`success: true`が返されます

**使用しているエージェント**
- Agent Generator Agent

---

### 6. Create Agent PR (createAgentPR)

**基本情報**
- **ツール名**: `createAgentPR`
- **ファイルパス**: `apps/server/src/tools/githubTools.ts`
- **カテゴリ**: GitHub連携

**説明**
新しいエージェントのためのGitHub Pull Requestを作成します。ブランチの作成、ファイルのコミット、PR作成を自動的に行います。`testExamplesRegistry.ts`の更新も自動的に行います。

**パラメータ**
- `agentName` (string, 必須): エージェント名
- `agentId` (string, 必須): エージェントID
- `files` (array, 必須): コミットするファイルの配列
  - `path` (string): ファイルパス
  - `content` (string): ファイルの内容
- `description` (string, オプション): PRの説明

**返り値**
```typescript
{
  success: boolean,
  prUrl?: string,
  prNumber?: number,
  branch?: string,
  committedFiles?: string[],
  error?: string,
  details?: any
}
```

**必要な環境変数**
- `GITHUB_TOKEN`: GitHub Personal Access Token
- `GITHUB_OWNER`: リポジトリのオーナー
- `GITHUB_REPO`: リポジトリ名
- `GITHUB_DEFAULT_BRANCH`: デフォルトブランチ（デフォルト: "master"）

**使用例**
```typescript
const result = await createAgentPR.execute({
  agentName: "CSV Analyzer",
  agentId: "csvAnalyzer",
  files: [
    {
      path: "apps/server/src/agents/CsvAnalyzerAgent.ts",
      content: "// エージェントコード"
    },
    {
      path: "apps/server/src/tools/csvAnalyzerTools.ts",
      content: "// ツールコード"
    }
  ],
  description: "CSVファイルを分析するエージェント"
});

if (result.success) {
  console.log(`PR作成成功: ${result.prUrl}`);
}
```

**PR作成プロセス**
1. デフォルトブランチの最新SHAを取得
2. 新しいブランチを作成（`feature/add-{agentId}-agent`）
3. `testExamplesRegistry.ts`を自動更新
4. 各ファイルをコミット
5. Pull Requestを作成

**自動生成されるPRの内容**
- **タイトル**: `Add {agentName} Agent`
- **ブランチ名**: `feature/add-{agentId}-agent`
- **本文**: エージェント情報、コミットされたファイル一覧、次のステップ

**注意事項**
- 同じブランチ名が既に存在する場合はエラーになります
- `testExamplesRegistry.ts`の更新に失敗してもPR作成は続行されます
- GitHub APIの認証エラーがある場合は、環境変数を確認してください

**使用しているエージェント**
- Agent Generator Agent

---

## ツール登録場所

新しいツールを追加する際は、以下のファイルを更新する必要があります：

1. **apps/server/src/tools/[toolName].ts** - ツールの定義
2. **apps/server/src/tools/index.ts** - エクスポート追加

Agent Generator Agentを使用すると、これらの変更が自動的に適用されます。

---

## 開発ガイドライン

### 新規ツール作成時の注意点

1. **命名規則**
   - ツール名: camelCase（例: `parseCSV`, `sendSlackMessage`）
   - ファイル名: ツール名.ts または [agentId]Tools.ts

2. **パラメータ定義**
   - Zodスキーマを使用して型安全に定義
   - 必要最小限のパラメータのみを定義
   - descriptionを必ず記述（LLMへのヒント）

3. **返り値の形式**
   - 必ず`success: boolean`を含める
   - エラー時は`error: string`を返す
   - 必要に応じて詳細情報を追加

4. **エラーハンドリング**
   - try-catchで適切にエラーをキャッチ
   - エラーメッセージは明確に記述
   - 外部APIの失敗は適切にハンドリング

5. **セキュリティ**
   - ファイル操作は許可されたパスのみ
   - 環境変数から認証情報を取得
   - ユーザー入力は適切にバリデーション

### ツールのテスト

新しいツールを作成したら、以下をテストしてください：

1. **正常系**: 期待される入力で正しく動作するか
2. **異常系**: エラーケースで適切にエラーを返すか
3. **エッジケース**: 境界値や特殊な入力で問題ないか
4. **統合テスト**: エージェントから呼び出して正しく動作するか

---

## トラブルシューティング

### ツールが正しく認識されない場合

1. `apps/server/src/tools/index.ts`にエクスポートが追加されているか確認
2. ツール名が正しく定義されているか確認（nameフィールド）
3. TypeScriptのビルドエラーがないか確認: `npm run build`
4. サーバーを再起動: `npm run dev`

### ツールの実行でエラーが発生する場合

1. パラメータの型が正しいか確認
2. 必要な環境変数が設定されているか確認
3. 外部APIの認証情報が正しいか確認
4. ログを確認してエラーの詳細を調査

### GitHub連携ツールのエラー

1. `GITHUB_TOKEN`が設定されているか確認
2. トークンに必要な権限（repo）があるか確認
3. `GITHUB_OWNER`と`GITHUB_REPO`が正しいか確認
4. GitHub APIのレート制限に達していないか確認

---

## 関連ドキュメント

- [エージェント一覧](./agents.md)
- [API仕様](./api.md)
- [アーキテクチャ](./architecture.md)
