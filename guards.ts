export type GuardSeverity = "critical" | "error" | "warning" | "info";

export interface GuardError {
  id: string;
  at: string;
  section: string;
  severity: GuardSeverity;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
}

const STORAGE_KEY = "csi.error.log.v1";
const MAX_ENTRIES = 80;

// Messaggi di errore benigni noti: non sono errori reali del codice ma avvisi
// del browser che non richiedono alcuna azione. Non vanno registrati come
// critical, altrimenti inquinano il registro e il finding ERR-RECENT.
// ResizeObserver loop: il browser notifica che un'osservazione resize è stata
// recapitata nel frame successivo; è un avviso, non un'eccezione (spec WHATWG).
const BENIGN_ERROR_PATTERNS: RegExp[] = [
  /ResizeObserver loop completed with undelivered notifications/i,
  /ResizeObserver loop limit exceeded/i,
];

function isBenignError(message: string): boolean {
  return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function serializeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
  } catch {
    return { note: "contesto non serializzabile" };
  }
}

export function listGuardErrors(): GuardError[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuardError[];
    if (!Array.isArray(parsed)) return [];
    // Migrazione: scarta eventuali vecchi entry benigni (es. ResizeObserver loop)
    // registrati prima del filtro, così il registro e i finding ERR-RECENT si
    // svuotano senza richiedere un reset manuale dell'utente.
    const cleaned = parsed.filter((entry) => !isBenignError(entry.message));
    if (cleaned.length !== parsed.length) {
      // Riscrive il registro pulito senza innescare l'evento di cambiamento
      // (la lettura non deve avere effetti collaterali visibili).
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      } catch {
        // storage pieno o non scrivibile: restituisce comunque la lista pulita
      }
    }
    return cleaned;
  } catch {
    return [];
  }
}

function persist(errors: GuardError[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ENTRIES)));
  } catch {
    // lo storage può essere pieno: il registro resta in memoria tramite l'evento
  }
  window.dispatchEvent(new CustomEvent("csi:errors-changed"));
}

export function logGuardError(input: {
  section: string;
  error?: unknown;
  message?: string;
  severity?: GuardSeverity;
  context?: Record<string, unknown>;
}): GuardError | null {
  const error = input.error;
  const message =
    input.message ??
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Errore sconosciuto");

  // Salta gli avvisi benigni noti del browser (es. ResizeObserver loop): non
  // sono errori del codice e non vanno registrati nel registro errori.
  if (isBenignError(message)) return null;

  const report: GuardError = {
    id: makeId(),
    at: new Date().toISOString(),
    section: input.section,
    severity: input.severity ?? "error",
    message,
    stack: error instanceof Error ? error.stack : undefined,
    context: serializeContext(input.context),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  const current = listGuardErrors();
  persist([report, ...current].slice(0, MAX_ENTRIES));
  if (process.env.NODE_ENV !== "production") {
    // aiuta la diagnosi in console senza duplicare i dati nel registro
    console.error(`[guard:${input.section}]`, error ?? message, input.context);
  }
  return report;
}

export function clearGuardErrors(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
  window.dispatchEvent(new CustomEvent("csi:errors-changed"));
}

export function guardSync<T>(section: string, action: () => T, fallback: T): T {
  try {
    return action();
  } catch (error) {
    logGuardError({ section, error, severity: "error" });
    return fallback;
  }
}

export async function guardAsync<T>(section: string, action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    logGuardError({ section, error, severity: "error" });
    return undefined;
  }
}

export function installGlobalGuards(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onError = (event: ErrorEvent) => {
    logGuardError({
      section: "window.error",
      error: event.error ?? event.message,
      severity: "critical",
      context: { filename: event.filename, line: event.lineno, column: event.colno },
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    logGuardError({
      section: "window.unhandledrejection",
      error: event.reason,
      severity: "critical",
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

export function errorsToMarkdown(errors: GuardError[]): string {
  if (!errors.length) return "# Registro errori\n\nNessun errore registrato.\n";
  const lines = ["# Registro errori — C.S.I. Gestionale", "", `Totale: ${errors.length}`, ""];
  for (const error of errors) {
    lines.push(`## [${error.severity.toUpperCase()}] ${error.section} · ${new Date(error.at).toLocaleString("it-IT")}`);
    lines.push("");
    lines.push(error.message);
    if (error.url) lines.push(`- URL: ${error.url}`);
    if (error.context) lines.push(`- Contesto: \`${JSON.stringify(error.context)}\``);
    if (error.stack) {
      lines.push("");
      lines.push("```text");
      lines.push(error.stack);
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadTextFile(content: string, fileName: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
