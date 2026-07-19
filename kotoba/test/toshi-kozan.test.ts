import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
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
} from "../src/index.js";

const SRC = "https://www.env.go.jp/urban-mining/example";

describe("toshi-kozan kotoba", () => {
  let e: any;
  beforeEach(() => {
    e = new MockEtzhayyim({ did: "did:web:toshi-kozan.etzhayyim.com" });
  });

  describe("material catalog", () => {
    it("registers materials (category validated), lists, searches symbol+name", async () => {
      expect((await registerMaterial(e, { materialId: "M-AU", symbol: "Au", name: "Gold", category: "precious", typicalSource: "connector pins", sourceUrl: SRC })).status).toBe("registered");
      expect((await registerMaterial(e, { materialId: "M-ND", symbol: "Nd", name: "Neodymium", category: "rare-earth", typicalSource: "HDD magnets" })).status).toBe("registered");
      expect((await registerMaterial(e, { materialId: "M-X", symbol: "X", name: "x", category: "antimatter" as any })).status).toBe("rejected"); // category
      expect((await listMaterials(e, { category: "precious" })).total).toBe(1);
      expect((await listMaterials(e, { q: "neodymium" })).total).toBe(1);
      expect((await listMaterials(e, { q: "au" })).total).toBe(1); // symbol hit
    });
  });

  describe("depot directory + safety guides", () => {
    it("registers depots, reads, lists; adds safety guides (topic validated)", async () => {
      expect((await registerDepot(e, { depotId: "D-1", name: "渋谷区 e-waste センター", operator: "Shibuya-ku", region: "JP-13", address: "...", hours: "09:00-17:00", sourceUrl: SRC })).status).toBe("registered");
      expect((await getDepot(e, { depotId: "D-1" })).depot?.region).toBe("JP-13");
      await registerDepot(e, { depotId: "D-2", name: "Osaka Recycle Hub", operator: "Osaka-shi", region: "JP-27" });
      expect((await listDepots(e, { region: "JP-13" })).total).toBe(1);
      expect((await listDepots(e, { q: "osaka" })).total).toBe(1);
      expect((await addSafetyGuide(e, { guideId: "G-1", topic: "battery", title: "リチウム電池の取り扱い", instructions: "端子をテープで絶縁してください" })).status).toBe("added");
      expect((await addSafetyGuide(e, { guideId: "G-X", topic: "nuclear" as any, title: "x", instructions: "y" })).status).toBe("rejected"); // topic
      expect((await listSafetyGuides(e, { topic: "battery" })).total).toBe(1);
    });
  });

  describe("acceptance edges (two-FK) + coverage", () => {
    beforeEach(async () => {
      await registerDepot(e, { depotId: "D-1", name: "Depot 1", operator: "op", region: "JP-13" });
      await registerMaterial(e, { materialId: "M-AU", symbol: "Au", name: "Gold", category: "precious" });
    });
    it("records depot-accepts-material (both FK), rejects missing depot/material", async () => {
      expect((await recordAcceptance(e, { acceptanceId: "A-1", depotId: "D-1", materialId: "M-AU", notes: "small electronics only" })).status).toBe("recorded");
      expect((await recordAcceptance(e, { acceptanceId: "A-X", depotId: "GHOST", materialId: "M-AU" })).status).toBe("depotNotFound");
      expect((await recordAcceptance(e, { acceptanceId: "A-Y", depotId: "D-1", materialId: "GHOST" })).status).toBe("materialNotFound");
      expect((await listAcceptances(e, { depotId: "D-1" })).total).toBe(1);
      expect((await listAcceptances(e, { materialId: "M-AU" })).total).toBe(1);
    });
    it("coverage rolls up all four collections by category/region", async () => {
      await registerMaterial(e, { materialId: "M-CU", symbol: "Cu", name: "Copper", category: "base" });
      await addSafetyGuide(e, { guideId: "G-1", topic: "general", title: "t", instructions: "i" });
      await recordAcceptance(e, { acceptanceId: "A-1", depotId: "D-1", materialId: "M-AU" });
      const cov = await coverage(e);
      expect(cov.materialCount).toBe(2);
      expect(cov.depotCount).toBe(1);
      expect(cov.safetyGuideCount).toBe(1);
      expect(cov.acceptanceCount).toBe(1);
      expect(cov.materialsByCategory?.precious).toBe(1);
      expect(cov.depotsByRegion?.["JP-13"]).toBe(1);
    });
  });
});
