import { webClientEnvSchema } from "@emergency-map/infra-env";

export const env = webClientEnvSchema.parse(import.meta.env);
