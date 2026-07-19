/**
 * toshi-kozan (都市鉱山 / Urban Mining) kotoba — public urban-mining reference:
 * recoverable-material catalog + depot directory + safety guidance + depot-
 * acceptance edges.
 *
 * Per ADR-2606011400 (Consensys pattern) + ADR-2605172400 (3-axis OR-test).
 *
 * SPLIT (this app is (c) mixed):
 *   PUBLIC (THIS PACKAGE) — the consumer-facing reference surface: where to drop
 *   off e-waste (depot directory), how to do it safely (safety guidance), what
 *   materials are recoverable (material catalog), and which depot accepts which
 *   material. All public open-data, no PII / settlement / custody.
 *     → migrated to etzhayyim front (AT PDS records, replaces RW).
 *
 *   PIPELINE (STAYS etzhayyim, NOT in this package) — the physical recovery pipeline:
 *   receipt issuance + ownership transfer + weighing (goods Custody + theft
 *   detection), image/classify Murakumo inference (compute), robotic disassembly
 *   + arm control (Liability / 善管注意義務 + machine safety), hc human-labor
 *   delegation, and batch appraisal / material valuation (Settlement). Remains a
 *   etzhayyim regulated function consumed via consent-capability.
 *
 * AT-Lexicon: no float. Geo is a coarse region string (precise depot coords stay
 * provider-side). Material grades / valuations are pipeline-side (settlement).
 *
 * Identity hierarchy:
 *   did:web:toshi-kozan.etzhayyim.com                          — controller
 *   did:web:toshi-kozan.etzhayyim.com:mat:{materialId}         — a material
 *   did:web:toshi-kozan.etzhayyim.com:depot:{depotId}          — a collection depot
 *   did:web:toshi-kozan.etzhayyim.com:guide:{guideId}          — a safety guide
 *   did:web:toshi-kozan.etzhayyim.com:accept:{acceptanceId}    — a depot-accepts-material edge
 */

export const TOSHIKOZAN_DID_PREFIX = "did:web:toshi-kozan.etzhayyim.com:" as const;

export const MATERIAL_COLLECTION = "com.etzhayyim.apps.toshiKozan.material";
export const DEPOT_COLLECTION = "com.etzhayyim.apps.toshiKozan.depot";
export const SAFETY_GUIDE_COLLECTION = "com.etzhayyim.apps.toshiKozan.safetyGuide";
export const ACCEPTANCE_COLLECTION = "com.etzhayyim.apps.toshiKozan.acceptance";

// ─── Enums ──────────────────────────────────────────────────────────

export type MaterialCategory = "precious" | "base" | "rare-earth" | "rare-metal" | "ferrous" | "plastic" | "other";
export type SafetyTopic = "battery" | "crt" | "mercury" | "capacitor" | "general" | "other";

export const MATERIAL_CATEGORIES: ReadonlySet<string> = new Set([
  "precious",
  "base",
  "rare-earth",
  "rare-metal",
  "ferrous",
  "plastic",
  "other",
]);
export const SAFETY_TOPICS: ReadonlySet<string> = new Set(["battery", "crt", "mercury", "capacitor", "general", "other"]);

// ─── Material (recoverable-material reference) ──────────────────────

export interface MaterialRecord {
  did: string;
  materialId: string;
  /** Element / alloy symbol, e.g. "Au", "Nd", "Cu". */
  symbol: string;
  name: string;
  category: MaterialCategory;
  /** Typical source in e-waste, e.g. "connector pins". */
  typicalSource?: string;
  sourceUrl?: string;
  createdAt: string;
}
export interface MaterialView extends MaterialRecord {
  materialUri: string;
}
export interface RegisterMaterialInput {
  materialId: string;
  symbol: string;
  name: string;
  category: MaterialCategory;
  typicalSource?: string;
  sourceUrl?: string;
}
export interface RegisterMaterialOutput {
  status: "registered" | "alreadyExists" | "rejected";
  materialUri?: string;
  did?: string;
  materialId?: string;
  error?: string;
}
export interface ListMaterialsInput {
  category?: MaterialCategory;
  /** App-layer substring search over symbol + name. */
  q?: string;
  limit?: number;
  cursor?: string;
}
export interface ListMaterialsOutput {
  items: MaterialView[];
  cursor?: string;
  total: number;
}

// ─── Depot (collection point) ───────────────────────────────────────

