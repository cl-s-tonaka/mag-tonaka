/**
 * データベースマイグレーション実行
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * マイグレーションを実行
 */
export async function runMigrations(db: any): Promise<void> {
  console.log('Starting database migrations...');

  // マイグレーションテーブルの作成
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 既に実行済みのマイグレーションを取得
  const appliedMigrations = await db.execute(`
    SELECT version FROM schema_migrations ORDER BY version
  `);
  const appliedVersions = new Set(
    appliedMigrations.rows.map((r: any) => r.version)
  );

  // マイグレーションファイルのリスト
  const migrations = [
    { version: 1, name: '001_initial_schema.sql', path: 'migrations/001_initial_schema.sql' },
    // 将来のマイグレーションをここに追加
  ];

  // 未適用のマイグレーションを実行
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Applying migration ${migration.name}...`);

      try {
        // マイグレーションファイルを読み込み
        const sql = readFileSync(
          join(process.cwd(), migration.path),
          'utf8'
        );

        // マイグレーションを実行
        await db.execute(sql);

        // マイグレーション記録を保存
        await db.execute({
          sql: `INSERT INTO schema_migrations (version, name) VALUES (?, ?)`,
          args: [migration.version, migration.name],
        });

        console.log(`Migration ${migration.name} applied successfully`);
      } catch (error: any) {
        console.error(`Failed to apply migration ${migration.name}:`, error.message);
        throw error;
      }
    } else {
      console.log(`Migration ${migration.name} already applied, skipping...`);
    }
  }

  console.log('All migrations applied successfully');
}
