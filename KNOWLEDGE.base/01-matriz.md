# Matriz de decisiones — naWARE / Cerca

Versión 0.2, del 2026-10-17 (America/Lima). Copia local del documento canónico [7. Matriz de decisiones](https://linear.app/naware/document/7-matriz-de-decisiones-5c43332e1ae1) en Linear, verificada leyéndolo el 2026-10-17 a las 23:21 UTC. Si esta copia y Linear difieren, prevalece Linear. Se construyó a partir de los documentos 1 a 6 del proyecto Cerca y se publicó con autorización explícita del usuario.

Los IDs son estables. Cualquier cambio (altas, bajas, estados o cambios de significado) se prepara en `proposals/` y sigue la skill: alerta con antes/después y autorización humana antes de escribir aquí o en Linear.

## Decisiones

| ID   | Asunto              | Valor vigente                                                                                                                                                                                                                                                                | Fuente                   |
| ---- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| D-01 | Fuente de verdad    | Linear: workspace naWARE, proyecto Cerca (verificado el 2026-10-17)                                                                                                                                                                                                          | Workspace                |
| D-02 | Cambios a la matriz | Alerta con antes/después, autorización humana antes de escribir y revisión final en cada sesión                                                                                                                                                                              | Pedido del equipo; doc 0 |
| D-03 | Producto elegido    | **Cerca: semáforo de lluvias de tu comunidad**. Mapa de colores por distrito, alertas cuando sube el color, comunidades, reportes confirmados por varias personas y puntos de ayuda                                                                                          | Doc 1                    |
| D-04 | Piloto y amenaza    | Amenaza: lluvias (avisos de SENAMHI cruzados con SIGRID, INDECI y Sutran). Distrito piloto: **pendiente**                                                                                                                                                                    | Docs 1 y 5               |
| D-05 | Reglas del track    | Rúbrica: técnico 75 % (complejidad 30, funciona 25, calidad 20) y producto 25 % (impacto 15, claridad 10); bonus de tracción hasta +0,5. Entrega: domingo 18-oct a las 09:00 (Lima), con URL pública, demo y repositorio. El enlace al reglamento oficial no está registrado | Doc 1                    |
| D-06 | Fuentes de datos    | SENAMHI (servicio ArcGIS de INDECI sin verificar; HTML como respaldo frágil; Open-Meteo de reserva), Sutran (feed sin verificar), INDECI (ODbL), SIGRID, OSM Overpass, APCI y MIMP. No raspar Google Maps. Koru queda fuera del alcance actual                               | Docs 2 y 5               |
| D-07 | Responsables        | cristiansotomayor.dev: monorepo, CI/CD, contratos, UI y notificaciones. camilamcr97: ingesta de incidentes, semáforo, alertas y API. krelboyne: puntos de ayuda, base de datos y comunidades. Detalle en NAW-5 a NAW-25                                                      | Doc 6                    |
| D-08 | Fuera de alcance    | Sin seguimiento de donaciones ni de dinero                                                                                                                                                                                                                                   | Doc 1                    |
| D-09 | Arquitectura        | Monorepo pnpm + turborepo, Next.js (PWA), Supabase/PostGIS, ingestores en GitHub Actions y contratos zod como fuente de verdad del código                                                                                                                                    | Doc 2                    |
| D-10 | Canal de alertas    | Web push de la PWA. Canal adicional (Telegram o correo): **pendiente**                                                                                                                                                                                                       | Docs 2 y 5               |

## Antecedentes: alternativas previas no adoptadas

| ID   | Propuesta                                      | Estado                                    |
| ---- | ---------------------------------------------- | ----------------------------------------- |
| P-01 | Alertas convertidas en preparación comunitaria | No adoptada; el producto vigente es Cerca |
| P-02 | Mapa de ayuda faltante                         | No adoptada; el producto vigente es Cerca |
| P-03 | Observadores climáticos comunitarios           | No adoptada; el producto vigente es Cerca |

## Pendientes abiertos

Distrito piloto, canal de alertas adicional, verificación del feed de Sutran y del servicio ArcGIS de SENAMHI/INDECI, y fuente confirmada para el directorio de ONG.
