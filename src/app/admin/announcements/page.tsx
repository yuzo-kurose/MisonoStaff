import { PageHeader } from "@/components/ui/Card";
import { getAllAnnouncements } from "@/lib/queries/announcements";
import { AnnouncementsClient } from "./AnnouncementsClient";

export default async function AdminAnnouncementsPage() {
  const items = await getAllAnnouncements();

  return (
    <>
      <PageHeader
        title="連絡事項"
        description="ホーム画面に表示するお知らせを作成・編集します。下書きにすると非表示になります。"
      />
      <AnnouncementsClient items={items} />
    </>
  );
}
