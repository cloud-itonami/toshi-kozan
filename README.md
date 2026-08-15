# toshi-kozan — 都市鉱山 (urban mining) public reference

**この repo が持っているのは「どこに出せて・どう安全に扱い・何が回収できるか」という
公開参照面だけである。** e-waste を実際に受け取り、撮影し、分解し、鑑定する物理パイプラインは
ここには無い。名前（都市鉱山）と `CLAUDE.md` の 10 actor 図はパイプライン全体を指すので、
**この境界を最初に書いておく。**

正本の宣言は `kotoba/src/types.ts` の冒頭 docblock（migration の判断を書いた場所）で、
この README はそれを repo の入口へ引き上げたものである。

| | 何が | どこに |
|---|---|---|
| **PUBLIC — この repo** | 回収可能素材カタログ / 回収拠点ディレクトリ / 安全手引き / 「この拠点はこの素材を受け入れる」辺 | `kotoba/` |
| **PIPELINE — この repo に無い** | 受領・計量・所有権移転（custody）/ 画像認識・分類（Murakumo inference）/ ロボット分解・アーム制御（liability）/ 人間労働委任（hc）/ バッチ鑑定・評価（settlement） | etzhayyim 側に残置。consent-capability 経由で消費する |

PII も決済も custody もこの repo には入らない。AT Lexicon の制約で float を持たないので、
位置は粗い region 文字列（`JP-13`）であり、正確な拠点座標と素材グレード／評価額は
pipeline 側にある。

---

## 実際に動くもの（実行して確かめた。2026-08-16）

### `kotoba/` — 実装本体

`@etzhayyim/sdk` 経由で AT PDS レコードを読み書きする 5 つの registry。
**`npm test` が緑（4 tests）で `npm run typecheck` も緑。**

| 関数 | すること | collection |
|---|---|---|
| `registerMaterial` / `listMaterials` | 素材カタログ。`category` を検証（7 値）、symbol+name 検索 | `com.etzhayyim.apps.toshiKozan.material` |
| `registerDepot` / `getDepot` / `listDepots` | 回収拠点。region / operator / 名前で絞る | `…toshiKozan.depot` |
| `addSafetyGuide` / `listSafetyGuides` | 安全手引き。`topic` を検証（6 値） | `…toshiKozan.safetyGuide` |
| `recordAcceptance` / `listAcceptances` | 拠点×素材の 2-FK 辺。**両方の実在を確かめてから書く**（`depotNotFound` / `materialNotFound`） | `…toshiKozan.acceptance` |
| `coverage` | 4 collection の集計（category 別・region 別） | — |

DID は `did:web:toshi-kozan.etzhayyim.com:{mat,depot,guide,accept}:{id}`。

### `appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/svelte/` — 配信される appview

SvelteKit + `@sveltejs/adapter-cloudflare`。**build して preview で実測した挙動**:

| | | |
|---|---|---|
| `GET /` | **200** | ランディングページ |
| `POST /xrpc/<nsid>` | 上流へ転送 | JSON-RPC `tools/call` に包んで MCP router へ投げ、`result.structuredContent` を返す |
| `OPTIONS /xrpc/<nsid>` | **204** | CORS preflight |
| `GET /xrpc/<nsid>` | **405** | POST と OPTIONS しか export していない |

---

## 実際には無いもの（`CLAUDE.md` が書いているが、この repo では成立しない）

`CLAUDE.md`（16 KB）は 10 actor・15 XRPC コマンド・heartbeat・derive rule を詳細に記述する。
**それは意図の記録として価値があるので消していない。ただし次の 4 点は実測で成立しなかった。**

### 1. `appview/…/src/app.ts` は deploy されない

26,734 バイトあり、`CLAUDE.md` の 15 コマンドを実装しているのはこのファイルだが、
`wrangler.jsonc` の `main` は `svelte/.svelte-kit/cloudflare/_worker.js`（SvelteKit の生成物）であって
`src/app.ts` ではない。build 後の `.svelte-kit/` tree に対し:

- `src/app.ts` 固有の marker 6 種（`createWorkerExport` / `kotodama-host-sdk` /
  `toshiKozan.guideDropoff` / `actor:hcDelegate` / `appraiseBatch` / `executeArmCommand`）→ **0 file**
