import { requireAdmin } from "@/lib/permission";

interface UserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserPage({ params }: UserPageProps) {
  await requireAdmin();

  const { id } = await params;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">User</h1>
      <p className="mt-1 text-sm text-slate-500">
        User ID: {id}
      </p>  
    </div>
  );
}
