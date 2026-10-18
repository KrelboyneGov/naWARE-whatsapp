# Propuesta: limpiar referencias al stack anterior en los tickets y fuentes del directorio de ayuda

Estado: **aplicada el 2026-10-18** con autorización explícita del usuario: «Sí, autorizo aplicar exactamente la propuesta 2026-10-18-limpieza-tickets-stack: los 14 tickets y D-06». Los 14 issues se actualizaron entre las 01:35 y las 01:51 UTC, y D-06 a las 01:52:28 UTC; todo se verificó por lectura. Antes de escribir se releyeron los issues: NAW-22 había cambiado a las 01:06 solo por un carácter «|» accidental, que quedó reemplazado por la reescritura autorizada. Además, se añadió una nota de versión en la cabecera del documento 7.

**Corrección pendiente:** el PR #8 (commit 2eaadec, 01:04 UTC) se fusionó antes de estas escrituras y no se revisó. Por eso NAW-17 afirma que `Community`, `SemaforoCell` e `Ingestor<T>` no existen, y NAW-6, NAW-8 y NAW-23 citan puertos que no son el genérico `Ingestor<T>`. Ver `2026-10-18-correccion-tras-pr8.md`.

Base: issues leídos el 2026-10-18 hacia las 01:00 UTC (NAW-5 fue editado por otra persona a las 00:57; se releerá todo antes de escribir). Matriz v0.3 (doc 7, 00:46:41Z). Código de `main` en df52304.

Alcance: solo referencias técnicas (Vercel, Supabase, GitHub Actions, `packages/core|contracts|db`, `apps/web`, `/api/` sin versión, `Ingestor<T>`), más NAW-22, NAW-23 y D-06. **No cambia el producto** (semáforo, alertas, comunidades); esa divergencia con el código sigue pendiente en D-03.

## Equivalencias usadas

| Antes                                    | Después (según el código)                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Vercel                                   | Cloudflare Workers, desplegados con release-please (ADR 0007)               |
| Supabase                                 | Neon + PostGIS (ADR 0003)                                                   |
| Cron de GitHub Actions para las ingestas | Cron Triggers de Cloudflare (+ Queues), según el brief; aún no implementado |
| `packages/contracts`                     | `packages/domain` (zod); contratos HTTP en `apps/server-hono/src/contract`  |
| `packages/core`                          | `packages/application` (lógica pura con tests)                              |
| `packages/db`                            | `packages/infra-db`                                                         |
| Route handlers en `apps/web`             | Procedimientos oRPC en `apps/server-hono`                                   |
| `/api/...`                               | `/api/v1/...`                                                               |
| `Ingestor<T>`                            | Puerto de importación en `packages/domain` (como `IOfficialNoticeImporter`) |

## Cambios por ticket

### NAW-5 (Cristian, Done; el estado no cambia)

- Título: `… + deploy Vercel` → `[Cristian] Monorepo (pnpm + Turborepo) + estructura de paquetes + deploy en Cloudflare Workers`.
- Descripción nueva: «Implementado en csdev19/naWARE a partir de monorepo-template (patrón cliente-servidor Hono): `apps/web-hono` (TanStack Start), `apps/server-hono` (Hono + oRPC), `packages/domain`, `packages/application`, `packages/infra-db`, `packages/infra-auth`, `packages/infra-cloudflare`, `packages/infra-env` y `packages/web-ui`. pnpm + mise (ADR 0002). Los dos Workers se despliegan en Cloudflare con release-please (ADR 0007). **Criterio:** la URL pública abre la app y `pnpm run verify` está en verde.»

### NAW-17 (Cristian): Backlog → Done

- Título: `[Cristian] Contratos compartidos (packages/domain, zod)`.
- Descripción nueva: «Implementado en el commit 9513344: esquemas zod en `packages/domain` (event, evidence, help, review, source, territory y common), interfaces de repositorio y puertos (`IOfficialNoticeImporter`, `IFileStorage`, `IClock`) y dataset de demo. Los contratos HTTP están en `apps/server-hono/src/contract`. Los tipos anteriores (`Incident`, `Benefactor`, `Community`, `SemaforoCell`, `Ingestor<T>`) no existen.»

