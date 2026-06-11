/**
 * Supabase スキーマの TypeScript 型（手書き）。
 * 実プロジェクト接続後は `supabase gen types typescript` で自動生成に置き換え可能：
 *   npx supabase gen types typescript --project-id <id> --schema public > src/types/database.ts
 */

// ---------- enum ----------
export type UserRole = "participant" | "representative" | "admin" | "reception";
/** 部（所属組織区分） */
export type Division = "student" | "university" | "adult" | "mens" | "general";
export type AccountStatus = "active" | "inactive";
export type CreatedVia = "self" | "proxy";
export type EnteredVia = "self" | "proxy";
export type EventStatus = "draft" | "published" | "closed";
export type FieldType =
  | "text"
  | "textarea"
  | "select_single"
  | "select_multiple"
  | "number"
  | "date";
export type PriceCalcType = "none" | "per_unit" | "option_based";
export type ApplicationStatus = "open" | "confirmed";
export type ParticipantStatus = "applying" | "confirmed" | "paid" | "cancelled";
export type PaymentMethod = "credit_card" | "paypay";
export type PaymentStatus = "requested" | "completed" | "failed" | "refunded";
export type AttendanceStatus = "not_arrived" | "checked_in" | "day_cancelled";
export type AttendanceMethod = "qr" | "name_search";
export type NotificationType =
  | "application_complete"
  | "payment_request"
  | "payment_reminder"
  | "payment_complete"
  | "cancellation"
  | "refund";
export type NotificationChannel = "email" | "line";
export type NotificationStatus = "sent" | "failed";

// ---------- Row 型 ----------
export interface Profile {
  id: string;
  name: string;
  kana: string;
  role: UserRole;
  division: Division | null;
  department: string | null;
  branch_id: string | null;
  line_user_id: string | null;
  status: AccountStatus;
  created_via: CreatedVia;
  checkin_token: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  representative_user_id: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  name: string;
  start_date: string | null; // 開催初日（受付日）。null は単日（event_date）扱い
  event_date: string; // 開催当日（最終日）
  venue: string | null;
  application_deadline: string;
  capacity: number | null;
  form_id: string;
  status: EventStatus;
  duplicated_from_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventBranch {
  event_id: string;
  branch_id: string;
}

export interface FormField {
  id: string;
  form_id: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  sort_order: number;
  price_calc_type: PriceCalcType;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface FormFieldOption {
  id: string;
  form_field_id: string;
  label: string;
  price: number | null;
  sort_order: number;
}

export interface Application {
  id: string;
  event_id: string;
  branch_id: string;
  status: ApplicationStatus;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  application_id: string;
  user_id: string;
  status: ParticipantStatus;
  total_amount: number;
  entered_via: EnteredVia;
  entered_by_user_id: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantValue {
  id: string;
  participant_id: string;
  form_field_id: string;
  value: string | null;
}

export interface ParticipantValueOption {
  participant_value_id: string;
  form_field_option_id: string;
}

export interface PaymentGroup {
  id: string;
  user_id: string;
  total_amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_group_id: string;
  participant_id: string;
  amount: number;
  status: PaymentStatus;
  refunded_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string | null;
  refunded_by_user_id: string;
  stripe_refund_id: string | null;
  refunded_at: string;
}

export interface Attendance {
  id: string;
  participant_id: string;
  status: AttendanceStatus;
  checked_in_at: string | null;
  received_by_user_id: string | null;
  method: AttendanceMethod | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  participant_id: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  destination: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export type AnnouncementLevel = "important" | "info";
export interface Announcement {
  id: string;
  level: AnnouncementLevel;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- supabase-js 用 Database 型 ----------
type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      branches: TableShape<Branch>;
      forms: TableShape<FormRow>;
      events: TableShape<EventRow>;
      event_branches: TableShape<EventBranch>;
      form_fields: TableShape<FormField>;
      form_field_options: TableShape<FormFieldOption>;
      applications: TableShape<Application>;
      participants: TableShape<Participant>;
      participant_values: TableShape<ParticipantValue>;
      participant_value_options: TableShape<ParticipantValueOption>;
      payment_groups: TableShape<PaymentGroup>;
      payments: TableShape<Payment>;
      refunds: TableShape<Refund>;
      attendances: TableShape<Attendance>;
      notification_logs: TableShape<NotificationLog>;
      audit_logs: TableShape<AuditLog>;
      announcements: TableShape<Announcement>;
    };
    Views: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
    Functions: {
      checkin_candidates: {
        Args: { p_token: string; p_date: string; p_venue?: string };
        Returns: {
          participant_id: string;
          event_id: string;
          event_name: string;
          venue: string | null;
          branch_id: string;
          participant_status: ParticipantStatus;
          attendance_status: AttendanceStatus;
          user_id: string;
          user_name: string;
        }[];
      };
      batch_check_in: {
        Args: { p_participant_ids: string[]; p_method?: AttendanceMethod };
        Returns: number;
      };
      mark_day_cancelled: {
        Args: { p_participant_id: string };
        Returns: undefined;
      };
    };
  };
}
