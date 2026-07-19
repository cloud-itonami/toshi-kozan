/**
 * toshi-kozan (都市鉱山 / Urban Mining) kotoba — barrel.
 *
 * Per ADR-2606011400. Public urban-mining reference on the etzhayyim substrate
 * (AT PDS records; no RW).
 *
 *   material    : registerMaterial / listMaterials (symbol+name search)
 *   depot       : registerDepot / getDepot / listDepots (name search)
 *   safetyGuide : addSafetyGuide / listSafetyGuides
 *   acceptance  : recordAcceptance (FK→depot + FK→material) / listAcceptances
 *   coverage
 *
 * (c) MIXED SPLIT: the public reference migrates. The physical recovery pipeline
 * — receipt/ownership-transfer custody, image/classify Murakumo inference,
 * robotic disassembly + arm control + hc human labor (Liability), and batch
 * appraisal/valuation (Settlement) — STAYS etzhayyim via consent-capability.
 */

export * from "./types.js";
export {
  registerMaterial,
  listMaterials,
  registerDepot,
  getDepot,
  listDepots,
  addSafetyGuide,
  listSafetyGuides,
  recordAcceptance,
  listAcceptances,
  coverage,
} from "./registry.js";