- `+server.ts` 固有の marker 4 種（`sveltekit-edge-bff` / `x-etzhayyim-xrpc-method` /
  `tools/call` / `AGENTGATEWAY_MCP_ROUTER_URL`）→ **各 1 file**
  （`.svelte-kit/output/server/entries/endpoints/xrpc/_...path_/_server.ts.js`）

### 2. `src/app.ts` は install すらできない

`appview/…/package.json` の唯一の依存が `"@etzhayyim/kotodama-host-sdk": "workspace:*"`。
この repo は `etzhayyim/root` から抽出されたもの（`migration.edn` 参照）で、
**workspace root は付いてこなかった。** `npm install` は `EUNSUPPORTEDPROTOCOL` で止まる。
したがって `src/app.ts` は build も typecheck も test もできない。

### 3. `/health` と `/_app/meta` は無い

`CLAUDE.md` の「Build & Deploy」節は `Health: https://tk7x9p2m.etzhayyim.com/health` と
`Meta: …/_app/meta` を挙げるが、配信される handler にこの 2 経路は無い。
preview 実測で **どちらも 404**。この 2 つは `src/app.ts` 側（`createWorkerExport`）の
機能であって、deploy される tree には入らない。同節の `etzhayyim deploy` コマンドも
この repo には存在しない。

### 4. route も上流もまだ DNS に無い

2 resolver（1.1.1.1 / 8.8.8.8）で一致:

| host | 結果 |
|---|---|
| `toshi-kozan.etzhayyim.com` | **NXDOMAIN** |
| `tk7x9p2m.etzhayyim.com` | **NXDOMAIN** |
| `mcp.etzhayyim.com` | **NXDOMAIN** |
| `hc.etzhayyim.com` | **NXDOMAIN** |
| `etzhayyim.com`（apex） | NOERROR |

`wrangler.jsonc` の route 2 本が両方 NXDOMAIN で、`+server.ts` が転送する先の
MCP router も NXDOMAIN なので、**`POST /xrpc` は現在の設定では成功しえない**
（preview 実測 500 / `TypeError: fetch failed`）。`kotodama.jsonld` が名乗る
`did:web:toshi-kozan.etzhayyim.com` も解決しない（apex の `did:web:etzhayyim.com` は 200）。
同ファイルが指す `component.path: /wasm/component.wasm` の実体もこの repo に無い（`.wasm` は 0 件）。

**これは「壊れている」ではなく「まだ立っていない」。** 直すのは DNS と deploy の判断であって
コードの判断ではないので、ここでは記録にとどめる。

---

## 検査が見ている範囲（実測した。緑を過信しないために）

同じ形の型エラーを 1 箇所ずつ入れて、どのコマンドが赤くなるかを測った
（無改変では 3 つとも exit 0）。手順は `docs/operator-quickstart.md` §6。

| 壊した場所 | `kotoba` typecheck | `kotoba` test | `svelte` check | `svelte` build |
|---|---|---|---|---|
| `kotoba/src/registry.ts`（型） | **exit 2** | 0 | — | — |
| `kotoba/test/*.test.ts`（型） | **0 — 盲** | 0 | — | — |
| `appview/src/app.ts`（型） | 0 | 0 | **0 — 盲** | **0 — 盲** |
| `svelte/…/+server.ts`（型） | 0 | — | **exit 1** | — |

- **`src/app.ts` を見ている検査は 1 つも無い。** deploy もされず install もできず
  検査もされない 26 KB が repo の中で最大のソースファイルである。
- `kotoba/tsconfig.json` の `include` は `src/**/*.ts` だけなので、**typecheck は
  `test/` を見ていない。**
- **`kotoba` の検索テストは件数を固定していて一致を固定していない。**
  `listMaterials` の `q` フィルタを反転（`!hay.includes(q)` → `hay.includes(q)`）しても
  repo の 4 tests は緑のまま通る —— `q: "neodymium"` の期待が `.total === 1` なので、
  Neodymium の代わりに Gold が 1 件返っても等しく満たされる。
  `expect(r.items[0].name).toBe("Neodymium")` を足したプローブは同じ変異で
  `expected 'Gold' to be 'Neodymium'` と落ちた。**この 3 件は未修正**（この周は docs 軸）。

---

## はじめかた

`docs/operator-quickstart.md` — clean checkout から build・test・probe・変異まで、
**逐語で再実行して出力が一致することを確認済み**のコマンド列。

## ライセンス

Apache-2.0 + etzhayyim Charter Compliance Rider v3.1（`NOTICE` 参照）。
