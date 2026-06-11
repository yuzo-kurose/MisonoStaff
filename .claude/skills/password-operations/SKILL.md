---
name: password-operations
description: >-
  misono-staff-system でパスワードまわりの作業をするときの運用規約。「パスワードをリセット」「初期パスワードを発行」「パスワードが届かない/メールが来ない」「パスワードを変更したい」「パスワードを忘れた」「ログインできない」「Supabaseでパスワードを直した」などの依頼で必ず参照する。Supabaseダッシュボードの「reset」は初期パスワードを送らないこと、Resendの onboarding@resend.dev は所有者宛にしか届かないこと、用途別に使う3経路（管理者発行 / ログイン中変更 / 忘れた時メール）を取り違えないための規約。
---

# パスワード運用規約（misono-staff-system）

このプロジェクトでパスワードに関わる作業をするときの決まりごと。**決済が発生する本番システム**なので、
誤った前提（「リセットすれば初期パスワードがメールで来る」等）で操作・案内しないこと。

## 大前提：Supabaseの「reset」は初期パスワードを送らない

- Supabaseダッシュボードの「Send password recovery / reset」は **再設定リンク** を送るだけで、
  **平文の初期パスワードを送る機能は存在しない**。「初期パスワードが届かない」のは正常。
- そのうえ Supabase の認証メールは **独自SMTP未設定だと事実上届かない**（標準メールは1時間数通制限）。

## 用途別の3経路（取り違えない）

| 状況 | 使うもの | 備考 |
| --- | --- | --- |
| 管理者がスタッフへ初期パスワードを発行 | `scripts/set-password.mjs` | ドメイン/SMTP不要。**今日から全員に使える** |
| ログイン中の本人がパスワード変更 | マイページの「パスワード」カード | `src/app/mypage/ChangePasswordCard.tsx` |
| ログインできない人の自動メール再設定 | `/forgot-password` → `/reset-password` | **Resendドメイン認証が前提**（下記） |

### 1. 管理者による初期パスワード発行（現在の標準運用）

```bash
node scripts/set-password.mjs <email> [password]
```
- service_role で `updateUserById` により **password と email_confirm のみ** 設定する。
- **`profiles`(name/kana/role) には触れない**。これが `scripts/ensure-admin.mjs`（admin昇格＋profiles upsert）との違い。
  単にパスワードを直したいだけのときに ensure-admin を使うと **氏名・読み仮名を上書きしてしまう**ので使わない。
- パスワード省略時は安全なランダムを生成して表示する。発行後は本人へ安全な手段で伝え、ログイン後に本人がカードで変更する。

### 2. ログイン中の変更（ChangePasswordCard）

- マイページに常設。**現在のパスワードで再認証（signInWithPassword）してから `updateUser`** する。
  放置中セッションからの不正変更を防ぐためで、この再認証ステップを省かないこと。

### 3. 忘れた時の自動メール（/forgot-password・/reset-password）

- コードは実装・本番反映済み。`/forgot-password` が `resetPasswordForEmail` を送り、
  リンクは既存の `src/app/auth/confirm/route.ts` でセッション確立後 `/reset-password` に着地する。
- **メール列挙対策**：実在/不在に関わらず同じ「送信しました」を表示する。成否を出し分けないこと。
- **これが実際に届くにはResendのドメイン認証＋Supabase SMTP設定が必要**（次節）。

## Resendの罠：onboarding@resend.dev は所有者宛にしか届かない

- `.env.local` の `EMAIL_FROM` が `onboarding@resend.dev`（Resendのテスト送信元）の間、
  **メールはResendアカウント所有者（yuzo515@gmail.com）にしか配信されない**。他スタッフには一切届かない。
- 解消には**独自ドメインをResendで認証**し、そのアドレスを `EMAIL_FROM` と Supabase SMTP の Sender に使う。
- 手順の詳細は [`docs/SETUP_メール配信_Resendドメイン認証.md`](../../../docs/SETUP_メール配信_Resendドメイン認証.md) を参照
  （ドメイン取得→DNS認証→EMAIL_FROM更新→Supabase SMTP/URL設定→動作確認）。
- ドメイン認証が済むまでは経路3に頼らず、**経路1（管理者発行）＋経路2（本人変更）** で運用する。

## やってはいけないこと

- 「リセットすれば初期パスワードがメールで届く」と案内する（そういう仕組みは無い）。
- パスワードだけ直したいのに `ensure-admin.mjs` を使う（profilesを上書きする）。
- `/forgot-password` の成否をユーザーに出し分ける（メール列挙を許す）。
- ドメイン未認証のまま「忘れたら自動メールで」と全スタッフに案内する（届かないのに届く前提にする）。
- service_role キーやResend APIキーをクライアント/ログ/コミットに混入させる。

## 関連
- `scripts/set-password.mjs` … 初期パスワード直接発行（profilesを壊さない）
- `scripts/ensure-admin.mjs` … 管理者作成・昇格（profiles upsertあり）
- `src/app/mypage/ChangePasswordCard.tsx` … ログイン中の変更
- `src/app/forgot-password/`, `src/app/reset-password/`, `src/app/auth/confirm/route.ts` … 忘れた時フロー
- `docs/SETUP_メール配信_Resendドメイン認証.md` … メール配信を有効化する手順
