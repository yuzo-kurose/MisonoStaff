# 神苑（misono）スタッフ 参加申込・事前決済・受付管理システム

神苑スタッフが複数イベントへの参加をスマホから申込・事前決済し、運営側が申込・当日受付を管理するシステム。

## 技術構成

| 領域 | 採用 |
| --- | --- |
| フレームワーク | Next.js 15（App Router）+ TypeScript |
| スタイル | Tailwind CSS + **デジタル庁デザインシステム（DADS v2.12.0）** |
| DB / 認証 | Supabase（PostgreSQL / Auth / RLS） |
| 決済 | Stripe（クレジットカード + PayPay） |
| 通知 | メール + LINE（決済リンクは必ずメール） |

## ディレクトリ

```
docs/                 要件定義書・データ定義書・UIデザイン方針
src/app/              画面（App Router）
src/components/       UIコンポーネント
src/lib/supabase/     Supabaseクライアント（client / server / admin）
src/types/            型定義
supabase/migrations/  DBスキーマ・RLSポリシー
.mcp.json             DADS デザインシステム MCP の登録
```

## セットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数（.env.local.example をコピーして値を設定）
cp .env.local.example .env.local

# 3. 開発サーバー
npm run dev          # http://localhost:3000

# 4. ビルド / 型チェック
npm run build
npm run typecheck
```

## DB マイグレーション

`supabase/migrations/` に DDL・RLS を配置済み（未適用）。Supabase プロジェクト接続後：

```bash
supabase db push     # もしくは Supabase Studio の SQL Editor で順に実行
```

## UIデザイン（DADS）

デジタル庁デザインシステムを [design-system-mcp](https://github.com/keisato848/design-system-mcp) 経由で参照。
トークンは [tailwind.config.ts](tailwind.config.ts) と [src/app/globals.css](src/app/globals.css) に展開済み。
詳細は [docs/UIデザイン方針.md](docs/UIデザイン方針.md)。

## ドキュメント

- [要件定義書 v4](docs/要件定義書_v4_確定版.md)
- [データ定義書 v2（Supabase + Stripe）](docs/データ定義書_v2_Supabase-Stripe.md)
- [UIデザイン方針](docs/UIデザイン方針.md)
