# etzhayyim-project-toshi-kozan — 都市鉱山 App

共通ルールは `60-apps/CLAUDE.md` と `70-tools/CLAUDE.md` を参照。

## Overview

toshi-kozan.etzhayyim.com — 都市鉱山 (Urban Mining) インテリジェンス。使用済み電子機器・廃棄物から貴金属・レアメタル・レアアースを回収するための end-to-end パイプライン。回収案内 → 受領 → 画像認識 → 分類 → 分解 → ロボットアーム自動分離 → 人間精密作業 (hc.etzhayyim.com) → 鑑定 → 告知 の全工程を 10 actor が協調処理する。

## Actor Topology

```
[市民/企業]
  │
  ▼
 guide (案内: 持込場所・手順・安全指示)
  │
  ▼
 collector (回収: 拠点管理・ピックアップ手配・物流)
  │
  ▼
 receiver (受領: 計量・受領証発行・所有権移転)
  │
  ├──────────────────┐
  ▼                  ▼
 eye (画像認識)    announcer (告知: 実績・キャンペーン)
  │                  ▲
  ▼                  │
 classifier (分類: 素材判定・グレード)
  │                  │
  ▼                  │
 disassembler (分解: 工程計画・部品分離)
  │                  │
  ├──────┐           │
  ▼      ▼           │
 arm    [HC]          │
 (自動)  (人間)        │
  │      │           │
  ▼      ▼           │
 appraiser (鑑定: 素材価値・市場価格) ──┘
```

## Project Actor Composition

| Actor | DID | Role | Capability |
|---|---|---|---|
| **controller** | `did:web:toshi-kozan.etzhayyim.com` | Orchestration, project lifecycle | pipeline 統括 |
| **guide** | `did:web:toshi-kozan.etzhayyim.com:actor:guide` | 案内 AI — 持込場所・手順・安全指示 | agent.chat, maps 連携 |
| **collector** | `did:web:toshi-kozan.etzhayyim.com:actor:collector` | 回収 AI — 拠点管理・ピックアップ手配 | graph.write, logistics |
| **receiver** | `did:web:toshi-kozan.etzhayyim.com:actor:receiver` | 受領 AI — 計量・受領証発行・所有権移転 | graph.write, receipt |
| **eye** | `did:web:toshi-kozan.etzhayyim.com:actor:eye` | 画像認識 AI — 外観撮影・素材推定・損傷検出 | image inference, Murakumo |
| **classifier** | `did:web:toshi-kozan.etzhayyim.com:actor:classifier` | 分類 AI — 素材分類・グレード判定・下流ルーティング | material science, graph.write |
| **disassembler** | `did:web:toshi-kozan.etzhayyim.com:actor:disassembler` | 分解 AI — 分解計画・工程管理・部品追跡 | BOM analysis, process planning |
| **arm** | `did:web:toshi-kozan.etzhayyim.com:actor:arm` | ロボットアーム AI — 自動分離・仕分け・ビン配置 | robotic control, IoT |
| **hcDelegate** | `did:web:toshi-kozan.etzhayyim.com:actor:hcDelegate` | HC 委任 AI — 人間タスク生成・進捗追跡 | hc.etzhayyim.com invoke |
| **appraiser** | `did:web:toshi-kozan.etzhayyim.com:actor:appraiser` | 鑑定 AI — 素材価値評価・市場価格連動 | kakaku 連携, valuation |
| **announcer** | `did:web:toshi-kozan.etzhayyim.com:actor:announcer` | 告知 AI — 回収実績・キャンペーン・社会投稿 | derive:social |

## Domain Model

