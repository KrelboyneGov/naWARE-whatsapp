# Divergencia: repositorio recreado vs. matriz v0.2 de Linear

Estado: **pendiente de decisión del equipo**. Este archivo no modifica la matriz vigente (`01-matriz.md`, v0.2) ni Linear.

## Contexto

El 2026-10-17 se recreó el repositorio en `csdev19/naWARE` (paquete `emergency-map`). Su `docs/product-brief.md`, `CLAUDE.md` y `README.md` describen un producto y una arquitectura que no coinciden con la matriz publicada en Linear ([7. Matriz de decisiones](https://linear.app/naware/document/7-matriz-de-decisiones-5c43332e1ae1)).

## Diferencias observadas

| ID matriz | Matriz v0.2 (Linear)                                                                    | Repositorio recreado                                                                                                   | Observación                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D-03      | Cerca: semáforo de lluvias por distrito (verde/amarillo/naranja/rojo) que cruza fuentes | Mapa nacional de emergencias y ayuda que muestra cada fuente con su propio nivel                                       | El brief del repo dice explícitamente: evitar un único «risk score» que mezcle fuentes. Contradice el semáforo agregado de D-03 |
| D-04      | Lluvias; distrito piloto pendiente                                                      | Lluvias intensas, inundaciones, huaicos, heladas y friaje; cobertura nacional con validación en regiones seleccionadas | Alcance más amplio                                                                                                              |
| D-06      | SENAMHI, Sutran, INDECI, SIGRID, OSM, APCI, MIMP                                        | Open-Meteo, SENAMHI/IDESEP, SENAMHI avisos, CENEPRED/SIGRID, INDECI/COEN/SINPAD, DHN (extensión)                       | Sutran, APCI y MIMP no aparecen en el repo                                                                                      |
| D-07      | Roles del doc 6 (cristiansotomayor.dev, camilamcr97, krelboyne)                         | Sin asignación en el repo                                                                                              | Sin conflicto directo                                                                                                           |
| D-09      | Next.js (PWA), Supabase/PostGIS, ingestores en GitHub Actions, despliegue en Vercel     | TanStack Start + Hono/oRPC en Cloudflare Workers, Neon + Drizzle, Cron Triggers + Queues, R2                           | Contradicción directa de arquitectura                                                                                           |
| D-10      | Web push de la PWA                                                                      | No definido                                                                                                            | Pendiente                                                                                                                       |

## Decisión necesaria

El equipo debe decidir cuál es la versión vigente:

1. **El repo refleja la decisión más reciente:** preparar una propuesta v0.3 que actualice D-03, D-04, D-06, D-09 y D-10 en Linear (con alerta, antes/después y autorización), y revisar si los documentos 1 a 6 de Linear siguen vigentes.
2. **Linear sigue vigente:** el brief y la arquitectura del repo deben ajustarse a Cerca.

Hasta entonces, los asistentes deben señalar esta divergencia y no implementar decisiones de alcance como si estuvieran aprobadas.
