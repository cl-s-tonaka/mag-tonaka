# エージェント設計

## 1. Supervisor
- ユーザー入力を解釈
- モードを確認
- サブエージェントに task を委譲
- 結果を統合しユーザー向け回答を生成

## 2. LocalDocsAgent
- Supervisorから task を受領
- LocalDocsTool を使用して検索
- 検索結果＋参照元を返却

## 3. 将来サブエージェント（設計のみ）
- GoogleDriveAgent
- FormatterAgent（マスキング・整形）
- OrganizerAgent（整理提案）
- GitHubAgent（エージェント作成）