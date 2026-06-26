import type { ToolEffects } from "../schemas/inventory.js";

export interface Classification {
  effects: ToolEffects;
  confidence: "high" | "medium" | "low";
  rationale: string;
}

// Verb lexicons. A tool name is the strongest signal an MCP server gives about
// what a tool does, far stronger than its free-text description.
const READ_VERBS = new Set([
  "get",
  "list",
  "read",
  "fetch",
  "search",
  "query",
  "describe",
  "show",
  "view",
  "count",
  "status",
  "info",
  "stat",
  "find",
  "lookup",
  "ls",
  "cat",
  "head",
  "tail",
  "peek",
  "inspect",
  "summary",
  "report",
  "resolve",
  "explain",
  "check",
  "validate",
  "preview",
]);
const WRITE_VERBS = new Set([
  "create",
  "update",
  "delete",
  "remove",
  "set",
  "put",
  "post",
  "add",
  "insert",
  "write",
  "save",
  "edit",
  "modify",
  "patch",
  "rename",
  "move",
  "copy",
  "upload",
  "deploy",
  "install",
  "enable",
  "disable",
  "restart",
  "start",
  "stop",
  "shutdown",
  "kill",
  "drop",
  "truncate",
  "exec",
  "execute",
  "run",
  "invoke",
  "trigger",
  "send",
  "publish",
  "push",
  "register",
  "provision",
  "configure",
  "setup",
  "grant",
  "revoke",
  "lock",
  "unlock",
  "reset",
  "apply",
  "import",
]);
const ACTION_VERBS = new Set([
  "exec",
  "execute",
  "run",
  "invoke",
  "trigger",
  "send",
  "restart",
  "deploy",
  "shutdown",
  "publish",
  "push",
  "start",
  "stop",
  "apply",
  "kill",
]);

const CRED_HINT =
  /(password|passwd|credential|secret|token|api[_-]?key|apikey|oauth|jwt|keystore|saml|ldap|ssh[_-]?key|private[_-]?key|certificate)/i;
const PERSONAL_HINT =
  /(\buser\b|\busers\b|email|person|people|customer|profile|\baccount\b|contact|address|phone|\bpii\b|employee|member)/i;
const NETWORK_HINT =
  /(http|url|\bapi\b|fetch|request|remote|webhook|email|slack|github|gitlab|upload|download|sync|notify|publish|send)/i;

function tokens(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-./]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

/**
 * Heuristically classify a tool's governance effects from its name and
 * description. This produces a DRAFT for a human to review, not a verdict: the
 * confidence flags the tail the classifier is unsure about. tools/list cannot
 * report whether a human approves an invocation (that is a host policy), so
 * humanInTheLoop is always false here and is meant to be set at the deployment
 * level.
 */
export function classifyEffects(
  name: string,
  description: string | undefined,
  serverRemote: boolean,
): Classification {
  const toks = tokens(name);
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const hasWriteVerb = toks.some((token) => WRITE_VERBS.has(token));
  const hasReadVerb = toks.some((token) => READ_VERBS.has(token));
  const hasAction = toks.some((token) => ACTION_VERBS.has(token));

  // A pure read (a read verb and no write/action verb) is read-only. Otherwise
  // a write or action verb means the tool changes state.
  const readOnly = hasReadVerb && !hasWriteVerb && !hasAction;
  const writes = hasWriteVerb && !readOnly;
  const sideEffects = (hasWriteVerb || hasAction) && !readOnly;

  const dataCategories: string[] = [];
  if (CRED_HINT.test(text)) dataCategories.push("credentials");
  if (PERSONAL_HINT.test(text)) dataCategories.push("personal-data");

  const effects: ToolEffects = {
    writes,
    sideEffects,
    externalAccess: serverRemote || NETWORK_HINT.test(text),
    humanInTheLoop: false,
    scope: [],
    dataCategories,
  };

  let confidence: Classification["confidence"];
  let rationale: string;
  if (hasWriteVerb || readOnly) {
    confidence = "high";
    rationale = `matched a ${writes ? "write" : "read"} verb in "${name}"`;
  } else if (hasAction) {
    confidence = "medium";
    rationale = "matched an action verb but no clear read/write verb";
  } else {
    confidence = "low";
    rationale = "no recognised read or write verb; defaulted to read-only, please review";
  }
  return { effects, confidence, rationale };
}
