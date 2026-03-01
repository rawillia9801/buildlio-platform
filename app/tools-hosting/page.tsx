// FILE: app/secretary/page.tsx
import { AppShell } from "@/components/ops/Appshell";
import { SecretaryPage } from "@/components/ops/pages/SecretaryPage";

export default function Page() {
  return (
    <AppShell>
      <SecretaryPage />
    </AppShell>
  );
}