# UIデザイン方針 — デジタル庁デザインシステム（DADS）

作成日：2026-06-07
対象：神苑（misono）スタッフ参加申込システム

---

## 1. 採用デザインシステム

本システムのUIは **デジタル庁デザインシステム（DADS）v2.12.0** に準拠する。

- 公的・誰にでも使いやすいアクセシブルなUI（要件：スマホファースト／数百人規模／幅広い年齢層のスタッフ）に適合。
- カラー・タイポグラフィ・スペーシングの各トークン、コンポーネント仕様、WCAGコントラスト基準を統一的に適用する。

## 2. 参照手段：design-system-mcp

DADSの仕様は MCPサーバー **dads-design-system** 経由で参照する。

- リポジトリ：https://github.com/keisato848/design-system-mcp
- ローカル配置：`/Users/apple/Downloads/claude/design-system-mcp/`（アプリ本体とは別ディレクトリ）
- ビルド済みエントリ：`dist/index.js`（`npm install` → `npm run build` 済み）
- プロジェクト登録：本リポジトリ直下 [.mcp.json](../.mcp.json)（プロジェクトスコープ）

### 利用可能なMCPツール

| ツール | 用途 |
| --- | --- |
| `search_guidelines` | ガイドラインのキーワード検索 |
| `get_guideline` | セクションIDで詳細取得 |
| `get_color_tokens` | カラートークン一覧 |
| `get_component_spec` | コンポーネント仕様 |
| `get_typography_spec` | タイポグラフィ仕様 |
| `get_spacing_tokens` | スペーシングトークン一覧 |
| `validate_color_usage` | WCAGコントラスト比検証 |

> MCPリソース：`dads://foundations/color` / `typography` / `spacing` / `layout`

## 3. 実装への落とし込み方針（案）

> **実施状況（2026-06-07）**：DADSトークンをMCPから取得し、[../tailwind.config.ts](../tailwind.config.ts)（カラー25種・タイポグラフィ13種・focusリング）と [../src/app/globals.css](../src/app/globals.css)（CSS変数 + `:focus-visible`にfocus-yellow）へ展開済み。フォントは Noto Sans JP を `next/font` で読込。スペーシングはTailwindデフォルトと一致のため未拡張。

- **トークンはコード化して一元管理**：`get_color_tokens` / `get_spacing_tokens` / `get_typography_spec` で取得した値を、Tailwind CSS の `theme.extend`（または CSS カスタムプロパティ）に展開し、`src/` 全体で共有する。
- **コンポーネントはDADS仕様準拠**：ボタン・フォーム・テーブル等は `get_component_spec` の仕様（状態・余白・サイズ）に合わせて実装。
- **配色は必ず検証**：新しい文字色×背景色の組み合わせは `validate_color_usage` でWCAG基準（原則 AA）を満たすか確認してから採用。
- **スマホファースト**：参加者画面はモバイル基準でレイアウト、管理画面はPC・タブレット併用（要件§7）。

## 4. セットアップ手順（再現用）

```bash
# 1. MCPサーバーの取得・ビルド（初回のみ）
git clone https://github.com/keisato848/design-system-mcp.git
cd design-system-mcp && npm install && npm run build

# 2. 本プロジェクトの .mcp.json で node dist/index.js を登録（設定済み）
# 3. Claude Code をこのプロジェクトで起動 → MCPサーバーの承認プロンプトで許可
#    （/mcp コマンドで dads-design-system が connected になることを確認）
```

> 注意：`.mcp.json` はプロジェクトスコープのため、**Claude Code 起動時に承認が必要**。
> 既存セッション中に追加した場合は再起動または再読込で反映される。

## 5. 残課題

- DADSトークン → Tailwind/CSS変数への変換スクリプト（手動 or 自動生成）の整備
- ダークモード対応の要否
- ロゴ・神苑固有のブランド要素とDADSの併用ルール
