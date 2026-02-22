// FILE: lib/documents/motions.ts
//
// CHANGELOG
// - v1.0
//   * Starter motion template list (expand endlessly)
//   * Supports state/county targeting + tags + court type
//
// NOTE
// - This is a starter dataset so the UI works immediately.
// - Later you’ll store these in Supabase as "document_templates" and query by state/county/court.

export type MotionTemplate = {
  id: string;
  title: string;
  category: "Civil" | "Family" | "Criminal" | "Juvenile" | "General";
  courtType: "Circuit Court" | "General District Court" | "Juvenile & Domestic Relations" | "Any";
  state: "ALL" | "VA" | "TN" | "NC" | "WV" | "KY";
  county: "ALL" | string;
  tags: string[];
};

export const MOTIONS: MotionTemplate[] = [
  // GENERAL / COMMON
  {
    id: "mtn_continuance_all_any",
    title: "Motion for Continuance",
    category: "General",
    courtType: "Any",
    state: "ALL",
    county: "ALL",
    tags: ["continuance", "reschedule", "hearing", "court date"],
  },
  {
    id: "mtn_withdraw_counsel_all_any",
    title: "Motion to Withdraw as Counsel",
    category: "General",
    courtType: "Any",
    state: "ALL",
    county: "ALL",
    tags: ["withdraw", "attorney", "representation"],
  },
  {
    id: "mtn_show_cause_all_any",
    title: "Motion for Rule to Show Cause (Contempt)",
    category: "General",
    courtType: "Any",
    state: "ALL",
    county: "ALL",
    tags: ["contempt", "show cause", "enforcement", "violation"],
  },

  // FAMILY
  {
    id: "mtn_temp_custody_va_all_jdr",
    title: "Motion for Temporary Custody",
    category: "Family",
    courtType: "Juvenile & Domestic Relations",
    state: "VA",
    county: "ALL",
    tags: ["custody", "temporary", "children", "emergency"],
  },
  {
    id: "mtn_modify_support_va_all_jdr",
    title: "Motion to Modify Child Support",
    category: "Family",
    courtType: "Juvenile & Domestic Relations",
    state: "VA",
    county: "ALL",
    tags: ["child support", "modify", "income change"],
  },
  {
    id: "mtn_visitation_va_all_jdr",
    title: "Motion to Establish/Modify Visitation",
    category: "Family",
    courtType: "Juvenile & Domestic Relations",
    state: "VA",
    county: "ALL",
    tags: ["visitation", "schedule", "parenting time"],
  },

  // CIVIL
  {
    id: "mtn_compel_discovery_va_all_circuit",
    title: "Motion to Compel Discovery",
    category: "Civil",
    courtType: "Circuit Court",
    state: "VA",
    county: "ALL",
    tags: ["discovery", "compel", "interrogatories", "production"],
  },
  {
    id: "mtn_default_judgment_va_all_gdc",
    title: "Motion for Default Judgment",
    category: "Civil",
    courtType: "General District Court",
    state: "VA",
    county: "ALL",
    tags: ["default", "judgment", "no response", "failure to appear"],
  },

  // COUNTY-SPECIFIC EXAMPLES (to prove the filter works)
  {
    id: "mtn_special_set_va_smyth_circuit",
    title: "Motion to Set for Hearing (Local Practice)",
    category: "Civil",
    courtType: "Circuit Court",
    state: "VA",
    county: "Smyth",
    tags: ["hearing", "set", "docket", "local"],
  },
  {
    id: "mtn_special_set_va_washington_circuit",
    title: "Motion to Set for Hearing (Local Practice)",
    category: "Civil",
    courtType: "Circuit Court",
    state: "VA",
    county: "Washington",
    tags: ["hearing", "set", "docket", "local"],
  },

  // PROTECTIVE / SAFETY
  {
    id: "mtn_protective_order_va_all_jdr",
    title: "Motion / Petition for Protective Order (Starter)",
    category: "Family",
    courtType: "Juvenile & Domestic Relations",
    state: "VA",
    county: "ALL",
    tags: ["protective order", "restraining", "safety"],
  },
];