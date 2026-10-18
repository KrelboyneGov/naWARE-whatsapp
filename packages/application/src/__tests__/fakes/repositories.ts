import type {
  IClock,
  ICollectionPointRepository,
  IDataSourceRepository,
  IEventRepository,
  IEvidenceRepository,
  IFileStorage,
  IIdGenerator,
  INeedRepository,
  IOfficialNoticeImporter,
  IOfficialNoticeRepository,
  IOrganizationRepository,
  IReviewRepository,
  ITerritoryRepository,
} from "@emergency-map/domain/repositories";
import type {
  ActivityEntry,
  CollectionPoint,
  DataSource,
  Event,
  EventFilters,
  EventVersion,
  Evidence,
  GeoPoint,
  ImportRun,
  IssueReport,
  Need,
  OfficialNotice,
  Organization,
  ReviewDecision,
  ReviewQueueItem,
  Territory,
} from "@emergency-map/domain/schemas";
import { distanceKm } from "../../shared/geo";

export class FixedClock implements IClock {
  constructor(public current: Date) {}
  now() {
    return new Date(this.current);
  }
}

export class SeqIds implements IIdGenerator {
  private n = 0;
  next(prefix: string) {
    this.n += 1;
    return `${prefix}-${this.n}`;
  }
}

export class FakeFileStorage implements IFileStorage {
  lastKey: string | null = null;
  async createUploadUrl(input: { key: string; contentType: string; sizeBytes: number }) {
    this.lastKey = input.key;
    return {
      uploadUrl: `https://storage.test/${input.key}`,
      expiresAt: new Date("2026-10-17T16:00:00.000Z"),
      simulated: true,
    };
  }
  publicUrl(key: string) {
    return `https://storage.test/${key}`;
  }
}

export class FakeImporter implements IOfficialNoticeImporter {
  constructor(
    public readonly sourceId: string,
    public notices: Awaited<ReturnType<IOfficialNoticeImporter["fetchNotices"]>> = [],
    public failWith: Error | null = null,
  ) {}
  async fetchNotices() {
    if (this.failWith) throw this.failWith;
    return this.notices;
  }
}

function matchesFilters(e: Event, f: EventFilters): boolean {
  const v = e.currentVersion;
  if (f.categories && !f.categories.includes(v.category)) return false;
  if (f.origins && !f.origins.includes(e.origin)) return false;
  if (f.reviewStatuses && !f.reviewStatuses.includes(e.reviewStatus)) return false;
  if (f.situationStatuses && !f.situationStatuses.includes(e.situationStatus)) return false;
  if (f.ubigeo && v.place.territory.ubigeo !== f.ubigeo) return false;
  if (f.text && !v.title.toLowerCase().includes(f.text.toLowerCase())) return false;
  if (!f.includeDemo && e.isDemo) return false;
  if (f.bounds) {
    const p = v.place.point;
    if (!p) return false;
    const [w, s, ea, n] = f.bounds;
    if (p.lng < w || p.lng > ea || p.lat < s || p.lat > n) return false;
  }
  const date = f.dateField === "occurred" ? v.occurredAt.start : e.lastUpdatedAt;
  if (f.from && date < f.from) return false;
  if (f.to && date > f.to) return false;
  return true;
}

export class FakeEventRepository implements IEventRepository {
  events = new Map<string, Event>();
  versions: EventVersion[] = [];
  activity: ActivityEntry[] = [];

  seed(event: Event) {
    this.events.set(event.id, event);
    this.versions.push(event.currentVersion);
    return event;
  }
  async findById(id: string) {
    return this.events.get(id) ?? null;
  }
  async listPublic(
    filters: EventFilters,
    page: { limit: number; offset: number },
    sort: "last_updated" | "occurred",
  ) {
    const all = [...this.events.values()]
      .filter((e) => e.publicationStatus === "published" && e.mergedIntoEventId === null)
      .filter((e) => matchesFilters(e, filters))
      .sort((a, b) =>
        sort === "occurred"
          ? b.currentVersion.occurredAt.start.getTime() -
            a.currentVersion.occurredAt.start.getTime()
          : b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime(),
      );
    return { data: all.slice(page.offset, page.offset + page.limit), total: all.length };
  }
  async listVersions(eventId: string) {
    return this.versions.filter((v) => v.eventId === eventId);
  }
  /** Deliberately loose: returns any publication status so use cases must filter. */
  async findCandidates(input: {
    category: Event["currentVersion"]["category"];
    point: GeoPoint | null;
    ubigeo: string;
    from: Date;
    to: Date;
    radiusKm: number;
    limit: number;
  }) {
    const out: { event: Event; distanceKm: number | null }[] = [];
    for (const event of this.events.values()) {
      const v = event.currentVersion;
      if (v.category !== input.category) continue;
      const t = v.occurredAt.start;
      if (t < input.from || t > input.to) continue;
      const d = input.point && v.place.point ? distanceKm(input.point, v.place.point) : null;
      const sameDistrict = v.place.territory.ubigeo === input.ubigeo;
      if (!sameDistrict && (d === null || d > input.radiusKm)) continue;
      out.push({ event, distanceKm: d });
    }
    return out.slice(0, input.limit);
  }
  async create(event: Event) {
    this.events.set(event.id, event);
    this.versions.push(event.currentVersion);
    return event;
  }
  async addVersion(version: EventVersion) {
    this.versions.push(version);
  }
  async updateStatus(
    id: string,
    expectedSeq: number,
    patch: Parameters<IEventRepository["updateStatus"]>[2],
  ) {
    const e = this.events.get(id);
    if (!e || e.currentVersion.seq !== expectedSeq) return false;
    const { currentVersionSeq: _seq, ...rest } = patch;
    this.events.set(id, { ...e, ...rest } as Event);
    return true;
  }
  async listActivity(filters: EventFilters, page: { limit: number; offset: number }) {
    const data = this.activity
      .filter((a) => filters.includeDemo || !a.isDemo)
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    return { data: data.slice(page.offset, page.offset + page.limit), total: data.length };
  }
  async appendActivity(entry: ActivityEntry) {
    this.activity.push(entry);
  }
}