| 概念 | Graph Label | 説明 |
|---|---|---|
| **素材 (Material)** | `TkMaterial` | 回収対象の金属・レアアース元素 (Au, Ag, Pt, Pd, Cu, In, Ga, Nd, Dy 等) |
| **廃棄物 (Waste)** | `TkWaste` | e-waste カテゴリ (基板, バッテリー, ディスプレイ, HDD 等) |
| **組成 (Composition)** | `TkComposition` | 廃棄物あたりの素材含有量・品位 (g/t) |
| **回収拠点 (Depot)** | `TkDepot` | 回収拠点の位置・営業時間・受入可能カテゴリ |
| **ピックアップ (Pickup)** | `TkPickup` | 出張回収の予約・ルート・ステータス |
| **受領 (Receipt)** | `TkReceipt` | 受入記録 — 計量結果・受領証・提供者 DID |
| **画像解析 (ImageScan)** | `TkImageScan` | 撮影画像・AI 推定結果・素材候補・信頼度 |
| **分類結果 (Classification)** | `TkClassification` | 素材分類・グレード・下流工程指示 |
| **分解計画 (DisassemblyPlan)** | `TkDisassemblyPlan` | BOM ベース分解工程・自動/人間の振分け |
| **分解工程 (DisassemblyStep)** | `TkDisassemblyStep` | 個別工程ステップ (arm or HC) |
| **アーム指令 (ArmCommand)** | `TkArmCommand` | ロボットアーム制御指令 (pick/place/sort) |
| **HC タスク (HcTask)** | `TkHcTask` | hc.etzhayyim.com に委任した人間タスク |
| **回収バッチ (Batch)** | `TkBatch` | 回収処理バッチ (投入量, 回収量, 回収率) |
| **鑑定 (Appraisal)** | `TkAppraisal` | 素材価値評価・市場価格・CO2 削減量 |
| **回収施設 (Facility)** | `TkFacility` | 精錬・分離施設の処理能力・稼働状況 |
| **イベント (Event)** | `TkEvent` | 状態変更の監査ログ |

## Edge Predicates

| Predicate | Domain → Range | 説明 |
|---|---|---|
| `CONTAINS_MATERIAL` | TkWaste → TkComposition | 廃棄物の素材組成 |
| `COMPOSITION_OF` | TkComposition → TkMaterial | 組成の対象素材 |
| `COLLECTED_AT` | TkPickup → TkDepot | ピックアップの回収拠点 |
| `RECEIVED_AS` | TkPickup → TkReceipt | 受領記録 |
| `SCANNED_BY` | TkReceipt → TkImageScan | 画像解析結果 |
| `CLASSIFIED_AS` | TkImageScan → TkClassification | 分類結果 |
| `PLAN_FOR` | TkClassification → TkDisassemblyPlan | 分解計画 |
| `HAS_STEP` | TkDisassemblyPlan → TkDisassemblyStep | 分解工程 |
| `ARM_EXEC` | TkDisassemblyStep → TkArmCommand | ロボットアーム実行 |
| `HC_EXEC` | TkDisassemblyStep → TkHcTask | 人間タスク実行 |
| `PRODUCED_BY` | TkBatch → TkDisassemblyPlan | バッチの元工程 |
| `APPRAISED` | TkBatch → TkAppraisal | 鑑定結果 |
| `PROCESSED_AT` | TkBatch → TkFacility | 処理施設 |
| `SUPPLIED_TO` | TkMaterial → ExternalConsumer | 回収素材の供給先 |

## Material Categories

| Category | Elements | Primary Source |
|---|---|---|
| **貴金属 (Precious)** | Au, Ag, Pt, Pd | 基板, コネクタ, 触媒 |
| **ベースメタル (Base)** | Cu, Al, Fe, Sn, Pb, Zn | 配線, 筐体, はんだ |
| **レアアース (REE)** | Nd, Dy, La, Ce, Pr, Sm | モーター, HDD, ディスプレイ |
| **レアメタル (Minor)** | In, Ga, Li, Co, Ta, W | LCD, LED, バッテリー, コンデンサ |

## Actor Data Flow (Pipeline)

### 1. Guide → Collector (案内 → 回収)

```
市民/企業 → guide.chat("スマホを処分したい")
  → guide: maps.etzhayyim.com invoke → 最寄り depot 検索
  → guide: 持込手順・安全注意事項を回答
  → collector: createPickup (出張回収予約) or depot 持込案内
```

### 2. Collector → Receiver (回収 → 受領)

