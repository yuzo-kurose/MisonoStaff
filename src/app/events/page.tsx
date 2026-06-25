import { createClient } from "@/lib/supabase/server";
import { getPublishedEvents } from "@/lib/queries/events";
import { getMyExistingApplications } from "./apply/actions";
import { EventsClient, type EventListItem } from "./EventsClient";

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const formIds = [...new Set(events.map((e) => e.form_id))];

  // 申込済み状態の取得と、参加費算出用のフォーム定義取得は互いに独立なので並列化する。
  // フォーム項目と選択肢はネスト取得（1往復）でまとめる。
  const supabase = await createClient();
  const [existing, formData] = await Promise.all([
    getMyExistingApplications(events.map((e) => e.id)),
    formIds.length
      ? supabase
          .from("form_fields")
          .select("form_id,price_calc_type,form_field_options(price)")
          .in("form_id", formIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // 申込済み状態（イベントID→状態）。取消は除外済み（getMyExistingApplications）。
  const appliedStatus: Record<string, string> = {};
  for (const [eventId, app] of Object.entries(existing)) appliedStatus[eventId] = app.status;

  // 参加費（最低額）をフォーム定義から算出する。
  //  - option_based：その項目の最安選択肢の価格（なし=0 等）
  //  - per_unit：数量0を想定し 0
  const fields = (formData.data ?? []) as unknown as {
    form_id: string;
    price_calc_type: string;
    form_field_options: { price: number | null }[];
  }[];
  const minFee = (formId: string) => {
    let sum = 0;
    for (const f of fields.filter((x) => x.form_id === formId && x.price_calc_type === "option_based")) {
      const prices = (f.form_field_options ?? []).map((o) => o.price ?? 0);
      if (prices.length) sum += Math.min(...prices);
    }
    return sum;
  };

  const items: EventListItem[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    eventDate: e.event_date,
    startDate: e.start_date,
    venue: e.venue,
    deadline: e.application_deadline,
    capacity: e.capacity,
    fee: minFee(e.form_id),
    category: "神苑スタッフ",
  }));

  return <EventsClient events={items} appliedStatus={appliedStatus} />;
}
