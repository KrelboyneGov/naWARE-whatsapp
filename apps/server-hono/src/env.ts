import { env as cfEnv } from "cloudflare:workers";
import { serverEnvSchema } from "@emergency-map/infra-env";

export const env = serverEnvSchema.parse(cfEnv);
