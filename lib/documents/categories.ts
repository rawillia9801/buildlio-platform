// FILE: lib/documents/categories.ts
//
// CHANGELOG
// - v1.0
//   * Category cards shown on Documents home

export type DocCategoryKey = "letter" | "legal" | "contracts" | "policies" | "business";

export const DOC_CATEGORIES: Array<{
  key: DocCategoryKey;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: "letter",
    title: "Letters",
    description: "Personal or business letters: demand, apology, follow-up, reference, notices, and more.",
    icon: "✉️",
  },
  {
    key: "legal",
    title: "Legal Motions",
    description: "State + county specific court filings with searchable motion library and fillable fields.",
    icon: "⚖️",
  },
  {
    key: "contracts",
    title: "Contracts",
    description: "Agreements, bill of sale, guarantees, service contracts, terms and conditions, addendums.",
    icon: "📄",
  },
  {
    key: "policies",
    title: "Policies & Packets",
    description: "Policies, packets, handbooks, procedures, and printable client-facing documents.",
    icon: "📚",
  },
  {
    key: "business",
    title: "Business Docs",
    description: "Invoices, receipts, payment plans, forms, internal memos, notices, and operational docs.",
    icon: "🏢",
  },
];