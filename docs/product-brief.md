# Product brief — Emergency and aid map for Peru

Processed from the founding briefing (2026-10-17). It keeps the intent and the decisions; the
original is a Spanish document owned by the product team.

## Proposal

A web platform to understand what is happening in an area of Peru, read official warnings, and
find organizations or communities to receive help from or collaborate with. It connects people
who want to help with visible needs and contact channels. Coordination after first contact
happens directly with the organizations or groups, outside the platform.

## Users and needs

| User                     | Need                                                 |
| ------------------------ | ---------------------------------------------------- |
| Resident of an area      | Check warnings and emergencies nearby.               |
| Relative in another city | Understand what is happening in a specific locality. |
| Person who wants to help | Find organizations, campaigns and relevant contacts. |
| Organization             | Publish its coverage, needs and help channels.       |

## Core experience

The user opens the map, searches a district or uses their location, and selects the layers of
interest. Selecting an event or an organization shows its description, source, dates, location
and a link to learn more or make contact.

The map distinguishes four classes of information:

- **Forecast:** expected weather conditions.
- **Official warnings:** phenomena that may affect an area during a period.
- **Reported emergencies:** recorded events and their updates.
- **Available help:** organizations, service points and communities.

Historically exposed zones may be an extra layer. A zone susceptible to floods is not a zone
flooded right now.

## Public data sources to start with

| Source                                | Useful information                                 | Access identified / proposed use                                                       |
| ------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Open-Meteo                            | Rain, temperature, wind, forecast by coordinates   | Documented JSON API. Most direct first integration for weather context.                |
| SENAMHI / IDESEP                      | Georeferenced weather and hydrological information | WMS/WFS service catalog. Check which layers are live and how often they update.        |
| SENAMHI / Warnings                    | Preventive warnings with area, validity and level  | Official publication; a stable automated extraction mechanism is not yet confirmed.    |
| CENEPRED / SIGRID                     | Exposure, risk scenarios, territorial boundaries   | Public ArcGIS REST services; the reviewed service advertises JSON and GeoJSON queries. |
| INDECI / COEN / SINPAD                | Recorded emergencies and follow-up reports         | Public portals and reports. No documented API confirmed.                               |
| DHN / National Tsunami Warning Center | Official tsunami information and inundation areas  | Later extension; automated access still to validate.                                   |

