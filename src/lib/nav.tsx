import {
  Home,
  CalendarPlus,
  ClipboardList,
  UserPlus,
  CreditCard,
  Calendar,
  Building2,
  FileText,
  ListChecks,
  QrCode,
  Megaphone,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type Role = "participant" | "representative" | "admin" | "reception";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** 左メニュー2階層の親カテゴリ。 */
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const roleLabels: Record<Role, string> = {
  participant: "参加者",
  representative: "代表者",
  admin: "管理者",
  reception: "受付",
};

/** 左サイドメニュー（2階層）。親カテゴリ → 子項目。 */
export const navGroupsByRole: Record<Role, NavGroup[]> = {
  participant: [
    {
      label: "参加",
      icon: Home,
      items: [
        { href: "/mypage", label: "マイページ", icon: Home },
        { href: "/events", label: "イベント・申込", icon: CalendarPlus },
      ],
    },
  ],
  representative: [
    {
      label: "申込管理",
      icon: ClipboardList,
      items: [
        { href: "/rep/roster", label: "名簿・確定", icon: ClipboardList },
        { href: "/rep/proxy", label: "代行入力", icon: UserPlus },
      ],
    },
    {
      label: "決済",
      icon: CreditCard,
      items: [{ href: "/rep/payments", label: "決済状況", icon: CreditCard }],
    },
  ],
  admin: [
    {
      label: "申込管理",
      icon: ListChecks,
      items: [{ href: "/admin/applications", label: "申込一覧", icon: ListChecks }],
    },
    {
      label: "マスタ管理",
      icon: Building2,
      items: [
        { href: "/admin/events", label: "イベント", icon: Calendar },
        { href: "/admin/forms", label: "フォーム", icon: FileText },
        { href: "/admin/branches", label: "拠点マスタ", icon: Building2 },
        { href: "/admin/departments", label: "部署マスタ", icon: Tags },
      ],
    },
    {
      label: "お知らせ",
      icon: Megaphone,
      items: [{ href: "/admin/announcements", label: "連絡事項", icon: Megaphone }],
    },
  ],
  reception: [
    {
      label: "受付",
      icon: QrCode,
      items: [{ href: "/reception", label: "受付", icon: QrCode }],
    },
  ],
};

/** 2階層グループを平坦化した一覧（モバイル下部タブ・トップ画面の役割カードで使用）。 */
export const navByRole: Record<Role, NavItem[]> = Object.fromEntries(
  (Object.entries(navGroupsByRole) as [Role, NavGroup[]][]).map(([role, groups]) => [
    role,
    groups.flatMap((g) => g.items),
  ]),
) as Record<Role, NavItem[]>;
