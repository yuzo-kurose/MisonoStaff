import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { getParticipantForEdit } from "../../actions";
import { RepEditClient } from "./RepEditClient";

export default async function RepEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getParticipantForEdit(id);

  if (!data) {
    return (
      <>
        <Alert variant="error">
          編集できる申込が見つかりません（権限がないか、削除された可能性があります）。
          <Link href="/rep/roster" className="ml-1 text-link underline">
            申込名簿へ戻る
          </Link>
        </Alert>
      </>
    );
  }

  return <RepEditClient data={data} />;
}
