import { implement, ORPCError } from "@orpc/server";
import { registerSubscriber } from "@emergency-map/application";
import { onboardingContract } from "../../contract/onboarding.contract";
import { authMiddleware } from "../../middleware/auth";
import { getMessagingDeps, messagingConfigurationError } from "../../lib/messaging";
import { domainErrorToOrpc } from "../../lib/result-to-orpc";

const impl = implement(onboardingContract).$context<{ headers: Headers }>();

export const onboardingRouter = impl.router({
  register: impl.register.use(authMiddleware).handler(async ({ input, context }) => {
    if (messagingConfigurationError()) {
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "El registro de WhatsApp no está configurado.",
      });
    }
    const result = await registerSubscriber(getMessagingDeps(), {
      userId: context.user.id,
      phone: input.phone,
      districtName: input.districtName,
      ubigeo: input.ubigeo,
      point: input.point,
      consentAccepted: input.consentAccepted,
      adultConfirmed: input.adultConfirmed,
    });
    if (result.error || !result.data) {
      throw result.error
        ? domainErrorToOrpc(result.error)
        : new ORPCError("INTERNAL_SERVER_ERROR", { message: "No se pudo registrar." });
    }
    const row = result.data;
    return {
      data: {
        id: row.id,
        homeDistrictName: row.homeDistrictName,
        verificationStatus: row.verificationStatus,
        consentVersion: row.consentVersion,
      },
      error: null,
    };
  }),
});
