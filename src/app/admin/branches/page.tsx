import { getBranches, getRepresentativeCandidates } from "@/lib/queries/branches";
import { BranchesClient } from "./BranchesClient";

export default async function AdminBranchesPage() {
  const [branches, candidates] = await Promise.all([
    getBranches(),
    getRepresentativeCandidates(),
  ]);

  return (
    <BranchesClient
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        representative_user_id: b.representative_user_id,
        representativeName: b.representativeName,
      }))}
      candidates={candidates}
    />
  );
}
