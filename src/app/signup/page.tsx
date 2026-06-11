import { getDepartmentNames } from "@/lib/queries/departments";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  // 部署マスタ（DB）から選択肢を取得。未ログインでも RLS の select ポリシーで閲覧可。
  const departments = await getDepartmentNames();
  return <SignupForm departments={departments} />;
}