```
collector: pickup 完了 → onCommit
  → receiver: issueReceipt (計量・受領証発行)
  → receiver: transferOwnership (提供者 DID → toshi-kozan DID)
```

### 3. Receiver → Eye (受領 → 画像認識)

```
receiver: receipt 作成 → onCommit
  → eye: scanItem (Murakumo image inference)
  → eye: identifyMaterials (素材候補・信頼度リスト)
  → eye: detectDamage (損傷・汚染検出)
```

### 4. Eye → Classifier (画像認識 → 分類)

```
eye: imageScan 完了 → onCommit
  → classifier: classifyMaterial (素材分類・グレード判定)
  → classifier: routeDownstream (自動分解 or 人間分解 or 直接精錬)
```

### 5. Classifier → Disassembler (分類 → 分解)

```
classifier: classification 完了 → onCommit
  → disassembler: createPlan (BOM 分析 → 分解工程生成)
  → disassembler: assignSteps (各工程を arm or HC に振分け)
```

### 6. Disassembler → Arm / HC (分解 → 自動/人間)

```
disassembler: step(type=auto) → onCommit
  → arm: executePickPlace (ロボットアーム pick-and-place)
  → arm: sortToBin (素材別ビン仕分け)

disassembler: step(type=human) → onCommit
  → hcDelegate: createHcTask (hc.etzhayyim.com invoke)
  → hcDelegate: trackCompletion (完了追跡)
  → HC worker が精密分解・危険物処理を実行
```

### 7. Arm/HC → Appraiser (完了 → 鑑定)

```
arm/hcDelegate: step 完了 → onCommit
  → appraiser: assessValue (素材重量 × 市場価格)
  → appraiser: kakaku.etzhayyim.com invoke (LME/TOCOM 価格取得)
  → appraiser: calculateCo2Saved (環境インパクト)
```

### 8. Appraiser → Announcer (鑑定 → 告知)

```
appraiser: appraisal 完了 → derive:social
  → announcer: postAchievement (回収実績投稿)
  → announcer: campaignNotify (キャンペーン告知)
```

## HC Task Categories (hc.etzhayyim.com 委任タスク)

| Category | 用途 | Difficulty | Reward |
|---|---|---|---|
| `tk-precision-disassembly` | 精密分解 (微細部品・はんだ除去) | hard | ¥3,000-10,000 |
| `tk-hazmat-handling` | 危険物処理 (Li バッテリー・Hg 含有) | expert | ¥10,000-30,000 |
| `tk-visual-qc` | 目視品質検査 (AI 判定の人間確認) | medium | ¥500-1,000 |
| `tk-sorting-assist` | 手動仕分け補助 (ロボット不適品) | easy | ¥1,000-3,000 |
| `tk-depot-ops` | 回収拠点運営 (受付・計量) | medium | ¥1,500-5,000/h |

## Cross-Project Dependencies

| Project | 関係 | Direction |
|---|---|---|
| `hc.etzhayyim.com` | 人間タスク委任 (精密分解・危険物・QC) | toshi-kozan → HC (Invoke) |
| `maps.etzhayyim.com` | 回収拠点の空間配置・物流ルート | toshi-kozan → maps (Invoke) |
| `kakaku.etzhayyim.com` | 素材市場価格データ (LME/TOCOM) | toshi-kozan → kakaku (Invoke) |
| `energy.etzhayyim.com` | 精錬プロセスのエネルギー消費 | toshi-kozan → energy (query) |
| `society6.etzhayyim.com` | 循環経済指標への寄与 | toshi-kozan → society6 (derive) |
| `collector.etzhayyim.com` | 廃棄物収集パイプライン上流 | collector → toshi-kozan (onCommit) |
| `murakumo.etzhayyim.com` | 画像認識・LLM 推論 | toshi-kozan → Murakumo (inference) |
| `yabai.etzhayyim.com` | 違法廃棄物・盗品スクリーニング | toshi-kozan → yabai (Invoke) |
| `trust.etzhayyim.com` | 提供者 DID 信頼スコア | toshi-kozan → trust (query) |

