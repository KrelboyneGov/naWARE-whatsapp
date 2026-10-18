import { implement } from "@orpc/server";
import { listDataSources } from "@emergency-map/application";
import { sourcesContract } from "../../contract/sources.contract";
import type { AppContext } from "../../lib/actor";
import { sourcesDeps } from "../../lib/container";
import { toEnvelope } from "../../lib/result-to-orpc";

const impl = implement(sourcesContract).$context<AppContext>();

export const sourcesRouter = impl.router({
  list: impl.list.handler(async () => toEnvelope(await listDataSources(sourcesDeps))),
});
