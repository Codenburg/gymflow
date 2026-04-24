import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, isAdmin } from "@/lib/auth";
import { getTrainers } from "@/app/actions/trainers";
import { TrainerManager } from "@/components/admin/trainer-manager";

// Only ADMIN can access this page. TRAINER is redirected to /admin/rutinas.
export default async function TrainersAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) redirect("/admin/rutinas");

  const trainers = await getTrainers();

  return <TrainerManager initialTrainers={trainers} />;
}