import { getDepartments } from "@/lib/queries/departments";
import { DepartmentsClient } from "./DepartmentsClient";

export default async function AdminDepartmentsPage() {
  const departments = await getDepartments();
  return (
    <DepartmentsClient
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
    />
  );
}
