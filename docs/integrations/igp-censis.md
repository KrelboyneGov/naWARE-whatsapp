# IGP / CENSIS seismic reports: access notes for the poller

Checked by hand on 2026-10-17. No poller exists in the repository yet. These notes are input
for whoever builds it, through `Ingestor<T>` (ADR 0008). It would feed the
`official_emergencies` layer.

## Endpoints

The CENSIS site (`https://censis.igp.gob.pe`) is a Nuxt app. Its public runtime config points
`PATH_BACKEND` to `https://censis.igp.gob.pe/api`. Every endpoint below answered JSON with no
key, served through CloudFront and API Gateway.

| Endpoint                                                                        | Returns                                                                                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/ultimo-sismo`                                                         | The latest event: `codigo`, `fecha_hora`, `magnitud`, `latitud`, `longitud`, `profundidad`, `referencia`, `intensidades`, `tipo_evento`, `simulacro`, map URLs |
| `GET /api/ultimo-sismo/ajaxb/{year}`                                            | Every published report of that year in one array (2026: 740 items, about 500 KB). Before 2012 it returns 404                                                   |
| `GET /api/ultimo-sismo/sismo/{codigo}`                                          | One report with the thematic map URLs (intensity, PGA, PGV) and the accelerometric PDF                                                                         |
| `GET /api/ultimo-sismo/inicio`                                                  | Count per month for the current year                                                                                                                           |
| `GET /api/ultimo-sismo/descargar-datos?tipoCatalogo=…&fechaInicio=…&fechaFin=…` | Catalogue export as XLSX, filtered by date, magnitude, depth and bounding box                                                                                  |

The site also gets push updates over an AWS AppSync WebSocket, using an API key embedded in its
frontend bundle. Do not use it. That key is meant for their page, and polling is enough.

## Data quirks

- `codigo` (e.g. `2026-0740`) is unique and stable. Use it as the `externalId`.
- Date and time come split. `hora_local` and `hora_utc` carry a fake `1970-01-01` date. Build
  the instant from `fecha_utc` (date part) plus `hora_utc` (time part).
- `magnitud`, `latitud` and `longitud` are strings. `tipomagnitud` is empty in the samples.
- `intensidad` / `intensidades` are free text in the issuer's own scale (e.g. `II-III Oxapampa`).
  Keep it verbatim as the issuer's legend and never map it to a common score (ADR 0008).
- The epicentre is a point, often offshore. Do not snap it to a district polygon. Keep the
  `referencia` text ("70 km al O de San Juan, Nasca - Ica").
- `simulacro === 1` marks a drill. Reject it in the ingestor.

## Suggested polling

- Every 5 minutes: `GET /ultimo-sismo`. If its `codigo` is unknown, fetch `ajaxb/{current
year}` and upsert by `codigo`.
- One-off backfill: `ajaxb/2012` through `ajaxb/{current year}`, 15 requests and about 8,300
  events.

## Unverified

- The licence and terms of use of the IGP data.
- Rate limits. None were observed, but there were only a few requests.
