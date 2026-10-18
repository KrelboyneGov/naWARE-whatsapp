# Propuesta: sismos (IGP/CENSIS) y contexto de calor/UV (Open-Meteo)

Estado: **autorizada en el chat el 2026-10-17, pero sin aplicar**. Este archivo no modifica la
matriz vigente (`01-matriz.md`, v0.3) ni Linear.

## Por qué sigue pendiente

- El usuario respondió «autorizo» a la alerta preparada sobre la v0.2. Antes de aplicarla, la
  matriz pasó a v0.3: D-06 cambió de texto y D-09 se actualizó. Según la skill, una base
  cambiada exige mostrar la diferencia nueva y pedir autorización otra vez.
- El conector de Linear de la sesión está en el workspace **NIWAY**, no en naWARE. La skill
  prohíbe escribir en otro workspace. Linear se actualiza primero y la copia local después, así
  que la copia local tampoco se tocó.

## Cambios propuestos (base v0.3)

| ID   | Valor vigente (v0.3)                                                                                                                                                                                                         | Valor propuesto                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-04 | Amenaza: lluvias (avisos de SENAMHI cruzados con SIGRID, INDECI y Sutran). Distrito piloto: **pendiente**                                                                                                                    | Amenaza: lluvias (avisos de SENAMHI cruzados con SIGRID, INDECI y Sutran). Además: sismos de IGP/CENSIS como capa informativa, y calor y radiación UV como contexto sin semáforo propio. Distrito piloto: **pendiente** (Chorrillos se usa como ejemplo del seed de desarrollo) |
| D-06 | SENAMHI (…), Sutran (…), INDECI (ODbL), SIGRID; directorio de ayuda: APCI (…) y MIMP (…), por verificar en NAW-22. OSM solo como mapa base, sin importar lugares. No raspar Google Maps. Koru queda fuera del alcance actual | El mismo texto, más: «IGP/CENSIS (API JSON pública, verificada el 2026-10-17; licencia sin verificar). Open-Meteo también para temperatura, sensación térmica y UV (modelo, no oficial)»                                                                                        |

## Motivo e impacto

- Los sismos son la otra gran emergencia del país. CENSIS tiene una API sin key; el detalle
  está en `docs/integrations/igp-censis.md`. El poller lo construye el backend (D-07: ingesta).
- El usuario pidió la temperatura con una explicación, no solo el número. La tarjeta dice que es
  un modelo y no un aviso oficial (ADR 0008: capa `forecast`).
- No cambia los responsables.

## Para aplicar

1. Conectar el conector de Linear al workspace naWARE.
2. Mostrar esta tabla y obtener una autorización humana sobre la base v0.3.
3. Publicar en el documento 7 de Linear, leerlo de vuelta y recién entonces actualizar
   `01-matriz.md`.
