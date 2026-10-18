import type { IIdGenerator } from "@emergency-map/domain/repositories";
import type { FieldCipher } from "@emergency-map/domain/rules";
import { normalizePhone } from "@emergency-map/domain/rules";
import { CONSENT_VERSION } from "@emergency-map/domain/schemas";
import type { RegisterSubscriberInput, Subscriber } from "@emergency-map/domain/schemas";
import { err, ok, type DomainError } from "@emergency-map/domain/types";
import type { MessagingDeps } from "./deps";

export async function registerSubscriber(
  deps: MessagingDeps,
  input: RegisterSubscriberInput,
): Promise<{ data: Subscriber | null; error: DomainError | null }> {
  if (!input.consentAccepted || !input.adultConfirmed) {
    return err({
      kind: "validation",
      field: "consent",
      message: "Sin consentimiento explícito de una persona mayor de edad no se registra.",
    });
  }

  const phone = normalizePhone(input.phone);
  if (!phone.ok) return err({ kind: "validation", field: "phone", message: phone.reason });

  let districtName = input.districtName.trim();
  let ubigeo = input.ubigeo?.trim() || null;
  if (input.point) {
    const district = await deps.territories.findDistrictAt(input.point);
    if (district) {
      districtName = district.name;
      ubigeo = district.ubigeo;
    }
  }
  if (districtName.length < 2) {
    return err({
      kind: "validation",
      field: "district",
      message: "Indica el distrito de tu hogar.",
    });
  }

  const now = deps.clock.now();
  const row: Subscriber = {
    id: deps.ids.next("sub"),
    userId: input.userId,
    phoneHash: await deps.cipher.hashPhone(phone.phone.e164),
    phoneCiphertext: await deps.cipher.encrypt(phone.phone.e164),
    verificationStatus: "pending",
    verifiedAt: null,
    homeDistrictName: districtName,
    homeUbigeo: ubigeo,
    consentVersion: CONSENT_VERSION,
    consentAt: now,
    notificationsEnabled: true,
    optedOutAt: null,
    erasureDueAt: null,
    windowOpenedAt: null,
    lastHomeLevel: null,
    lastHomeNoticeId: null,
    lastInformedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const inserted = await deps.store.insertSubscriber(row);
  if (inserted === "phone_taken") {
    return err({ kind: "conflict", message: "Ese teléfono ya está registrado." });
  }
  if (inserted === "user_taken") {
    return err({ kind: "conflict", message: "Esta cuenta ya tiene un teléfono." });
  }
  deps.log.info("subscriber_registered");
  return ok(row);
}

export async function readPhone(cipher: FieldCipher, subscriber: Subscriber): Promise<string> {
  return cipher.decrypt(subscriber.phoneCiphertext);
}

export function nextId(ids: IIdGenerator, prefix: string): string {
  return ids.next(prefix);
}
