import { describe, expect, it, vi } from "vitest";
import {
  createSenamhiNoticesSource,
  isRainNotice,
  parseSenamhiNotices,
  sortByLevel,
} from "./senamhi";

const LIST_HTML = `
<table><tr><th>Aviso</th></tr><tr>
<td  class="vigente"><a href="./?p=aviso-meteorologico-vigente&a=2026&b=29267&c=00&d=SENA">PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE</td>
<td  class="vigente"><a href="./?p=aviso-meteorologico-vigente&a=2026&b=29267&c=00&d=SENA">421 (vigente) </td>
<td  class="vigente">2026-10-15</td>
<td  class="vigente">2026-10-17</td>
<td  class="vigente">2026-10-19</td>
<td  class="vigente">71 Hrs. </td>
<td  class="vigente"><span class="tres">NARANJA</span></td>
</tr><tr>
<td  class="vigente"><a href="./?p=aviso-meteorologico-vigente&a=2026&b=29265&c=00&d=SENA">INCREMENTO DE TEMPERATURA DIURNA EN LA COSTA  Y SIERRA</td>
<td  class="vigente"><a href="./?p=aviso-meteorologico-vigente&a=2026&b=29265&c=00&d=SENA">419 (vigente) </td>
<td  class="vigente">2026-10-15</td>
<td  class="vigente">2026-10-17</td>
<td  class="vigente">2026-10-19</td>
<td  class="vigente">71 Hrs. </td>
<td  class="vigente"><span class="cuatro">ROJO</span></td>
</tr><tr>
<td ><a href="./?p=aviso-meteorologico-detalle&a=2026&b=29264&c=00&d=SENA">INCREMENTO DE VIENTO EN LA COSTA (EXTENSI&Oacute;N DEL AVISO 411)</td>
<td ><a href="./?p=aviso-meteorologico-detalle&a=2026&b=29264&c=00&d=SENA">418 </td>
<td >2026-10-14</td>
<td >2026-10-17</td>
<td >2026-10-17</td>
<td >23 Hrs. </td>
<td ><span class="dos">AMARILLO</span></td>
</tr></table>`;

describe("SENAMHI notices parser", () => {
  it("keeps only the rows SENAMHI marks as current, with the issuer's own level", () => {
    const notices = parseSenamhiNotices(LIST_HTML);

    expect(notices).toHaveLength(2);
    expect(notices[0]).toEqual({
      number: "421",
      title: "PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE",
      level: "naranja",
      issuedOn: "2026-10-15",
      validFrom: "2026-10-17",
      validTo: "2026-10-19",
      url: "https://www.senamhi.gob.pe/?p=aviso-meteorologico-vigente&a=2026&b=29267&c=00&d=SENA",
    });
  });

  it("selects rain notices only, highest level first", () => {
    const notices = parseSenamhiNotices(LIST_HTML);

    expect(notices.filter(isRainNotice).map((notice) => notice.number)).toEqual(["421"]);
    expect(sortByLevel(notices).map((notice) => notice.level)).toEqual(["rojo", "naranja"]);
  });

  it("returns nothing when the markup does not match instead of guessing", () => {
    expect(parseSenamhiNotices("<html><body>Mantenimiento</body></html>")).toEqual([]);
  });

  it("reports the source as unavailable when SENAMHI fails", async () => {
    const down = createSenamhiNoticesSource(vi.fn(async () => new Response("", { status: 503 })));
    const offline = createSenamhiNoticesSource(
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );

    await expect(down.listCurrent()).resolves.toMatchObject({ available: false });
    await expect(offline.listCurrent()).resolves.toMatchObject({
      available: false,
      reason: "SENAMHI no respondió: timeout",
    });
  });

  it("returns the parsed notices when SENAMHI answers", async () => {
    const source = createSenamhiNoticesSource(vi.fn(async () => new Response(LIST_HTML)));

    const result = await source.listCurrent();

    expect(result.available).toBe(true);
    expect(result.available && result.notices.map((notice) => notice.number)).toEqual([
      "421",
      "419",
    ]);
  });
});
