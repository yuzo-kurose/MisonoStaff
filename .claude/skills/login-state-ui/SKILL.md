---
name: login-state-ui
description: >-
  misono-staff-system でログイン状態に応じてUIを出し分けるときの規約。ログイン/未ログインでメニュー・ボタン・アイコン・遷移先を切り替える、ログアウトボタンを置く、ユーザー名やアバターを表示する、といった作業のときに必ず参照すること。「ログイン後は〜を表示」「未ログインなら〜を隠す」「ログアウトを追加」「ユーザーアイコン」「右上にユーザー」などの依頼で使う。クライアントコンポーネントでの認証状態取得は useAuthUser フックに統一する。
---

# ログイン状態に応じた UI 出し分け規約（misono-staff-system）

このプロジェクトでログイン状態によって表示を変える UI を作る・直すときの決まりごと。
目的は「認証状態の取得方法を1か所に集約し、ログイン/ログアウトに即追従する一貫した挙動」を保つこと。

## 原則：認証状態は `useAuthUser` フックで取る

クライアントコンポーネントでログイン状態が必要なときは、必ず
[`src/hooks/useAuthUser.ts`](../../../src/hooks/useAuthUser.ts) を使う。

```tsx
"use client";
import { useAuthUser } from "@/hooks/useAuthUser";

export function Example() {
  const { who, authed, ready } = useAuthUser();
  // who   : 表示名（user_metadata.name → email の順。未ログインは ""）
  // authed: ログイン済みか
  // ready : 初回判定が済んだか（チラつきを抑えたいときに使う）
}
```

### なぜフックに統一するのか

- **重複の排除**：以前は `AppShell` / `PublicSidebar` / `HomeUserMenu` が各自で
  `createClient().auth.getUser()` を呼んでいた。判定ロジックがコピペで散らばると、
  表示名のフォールバック順を変えるだけで複数ファイルを直す羽目になる。
- **ログイン/ログアウトへの追従**：フックは内部で `onAuthStateChange` を購読しているため、
  別タブやログアウト操作後の状態変化が再読み込みなしで反映される。各コンポーネントで
  `getUser()` を1回呼ぶだけだと、初回スナップショットのまま固まってしまう。

### やってはいけないこと

- クライアントコンポーネントで `createClient().auth.getUser()` を**新規に直接呼ばない**
  （状態取得のためには）。表示名・ログイン有無が欲しいだけなら `useAuthUser` で足りる。
- `localStorage` などに独自のログインフラグを持たない。認証の真実は Supabase セッション。
- サーバーコンポーネント／サーバーアクションでの認証チェックは別物。そちらは
  [`src/lib/supabase/server.ts`](../../../src/lib/supabase/server.ts) の
  サーバー用クライアントを使う（このフックはクライアント専用）。

例外：**ログアウト操作そのもの**（`auth.signOut()`）は `createClient()` を直接使ってよい。
状態の「取得」と「操作」は別。下の logout 例を参照。

## ログアウトボタンの定型

ログアウトは「サインアウト → `/login` へ遷移 → `router.refresh()`」で統一する。
refresh を入れるのはサーバーコンポーネント側のセッションキャッシュを確実に更新するため。

```tsx
"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const router = useRouter();
async function logout() {
  await createClient().auth.signOut();
  router.push("/login");
  router.refresh();
}
```

参考実装：[`src/components/layout/AppShell.tsx`](../../../src/components/layout/AppShell.tsx)、
[`src/components/layout/PublicSidebar.tsx`](../../../src/components/layout/PublicSidebar.tsx)。

## 表示の出し分けパターン

- **ログイン時に隠す**：ログイン/新規登録への導線は `authed` のとき配列から除外する
  （`disabled` ではなく出さない）。例：`PublicSidebar` のメニュー組み立て。
- **頭文字アバター**：表示名の先頭1文字を丸バッジに入れ、クリックで `/mypage` へ。
  実装は [`src/components/layout/HomeUserMenu.tsx`](../../../src/components/layout/HomeUserMenu.tsx)。
  匿名時に出すか隠すかは `showLoginWhenAnon` のようなフラグで呼び出し側が選べるようにする。
- **配色**：DADS トークンを使う（`tailwind.config.ts`）。アバター等の主要アクションは
  `bg-primary-700` / hover `bg-primary-900`。`primary-600` などトークンに無い番号は使わない。

## チェックリスト（この種の修正をしたら）

- [ ] 認証状態の取得は `useAuthUser` を経由しているか（`getUser()` の新規直呼びがないか）
- [ ] ログアウトは signOut → push("/login") → refresh の順か
- [ ] ログイン/未ログインの両状態で表示崩れがないか（PC サイドバー・モバイルヘッダー両方）
- [ ] `npx tsc --noEmit` が通るか