Documentation: [Open-Meteo](https://open-meteo.com/en/docs),
[IDESEP catalog](https://idesep.senamhi.gob.pe/portalidesep/idesep_componente_catalogo_geoservicios.jsp),
[SENAMHI warnings](https://web2.senamhi.gob.pe/?p=avisos),
[SIGRID service](https://sig.cenepred.gob.pe/sigrid/rest/services/sigrid/Informacion_Complementaria/MapServer),
[INDECI reports](https://portal.indeci.gob.pe/emergencias/),
[SINPAD query](https://sinpad2.indeci.gob.pe/sinpad2/faces/public/listSinpadEnviadosPubli.xhtml),
[DHN](https://www.dhn.mil.pe/).

WMS returns images to overlay on the map; WFS and some REST services return geographic
features that can be filtered and processed. Finding a public viewer does not guarantee an
events API.

Open-Meteo's free API is for non-commercial use and rate limited; commercial use needs a paid
plan, and data requires attribution ([terms and plans](https://open-meteo.com/en/pricing)).

## Recommended first version

1. National map with search by department, province and district.
2. Weather warnings plus forecast context.
3. Filters by phenomenon, location, validity and published level.
4. Detail cards with the original source and visible dates.
5. A small, reviewed directory of organizations with coverage and contact.
6. Shareable links that keep the area and the filters.
7. Internal panel to review imports, fix locations and retire expired contacts.

Start with heavy rain, floods, mudflows (huaicos), frost and cold waves (friaje), according to
what each source really offers. Validate data quality in a few regions before claiming national
coverage.

Communities start as links contributed by their owners and reviewed by the team. Group creation,
in-app chat, donations and open citizen reports are a later stage.

## Representing severity

- Keep the level and legend of the issuing institution. SENAMHI publishes yellow, orange and red
  warnings ([reference](https://web2.senamhi.gob.pe/?p=avisos)).
- Avoid a single "risk score" that mixes forecasts, historical exposure and recorded damage. Each
  card explains what its classification means.
- Use color together with text and icons. A zone with no records shows "no information
  available"; it is never interpreted as safe.

## Proposed architecture

| Component      | Choice                                     | Role                                                   |
| -------------- | ------------------------------------------ | ------------------------------------------------------ |
| Web app        | TanStack Start                             | Navigation, pages, server functions                    |
| UI queries     | TanStack Query                             | Load and refresh data by area and filters              |
| Visualization  | MapLibre GL JS + OpenStreetMap-based tiles | Points, polygons and layers                            |
| Runtime        | Cloudflare Workers                         | Serve the app and its API                              |
| Source refresh | Cron Triggers + Queues                     | Schedule fetches, process separately, retry failures   |
| Database       | Neon + PostGIS                             | Store events; query areas, distances, intersections    |
| Raw files      | Cloudflare R2                              | Keep original documents and responses for traceability |

References: Cloudflare guides for
[TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
and [Neon](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/);
MapLibre [WMS layers](https://maplibre.org/maplibre-gl-js/docs/examples/wms/).

OpenStreetMap provides map data; a tile provider still has to be chosen. The public OSM tile
server has a usage policy and is not production infrastructure
([tile policy](https://operations.osmfoundation.org/policies/tiles/)).

### Neon vs Convex

1. **Neon with PostGIS — recommended.** Fits queries such as "which districts does this warning
   intersect" or "which organizations serve near this area". Main cost: building the API and the
   refresh processes. [Docs](https://neon.com/docs/extensions/postgis).
2. **Convex.** Attractive if the product evolves toward collaboration and reactive updates between
   users. Its geospatial component handles points and is in beta; polygon operations and
   territorial joins would need validation. [Component](https://github.com/convex/geospatial).

The recommendation follows from the geographic queries, not from the data being public or
scraped. The first version uses a single database: Neon.

## Ingesting and refreshing data

Flow: public source → download → validation → normalization → storage → map.

Prefer APIs or geographic services, then downloadable files, then HTML or PDF extraction. Each
source gets its own importer so a page change breaks only that one.

Store at least:

- Source identifier and link.
- Information type and phenomenon.
- Geometry, affected districts and location precision.
- Original level, never silently reinterpreted.
- Event date, publication date, validity and last fetch.
- Report versions and review status.

A follow-up report updates the matching event instead of creating a duplicate emergency. If only
the district is known, show that territorial precision; never invent an exact point.

Fetch frequency is set per source after checking limits and publication cadence. Polling every
few minutes does not turn a daily publication into real time. If a source fails, keep the last
valid data with a visible age indicator.

## Validate before building the full map

- Get a real sample from each priority source.
- Confirm access, reuse terms, geometries and dates.
- Check how corrections, cancellations and expirations are published.
- Measure duplicates and records that cannot be located.
- Decide who reviews organizations and contacts.
- Estimate costs: queries, tiles, storage, processing.

The document review found relevant services and portals; it does not yet prove that every
integration is stable. Opening the IDESEP catalog directly timed out during the review.

## Initial success criterion

A person can find their district, tell a warning from an emergency that already happened, check
the source, and reach a relevant contact. The team can detect expired data and failed imports.

## Open decisions and assumptions

1. **Scope:** weather and hydrological phenomena in the first version; tsunamis and earthquakes
   in an extension.
2. **Communities:** a reviewed directory with external contact, no automatic group creation.
3. **Business model:** pending; it affects API and map tile contracts.
4. **Coverage:** national map with explicit data coverage and initial validation in selected
   regions.

Next step: an access test against the priority sources, then close the MVP spec and the
architecture decisions with those results.
