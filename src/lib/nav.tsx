import {
  Home,
  CalendarPlus,
  ClipboardList,
  UserPlus,
  CreditCard,
  Calendar,
  Building2,
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

/**
 * 左サイドメニュー。役割（権限）ごとに「○○メニュー」1グループにまとめ、
 * グループ見出しをアコーディオンで開閉できる。色は役割によらず全て紺色で統一。
 */
export const navGroupsByRole: Record<Role, NavGroup[]> = {
  participant: [
    {
      label: "参加者メニュー",
      icon: Home,
      items: [
        { href: "/mypage", label: "マイページ", icon: Home },
        { href: "/events", label: "イベント・申込", icon: CalendarPlus },
      ],
    },
  ],
  representative: [
    {
      label: "代表者メニュー",
      icon: ClipboardList,
      items: [
        { href: "/rep/roster", label: "所属名簿", icon: ClipboardList },
        { href: "/rep/proxy", label: "代行入力", icon: UserPlus },
        { href: "/rep/payments", label: "決済状況", icon: CreditCard },
      ],
    },
  ],
  admin: [
    {
      label: "管理者メニュー",
      icon: ListChecks,
      items: [
        { href: "/admin/applications", label: "申込一覧", icon: ListChecks },
        { href: "/admin/events", label: "イベント管理", icon: Calendar },
        { href: "/admin/announcements", label: "連絡事項管理", icon: Megaphone },
        { href: "/admin/branches", label: "拠点マスタ", icon: Building2 },
        { href: "/admin/departments", label: "部署マスタ", icon: Tags },
      ],
    },
  ],
  reception: [
    {
      label: "受付管理メニュー",
      icon: QrCode,
      items: [
        { href: "/reception", label: "受付対応", icon: QrCode },
        { href: "/reception/list", label: "受付一覧", icon: ListChecks },
      ],
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

/**
 * 全役割のメニューをまとめた一覧。役割でフィルタせず、全ユーザー・全画面で同じ表示にする。
 * 並び順：参加者 → 代表者 → 管理者 → 受付管理。
 */
export const allNavGroups: NavGroup[] = [
  ...navGroupsByRole.participant,
  ...navGroupsByRole.representative,
  ...navGroupsByRole.admin,
  ...navGroupsByRole.reception,
];

/** allNavGroups を平坦化した全項目（モバイル下部タブ等で使用）。 */
export const allNavItems: NavItem[] = allNavGroups.flatMap((g) => g.items);

/**
 * 権限ロールに応じて表示するメニュー（グループ）を返す。
 * - participant（ユーザー）        : 参加者メニューのみ
 * - representative（所属代表者）   : 参加者＋代表者メニュー
 * - reception（受付）              : 参加者＋受付管理メニュー
 * - admin（管理者/システム管理者） : 全メニュー
 * 未ログイン/不明は空（公開トップではクイックリンクのみ表示）。
 */
export function visibleNavGroups(role: string | undefined): NavGroup[] {
  switch (role) {
    case "participant":
      return navGroupsByRole.participant;
    case "representative":
      return [...navGroupsByRole.participant, ...navGroupsByRole.representative];
    case "reception":
      return [...navGroupsByRole.participant, ...navGroupsByRole.reception];
    case "admin":
      return allNavGroups;
    default:
      return [];
  }
}

export function visibleNavItems(role: string | undefined): NavItem[] {
  return visibleNavGroups(role).flatMap((g) => g.items);
}
