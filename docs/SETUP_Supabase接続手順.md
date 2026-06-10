# Supabase 接続手順

このドキュメントの手順どおりに進めると、モック画面を実データへ接続できます。
所要：15〜30分。**キーを設定し、マイグレーションを適用するだけ**で認証保護が自動で有効になります。

---

## 0. 前提

- Supabase アカウント（https://supabase.com）
- このリポジトリで `npm install` 済み

## 1. Supabase プロジェクト作成

1. https://supabase.com/dashboard で「New project」
2. リージョンは **Tokyo (Northeast Asia)** を推奨
3. データベースパスワードを控える

## 2. 環境変数を設定

`.env.local.example` を `.env.local` にコピーし、値を入れる。

```bash
cp .env.local.example .env.local
```

| 変数 | 取得場所（ダッシュボード） |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role（**秘匿**） |

> Stripe の値は決済実装時でOK（未設定でも画面は動く）。

## 3. マイグレーション適用

### 方法A：Supabase CLI（推奨）

```bash
npx supabase login
npx supabase link --project-ref <プロジェクトref>
npx supabase db push      # supabase/migrations/*.sql を順に適用
```

### 方法B：SQL Editor で手動

ダッシュボードの SQL Editor で、`supabase/migrations/` 内を**ファイル名順**に貼り付けて実行：

1. `20260607000001_init_schema.sql`
2. `20260607000002_auth_profile_sync.sql`
3. `20260607000003_rls_policies.sql`
4. `20260607000004_reception_rpc.sql`

## 4. シードデータ投入

SQL Editor で `supabase/seed.sql` を実行（拠点・イベント・フォームが入る）。

## 5. 管理者アカウント作成

1. ダッシュボード Authentication → Users → 「Add user」で自分のメール/パスワードを作成
2. 作成されたユーザーの UUID をコピー
3. SQL Editor で role を昇格（`seed.sql` 末尾のコメント参照）：

```sql
update public.profiles set role='admin', name='管理者'
  where id='<コピーしたUUID>';
```

> 役割変更は次回トークン発行時に反映されるため、**一度ログアウト→再ログイン**する。

## 6. 型の自動生成（任意）

手書きの `src/types/database.ts` を自動生成に置き換える場合：

```bash
npx supabase gen types typescript --project-id <id> --schema public > src/types/database.ts
```

## 7. 起動・確認

```bash
npm run dev
```

- env を設定したので **認証保護が有効化**（`/mypage` などは未ログインで `/login` へ）
- 管理者でログイン → `/admin/events` に**シードのイベント**が表示されれば接続成功

---

## 画面を実データへ接続していく順序（推奨）

1. **イベント一覧/フォーム** … `src/lib/queries/events.ts` を使って `/admin/events`・`/events`・`/admin/forms/[eventId]` をモックから置換
2. **マイページ/申込** … participants/applications の取得・作成
3. **受付** … RPC `checkin_candidates` / `batch_check_in` を呼ぶ（`/reception`）
4. **決済** … Stripe Checkout（payment_groups）＋ Webhook

> 各画面は現在モック（`src/lib/mock/data.ts`）。Server Component 側で上記 query に差し替えるだけで実データ化できる構造です。

## トラブルシュート

- **403/RLSで見えない**：role が `app_metadata` に反映されているか。再ログインで解決することが多い。
- **profiles が作られない**：`20260607000002` のトリガが適用されているか確認。
- **middleware で全部 /login に飛ぶ**：env は正しいか。逆に env 未設定なら認証はスキップされる（デモ用）。
