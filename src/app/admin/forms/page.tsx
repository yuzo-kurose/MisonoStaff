import { redirect } from "next/navigation";

// フォーム管理はイベント管理に統合。各イベント行の「フォーム」から編集する。
// 旧URL /admin/forms はイベント管理へ転送する（フォーム編集自体は /admin/forms/[eventId]）。
export default function FormsListPage() {
  redirect("/admin/events");
}