export class FakeEvidenceRepository implements IEvidenceRepository {
  items = new Map<string, Evidence & { fileSha256: string | null }>();

  seed(e: Evidence, fileSha256: string | null = null) {
    this.items.set(e.id, { ...e, fileSha256 });
    return e;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async listByEvent(eventId: string, opts: { includeNonPublic: boolean }) {
    return [...this.items.values()].filter(
      (e) => e.eventId === eventId && (opts.includeNonPublic || e.visibility === "public"),
    );
  }
  async findByFileHash(sha256: string) {
    return [...this.items.values()].find((e) => e.fileSha256 === sha256) ?? null;
  }
  async create(evidence: Evidence & { fileSha256: string | null }) {
    this.items.set(evidence.id, evidence);
    return evidence;
  }
  async update(id: string, patch: Parameters<IEvidenceRepository["update"]>[1]) {
    const e = this.items.get(id);
    if (e) this.items.set(id, { ...e, ...patch });
  }
  async countIndependent(eventId: string) {
    const authors = new Set<string>();
    for (const e of this.items.values()) {
      if (e.eventId === eventId && e.visibility === "public" && e.duplicateOfEvidenceId === null) {
        authors.add(e.authorId);
      }
    }
    return authors.size;
  }
}

export class FakeReviewRepository implements IReviewRepository {
  queue: { eventId: string; reason: ReviewQueueItem["reason"]; versionSeq: number; at: Date }[] =
    [];
  decisions: ReviewDecision[] = [];
  issues: IssueReport[] = [];

  async listQueue() {
    return { data: [] as ReviewQueueItem[], total: this.queue.length };
  }
  async enqueue(item: (typeof this.queue)[number]) {
    this.queue.push(item);
  }
  async dequeue(eventId: string) {
    this.queue = this.queue.filter((q) => q.eventId !== eventId);
  }
  async assign() {}
  async listDecisions(eventId: string) {
    return this.decisions.filter((d) => d.eventId === eventId);
  }
  async recordDecision(decision: ReviewDecision) {
    this.decisions.push(decision);
  }
  async createIssue(issue: IssueReport) {
    this.issues.push(issue);
  }
}

export class FakeTerritoryRepository implements ITerritoryRepository {
  items = new Map<string, Territory>();
  neighbours = new Map<string, string[]>();

  seed(t: Territory) {
    this.items.set(t.ubigeo, t);
    return t;
  }
  async findByUbigeo(ubigeo: string) {
    return this.items.get(ubigeo) ?? null;
  }
  async search(query: string, level: Territory["level"] | undefined, limit: number) {
    return [...this.items.values()]
      .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
      .filter((t) => !level || t.level === level)
      .slice(0, limit);
  }
  async findDistrictAt(point: GeoPoint) {
    let best: Territory | null = null;
    let bestD = Infinity;
    for (const t of this.items.values()) {
      if (t.level !== "district") continue;
      const d = distanceKm(point, t.centroid);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }
  async findNeighbours(ubigeo: string, limit: number) {
    return (this.neighbours.get(ubigeo) ?? [])
      .map((u) => this.items.get(u))
      .filter((t): t is Territory => t !== undefined)
      .slice(0, limit);
  }
}

export class FakeNoticeRepository implements IOfficialNoticeRepository {
  items = new Map<string, OfficialNotice>();
  /** ubigeo -> notice ids intersecting it. */
  coverage = new Map<string, { id: string; partialOverlap: boolean }[]>();

