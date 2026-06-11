/**
 * 画面確認用のモックデータ。
 * Supabase 接続後は実データ取得に差し替える（型は src/types/ に集約予定）。
 */

export type ParticipantStatus = "applying" | "confirmed" | "paid" | "cancelled";
export type AttendanceStatus = "not_arrived" | "checked_in" | "day_cancelled";

export type FieldType =
  | "text"
  | "textarea"
  | "select_single"
  | "select_multiple"
  | "number"
  | "date";

export interface FormField {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice?: number;
  options?: { id: string; label: string; price?: number }[];
}

export interface MockEvent {
  id: string;
  name: string;
  eventDate: string; // ISO
  venue?: string;
  deadline: string;
  capacity?: number;
  status: "draft" | "published" | "closed";
  baseFee: number;
  formName: string;
  fields: FormField[];
}

export interface Branch {
  id: string;
  name: string;
  region?: string;
  representative: string;
}

/** 部（所属組織区分） */
export const divisions = [
  { value: "student", label: "学生部" },
  { value: "university", label: "大学生部" },
  { value: "adult", label: "成人部" },
  { value: "mens", label: "男子部" },
  { value: "general", label: "一般" },
] as const;

/**
 * 部署（配置先）の初期値。部(division)とは別軸の「当日の持ち場」。
 * ⚠️ 実行時の選択肢は DB の departments テーブル（部署マスタ）が正。
 *    この定数は migration 20260611000003 の初期シードと同じ並びの参照用で、
 *    画面では使用しない（管理者が部署マスタで追加・編集・削除する）。
 */
export const departments = [
  "教祖殿エントランス",
  "教祖殿地下",
  "サンクチュアリ",
  "プラザ",
  "みたらし",
  "参道",
  "天門",
  "スクエア",
  "宗務棟",
  "講堂棟",
  "研修棟",
  "設営",
  "キッチン",
  "配布",
  "浄化",
  "交通本部",
  "参拝報告",
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "守山",
  "未割当",
] as const;

// id は supabase/seed.sql の拠点UUIDと一致させる（サインアップのFK整合）
export const branches: Branch[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "東京拠点", region: "関東", representative: "佐藤 健一" },
  { id: "22222222-2222-2222-2222-222222222222", name: "大阪拠点", region: "近畿", representative: "鈴木 美咲" },
  { id: "33333333-3333-3333-3333-333333333333", name: "福岡拠点", region: "九州", representative: "高橋 大輔" },
];

// イベントごとに独立したフォーム項目（フォームはイベント単位で作成・編集する）
const mealField: FormField = {
  id: "f-meal",
  label: "食事",
  fieldType: "select_single",
  required: true,
  priceCalc: "option_based",
  options: [
    { id: "o1", label: "なし", price: 0 },
    { id: "o2", label: "お弁当（並）", price: 800 },
    { id: "o3", label: "お弁当（特上）", price: 1500 },
  ],
};

export const events: MockEvent[] = [
  {
    id: "e1",
    name: "元旦祭 奉仕",
    eventDate: "2026-07-12",
    venue: "本殿",
    deadline: "2026-06-25",
    capacity: 300,
    status: "published",
    baseFee: 3000,
    formName: "元旦祭 申込フォーム",
    fields: [
      mealField,
      {
        id: "f-bus",
        label: "送迎バス利用人数",
        fieldType: "number",
        required: false,
        priceCalc: "per_unit",
        unitPrice: 500,
      },
    ],
  },
  {
    id: "e2",
    name: "記念大祭 設営奉仕",
    eventDate: "2026-07-12",
    venue: "第二会場",
    deadline: "2026-06-25",
    capacity: 150,
    status: "published",
    formName: "記念大祭 設営フォーム",
    baseFee: 2000,
    fields: [
      {
        id: "f-role",
        label: "希望作業",
        fieldType: "select_single",
        required: true,
        priceCalc: "none",
        options: [
          { id: "r1", label: "設営" },
          { id: "r2", label: "受付補助" },
          { id: "r3", label: "撤収" },
        ],
      },
      {
        id: "f-tshirt",
        label: "スタッフTシャツ",
        fieldType: "select_single",
        required: false,
        priceCalc: "option_based",
        options: [
          { id: "t0", label: "不要", price: 0 },
          { id: "tS", label: "S", price: 1200 },
          { id: "tM", label: "M", price: 1200 },
          { id: "tL", label: "L", price: 1200 },
        ],
      },
    ],
  },
  {
    id: "e3",
    name: "奉仕体験合宿",
    eventDate: "2026-08-03",
    venue: "研修センター",
    deadline: "2026-07-25",
    capacity: 80,
    status: "published",
    formName: "合宿 申込フォーム",
    baseFee: 5000,
    fields: [
      {
        id: "f-night",
        label: "宿泊数",
        fieldType: "number",
        required: true,
        priceCalc: "per_unit",
        unitPrice: 3000,
      },
      {
        id: "f-allergy",
        label: "食物アレルギー",
        fieldType: "textarea",
        required: false,
        priceCalc: "none",
      },
    ],
  },
];

export interface RosterMember {
  participantId: string;
  name: string;
  eventId: string;
  eventName: string;
  status: ParticipantStatus;
  amount: number;
  attendance: AttendanceStatus;
}

export const roster: RosterMember[] = [
  { participantId: "p1", name: "山田 太郎", eventId: "e1", eventName: "元旦祭 奉仕", status: "paid", amount: 3800, attendance: "not_arrived" },
  { participantId: "p2", name: "山田 太郎", eventId: "e2", eventName: "記念大祭 設営奉仕", status: "paid", amount: 2000, attendance: "not_arrived" },
  { participantId: "p3", name: "田中 花子", eventId: "e1", eventName: "元旦祭 奉仕", status: "confirmed", amount: 3000, attendance: "not_arrived" },
  { participantId: "p4", name: "伊藤 次郎", eventId: "e1", eventName: "元旦祭 奉仕", status: "applying", amount: 3000, attendance: "not_arrived" },
  { participantId: "p5", name: "渡辺 三郎", eventId: "e2", eventName: "記念大祭 設営奉仕", status: "paid", amount: 2500, attendance: "checked_in" },
];

/** 「山田 太郎」が当日(2026-07-12)参加する複数イベント（受付デモ用） */
export const checkinDemo = {
  userName: "山田 太郎",
  branch: "東京拠点",
  date: "2026-07-12",
  items: [
    { participantId: "p1", eventName: "元旦祭 奉仕", venue: "本殿", status: "paid" as ParticipantStatus, attendance: "not_arrived" as AttendanceStatus },
    { participantId: "p2", eventName: "記念大祭 設営奉仕", venue: "第二会場", status: "paid" as ParticipantStatus, attendance: "not_arrived" as AttendanceStatus },
  ],
};

export const statusLabel: Record<ParticipantStatus, string> = {
  applying: "申込中",
  confirmed: "確定",
  paid: "支払済",
  cancelled: "キャンセル",
};

export const attendanceLabel: Record<AttendanceStatus, string> = {
  not_arrived: "未受付",
  checked_in: "受付済",
  day_cancelled: "当日キャンセル",
};