export interface DepotRecord {
  did: string;
  depotId: string;
  name: string;
  operator: string;
  /** Coarse region (country/prefecture/city), not precise coords. */
  region: string;
  address?: string;
  hours?: string;
  sourceUrl?: string;
  createdAt: string;
}
export interface DepotView extends DepotRecord {
  depotUri: string;
}
export interface RegisterDepotInput {
  depotId: string;
  name: string;
  operator: string;
  region: string;
  address?: string;
  hours?: string;
  sourceUrl?: string;
}
export interface RegisterDepotOutput {
  status: "registered" | "alreadyExists" | "rejected";
  depotUri?: string;
  did?: string;
  depotId?: string;
  error?: string;
}
export interface GetDepotInput {
  depotId: string;
}
export interface GetDepotOutput {
  depot?: DepotView;
  error?: string;
}
export interface ListDepotsInput {
  region?: string;
  operator?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}
export interface ListDepotsOutput {
  items: DepotView[];
  cursor?: string;
  total: number;
}

// ─── Safety guide ───────────────────────────────────────────────────

export interface SafetyGuideRecord {
  did: string;
  guideId: string;
  topic: SafetyTopic;
  title: string;
  instructions: string;
  sourceUrl?: string;
  createdAt: string;
}
export interface SafetyGuideView extends SafetyGuideRecord {
  guideUri: string;
}
export interface AddSafetyGuideInput {
  guideId: string;
  topic: SafetyTopic;
  title: string;
  instructions: string;
  sourceUrl?: string;
}
export interface AddSafetyGuideOutput {
  status: "added" | "alreadyExists" | "rejected";
  guideUri?: string;
  did?: string;
  guideId?: string;
  error?: string;
}
export interface ListSafetyGuidesInput {
  topic?: SafetyTopic;
  limit?: number;
  cursor?: string;
}
export interface ListSafetyGuidesOutput {
  items: SafetyGuideView[];
  cursor?: string;
  total: number;
}

// ─── Acceptance (depot accepts material — two-FK edge) ──────────────

export interface AcceptanceRecord {
  did: string;
  acceptanceId: string;
  /** FK → depot. */
  depotId: string;
  /** FK → material. */
  materialId: string;
  notes?: string;
  createdAt: string;
}
export interface AcceptanceView extends AcceptanceRecord {
  acceptanceUri: string;
}
export interface RecordAcceptanceInput {
  acceptanceId: string;
  depotId: string;
  materialId: string;
  notes?: string;
}
export interface RecordAcceptanceOutput {
  status: "recorded" | "alreadyExists" | "rejected" | "depotNotFound" | "materialNotFound";
  acceptanceUri?: string;
  did?: string;
  acceptanceId?: string;
  error?: string;
}
export interface ListAcceptancesInput {
  depotId?: string;
  materialId?: string;
  limit?: number;
  cursor?: string;
}
export interface ListAcceptancesOutput {
  items: AcceptanceView[];
  cursor?: string;
  total: number;
}

// ─── Coverage ───────────────────────────────────────────────────────

export interface CoverageInput {
  maxScan?: number;
}
export interface CoverageOutput {
  materialCount?: number;
  depotCount?: number;
  safetyGuideCount?: number;
  acceptanceCount?: number;
  materialsByCategory?: Record<string, number>;
  depotsByRegion?: Record<string, number>;
  truncated?: boolean;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function materialDidFor(id: string): string {
  return `${TOSHIKOZAN_DID_PREFIX}mat:${id.toLowerCase()}`;
}
export function materialRkey(id: string): string {
  return `mat-${id.toLowerCase()}`;
}
export function depotDidFor(id: string): string {
  return `${TOSHIKOZAN_DID_PREFIX}depot:${id.toLowerCase()}`;
}
export function depotRkey(id: string): string {
  return `depot-${id.toLowerCase()}`;
}
export function guideDidFor(id: string): string {
  return `${TOSHIKOZAN_DID_PREFIX}guide:${id.toLowerCase()}`;
}
export function guideRkey(id: string): string {
  return `guide-${id.toLowerCase()}`;
}
export function acceptanceDidFor(id: string): string {
  return `${TOSHIKOZAN_DID_PREFIX}accept:${id.toLowerCase()}`;
}
export function acceptanceRkey(id: string): string {
  return `accept-${id.toLowerCase()}`;
}
