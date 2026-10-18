import type { NotificationJob, Subscriber } from "@emergency-map/domain/schemas";
import { maskPhone } from "@emergency-map/domain/rules";
import type { MessagingDeps } from "./deps";

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];

export async function dispatchDue(deps: MessagingDeps, limit = 20): Promise<number> {
  const now = deps.clock.now();
  const jobs = await deps.store.pullDue(now, limit);
  let sent = 0;

  for (const job of jobs) {
    const subscriber = await deps.store.findSubscriberById(job.subscriberId);
    if (!subscriber) {
      await fail(deps, job, "subscriber_missing", true);
      continue;
    }
    if (job.purpose === "follow_up" && !subscriber.notificationsEnabled) {
      await fail(deps, job, "opt_out", true);
      continue;
    }

    if (job.mode === "template" && !deps.templatesEnabled) {
      await fail(
        deps,
        job,
        "can_send_templates_false: el sender de WhatsApp no tiene el pago de plantillas habilitado. No se reintenta.",
        true,
      );
      continue;
    }

    const phone = await deps.cipher.decrypt(subscriber.phoneCiphertext);
    if (phone.startsWith("erased:")) {
      await fail(deps, job, "phone_erased", true);
      continue;
    }

    const result =
      job.mode === "template" && job.templateName && job.variables
        ? await deps.notifications.sendTemplate({
            to: phone,
            templateName: job.templateName,
            variables: job.variables,
          })
        : await deps.notifications.sendText({ to: phone, text: job.body });

    if (result.status === "sent") {
      job.status = "sent";
      job.sentAt = now;
      job.attempts += 1;
      job.lastError = null;
      await deps.store.saveJob(job);
      sent += 1;
      deps.log.info(`whatsapp_sent ${maskPhone(phone)} ${job.mode}`);
      continue;
    }

    const terminal = result.terminal || job.attempts + 1 >= deps.maxAttempts;
    await fail(deps, job, `${result.code}: ${result.message}`, terminal);
    deps.log.error(maskPhone(phone) + " " + result.code);
  }

  return sent;
}

async function fail(
  deps: MessagingDeps,
  job: NotificationJob,
  error: string,
  terminal: boolean,
): Promise<void> {
  const attempts = job.attempts + 1;
  const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)] ?? 60_000;
  const next: NotificationJob = {
    ...job,
    attempts,
    lastError: error,
    terminal,
    status: terminal ? "failed" : "queued",
    nextAttemptAt: new Date(deps.clock.now().getTime() + delay),
  };
  await deps.store.saveJob(next);
}

export function isWindowOpen(subscriber: Subscriber, now: Date): boolean {
  if (!subscriber.windowOpenedAt) return false;
  return now.getTime() - subscriber.windowOpenedAt.getTime() < 24 * 60 * 60 * 1000;
}