### NAW-10 (Cristian): estado sin cambios

- Título: `[Cristian] CI/CD (verify + release-please) + Cron Triggers de importación + /estado`.
- Descripción nueva:
  - **Hecho:** `pnpm run verify` (lint, formato, build, tipos y tests) se ejecuta en el pre-push de Lefthook y en los workflows de release (ADR 0001). release-please corta versiones y despliega los dos Workers (ADR 0007). Por decisión del ADR 0001 no hay checks en cada PR.
  - **Pendiente:** Cron Triggers de Cloudflare (con Queues para reintentos) que ejecuten cada importador y escriban en Neon; secretos de Worker publicados con el deploy (`docs/deployment.md`); escaneo de secretos (gitleaks); página `/estado` con la última corrida (`import_run`), los registros y los errores de cada fuente.
  - **Criterio:** una ejecución manual y una programada corren un importador de punta a punta.

### NAW-9 (Camila): parche

- Título: `packages/core` → `packages/application`.
- Descripción: «desde un job de GitHub Actions» → «desde el Cron Trigger de Cloudflare».

### NAW-19 (Camila): parche

- Título: `packages/core` → `packages/application`.
- Descripción: «Sin I/O dentro de `core`» → «Sin I/O (lógica pura en `packages/application`)».

### NAW-20 (Camila): parche

- Título: `/api/incidents y /api/semaforo` → `/api/v1/incidents y /api/v1/semaforo`.
- Descripción: «Route handlers en `apps/web` que leen de `packages/db`: `GET /api/incidents…` y `GET /api/semaforo…`» → «Procedimientos oRPC en `apps/server-hono` que leen por los repositorios de `packages/infra-db`: `GET /api/v1/incidents…` y `GET /api/v1/semaforo…`».
- Descripción: «esquema de base de datos (krelboyne)» → «esquema de base de datos (NAW-21, hecho)».

### NAW-7 (Cristian): parche

- «Mapa (MapLibre/Leaflet) que consume `/api/semaforo` y `/api/incidents`» → «Mapa (MapLibre, componente mapcn de `apps/web-hono`) que consume `/api/v1/semaforo` y `/api/v1/incidents`».

### NAW-25 (Cristian): parche

- `POST /api/subscriptions` → `POST /api/v1/subscriptions`.

### NAW-18 (Cristian): parche

- «de la API de comunidades y reportes de krelboyne» → «de la API de organizaciones y eventos (NAW-24, hecho)».

### NAW-13: parche

- «README con la arquitectura (documento 2) y decisiones» → «README con la arquitectura y las decisiones (`docs/adr/`)».

### NAW-6 (Camila): parche

- «Adaptadores que implementan `Ingestor<Incident>`:» → «Adaptadores de importación (puerto en `packages/domain`, como `IOfficialNoticeImporter`):».
- Al final se añade: «Entidad destino por definir: `official_notice` no encaja con emergencias históricas.»

### NAW-8 (Camila): parche

- «`Incident` normalizado» → «`OfficialNotice` normalizado (adaptador de `IOfficialNoticeImporter`)».

### NAW-22 (krelboyne): reescritura

- Título: `[krelboyne] Fuentes del directorio de ayuda: definir y verificar acceso`.
- Descripción nueva:

