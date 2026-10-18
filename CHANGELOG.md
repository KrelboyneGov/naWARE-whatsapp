# Changelog

## [1.1.0](https://github.com/KrelboyneGov/naWARE-whatsapp/compare/v1.0.1...v1.1.0) (2026-10-18)


### Features

* **application:** use cases for events, evidence, review, territory, help and sources ([dcd35fa](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/dcd35fae247087a404aef2b7bbfde5cfd8b7f4ea)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* core domain, API and base screens for Andes Alerta ([9ebd0a1](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/9ebd0a1e9baee47b5e7aa06f0e1d618a79d76d72))
* **domain:** core contract, demo dataset, design spec and ADRs 0003-0006; add mapcn map ([9513344](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/951334478a1aa4387514ece05811166fb8ad0563)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **domain:** layered map contracts — SemaforoCell, Community, Ingestor&lt;T&gt; and fixtures ([2eaadec](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/2eaadec1e70deab305d006d4351a4fa402f9db11)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **domain:** layered map contracts (SemaforoCell, Community, Ingestor&lt;T&gt;) ([e13e555](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/e13e555d4e41a4e7401cf67c9c3f733497ed25fd))
* **infra-db:** PostGIS schema, repositories, migrations and demo seed ([3e1f640](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/3e1f640a4560b2b986b0a87ba2d91d976f59980e)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **server-hono:** oRPC API, actor resolution and Better Auth admin roles ([260d1d4](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/260d1d4806db9980a8c55321d7b368897a4e555c)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **web-hono:** app shell, login, dashboard, map and report form wired to the API ([bc716cb](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/bc716cb9838cc0c1fdbf5c4b4cd4c98d898bc422)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **web-hono:** Spanish labels for domain values ([75de752](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/75de75206ef45840cf542bb94176d96a12463128))
* **web:** adapt the map and report flow to phones ([864e67d](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/864e67d040b407ea405a72000a7d75de5b34f45d))
* **web:** add the remaining public, account and internal screens ([1536fab](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/1536fab59311ef3bd8c8a45f9458ab82fc9af996))
* **web:** remaining screens and mobile layout ([2569c76](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/2569c765b92d3d55f266762e32af25550620a1f1))
* **web:** Waze-style quick reports, "still there?" signals, urgencies and explained weather ([9399c1a](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/9399c1a40de44f3212d5af93df2b29325ac5151e))
* **web:** Waze-style quick reports, community signals, urgencies and explained weather ([79d14ba](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/79d14ba611a0e2226c029a745f62fe86310a3ce0))
* **whatsapp:** demo notification with current SENAMHI rain notice ([32efd4a](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/32efd4a66bdd4ef6fe80fc41f44861e7206337a4))
* **whatsapp:** demo notification with current SENAMHI rain notice ([8f8b8e9](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/8f8b8e953edb629e02637662b3a399577fa83b45))
* **whatsapp:** KlAimate por Zavu con sender explícito ([f690ddc](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/f690ddcf5febf2c1d03637660442e9c8cb7245b3))
* **whatsapp:** send KlAimate alerts through the explicit Zavu sender ([ec843a5](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/ec843a51c55ab495741e96f54fb0c16653e88a04))


### Bug Fixes

* **ci:** exclude release-please generated files from the format check ([8c9c889](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/8c9c889cac2802a0cbcb4530568187fb13728f66))
* **ci:** exclude release-please generated files from the format check ([aacc881](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/aacc881b58c56f24088186ac1367230430dfcf7e))
* **domain:** type nearby radius as a literal union ([bb0c6e3](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/bb0c6e36111657751d770837be2cb562a853f836)), closes [#1](https://github.com/KrelboyneGov/naWARE-whatsapp/issues/1)
* **web-hono:** pair @cloudflare/vite-plugin with the catalog Wrangler so the dev Service Binding resolves ([5979928](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/5979928fd6a25fc901829236e39c1a2160a4d73b))
* **web:** restore desktop navigation and give the site an Andean, WhatsApp-first look ([51a90fd](https://github.com/KrelboyneGov/naWARE-whatsapp/commit/51a90fd35bb1013fb755c13d624681277afa837b))

## [1.0.1](https://github.com/csdev19/naWARE/compare/v1.0.0...v1.0.1) (2026-10-18)


### Bug Fixes

* **ci:** exclude release-please generated files from the format check ([8c9c889](https://github.com/csdev19/naWARE/commit/8c9c889cac2802a0cbcb4530568187fb13728f66))
* **ci:** exclude release-please generated files from the format check ([aacc881](https://github.com/csdev19/naWARE/commit/aacc881b58c56f24088186ac1367230430dfcf7e))

## 1.0.0 (2026-10-18)


### Features

* **application:** use cases for events, evidence, review, territory, help and sources ([dcd35fa](https://github.com/csdev19/naWARE/commit/dcd35fae247087a404aef2b7bbfde5cfd8b7f4ea)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* core domain, API and base screens for Andes Alerta ([9ebd0a1](https://github.com/csdev19/naWARE/commit/9ebd0a1e9baee47b5e7aa06f0e1d618a79d76d72))
* **domain:** core contract, demo dataset, design spec and ADRs 0003-0006; add mapcn map ([9513344](https://github.com/csdev19/naWARE/commit/951334478a1aa4387514ece05811166fb8ad0563)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* **infra-db:** PostGIS schema, repositories, migrations and demo seed ([3e1f640](https://github.com/csdev19/naWARE/commit/3e1f640a4560b2b986b0a87ba2d91d976f59980e)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* **server-hono:** oRPC API, actor resolution and Better Auth admin roles ([260d1d4](https://github.com/csdev19/naWARE/commit/260d1d4806db9980a8c55321d7b368897a4e555c)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* **web-hono:** app shell, login, dashboard, map and report form wired to the API ([bc716cb](https://github.com/csdev19/naWARE/commit/bc716cb9838cc0c1fdbf5c4b4cd4c98d898bc422)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* **web-hono:** Spanish labels for domain values ([75de752](https://github.com/csdev19/naWARE/commit/75de75206ef45840cf542bb94176d96a12463128))


### Bug Fixes

* **domain:** type nearby radius as a literal union ([bb0c6e3](https://github.com/csdev19/naWARE/commit/bb0c6e36111657751d770837be2cb562a853f836)), closes [#1](https://github.com/csdev19/naWARE/issues/1)
* **web-hono:** pair @cloudflare/vite-plugin with the catalog Wrangler so the dev Service Binding resolves ([5979928](https://github.com/csdev19/naWARE/commit/5979928fd6a25fc901829236e39c1a2160a4d73b))
