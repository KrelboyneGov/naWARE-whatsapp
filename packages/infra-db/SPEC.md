# @emergency-map/infra-db — Package Spec

```
src/
├── client/
├── config/
├── enums/
├── mappers/
├── repositories/
├── schema/
└── utils/
```

---

## `client/`

| Item                        | Kind     | Description                                                |
| --------------------------- | -------- | ---------------------------------------------------------- |
| `db`                        | const    | Pre-configured Drizzle client using `DATABASE_URL` env var |
| `createDatabaseClient(url)` | function | Factory that creates a new Drizzle client from a given URL |

---

## `config/`

| Item           | Kind  | Description                                       |
| -------------- | ----- | ------------------------------------------------- |
| `TABLE_PREFIX` | const | `"emergency_map"` — prefix for all DB table names |

---

## `enums/`

| Item               | Kind   | Description                                            |
| ------------------ | ------ | ------------------------------------------------------ |
| `currencyEnum`     | pgEnum | PostgreSQL enum for currencies (from domain constants) |
| `todoStatusEnum`   | pgEnum | PostgreSQL enum for todo statuses                      |
| `todoPriorityEnum` | pgEnum | PostgreSQL enum for todo priorities                    |
| `todoCategoryEnum` | pgEnum | PostgreSQL enum for todo categories                    |

---

## `utils/`

| Item          | Kind     | Description                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| `createTable` | function | `pgTableCreator` wrapper that auto-prefixes table names with `emergency_map_` |
| `timestamps`  | const    | Reusable column object with `createdAt`, `updatedAt`, `deletedAt`             |

---

## `schema/`

### `auth.ts`

| Item                | Kind      | Description                                                      |
| ------------------- | --------- | ---------------------------------------------------------------- |
| `userTable`         | table     | Users (id, name, email, emailVerified, image, timestamps)        |
| `sessionTable`      | table     | Sessions (id, expiresAt, token, ipAddress, userAgent, userId FK) |
| `accountTable`      | table     | OAuth accounts (accountId, providerId, tokens, userId FK)        |
| `verificationTable` | table     | Verification codes (identifier, value, expiresAt)                |
| `userRelations`     | relations | User → many sessions, accounts, todos                            |
| `sessionRelations`  | relations | Session → one user                                               |
| `accountRelations`  | relations | Account → one user                                               |

### `todo.ts`

| Item            | Kind      | Description                                                                       |
| --------------- | --------- | --------------------------------------------------------------------------------- |
| `todoTable`     | table     | Todos (id, title, description, status, priority, category, userId FK, timestamps) |
| `todoRelations` | relations | Many-to-one with user                                                             |
| `Todo`          | type      | Inferred SELECT type                                                              |
| `NewTodo`       | type      | Inferred INSERT type                                                              |

---

## `mappers/`

| Item                               | Kind          | Description         |
| ---------------------------------- | ------------- | ------------------- |
| `TodoMapper.toDomain(row)`         | static method | DB row → `TodoBase` |
| `TodoMapper.toPersistence(entity)` | static method | `TodoBase` → DB row |

---

## `repositories/`

| Item                                       | Kind   | Description                                                            |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| `TodoRepository`                           | class  | Implements `ITodoRepository`                                           |
| `.findById(id, userId)`                    | method | Find by ID + userId, excludes soft-deleted                             |
| `.findPaginated(userId, params, filters?)` | method | Paginated list with status/priority filters, ordered by updatedAt DESC |
| `.save(todo)`                              | method | Insert new todo                                                        |
| `.update(id, userId, data)`                | method | Update fields, sets updatedAt, returns updated entity                  |
| `.delete(id, userId)`                      | method | Soft delete (sets deletedAt)                                           |

---

## Totals

| Category           | Count |
| ------------------ | ----- |
| Files              | 12    |
| Exported classes   | 2     |
| Exported functions | 2     |
| Exported constants | 2     |
| pgEnums            | 4     |
| Drizzle tables     | 5     |
| Exported types     | 7     |

---

## Core domain persistence (added with the core-logic spec)

- `schema/`: `territory`, `event` (+ `event_version`, `activity`), `evidence`, `review` (queue, decisions, issue reports), `source` (data sources, import runs, official notices), `help` (organizations, members, collection points, needs). Every product table has `is_demo`. Auth tables gained the Better Auth admin columns (`user.role/banned/ban_reason/ban_expires`, `session.impersonated_by`).
- `utils/postgis.ts`: `geometryPoint` / `geometryMultiPolygon` custom types (write via `ST_MakePoint` / `ST_Multi(ST_GeomFromGeoJSON)`), `geoJson(column)` for reads, `pointSql`, `distanceKm`. Geometry columns must be selected with `geoJson()`.
- `events.private_location` is never selected by list/candidate queries; only `findById` reads it.
- `mappers/` map rows to domain types; `repositories/` implement every domain interface; `createRepositories(db)` returns the `Repositories` aggregate.
- neon-http has no interactive transactions, so multi-statement writes use `db.batch`.
- Migrations: `0001_postgis` (extension), `0002_core_domain`.
- `seed/index.ts`: idempotent demo load, run with `pnpm run db:seed` from the root.
