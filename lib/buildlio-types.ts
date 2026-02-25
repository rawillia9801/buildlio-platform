export type BuildChoice = "website" | "app" | "document" | "store" | "agent" | "other";
export type BuildType = string;
export type AnySnapshot = Record<string, any>;
export type LogEntry = Record<string, any>;
export type Message = { role: string; content: string; [key: string]: any };
export type Tab = string;
export type UserLite = { id?: string; [key: string]: any };
export type ViewState = string;