## COFOG Classification

| COFOG Code | Description |
|---|---|
| 05.1 | Waste management |
| 05.3 | Pollution abatement |
| 04.4 | Mining, manufacturing and construction |

## Shinka (進化) — joucho 情緒 Cadence Heartbeat

`resolveHeartbeatCadence` + `sdk.app.onHeartbeat()` + `sdk.app.pushInboundCommit()` で自律進化。

### InboxBuffer 蓄積対象

| Collection | 蓄積タイミング |
|---|---|
| `com.etzhayyim.apps.toshiKozan.receipt` | 廃棄物受領時 |
| `com.etzhayyim.apps.toshiKozan.imageScan` | 画像解析完了時 |
| `com.etzhayyim.apps.toshiKozan.classification` | 分類完了時 |
| `com.etzhayyim.apps.toshiKozan.batch` | バッチ完了時 |
| `com.etzhayyim.apps.toshiKozan.appraisal` | 鑑定完了時 |
| `com.etzhayyim.apps.toshiKozan.hcTask` | HC タスク状態変更時 |
| `com.etzhayyim.apps.toshiKozan.armCommand` | アーム指令完了時 |
| `com.etzhayyim.apps.collector.pickup` | collector 上流からの pickup 到着時 |

### Mood-Driven 行動パターン

| Mood | 条件 | 都市鉱山での行動 |
|---|---|---|
| **joyful** | joy≥60 | 回収実績を祝福投稿 (inbox の appraisal commit を題材)、follower reward 活発 |
| **calm** | calm≥60 | 回収統計の定期分析 (Kysely で appraisal 集計)、素材組成レポート |
| **stressed** | stress≥70 | 投稿抑制、recovery モード |
| **grateful** | gratitude≥60 | 提供者への感謝投稿、HC worker の完了を祝福 |
| **focused** | focus≥60 | 素材市場動向調査 (kyumei-koji)、BOM 分析深掘り |
| **neutral** | default | バランス投稿、inbox 消化 |

### Heartbeat フック (ドメイン固有)

| Cadence Flag | 動作 |
|---|---|
| `shouldPost` | **自動** (host-sdk `runDefaultHeartbeat` が inbox commit を題材に社会投稿) |
| `shouldEngage` | **自動** (follower の wellness/dojo スコア上昇 → like/love) |
| `shouldAnalyze` | Kysely で dedicated appraisal table の統計を集計 |
| `shouldDrill` | kyumei-koji: 素材市場動向 (LME/TOCOM トレンド) の自己調査 |
| `followerRewards` | **自動** (host-sdk が follower KPI を検出して報酬) |

### Derive Rules (自動導出)

| Trigger | Action | Template |
|---|---|---|
| `com.etzhayyim.apps.toshiKozan.appraisal` | `derive:social` | `[都市鉱山] 回収バッチ完了 — {{grade}} grade {{materialName}} {{weightKg}}kg 回収 (市場価値 ¥{{economicValueJpy}}, CO2削減 {{co2SavedKg}}kg)` |
| `com.etzhayyim.apps.toshiKozan.receipt` (>100kg) | `derive:social` | `[都市鉱山] 大口受入: {{wasteCategory}} {{weightKg}}kg を {{depotName}} で受領` |
| `com.etzhayyim.apps.toshiKozan.hcTask` (pending) | `derive:invoke` | `hc.etzhayyim.com` に HC タスク自動生成 |

## Commands (XRPC)

