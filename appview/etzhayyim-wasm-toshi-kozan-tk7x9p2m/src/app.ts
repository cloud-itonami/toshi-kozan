import {
  createWorkerExport,
  nsid,
  parseLexiconInput,
  type LexiconOutput,
} from "@etzhayyim/kotodama-host-sdk";

export default createWorkerExport((sdk) => {
  // ════════════════════════════════════════════════════════
  // Actor DID registration (path-based DIDs)
  // ════════════════════════════════════════════════════════

  const ACTORS = [
    { path: "actor:guide", displayName: "案内 AI", description: "持込場所・手順・安全指示を案内" },
    { path: "actor:collector", displayName: "回収 AI", description: "回収拠点管理・ピックアップ手配" },
    { path: "actor:receiver", displayName: "受領 AI", description: "計量・受領証発行・所有権移転" },
    { path: "actor:eye", displayName: "画像認識 AI", description: "外観撮影・素材推定・損傷検出" },
    { path: "actor:classifier", displayName: "分類 AI", description: "素材分類・グレード判定" },
    { path: "actor:disassembler", displayName: "分解 AI", description: "BOM 分析・分解工程計画" },
    { path: "actor:arm", displayName: "ロボットアーム AI", description: "自動 pick-and-place・仕分け" },
    { path: "actor:hcDelegate", displayName: "HC 委任 AI", description: "hc.etzhayyim.com 人間タスク委任" },
    { path: "actor:appraiser", displayName: "鑑定 AI", description: "素材価値評価・市場価格連動" },
    { path: "actor:announcer", displayName: "告知 AI", description: "回収実績・キャンペーン告知" },
  ] as const;

  const actorDid = (role: string) => `did:web:toshi-kozan.etzhayyim.com:${role}`;

  // ════════════════════════════════════════════════════════
  // Guide (案内) — 持込場所・手順案内
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.guideDropoff"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.guideDropoff", body);
      // cross-actor removed (ADR-0047 audit 2026-04-21). Was: invoke maps.etzhayyim.com/nearbySearch.
      // TODO: reimplement via direct Hyperdrive SELECT on vertex_maps_depot once
      // cross-actor read RLS pattern is specified.
      console.log(`[toshi-kozan] guideDropoff request: lat=${input.lat} lng=${input.lng} — cross-actor stub`);
      return JSON.stringify({ ok: true, depots: [] });
    },
    {
      agentTool: "最寄りの都市鉱山回収拠点を案内",
      capabilityTags: ["guide", "navigation", "depot-search"],
    },
  );

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.guideSafety"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.guideSafety", body);
      // Murakumo LLM で安全指示を生成
      const safetyGuide = await sdk.hostImports.converse(
        `e-waste カテゴリ「${input.wasteCategory}」の安全な取り扱い手順と注意事項を説明してください。バッテリー膨張・液漏れ・有害物質のリスクを含めてください。`,
      );
      return JSON.stringify({ ok: true, safetyGuide });
    },
    {
      agentTool: "e-waste の安全取扱い手順を案内",
      capabilityTags: ["guide", "safety"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Collector (回収) — 拠点管理・ピックアップ
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.registerDepot"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.registerDepot", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.depot", {
        name: input.name,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        acceptCategories: input.acceptCategories,
        operatingHours: input.operatingHours,
        capacityKg: input.capacityKg,
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "回収拠点を登録",
      capabilityTags: ["collector", "depot"],
      responsible: { role: "collector" },
    },
  );

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.schedulePickup"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.schedulePickup", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.pickup", {
        providerDid: input.providerDid,
        depotId: input.depotId,
        wasteCategory: input.wasteCategory,
        estimatedWeightKg: input.estimatedWeightKg,
        scheduledAt: input.scheduledAt,
        status: "scheduled",
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "出張回収をスケジュール",
      capabilityTags: ["collector", "pickup", "scheduling"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Receiver (受領) — 計量・受領証発行
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.issueReceipt"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.issueReceipt", body);
      // cross-actor removed (ADR-0047 audit 2026-04-21). Was: invoke yabai.etzhayyim.com/screenItem
      // for theft detection. TODO: reimplement via shared vertex_yabai_entity SELECT
      // (hit check) or replace with classify_t1-style SQL UDF on serial_numbers.
      console.log(`[toshi-kozan] issueReceipt cross-actor stub: yabai screen skipped for ${input.serialNumbers?.length ?? 0} serials`);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.receipt", {
        pickupRkey: input.pickupRkey,
        providerDid: input.providerDid,
        wasteCategory: input.wasteCategory,
        weightKg: input.weightKg,
        itemCount: input.itemCount,
        serialNumbers: input.serialNumbers,
        receivedAt: new Date().toISOString(),
        depotName: input.depotName,
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "e-waste 受領証を発行",
      capabilityTags: ["receiver", "receipt", "weighing"],
      responsible: { role: "receiver" },
    },
  );

  // ════════════════════════════════════════════════════════
  // Eye (画像認識) — 素材推定・損傷検出
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.scanItem"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.scanItem", body);
      // Murakumo image inference で素材推定
      const inferenceResult = await sdk.hostImports.converse(
        `この e-waste 画像を分析してください。素材組成を推定し、以下の JSON 形式で回答: {"materials": [{"symbol": "Au", "confidence": 0.95, "location": "connector pins"}], "damage": [], "overallCondition": "good|fair|poor"}。画像 CID: ${input.imageCid}`,
      );
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.imageScan", {
        receiptRkey: input.receiptRkey,
        imageCid: input.imageCid,
        inferenceResult,
        scannedAt: new Date().toISOString(),
        actorDid: actorDid("actor:eye"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "e-waste の画像認識・素材推定",
      capabilityTags: ["eye", "image-recognition", "material-detection"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Classifier (分類) — 素材分類・グレード判定
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.classifyMaterial"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.classifyMaterial", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.classification", {
        imageScanRkey: input.imageScanRkey,
        materials: input.materials,
        grade: input.grade,
        route: input.route,
        classifiedAt: new Date().toISOString(),
        actorDid: actorDid("actor:classifier"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "素材を分類・グレード判定",
      capabilityTags: ["classifier", "material-science", "grading"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Disassembler (分解) — BOM 分析・工程計画
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.createDisassemblyPlan"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.createDisassemblyPlan", body);
      // LLM で BOM 分析 → 工程計画
      const plan = await sdk.hostImports.converse(
        `e-waste カテゴリ「${input.wasteCategory}」、素材グレード「${input.grade}」の分解計画を作成してください。各工程を "auto" (ロボットアーム) or "human" (精密手作業) に振り分け。JSON: {"steps": [{"id": 1, "name": "...", "type": "auto|human", "description": "...", "estimatedMinutes": N, "hazardLevel": "none|low|medium|high"}]}`,
      );
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.disassemblyPlan", {
        classificationRkey: input.classificationRkey,
        wasteCategory: input.wasteCategory,
        grade: input.grade,
        steps: plan,
        createdAt: new Date().toISOString(),
        actorDid: actorDid("actor:disassembler"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "分解計画を作成 (BOM 分析)",
      capabilityTags: ["disassembler", "bom-analysis", "process-planning"],
      responsible: { role: "disassembler" },
    },
  );

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.dispatchStep"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.dispatchStep", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.disassemblyStep", {
        planRkey: input.planRkey,
        stepId: input.stepId,
        type: input.type,
        description: input.description,
        status: "dispatched",
        dispatchedAt: new Date().toISOString(),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "分解工程ステップを arm or HC に振分け",
      capabilityTags: ["disassembler", "dispatch"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Arm (ロボットアーム) — 自動 pick-and-place
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.executeArmCommand"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.executeArmCommand", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.armCommand", {
        stepRkey: input.stepRkey,
        action: input.action,
        targetBin: input.targetBin,
        materialSymbol: input.materialSymbol,
        status: "executing",
        commandedAt: new Date().toISOString(),
        actorDid: actorDid("actor:arm"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "ロボットアームに分離・仕分け指令",
      capabilityTags: ["arm", "robotic-control", "pick-place"],
      responsible: { role: "arm" },
      requireApproval: { class: "A", count: 1, level: "high" },
    },
  );

  // ════════════════════════════════════════════════════════
  // HC Delegate (HC 委任) — hc.etzhayyim.com 人間タスク
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.delegateToHc"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.delegateToHc", body);
      // cross-actor removed (ADR-0047 audit 2026-04-21). Was: invoke hc.etzhayyim.com/createTask.
      // The local hcTask record below is the write-only derived source; hc can
      // consume via its own onCommit / MV on com.etzhayyim.apps.toshiKozan.hcTask once
      // ADR-0004 derive pattern is wired for this actor pair.
      console.log(`[toshi-kozan] delegateToHc cross-actor stub: ${input.hcCategory} stepRkey=${input.stepRkey}`);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.hcTask", {
        stepRkey: input.stepRkey,
        hcCategory: input.hcCategory,
        title: input.title,
        description: input.description,
        difficulty: input.difficulty,
        rewardJpy: input.rewardJpy,
        hazardLevel: input.hazardLevel,
        status: "pending",
        delegatedAt: new Date().toISOString(),
        actorDid: actorDid("actor:hcDelegate"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "hc.etzhayyim.com に人間タスクを委任",
      capabilityTags: ["hc-delegate", "human-task", "crowdsourcing"],
      responsible: { role: "hcDelegate" },
    },
  );

  // ════════════════════════════════════════════════════════
  // Appraiser (鑑定) — 素材価値評価
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.appraiseBatch"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.appraiseBatch", body);
      // cross-actor removed (ADR-0047 audit 2026-04-21). Was: invoke kakaku.etzhayyim.com/getPrice
      // for LME market prices. TODO: reimplement via direct Hyperdrive SELECT on
      // vertex_kakaku_price (or a `kakaku_latest_price(symbol, exchange)` SQL UDF).
      console.log(`[toshi-kozan] appraiseBatch cross-actor stub: ${(input.materialSymbols ?? []).join(",")}`);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.appraisal", {
        batchRkey: input.batchRkey,
        materialName: input.materialName,
        materialSymbols: input.materialSymbols,
        weightKg: input.weightKg,
        grade: input.grade,
        marketPrices: {},
        economicValueJpy: input.economicValueJpy,
        co2SavedKg: input.co2SavedKg,
        appraisedAt: new Date().toISOString(),
        actorDid: actorDid("actor:appraiser"),
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "回収素材の価値を鑑定",
      capabilityTags: ["appraiser", "valuation", "market-price"],
      responsible: { role: "appraiser" },
    },
  );

  // ════════════════════════════════════════════════════════
  // Announcer (告知) — 回収実績・キャンペーン
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.announceCampaign"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.announceCampaign", body);
      await sdk.pds.dispatch({
        type: "app.bsky.feed.post",
        did: actorDid("actor:announcer"),
        text: `[都市鉱山キャンペーン] ${input.title}\n${input.description}\n期間: ${input.startDate} 〜 ${input.endDate}`,
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "都市鉱山キャンペーンを告知",
      capabilityTags: ["announcer", "campaign", "social-post"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Material & Waste master registration
  // ════════════════════════════════════════════════════════

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.registerMaterial"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.registerMaterial", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.material", {
        symbol: input.symbol,
        name: input.name,
        category: input.category,
        unit: input.unit,
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "回収対象素材マスタを登録",
      capabilityTags: ["material", "master-data"],
    },
  );

  sdk.app.command(
    nsid("com.etzhayyim.apps.toshiKozan.registerWaste"),
    async (ctx, body) => {
      const input = parseLexiconInput("com.etzhayyim.apps.toshiKozan.registerWaste", body);
      await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.waste", {
        category: input.category,
        name: input.name,
        typicalMaterials: input.typicalMaterials,
        hazardClass: input.hazardClass,
      });
      return JSON.stringify({ ok: true });
    },
    {
      agentTool: "廃棄物カテゴリマスタを登録",
      capabilityTags: ["waste", "master-data"],
    },
  );

  // ════════════════════════════════════════════════════════
  // Shinka (進化) — joucho 情緒 cadence heartbeat
  // ════════════════════════════════════════════════════════

  // Target collections for inbox accumulation
  const TK_COLLECTIONS = new Set([
    "com.etzhayyim.apps.toshiKozan.receipt",
    "com.etzhayyim.apps.toshiKozan.imageScan",
    "com.etzhayyim.apps.toshiKozan.classification",
    "com.etzhayyim.apps.toshiKozan.batch",
    "com.etzhayyim.apps.toshiKozan.appraisal",
    "com.etzhayyim.apps.toshiKozan.hcTask",
    "com.etzhayyim.apps.toshiKozan.armCommand",
    "com.etzhayyim.apps.collector.pickup",
  ]);

  sdk.app.onHeartbeat(async (cadence, { pds }) => {
    const extra: Array<Record<string, unknown>> = [];

    // ── shouldAnalyze: 回収統計の定期分析 ──
    if (cadence.shouldAnalyze) {
      try {
        const db = (await import("@etzhayyim/kotodama-host-sdk")).createKyselyDb(
          (globalThis as any).__env?.HYPERDRIVE,
        );
        const stats = await db
          .selectFrom(LEGACY_VERTEX_OTHER_COUNT_TABLE as any)
          .select([(eb: any) => eb.fn.sum("cnt").as("total")])
          .where("collection" as any, "=", "com.etzhayyim.apps.toshiKozan.appraisal")
          .executeTakeFirst();
        extra.push({ action: "analyze", appraisalCount: Number(stats?.total ?? 0) });
      } catch (e) {
        console.warn("[heartbeat] analyze:", e);
      }
    }

    // ── shouldDrill: kyumei-koji 自己調査 (素材市場動向) ──
    if (cadence.shouldDrill) {
      extra.push({ action: "drill", topic: "material-market-trends" });
    }

    return extra;
  });

  // ════════════════════════════════════════════════════════
  // Reactive pipeline — onCommit handlers
  // ════════════════════════════════════════════════════════

  sdk.app.onCommit(async (commit) => {
    for (const op of commit.ops) {
      if (op.action !== "create") continue;
      const record = op.record as Record<string, unknown>;

      // ── Shinka: inbox に commit を蓄積 (cadence 解決用) ──
      if (TK_COLLECTIONS.has(op.collection)) {
        sdk.app.pushInboundCommit({
          collection: op.collection,
          repo: commit.repo,
          rkey: op.rkey,
          time: new Date().toISOString(),
        });
      }

      // ── collector.etzhayyim.com pickup → receiver: 自動受領 ──
      if (op.collection === "com.etzhayyim.apps.collector.pickup") {
        if (record.category && record.weightKg) {
          await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.receipt", {
            wasteCategory: record.category,
            weightKg: record.weightKg,
            providerDid: record.providerDid ?? "unknown",
            receivedAt: new Date().toISOString(),
            depotName: record.depotName ?? "auto-intake",
          });
        }
      }

      // ── receipt → eye: 自動画像スキャン依頼 ──
      if (op.collection === "com.etzhayyim.apps.toshiKozan.receipt" && record.imageCid) {
        await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.imageScan", {
          receiptRkey: op.rkey,
          imageCid: record.imageCid,
          scannedAt: new Date().toISOString(),
          actorDid: actorDid("actor:eye"),
        });
      }

      // ── imageScan → classifier: 自動分類 ──
      if (op.collection === "com.etzhayyim.apps.toshiKozan.imageScan" && record.inferenceResult) {
        await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.classification", {
          imageScanRkey: op.rkey,
          materials: record.inferenceResult,
          classifiedAt: new Date().toISOString(),
          actorDid: actorDid("actor:classifier"),
        });
      }

      // ── classification → disassembler: 自動分解計画 ──
      if (op.collection === "com.etzhayyim.apps.toshiKozan.classification" && record.route === "disassembly") {
        await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.disassemblyPlan", {
          classificationRkey: op.rkey,
          wasteCategory: record.wasteCategory,
          grade: record.grade,
          createdAt: new Date().toISOString(),
          actorDid: actorDid("actor:disassembler"),
        });
      }

      // ── disassemblyStep(type=auto) → arm: ロボットアーム実行 ──
      if (op.collection === "com.etzhayyim.apps.toshiKozan.disassemblyStep" && record.type === "auto") {
        await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.armCommand", {
          stepRkey: op.rkey,
          action: record.action ?? "pick-and-sort",
          targetBin: record.targetBin,
          materialSymbol: record.materialSymbol,
          status: "executing",
          commandedAt: new Date().toISOString(),
          actorDid: actorDid("actor:arm"),
        });
      }

      // ── disassemblyStep(type=human) → hcDelegate: HC タスク委任 ──
      if (op.collection === "com.etzhayyim.apps.toshiKozan.disassemblyStep" && record.type === "human") {
        const hazardLevel = (record.hazardLevel as string) ?? "low";
        const category = hazardLevel === "high" ? "tk-hazmat-handling" : "tk-precision-disassembly";
        const rewardJpy = hazardLevel === "high" ? 15000 : 5000;
        // cross-actor removed (ADR-0047 audit 2026-04-21). The hcTask record below is
        // the write-only derived source for hc.etzhayyim.com — no outbound invoke.
        await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.hcTask", {
          stepRkey: op.rkey,
          hcCategory: category,
          title: `都市鉱山分解: ${record.description}`,
          hazardLevel,
          rewardJpy,
          status: "pending",
          delegatedAt: new Date().toISOString(),
          actorDid: actorDid("actor:hcDelegate"),
        });
      }

      // ── armCommand/hcTask completed → appraiser: 自動鑑定 ──
      if (
        (op.collection === "com.etzhayyim.apps.toshiKozan.armCommand" && record.status === "completed") ||
        (op.collection === "com.etzhayyim.apps.toshiKozan.hcTask" && record.status === "completed")
      ) {
        if (record.materialSymbol && record.weightKg) {
          // cross-actor removed (ADR-0047 audit 2026-04-21). Was: invoke kakaku.etzhayyim.com
          // for LME price lookup — the call was fire-and-forget and its result
          // was not embedded in the appraisal record. Safely deleted.
          await sdk.pds.writePublic("com.etzhayyim.apps.toshiKozan.appraisal", {
            materialSymbols: [record.materialSymbol],
            weightKg: record.weightKg,
            grade: record.grade ?? "standard",
            appraisedAt: new Date().toISOString(),
            actorDid: actorDid("actor:appraiser"),
          });
        }
      }
    }
  });
});
