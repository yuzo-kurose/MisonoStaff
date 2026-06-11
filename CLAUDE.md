# Misono Staff System — 作業・デプロイ運用ルール

神苑スタッフ参加申込・事前決済・受付管理システム（Next.js 15 + Supabase + Stripe）。
**決済が発生する本番システム**であることを常に意識する。

## コミット運用（機能単位で小さく）

セッション全体を1コミットにまとめない。**1機能・1目的＝1コミット**を原則とする。
問題発生時の切り分けとロールバックを容易にするため。

- コミット前に必ず `npx tsc --noEmit`（型チェック）を通す。UIや本番影響のある変更は `npm run build` も通す。
- コミットメッセージは `feat:` / `fix:` / `refactor:` / `chore:` などの接頭辞＋日本語要約。何を・なぜ変えたかを本文に書く。
- 末尾に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` を付ける。
- `main` で直接作業する運用。push すると Vercel が自動デプロイする。

## デプロイ

- `git push origin main` → Vercel が自動デプロイ。
- デプロイ前チェックリスト:
  1. `npx tsc --noEmit` が通る
  2. 必要なら `npm run build` が通る
  3. 秘密情報が追跡されていない（`git ls-files | grep -iE "\.env" | grep -viE "example|sample"` が空）
  4. `.vercel` が gitignore 済み
- `NEXT_PUBLIC_*` 環境変数を変えた場合は再ビルドが必要（Vercel 再デプロイで反映）。

## DB マイグレーション

- 既存マイグレーションは編集せず、**新規番号のファイル**を追加する（適用済み環境との整合）。
- 本番DBへの適用はハード操作。DBパスワードが手元にないため、**SQL をユーザーに提示し Supabase SQL Editor で実行してもらう**運用。コードの push とは別ステップ。
- 列追加など破壊性のない変更でも、既存データへの影響（NULL になる等）を明示してから依頼する。

## セキュリティの前提（決済レベル）

- service_role（admin client）を使うサーバアクションは、必ず `requireRole` で呼び出し元の権限を自己検証する（RLS を迂回するため）。
- user セッション client の操作は RLS が保護する。`profiles_update_self` は role/branch_id を WITH CHECK で固定。
- メール列挙攻撃を防ぐため、サインアップの成否詳細はユーザーに返さない。
- 詳細監査は `.claude/skills/supabase-leak-audit` を参照。

## ドメイン用語の注意

- **部 (division)**: 所属組織区分（学生部/成人部 等）。postgres enum `division`。
- **部署 (department)**: 当日の配置先（教祖殿エントランス/キッチン 等）。`profiles.department` varchar、固定リストだが任意入力。**部とは別軸**なので混同しない。
