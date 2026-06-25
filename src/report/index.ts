import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import type { ReportInput } from "./types.js";

export type ReportFormat = "md" | "json";

export function renderReport(report: ReportInput, format: ReportFormat): string {
  return format === "json" ? renderJson(report) : renderMarkdown(report);
}

export { renderJson } from "./json.js";
export { renderMarkdown } from "./markdown.js";
export type { ReportInput } from "./types.js";