| NSID | Actor | 説明 |
|---|---|---|
| `com.etzhayyim.apps.toshiKozan.guideDropoff` | guide | 最寄り回収拠点を案内 (maps 連携) |
| `com.etzhayyim.apps.toshiKozan.guideSafety` | guide | 安全取扱い手順を案内 (LLM 生成) |
| `com.etzhayyim.apps.toshiKozan.registerDepot` | collector | 回収拠点マスタ登録 |
| `com.etzhayyim.apps.toshiKozan.schedulePickup` | collector | 出張回収スケジュール |
| `com.etzhayyim.apps.toshiKozan.issueReceipt` | receiver | 受領証発行 (yabai 盗品スクリーニング付) |
| `com.etzhayyim.apps.toshiKozan.scanItem` | eye | 画像認識・素材推定 (Murakumo inference) |
| `com.etzhayyim.apps.toshiKozan.classifyMaterial` | classifier | 素材分類・グレード判定 |
| `com.etzhayyim.apps.toshiKozan.createDisassemblyPlan` | disassembler | 分解計画作成 (LLM BOM 分析) |
| `com.etzhayyim.apps.toshiKozan.dispatchStep` | disassembler | 工程ステップ振分け (auto/human) |
| `com.etzhayyim.apps.toshiKozan.executeArmCommand` | arm | ロボットアーム指令 (高承認レベル) |
| `com.etzhayyim.apps.toshiKozan.delegateToHc` | hcDelegate | hc.etzhayyim.com に人間タスク委任 |
| `com.etzhayyim.apps.toshiKozan.appraiseBatch` | appraiser | 素材価値鑑定 (kakaku 市場価格連動) |
| `com.etzhayyim.apps.toshiKozan.announceCampaign` | announcer | キャンペーン告知投稿 |
| `com.etzhayyim.apps.toshiKozan.registerMaterial` | controller | 素材マスタ登録 |
| `com.etzhayyim.apps.toshiKozan.registerWaste` | controller | 廃棄物カテゴリマスタ登録 |

## Record Kinds (AT Lexicon NSID)

| Kind | Collection NSID | 説明 |
|---|---|---|
| depot | `com.etzhayyim.apps.toshiKozan.depot` | 回収拠点 |
| pickup | `com.etzhayyim.apps.toshiKozan.pickup` | ピックアップ予約 |
| receipt | `com.etzhayyim.apps.toshiKozan.receipt` | 受領記録 |
| imageScan | `com.etzhayyim.apps.toshiKozan.imageScan` | 画像解析結果 |
| classification | `com.etzhayyim.apps.toshiKozan.classification` | 分類結果 |
| disassemblyPlan | `com.etzhayyim.apps.toshiKozan.disassemblyPlan` | 分解計画 |
| disassemblyStep | `com.etzhayyim.apps.toshiKozan.disassemblyStep` | 分解工程ステップ |
| armCommand | `com.etzhayyim.apps.toshiKozan.armCommand` | ロボットアーム指令 |
| hcTask | `com.etzhayyim.apps.toshiKozan.hcTask` | HC 委任タスク |
| batch | `com.etzhayyim.apps.toshiKozan.batch` | 回収バッチ |
| appraisal | `com.etzhayyim.apps.toshiKozan.appraisal` | 鑑定結果 |
| material | `com.etzhayyim.apps.toshiKozan.material` | 素材マスタ |
| waste | `com.etzhayyim.apps.toshiKozan.waste` | 廃棄物カテゴリマスタ |

## Compliance

| Framework | 適用 |
|---|---|
| バーゼル条約 | 有害廃棄物の越境移動規制 |
| 家電リサイクル法 | 特定家庭用機器の回収義務 |
| 小型家電リサイクル法 | 使用済み小型電子機器等の再資源化 |
| 資源有効利用促進法 | 3R (Reduce/Reuse/Recycle) 推進 |
| 廃棄物処理法 | 産業廃棄物の適正処理 |

## Build & Deploy

```bash
cd appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m
etzhayyim deploy
# Health: https://tk7x9p2m.etzhayyim.com/health
# Meta:   https://tk7x9p2m.etzhayyim.com/_app/meta
# Vanity: https://toshi-kozan.etzhayyim.com/
```

## App Component

| Key | Value |
|---|---|
| Nanoid | `tk7x9p2m` |
| Folder | `appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/` |
| Service | `etzhayyim.toshiKozan.v1.ToshiKozanQueryService` / `etzhayyim.toshiKozan.v1.ToshiKozanCommandService` |
| Team room | `!team-tk7x9p2m` |
