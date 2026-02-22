// FILE: app/(app)/documents/page.tsx
//
// CHANGELOG
// - v1.0
//   * Documents home screen (white UI)
//   * Typewriter prompt
//   * Category tiles with "rise-from-water" animation
//   * Legal -> state/county + searchable motions list (client-side data)
//
// NOTES
// - This page assumes auth is already enforced by your middleware/layout.
// - Pure UI + local dataset for now; later you can fetch motions/templates from Supabase.

import DocumentBuilderHome from "@/components/documents/DocumentBuilderHome";

export default function DocumentsPage() {
  return (
    <main className="min-h-screen bg-white">
      <DocumentBuilderHome />
    </main>
  );
}