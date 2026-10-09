import { config } from "./config";

export type Mail = { to: string; subject: string; text: string; kind: string };

export interface Mailer {
  readonly mode: "resend" | "console" | "memory";
  send(mail: Mail): Promise<{ ok: boolean; error?: string }>;
}

export const consoleMailer: Mailer = {
  mode: "console",
  async send(mail) {
    console.info(`\n[email:${mail.kind}] to=${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return { ok: true };
  },
};

export function resendMailer(apiKey: string, from: string): Mailer {
  return {
    mode: "resend",
    async send(mail) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/** Captures mail instead of sending it. Used by tests. */
export function memoryMailer(): Mailer & { outbox: Mail[] } {
  const outbox: Mail[] = [];
  return {
    mode: "memory",
    outbox,
    async send(mail) {
      outbox.push(mail);
      return { ok: true };
    },
  };
}

export function defaultMailer(): Mailer {
  return config.resendApiKey ? resendMailer(config.resendApiKey, config.emailFrom) : consoleMailer;
}
