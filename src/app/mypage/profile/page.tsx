import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { getMyProfile } from "@/lib/queries/me";
import { getBranches } from "@/lib/queries/branches";
import { getDepartmentNames } from "@/lib/queries/departments";
import { getCurrentUser } from "@/lib/supabase/server";
import { ProfileCard } from "../ProfileCard";
import { ChangePasswordCard } from "../ChangePasswordCard";
import { HeroImageCard } from "../HeroImageCard";

export default async function ProfileEditPage() {
  const [user, profile, branches, departmentOptions] = await Promise.all([
    getCurrentUser(),
    getMyProfile(),
    getBranches(),
    getDepartmentNames(),
  ]);
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <Link
        href="/mypage"
        className="mb-3 inline-flex items-center gap-1 text-body-sm text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft size={16} /> マイページに戻る
      </Link>

      <PageHeader title="プロフィール編集" description="登録情報とパスワードを変更できます。" />

      <div className="max-w-2xl space-y-4">
        <ProfileCard
          name={profile?.name ?? ""}
          division={profile?.division ?? ""}
          department={profile?.department ?? ""}
          departmentOptions={departmentOptions}
          branchId={profile?.branch_id ?? ""}
          branches={branchOptions}
          email={user?.email ?? "—"}
        />
        {user && <HeroImageCard userId={user.id} currentUrl={profile?.hero_image_url ?? null} />}
        <ChangePasswordCard email={user?.email ?? ""} />
      </div>
    </>
  );
}
