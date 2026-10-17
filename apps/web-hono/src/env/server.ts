import { webServerEnvSchema } from "@emergency-map/infra-env";

export const env = webServerEnvSchema.parse(process.env);
