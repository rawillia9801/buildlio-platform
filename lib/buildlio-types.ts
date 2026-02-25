// lib/buildlio-types.ts

export type BuildChoice = "website" | "agent" | "store" | "document" | "app" | "other";

export type BuildlioMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};
