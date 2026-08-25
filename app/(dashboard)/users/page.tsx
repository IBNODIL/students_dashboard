import { requireAdmin } from "@/lib/permission";
import { UsersClient } from "../_components/users-client";

export default async function UsersPage() {
  const session = await requireAdmin();
  return (
    <UsersClient
      callerRole={session.user.role as string}
      callerId={session.user.id}
    />
  );
}