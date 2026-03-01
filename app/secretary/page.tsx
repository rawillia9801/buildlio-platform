// FILE: app/page.tsx
import { AppShell } from "@/components/ops/Appshell";
import { DailyOpsPage } from "@/components/ops/pages/DailyOpsPage";

export default function Page() {
  return (
    <AppShell>
      <DailyOpsPage />
    </AppShell>
  );
}