> OpenStreetMap no se importa: el mapa solo usa teselas base (Carto) y el código no consulta Overpass. Los lugares de OSM (iglesias, comedores) tampoco encajan en `organization` ni en `collection_point`, que exigen identidad revisada, una organización responsable y un horario.
>
> Fuentes candidatas (sin verificar; comprobar acceso, formato, fecha de corte, licencia y si permiten reutilización):
>
> 1. [Consulta de directorio de la APCI](https://sigcti.apci.gob.pe/InscripcionEntidad/Reporte/EntidadesConsultaDirectorio): buscador por tipo de entidad, nombre y departamento; muestra dirección, contacto y áreas de trabajo.
> 2. [Base de datos de ONGD en Datos Abiertos](https://www.datosabiertos.gob.pe/dataset/base-de-datos-organizaciones-no-gubernamentales-de-desarrollo-ongd-agencia-peruana-de): Excel por trimestre o semestre (se reporta hasta el II semestre de 2025, sin comprobar). Preferible al PDF porque es tabular.
> 3. [Directorio de ONGD en PDF de la APCI (31/10/2025)](https://www.gob.pe/institucion/apci/informes-publicaciones/2192060-ongd-registradas-en-la-apci) y el [compendio de entidades registradas](https://www.gob.pe/institucion/apci/colecciones/1077-reporte-de-entidades-registradas-en-la-agencia-peruana-de-cooperacion-internacional-apci) (ENIEX e IPREDA).
> 4. [Directorio de Sociedades de Beneficencia Pública del MIMP](https://www.gob.pe/institucion/mimp/informes-publicaciones/5006533-directorio-telefonico-de-las-sociedades-de-beneficencias-publicas) (29/05/2025), por provincia.
> 5. [Registro de voluntariado del MIMP](http://www.gob.pe/institucion/mimp/colecciones/20871-organizaciones-inscritas-en-el-registro-de-voluntariado).
>
> **Criterio:** por cada fuente, una muestra real descargada, los campos disponibles (RUC, tipo, ubigeo, contacto), la fecha de corte, los términos de uso y la decisión «usar / descartar». Cada fuente aceptada se registra en `data_source`.

### NAW-23 (krelboyne): reescritura

- Título: `[krelboyne] Importador de organizaciones (APCI y MIMP) → organization`.
- Descripción nueva:

> Importar las fuentes aceptadas en NAW-22 siguiendo el patrón de `importOfficialNotices`:
>
> - Puerto `IOrganizationImporter` en `packages/domain` y caso de uso `importOrganizations` en `packages/application`, con un registro en `import_run` por corrida.
> - Migración (`pnpm run db:generate`) que añada a `organization` la procedencia: `source_id` (→ `data_source`), `external_id` (RUC o código de registro) con índice único `(source_id, external_id)` para un upsert idempotente, el tipo de registro (ONGD, ENIEX, IPREDA, beneficencia, voluntariado) y la fecha de corte de la fuente.
> - Ubicación mediante `coverage` (ubigeo de departamento, provincia o distrito); nunca inventar un punto.
> - Las organizaciones importadas entran con `identity_review` y `contact_review` en `pending`, como en `createOrganization`. Solo se guardan datos públicos de la organización; nada de datos personales (Ley 29733).
> - Preferir Excel o CSV antes que PDF. Si el parseo no cabe en un Worker, ejecutarlo como script aparte. Si el formato cambia, la corrida falla con el error registrado en `import_run` y no escribe datos.
>
> **Criterio:** organizaciones reales por territorio en Neon, con fuente y fecha de corte; tests del normalizador con fixtures.

## Cambio en la matriz: D-06

- Antes: «… INDECI (ODbL), SIGRID, OSM Overpass, APCI y MIMP. No raspar Google Maps. …»
- Después: «… INDECI (ODbL), SIGRID; directorio de ayuda: APCI (consulta SIGCTI, ONGD en Datos Abiertos, PDF y compendio ENIEX/IPREDA) y MIMP (beneficencias y voluntariado), por verificar en NAW-22. OSM solo como mapa base, sin importar lugares. No raspar Google Maps. …»

## Señalado, sin cambiar (producto, D-03)

NAW-7, 9, 11, 18, 19, 20 y 25 describen el semáforo, las alertas y las comunidades de Cerca, que el código no implementa (implementa «Andes Alerta»). NAW-19, un «motor de semáforo» que combina factores en un color, contradice el invariante de `CLAUDE.md` y del brief: «nunca un "risk score" combinado».
