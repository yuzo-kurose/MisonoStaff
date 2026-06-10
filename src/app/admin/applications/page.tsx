import { getAdminApplications } from "@/lib/queries/applications";
import { AdminApplicationsClient } from "./AdminApplicationsClient";

export default async function AdminApplicationsPage() {
  const rows = await getAdminApplications();
  return <AdminApplicationsClient rows={rows} />;
}
