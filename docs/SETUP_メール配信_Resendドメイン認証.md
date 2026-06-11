# メール配信セットアップ（Resendドメイン認証 → パスワード再設定メールを有効化）

作成日：2026-06-12
対象：神苑（misono）スタッフ参加申込システム

このドキュメントの手順を完了すると、`/forgot-password`（パスワードを忘れた方）からの
**自動メールが全スタッフに届く**ようになる。**コードの変更は不要**で、設定だけで有効になる。

---

## 0. 背景：いまの状態と、なぜ届かないか

- 認証まわりのコード（`/forgot-password`・`/reset-password`・ログイン画面のリンク・
  マイページのパスワード変更カード）は**実装・本番反映済み**。
- しかし送信元が **`onboarding@resend.dev`（Resendのテスト用アドレス）** のため、
  **Resendアカウント所有者（yuzo515@gmail.com）宛にしか配信されない**。
  → 他スタッフには再設定メールが一切届かない。これはResend側の仕様で、コードでは回避できない。
- **独自ドメインをResendで認証し、そのドメインのアドレスを送信元にする**ことで解消する。

### ドメイン認証が済むまでの当面の運用
- スタッフの初期パスワードは管理者が **`scripts/set-password.mjs`** で直接発行し、
  本人がログイン後に**マイページの「パスワード」カード**で変更する（ドメイン不要・今日から可能）。
  ```bash
  node scripts/set-password.mjs staff@example.com
  ```
- `/forgot-password` は将来のために本番へ残してよい（ドメイン認証後に自動で効き始める）。
  ただし現状は「送信しました」と表示されても他スタッフには届かないため、
  当面の案内は「パスワードは管理者に連絡」とする。

---

## 1. ドメインを用意する

任意のレジストラ（お名前.com / Cloudflare Registrar / Google Domains 等）で
ドメインを1つ取得する（例：`misono-staff.jp`）。DNSレコードを編集できれば何でもよい。

> ヒント：送信専用のサブドメイン（例 `mail.misono-staff.jp`）を使うと、本体ドメインの
> メール評価に影響を与えにくい。Resendでもサブドメイン登録が推奨される。

---

## 2. Resend でドメインを認証する

1. https://resend.com/domains → **Add Domain**
2. ドメイン（またはサブドメイン）を入力して作成
3. Resendが表示する **DNSレコード**（通常 SPF=TXT、DKIM=TXT/CNAME、推奨で DMARC=TXT）を、
   レジストラのDNS設定に**そのまま追加**する
4. DNS反映後（数分〜最大48h、実際は数十分が多い）、Resendの画面で **Verified** になることを確認

認証が済むと、`no-reply@<あなたのドメイン>` のような**任意の差出人**で、
**任意の宛先へ**送信できるようになる。

---

## 3. アプリの送信元（EMAIL_FROM）を更新する

`.env.local` の `EMAIL_FROM` を、認証済みドメインのアドレスに変更する。

```
EMAIL_FROM=神苑スタッフ <no-reply@あなたのドメイン>
```

> `EMAIL_FROM` はアプリ自身（`src/lib/email.ts` / Resend API）の送信元。
> 次の手順4のSupabase SMTPの「Sender」とは別設定だが、**両方を同じ認証済みアドレスに揃える**。

### 本番（Vercel）へ反映
`NEXT_PUBLIC_*` ではないが本番でも使うため、Vercelの環境変数にも反映して再デプロイする。
本リポジトリの `vercel-env-deploy` スキルを使うと、`.env.local` → Vercel反映 → 再デプロイ →
本番ヘルスチェックまで一括で行える。

---

## 4. Supabase の SMTP を設定する（認証メールの配信経路）

Supabaseダッシュボード → **Authentication → Emails → SMTP Settings** →
**Enable Custom SMTP** をON。

| 項目 | 値 |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `.env.local` の `RESEND_API_KEY` の値 |
| Sender email | `no-reply@あなたのドメイン`（手順2で認証したドメイン） |
| Sender name | `神苑スタッフ` |

> Supabase標準メールは **1時間あたり数通** の制限があり本番に使えない。必ずカスタムSMTPにする。

---

## 5. Supabase の URL 設定（リンクの戻り先を許可）

Supabaseダッシュボード → **Authentication → URL Configuration**

- **Site URL**：`https://misono-staff-system.vercel.app`
- **Redirect URLs** に追加（無いと再設定リンクが弾かれる）：
  - `https://misono-staff-system.vercel.app/**`
  - `http://localhost:3000/**`（ローカル動作確認用）

> 再設定リンクは `/auth/confirm` を経由してセッションを確立し、`/reset-password` に着地する。
> 上記ワイルドカードでこの経路が許可される。

---

## 6. 動作確認

1. 本番 `https://misono-staff-system.vercel.app/forgot-password` を開く
2. **自分以外のスタッフのメール**を入力して送信（ドメイン認証後は届くはず）
3. 届いたメールのリンク → `/reset-password` で新パスワードを設定
4. 設定したパスワードでログインできることを確認

---

## 7. つまずきポイント

| 症状 | 原因と対処 |
| --- | --- |
| 自分には届くが他人に届かない | 送信元がまだ `onboarding@resend.dev`（テスト用）。手順2〜4で認証ドメインに変更する |
| リンクを開くと弾かれる/ログイン画面に戻る | 手順5の Redirect URLs / Site URL 未設定。ワイルドカードを追加 |
| 迷惑メールに入る | DMARCレコード未設定が主因。Resend推奨のDMARC TXTを追加し、送信元の表示名を整える |
| そもそも送信されない | SupabaseのSMTPがOFF、または `RESEND_API_KEY` の貼り間違い。手順4を再確認 |
| `set-password.mjs` でユーザーが見つからない | そのメールはまだ未登録。先に本人がサインアップ（または管理者が作成）する必要がある |

---

## 関連
- 初期パスワード発行スクリプト：`scripts/set-password.mjs`（profilesを壊さずパスワードのみ設定）
- 管理者作成・昇格スクリプト：`scripts/ensure-admin.mjs`
- 本番反映フロー：リポジトリ `vercel-env-deploy` スキル
