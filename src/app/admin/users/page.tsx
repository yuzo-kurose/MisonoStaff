import { getAllUsers } from "./actions";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  const users = await getAllUsers();
  return <UsersClient users={users} />;
}
