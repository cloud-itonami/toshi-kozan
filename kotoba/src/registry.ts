/**
 * toshi-kozan kotoba — material + depot + safetyGuide + acceptance registries
 * + coverage. AT PDS records (no RW). Acceptance is a two-FK edge (depot+material).
 * Public urban-mining reference only; the physical recovery pipeline stays etzhayyim.
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  ACCEPTANCE_COLLECTION,
  DEPOT_COLLECTION,
  MATERIAL_CATEGORIES,
  MATERIAL_COLLECTION,
  SAFETY_GUIDE_COLLECTION,
  SAFETY_TOPICS,
  acceptanceDidFor,
  acceptanceRkey,
  depotDidFor,
  depotRkey,
  guideDidFor,
  guideRkey,
  materialDidFor,
  materialRkey,
  type AcceptanceRecord,
  type AcceptanceView,
  type AddSafetyGuideInput,
  type AddSafetyGuideOutput,
  type CoverageInput,
  type CoverageOutput,
  type DepotRecord,
  type DepotView,
  type GetDepotInput,
  type GetDepotOutput,
  type ListAcceptancesInput,
  type ListAcceptancesOutput,
  type ListDepotsInput,
  type ListDepotsOutput,
  type ListMaterialsInput,
  type ListMaterialsOutput,
  type ListSafetyGuidesInput,
  type ListSafetyGuidesOutput,
  type MaterialRecord,
  type MaterialView,
  type RecordAcceptanceInput,
  type RecordAcceptanceOutput,
  type RegisterDepotInput,
  type RegisterDepotOutput,
  type RegisterMaterialInput,
  type RegisterMaterialOutput,
  type SafetyGuideRecord,
  type SafetyGuideView,
} from "./types.js";

const PAGE_LIMIT = 100;
const DEFAULT_MAX_SCAN = 10_000;

async function exists(e: Etzhayyim, collection: string, rkey: string): Promise<boolean> {
  const resp = await e.read({ collection, rkey }).catch(() => ({ records: [] }));
  return Boolean(resp.records[0]?.value);
}

async function scanAll<T>(e: Etzhayyim, collection: string, maxScan: number, onRow: (v: T) => void): Promise<number> {
  let cursor: string | undefined;
  let scanned = 0;
  while (scanned < maxScan) {
    const page = await e.read<T>({ collection, cursor, limit: PAGE_LIMIT });
    for (const r of page.records) {
      if (scanned >= maxScan) break;
      onRow(r.value);
      scanned += 1;
    }
    if (scanned >= maxScan || !page.cursor || page.records.length < PAGE_LIMIT) break;
    cursor = page.cursor;
  }
  return scanned;
}

// ─── Material ───────────────────────────────────────────────────────

export async function registerMaterial(e: Etzhayyim, input: RegisterMaterialInput): Promise<RegisterMaterialOutput> {
  if (!input.materialId || !input.symbol || !input.name) return { status: "rejected", error: "missingRequiredFields" };
  if (!MATERIAL_CATEGORIES.has(input.category)) return { status: "rejected", error: "invalidCategory" };
  const rkey = materialRkey(input.materialId);
  const existing = await e.read<MaterialRecord>({ collection: MATERIAL_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", materialUri: existing.records[0].uri, did: existing.records[0].value.did, materialId: input.materialId };
  }
  const did = materialDidFor(input.materialId);
  const record: MaterialRecord = {
    did,
    materialId: input.materialId,
    symbol: input.symbol,
    name: input.name,
    category: input.category,
    typicalSource: input.typicalSource,
    sourceUrl: input.sourceUrl,
    createdAt: new Date().toISOString(),
  };
  const receipt = await e.write({ collection: MATERIAL_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "registered", materialUri: receipt.uri, did, materialId: input.materialId };
}

export async function listMaterials(e: Etzhayyim, input: ListMaterialsInput = {}): Promise<ListMaterialsOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<MaterialRecord>({ collection: MATERIAL_COLLECTION, cursor: input.cursor, limit });
  const q = input.q?.toLowerCase();
  const items: MaterialView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.category && v.category !== input.category) return false;
      if (q) {
        const hay = [v.symbol, v.name].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .map((r) => ({ ...r.value, materialUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Depot ──────────────────────────────────────────────────────────

export async function registerDepot(e: Etzhayyim, input: RegisterDepotInput): Promise<RegisterDepotOutput> {
  if (!input.depotId || !input.name || !input.operator || !input.region) return { status: "rejected", error: "missingRequiredFields" };
  const rkey = depotRkey(input.depotId);
  const existing = await e.read<DepotRecord>({ collection: DEPOT_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", depotUri: existing.records[0].uri, did: existing.records[0].value.did, depotId: input.depotId };
  }
  const did = depotDidFor(input.depotId);
  const record: DepotRecord = {
    did,
    depotId: input.depotId,
    name: input.name,
    operator: input.operator,
    region: input.region,
    address: input.address,
    hours: input.hours,
    sourceUrl: input.sourceUrl,
    createdAt: new Date().toISOString(),
  };
  const receipt = await e.write({ collection: DEPOT_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "registered", depotUri: receipt.uri, did, depotId: input.depotId };
}

export async function getDepot(e: Etzhayyim, input: GetDepotInput): Promise<GetDepotOutput> {
  if (!input.depotId) return { error: "invalidDepotId" };
  const resp = await e.read<DepotRecord>({ collection: DEPOT_COLLECTION, rkey: depotRkey(input.depotId) }).catch(() => ({ records: [] }));
  const r = resp.records[0];
  if (!r) return { error: "notFound" };
  return { depot: { ...r.value, depotUri: r.uri } };
}

export async function listDepots(e: Etzhayyim, input: ListDepotsInput = {}): Promise<ListDepotsOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<DepotRecord>({ collection: DEPOT_COLLECTION, cursor: input.cursor, limit });
  const q = input.q?.toLowerCase();
  const items: DepotView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.region && v.region !== input.region) return false;
      if (input.operator && v.operator !== input.operator) return false;
      if (q && !v.name.toLowerCase().includes(q)) return false;
      return true;
    })
    .map((r) => ({ ...r.value, depotUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Safety guide ───────────────────────────────────────────────────

export async function addSafetyGuide(e: Etzhayyim, input: AddSafetyGuideInput): Promise<AddSafetyGuideOutput> {
  if (!input.guideId || !input.title || !input.instructions) return { status: "rejected", error: "missingRequiredFields" };
  if (!SAFETY_TOPICS.has(input.topic)) return { status: "rejected", error: "invalidTopic" };
  const rkey = guideRkey(input.guideId);
  const existing = await e.read<SafetyGuideRecord>({ collection: SAFETY_GUIDE_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", guideUri: existing.records[0].uri, did: existing.records[0].value.did, guideId: input.guideId };
  }
  const did = guideDidFor(input.guideId);
  const record: SafetyGuideRecord = {
    did,
    guideId: input.guideId,
    topic: input.topic,
    title: input.title,
    instructions: input.instructions,
    sourceUrl: input.sourceUrl,
    createdAt: new Date().toISOString(),
  };
  const receipt = await e.write({ collection: SAFETY_GUIDE_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "added", guideUri: receipt.uri, did, guideId: input.guideId };
}

export async function listSafetyGuides(e: Etzhayyim, input: ListSafetyGuidesInput = {}): Promise<ListSafetyGuidesOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<SafetyGuideRecord>({ collection: SAFETY_GUIDE_COLLECTION, cursor: input.cursor, limit });
  const items: SafetyGuideView[] = resp.records
    .filter((r) => !input.topic || r.value.topic === input.topic)
    .map((r) => ({ ...r.value, guideUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Acceptance (depot accepts material — two-FK edge) ──────────────

export async function recordAcceptance(e: Etzhayyim, input: RecordAcceptanceInput): Promise<RecordAcceptanceOutput> {
  if (!input.acceptanceId || !input.depotId || !input.materialId) return { status: "rejected", error: "missingRequiredFields" };
  if (!(await exists(e, DEPOT_COLLECTION, depotRkey(input.depotId)))) {
    return { status: "depotNotFound", error: `depotNotFound:${input.depotId}` };
  }
  if (!(await exists(e, MATERIAL_COLLECTION, materialRkey(input.materialId)))) {
    return { status: "materialNotFound", error: `materialNotFound:${input.materialId}` };
  }
  const rkey = acceptanceRkey(input.acceptanceId);
  const existing = await e.read<AcceptanceRecord>({ collection: ACCEPTANCE_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", acceptanceUri: existing.records[0].uri, did: existing.records[0].value.did, acceptanceId: input.acceptanceId };
  }
  const did = acceptanceDidFor(input.acceptanceId);
  const record: AcceptanceRecord = {
    did,
    acceptanceId: input.acceptanceId,
    depotId: input.depotId,
    materialId: input.materialId,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  const receipt = await e.write({ collection: ACCEPTANCE_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "recorded", acceptanceUri: receipt.uri, did, acceptanceId: input.acceptanceId };
}

export async function listAcceptances(e: Etzhayyim, input: ListAcceptancesInput = {}): Promise<ListAcceptancesOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<AcceptanceRecord>({ collection: ACCEPTANCE_COLLECTION, cursor: input.cursor, limit });
  const items: AcceptanceView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.depotId && v.depotId !== input.depotId) return false;
      if (input.materialId && v.materialId !== input.materialId) return false;
      return true;
    })
    .map((r) => ({ ...r.value, acceptanceUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Coverage ───────────────────────────────────────────────────────

export async function coverage(e: Etzhayyim, input: CoverageInput = {}): Promise<CoverageOutput> {
  const maxScan = Math.min(input.maxScan ?? DEFAULT_MAX_SCAN, DEFAULT_MAX_SCAN);
  const materialsByCategory: Record<string, number> = {};
  const depotsByRegion: Record<string, number> = {};
  const materialCount = await scanAll<MaterialRecord>(e, MATERIAL_COLLECTION, maxScan, (v) => {
    materialsByCategory[v.category] = (materialsByCategory[v.category] ?? 0) + 1;
  });
  const depotCount = await scanAll<DepotRecord>(e, DEPOT_COLLECTION, maxScan, (v) => {
    depotsByRegion[v.region] = (depotsByRegion[v.region] ?? 0) + 1;
  });
  const safetyGuideCount = await scanAll<SafetyGuideRecord>(e, SAFETY_GUIDE_COLLECTION, maxScan, () => {});
  const acceptanceCount = await scanAll<AcceptanceRecord>(e, ACCEPTANCE_COLLECTION, maxScan, () => {});
  return {
    materialCount,
    depotCount,
    safetyGuideCount,
    acceptanceCount,
    materialsByCategory,
    depotsByRegion,
    truncated:
      materialCount >= maxScan || depotCount >= maxScan || safetyGuideCount >= maxScan || acceptanceCount >= maxScan,
  };
}
