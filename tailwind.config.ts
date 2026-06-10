import type { Config } from "tailwindcss";

/**
 * デジタル庁デザインシステム（DADS）v2.12.0 のトークンを Tailwind に展開。
 * 出典: design-system-mcp（get_color_tokens / get_typography_spec / get_spacing_tokens）
 *
 * スペーシングは DADS と Tailwind デフォルト（1=4px, 4=16px …）が一致するため未拡張。
 * 新しい配色を使う際は MCP の validate_color_usage で WCAG(AA) を確認すること。
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // プライマリ（ブランド／主要アクション）
        primary: {
          50: "#F4F8FF",
          100: "#E8F1FE",
          700: "#0064E6",
          800: "#0050D0",
          900: "#003CB8",
        },
        // ニュートラル（テキスト・背景・ボーダー）
        neutral: {
          50: "#F8F8FA",
          100: "#F0F0F2",
          200: "#D9D9DB",
          300: "#B4B4B6",
          500: "#767678",
          600: "#626264",
          700: "#474749",
          900: "#1A1A1C",
          white: "#FFFFFF",
        },
        // セマンティック
        success: { 100: "#E5F5E8", 900: "#197A2E" },
        warning: { 100: "#FFF6DB", 900: "#926800" },
        error: { 100: "#FCEAE8", 900: "#C52F24" },
        info: { 100: "#E8F1FE", 900: "#0064E6" },
        // リンク・フォーカス
        link: { DEFAULT: "#0064E6", visited: "#7B59C0" },
        focus: "#FFDB1A",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", "Noto Sans JP", "sans-serif"],
      },
      // [fontSize, { lineHeight, fontWeight }]
      fontSize: {
        "display-lg": ["3rem", { lineHeight: "1.4", fontWeight: "700" }],
        "display-md": ["2.25rem", { lineHeight: "1.4", fontWeight: "700" }],
        "display-sm": ["1.875rem", { lineHeight: "1.4", fontWeight: "700" }],
        "heading-xl": ["1.5rem", { lineHeight: "1.5", fontWeight: "700" }],
        "heading-lg": ["1.25rem", { lineHeight: "1.5", fontWeight: "700" }],
        "heading-md": ["1.125rem", { lineHeight: "1.5", fontWeight: "700" }],
        "heading-sm": ["1rem", { lineHeight: "1.5", fontWeight: "700" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.7", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.7", fontWeight: "400" }],
        "label-lg": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        "label-md": ["0.875rem", { lineHeight: "1.5", fontWeight: "500" }],
        "label-sm": ["0.75rem", { lineHeight: "1.5", fontWeight: "500" }],
      },
      ringColor: {
        focus: "#FFDB1A",
      },
    },
  },
  plugins: [],
};

export default config;
