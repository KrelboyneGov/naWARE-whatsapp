import { describe, expect, it } from "vitest";
import { departmentZones, noticeMayCoverDepartment, noticeZones } from "../notice-zones";

describe("SENAMHI notice zones", () => {
  it("reads directions that follow each region", () => {
    expect(
      noticeZones("INCREMENTO DE VIENTO EN LA COSTA CENTRO Y SUR Y SIERRA SUR").sort(),
    ).toEqual(["costa centro", "costa sur", "sierra sur"]);
    expect(noticeZones("PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE").sort()).toEqual([
      "costa norte",
      "sierra norte",
    ]);
  });

  it("treats a region without direction as the whole region", () => {
    expect(noticeZones("INCREMENTO DE TEMPERATURA DIURNA EN LA COSTA Y SIERRA")).toHaveLength(6);
  });

  it("maps departments, with or without accents and prefixes", () => {
    expect(departmentZones("Arequipa")).toEqual(["costa sur", "sierra sur"]);
    expect(departmentZones("Departamento de Junín")).toEqual(["sierra centro", "selva centro"]);
    // Open-Meteo returns these admin1 names for Lima and Cusco.
    expect(departmentZones("Provincia de Lima")).toEqual(["costa centro", "sierra centro"]);
    expect(departmentZones("Departamento de Cusco")).toEqual(["sierra sur", "selva sur"]);
    expect(departmentZones("Atlantis")).toEqual([]);
  });

  it("marks which notices may cover a place", () => {
    const southWind = "INCREMENTO DE VIENTO EN LA COSTA CENTRO Y SUR Y SIERRA SUR";
    const northRain = "PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE";
    expect(noticeMayCoverDepartment(southWind, "Arequipa")).toBe(true);
    expect(noticeMayCoverDepartment(northRain, "Arequipa")).toBe(false);
    expect(noticeMayCoverDepartment(northRain, "Piura")).toBe(true);
    expect(noticeMayCoverDepartment(northRain, null)).toBe(false);
  });
});
