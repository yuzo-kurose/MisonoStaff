import { createClient } from "@/lib/supabase/server";
import { getPublishedEvents } from "@/lib/queries/events";
import { EventsClient, type EventListItem } from "./EventsClient";

export default async function EventsPage() {
  const events = await getPublishedEvents();

  // 参加費（最低額）をフォーム定義から算出する。
  //  - option_based：その項目の最安選択肢の価格（なし=0 等）
  //  - per_unit：数量0を想定し 0
  const supabase = await createClient();
  const formIds = [...new Set(events.map((e) => e.form_id))];
  let fields: { id: string; form_id: string; price_calc_type: string }[] = [];
  let opts: { form_field_id: string; price: number | null }[] = [];
  if (formIds.length) {
    const { data: fd } = await supabase
      .from("form_fields")
      .select("id,form_id,price_calc_type")
      .in("form_id", formIds);
    fields = (fd ?? []) as unknown as typeof fields;
    const fieldIds = fields.map((f) => f.id);
    if (fieldIds.length) {
      const { data: od } = await supabase
        .from("form_field_options")
        .select("form_field_id,price")
        .in("form_field_id", fieldIds);
      opts = (od ?? []) as unknown as typeof opts;
    }
  }
  const minFee = (formId: string) => {
    let sum = 0;
    for (const f of fields.filter((x) => x.form_id === formId && x.price_calc_type === "option_based")) {
      const prices = opts.filter((o) => o.form_field_id === f.id).map((o) => o.price ?? 0);
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

  return <EventsClient events={items} />;
}
