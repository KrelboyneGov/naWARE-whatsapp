# Propuesta: corregir tickets tras el PR #8 (contratos por capas)

Estado: **aplicada el 2026-10-18** con autorización explícita del usuario: «Sí, autorizo aplicar exactamente la propuesta 2026-10-18-correccion-tras-pr8 en NAW-17, NAW-6, NAW-8 y NAW-23». Antes de escribir se releyeron los 4 issues, que no tenían cambios desde las 01:51 UTC. Se aplicó entre las 02:18 y las 02:19 UTC y se verificó por lectura. Limitación: GitHub no respondía, así que no se pudo comprobar si `main` cambió después de e13e555 (fusión del PR #8).

## Motivo

El PR #8 (commit 2eaadec, Cristian, 01:04 UTC) añadió a `packages/domain`:

- `SemaforoCell` y `DistrictLayers`: una capa en un distrito, sin puntuación agregada (ADR 0008).
- `Community`: un grupo al que sumarse.
- `Ingestor<T>`: el puerto genérico para integrar fuentes, con `IngestBatch<T>` e `IngestItem<T>`.

`docs/specs/2026-10-18-domain-contracts.md` mapea los nombres de los tickets a los contratos. La limpieza aplicada entre las 01:35 y las 01:52 UTC se escribió sobre el código anterior a ese PR, así que contiene una afirmación falsa (NAW-17) y referencias a puertos superados (NAW-6, NAW-8, NAW-23).

## Cambios (antes → después)

### NAW-17

- Antes: «… puertos (`IOfficialNoticeImporter`, `IFileStorage`, `IClock`) … Los tipos anteriores (`Incident`, `Benefactor`, `Community`, `SemaforoCell`, `Ingestor<T>`) no existen.»
- Después: «… puertos (`Ingestor<T>`, `IOfficialNoticeImporter`, `IFileStorage`, `IClock`) … El PR #8 (commit 2eaadec) añadió `SemaforoCell` (una capa en un distrito, sin puntuación agregada; ADR 0008), `Community` e `Ingestor<T>`. `Incident`, `Report`, `Benefactor` e `IngestRun` se mapean a contratos existentes (`Event`/`OfficialNotice`, `SubmitReportInput`/`Evidence`, `Organization`/`CollectionPoint`/`Need` e `ImportRun`); ver `docs/specs/2026-10-18-domain-contracts.md`.»

### NAW-6

- «Adaptadores de importación (puerto en `packages/domain`, como `IOfficialNoticeImporter`):» → «Adaptadores `Ingestor<T>` (ADR 0008), uno por fuente y capa:».
- «Entidad destino por definir: `official_notice` no encaja con emergencias históricas.» → «Capas: `official_emergencies` (INDECI) y `historical_exposure` (SIGRID). El almacenamiento de estas capas aún no existe.»

### NAW-8

- «`OfficialNotice` normalizado (adaptador de `IOfficialNoticeImporter`)» → «`OfficialNotice` normalizado (un `Ingestor<T>` por fuente, capa `official_notices`; Sutran en la capa `road_status`)».

### NAW-23

- «Puerto `IOrganizationImporter` en `packages/domain` y caso de uso `importOrganizations` …» → «Un `Ingestor<T>` por fuente (ADR 0008) y caso de uso `importOrganizations` …».
