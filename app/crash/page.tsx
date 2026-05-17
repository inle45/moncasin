import CrashPageClient from "./CrashPageClient";
import { fetchCrashSnapshotServer } from "@/utils/crash/server-loop";

export const dynamic = "force-dynamic";

export default async function CrashPage() {
  const initialSnapshot = await fetchCrashSnapshotServer();

  return <CrashPageClient initialSnapshot={initialSnapshot} />;
}