  seed(n: OfficialNotice) {
    this.items.set(`${n.sourceId}:${n.externalId}`, n);
    return n;
  }
  async findById(id: string) {
    return [...this.items.values()].find((n) => n.id === id) ?? null;
  }
  async findIntersectingTerritory(ubigeo: string, opts: { includeExpired: boolean }) {
    const rows = this.coverage.get(ubigeo) ?? [];
    const out: { notice: OfficialNotice; partialOverlap: boolean }[] = [];
    for (const r of rows) {
      const notice = await this.findById(r.id);
      if (notice && (opts.includeExpired || notice.validity === "active")) {
        out.push({ notice, partialOverlap: r.partialOverlap });
      }
    }
    return out;
  }
  async listActive(at: Date) {
    return [...this.items.values()].filter((n) => !(n.validTo && n.validTo < at));
  }
  async upsert(notice: OfficialNotice) {
    const key = `${notice.sourceId}:${notice.externalId}`;
    const existing = this.items.get(key);
    if (!existing) {
      this.items.set(key, notice);
      return "inserted" as const;
    }
    const same =
      existing.title === notice.title &&
      existing.validTo?.getTime() === notice.validTo?.getTime() &&
      existing.validity === notice.validity;
    if (same) return "unchanged" as const;
    this.items.set(key, { ...notice, id: existing.id });
    return "updated" as const;
  }
}

export class FakeOrganizationRepository implements IOrganizationRepository {
  items = new Map<string, Organization>();
  members: { organizationId: string; userId: string; role: string }[] = [];

  seed(o: Organization) {
    this.items.set(o.id, o);
    return o;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async listCoveringTerritory(ubigeo: string) {
    return [...this.items.values()].filter((o) => o.coverage.some((c) => c.ubigeo === ubigeo));
  }
  async create(org: Organization) {
    this.items.set(org.id, org);
    return org;
  }
  async addMember(input: { organizationId: string; userId: string; role: string }) {
    this.members.push(input);
  }
  async listOrganizationIdsForUser(userId: string) {
    return this.members.filter((m) => m.userId === userId).map((m) => m.organizationId);
  }
}

export class FakeNeedRepository implements INeedRepository {
  items = new Map<string, Need>();

  seed(n: Need) {
    this.items.set(n.id, n);
    return n;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  /** Deliberately loose about deadlines so use cases must enforce them. */
  async list(input: Parameters<INeedRepository["list"]>[0], _now: Date) {
    return [...this.items.values()]
      .filter((n) => !input.ubigeo || n.destinationTerritory.ubigeo === input.ubigeo)
      .filter((n) => !input.organizationId || n.organizationId === input.organizationId)
      .filter((n) => !input.eventId || n.eventId === input.eventId)
      .filter((n) => !input.categories || input.categories.includes(n.category))
      .filter((n) => !input.onlyActive || n.status !== "covered");
  }
  async create(need: Need) {
    this.items.set(need.id, need);
    return need;
  }
  async updateStatus(
    id: string,
    organizationId: string,
    status: Need["status"],
    note: string,
    at: Date,
  ) {
    const n = this.items.get(id);
    if (!n || n.organizationId !== organizationId) return false;
    this.items.set(id, { ...n, status, statusNote: note, updatedAt: at });
    return true;
  }
}

export class FakeCollectionPointRepository implements ICollectionPointRepository {
  items = new Map<string, CollectionPoint>();

  seed(p: CollectionPoint) {
    this.items.set(p.id, p);
    return p;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  /** Deliberately returns withdrawn points too, so use cases must filter them. */
  async list(input: Parameters<ICollectionPointRepository["list"]>[0]) {
    return [...this.items.values()]
      .filter((p) => !input.organizationId || p.organizationId === input.organizationId)
      .filter((p) => !input.ubigeo || p.territory.ubigeo === input.ubigeo)
      .map((point) => ({
        point,
        distanceKm: input.near ? distanceKm(input.near, point.location) : null,
      }))
      .filter((r) => !input.near || !input.radiusKm || (r.distanceKm ?? 0) <= input.radiusKm);
  }
  async create(point: CollectionPoint) {
    this.items.set(point.id, point);
    return point;
  }
}

export class FakeDataSourceRepository implements IDataSourceRepository {
  items = new Map<string, DataSource>();
  runs: ImportRun[] = [];

  seed(s: DataSource) {
    this.items.set(s.id, s);
    return s;
  }
  async list() {
    return [...this.items.values()];
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async update(id: string, patch: Parameters<IDataSourceRepository["update"]>[1]) {
    const s = this.items.get(id);
    if (s) this.items.set(id, { ...s, ...patch });
  }
  async recordRun(run: ImportRun) {
    this.runs.push(run);
  }
  async listRuns(sourceId: string, limit: number) {
    return this.runs.filter((r) => r.sourceId === sourceId).slice(0, limit);
  }
}
