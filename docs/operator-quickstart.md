# operator quickstart — toshi-kozan

clean checkout から 15 分。**書いてあるコマンドは全部そのまま実行して出力を確認した**
（2026-08-16、macOS / node v26.3.0 / npm 11.16.0）。何を測ったかは README の
「検査が見ている範囲」に要約がある。

この repo は 2 つの独立したツリーを持ち、**互いに依存しない**。

```
kotoba/                                    ← 実装本体。ここが動く
appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/
  ├── src/app.ts                           ← install も build も deploy もされない（§5）
  └── svelte/                              ← 配信されるのはこちら
```

---

## 0. この環境の前置き（repo の欠陥ではない）

このワークステーションの `~/.npmrc` は `allow-scripts[]` を持っており、npm 11.16.0 は
**git 依存の準備 install でこれを拒否する**:

```
npm error code EALLOWSCRIPTS
npm error --allow-scripts is not allowed in project-scoped installs.
```

`kotoba/` の依存は git URL（`@etzhayyim/sdk` / `@etzhayyim/sdk-mock`）なのでここに当たる。
**別のマシンでは起きない。** 回避は userconfig を差し替えるだけ:

```bash
printf 'strict-ssl=false\n' > /tmp/tk-npmrc
export NPM_CFG='npm_config_userconfig=/tmp/tk-npmrc'
```

以下 `env $NPM_CFG npm …` と書いてある箇所は、この問題が無い環境では `npm …` でよい。
`svelte/` 側は git 依存が無いので素の `npm` で通る。

## 1. 取得

```bash
git clone git@github.com:cloud-itonami/toshi-kozan.git
cd toshi-kozan
```

west 管理下なら `orgs/cloud-itonami/toshi-kozan`。共有 checkout を直接編集せず
worktree を切ること（superproject の CLAUDE.md「並行エージェント運用」）。

## 2. kotoba — 実装本体を動かす

```bash
cd kotoba
env $NPM_CFG npm install --no-audit --no-fund
env $NPM_CFG npm test
env $NPM_CFG npm run typecheck
```

期待する出力:

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

`typecheck` は無出力・exit 0。**install で `allow-scripts` の warn が出るが失敗ではない**
（`prepare: tsc` が保留になるだけで、`@etzhayyim/sdk` は TS のまま解決される）。

### 何が入っているか

5 つの registry。すべて AT PDS レコード、RW graph は使わない。

```
registerMaterial / listMaterials      素材カタログ（category 7 値を検証、symbol+name 検索）
registerDepot / getDepot / listDepots  回収拠点（region / operator / 名前で絞る）
addSafetyGuide / listSafetyGuides      安全手引き（topic 6 値を検証）
recordAcceptance / listAcceptances     拠点×素材の 2-FK 辺（両方の実在を確認してから書く）
coverage                               4 collection の集計
```

### 手で 1 本触ってみる

`test/` に置けば `MockEtzhayyim` がそのまま使える（PDS も credential も要らない）。

```bash
cat > test/zz-scratch.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import { registerDepot, registerMaterial, recordAcceptance } from "../src/index.js";

describe("scratch", () => {
  it("acceptance requires BOTH foreign keys to exist", async () => {
    const e: any = new MockEtzhayyim({ did: "did:web:toshi-kozan.etzhayyim.com" });
    await registerDepot(e, { depotId: "D-1", name: "Depot 1", operator: "op", region: "JP-13" });
    await registerMaterial(e, { materialId: "M-AU", symbol: "Au", name: "Gold", category: "precious" });
    expect((await recordAcceptance(e, { acceptanceId: "A-1", depotId: "D-1", materialId: "M-AU" })).status).toBe("recorded");
    expect((await recordAcceptance(e, { acceptanceId: "A-2", depotId: "GHOST", materialId: "M-AU" })).status).toBe("depotNotFound");
  });
});
EOF
env $NPM_CFG npm test          # → Test Files 2 passed (2) / Tests 5 passed (5)
rm test/zz-scratch.test.ts
```

## 3. appview — 配信される方を build する

```bash
cd ../appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/svelte
npm install --no-audit --no-fund
node <superproject>/scripts/resource-guard.mjs run build -- npm run build
```

**superproject の中では build を直接起動しない**（resource-guard 経由。CLAUDE.md の
repo-wide resource governor）。最後の 2 行が成功のしるし:

```
> Using @sveltejs/adapter-cloudflare
  ✔ done
```

生成物は `.svelte-kit/cloudflare/_worker.js`（約 4.3 KB。実体は
`.svelte-kit/output/server/` を import する薄い entry）。これが `wrangler.jsonc` の
`main` が指すファイルである。

## 4. 実際に叩く

```bash
npm run preview -- --port 4319 &
sleep 8
B=http://localhost:4319
curl -s -o /dev/null -w 'GET  /                 -> %{http_code}\n' $B/
curl -s -o /dev/null -w 'GET  /health           -> %{http_code}\n' $B/health
curl -s -o /dev/null -w 'GET  /_app/meta        -> %{http_code}\n' $B/_app/meta
curl -s -o /dev/null -w 'GET  /xrpc/x.y.z       -> %{http_code}\n' $B/xrpc/com.etzhayyim.apps.toshiKozan.guideDropoff
curl -s -o /dev/null -w 'OPTIONS /xrpc/x.y.z    -> %{http_code}\n' -X OPTIONS $B/xrpc/com.etzhayyim.apps.toshiKozan.guideDropoff
curl -s -w '\nPOST /xrpc/x.y.z       -> %{http_code}\n' -X POST -H 'content-type: application/json' \
  -d '{"lat":35.6,"lng":139.7}' $B/xrpc/com.etzhayyim.apps.toshiKozan.guideDropoff
pkill -f "vite preview --port 4319"
```

実測:

```
GET  /                 -> 200
GET  /health           -> 404      ← CLAUDE.md が health として案内する経路。存在しない
GET  /_app/meta        -> 404      ← 同上
GET  /xrpc/x.y.z       -> 405      ← POST と OPTIONS だけ export されている
OPTIONS /xrpc/x.y.z    -> 204      ← CORS preflight
{"message":"Internal Error"}
POST /xrpc/x.y.z       -> 500      ← 上流 MCP router が NXDOMAIN（§7）。TypeError: fetch failed
```

`/health` と `/_app/meta` の 404 と POST の 500 は**この手順の失敗ではなく、実際の現在地**。
理由は §5 と §7。

## 5. `src/app.ts` が deploy されないことを確かめる

`appview/…/src/app.ts` は 26,734 バイトで、`CLAUDE.md` の 15 コマンドと 10 actor を
実装している唯一のファイルである。**build 出力に入らない。**

```bash
cd <repo>/appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/svelte
echo "── src/app.ts 固有の marker ──"
for m in createWorkerExport kotodama-host-sdk toshiKozan.guideDropoff actor:hcDelegate appraiseBatch executeArmCommand; do
  printf '  %-26s %s file(s)\n' "$m" "$(grep -rl -- "$m" .svelte-kit/ 2>/dev/null | wc -l | tr -d ' ')"
done
echo "── +server.ts 固有の marker ──"
for m in sveltekit-edge-bff x-etzhayyim-xrpc-method tools/call AGENTGATEWAY_MCP_ROUTER_URL; do
  printf '  %-26s %s file(s)\n' "$m" "$(grep -rl -- "$m" .svelte-kit/ 2>/dev/null | wc -l | tr -d ' ')"
done
```

実測 — 前者が全部 0、後者が全部 1:

```
── src/app.ts 固有の marker ──
  createWorkerExport         0 file(s)
  kotodama-host-sdk          0 file(s)
  toshiKozan.guideDropoff    0 file(s)
  actor:hcDelegate           0 file(s)
  appraiseBatch              0 file(s)
  executeArmCommand          0 file(s)
── +server.ts 固有の marker ──
  sveltekit-edge-bff         1 file(s)
  x-etzhayyim-xrpc-method    1 file(s)
  tools/call                 1 file(s)
  AGENTGATEWAY_MCP_ROUTER_URL 1 file(s)
```

**`.svelte-kit/cloudflare/` だけを検索しないこと** —— `_worker.js` は
`../output/server/index.js` を import する薄い entry なので、サーバコードは
`cloudflare/` の外に在る。`cloudflare/` だけを見ると**両方 0 になり、
「どちらも入っていない」と誤読する**（実際にこの手順で一度誤読した）。

さらに、そもそも install できない:

```bash
cd ../   # appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m
npm install --no-audit --no-fund
# → npm error code EUNSUPPORTEDPROTOCOL
#   npm error Unsupported URL Type "workspace:": workspace:*
```

唯一の依存 `@etzhayyim/kotodama-host-sdk` が `workspace:*` を指しているが、
この repo は `etzhayyim/root` から抽出されたもので（`migration.edn`）、
**workspace root は付いてこなかった。**

## 6. 検査が discriminate するかを確かめる

**「緑だから通っている」を信じる前に、壊して赤くなることを見る。**
以下は 1 箇所ずつ入れて戻す。無改変ではすべて exit 0。

```bash
KO=kotoba; AV=appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m; SV=$AV/svelte
probe() { printf '  %-22s exit=%s\n' "$1" "$( (cd "$2" && eval "$3" >/dev/null 2>&1); echo $? )"; }

# M1 — kotoba/src に型エラー
printf '\nconst __mut: number = "x";\n' >> $KO/src/registry.ts
probe "kotoba typecheck" $KO "env \$NPM_CFG npm run typecheck"      # → exit=2   見える
git checkout -- $KO/src/registry.ts

# M2 — kotoba/test に型エラー
printf '\nconst __mut: number = "x";\n' >> $KO/test/toshi-kozan.test.ts
probe "kotoba typecheck" $KO "env \$NPM_CFG npm run typecheck"      # → exit=0   盲
git checkout -- $KO/test/toshi-kozan.test.ts

# M3 — appview/src/app.ts に型エラー
printf '\nconst __mut: number = "x";\n' >> $AV/src/app.ts
probe "kotoba typecheck" $KO  "env \$NPM_CFG npm run typecheck"     # → exit=0   盲
probe "svelte check"     $SV  "npm run check"                       # → exit=0   盲
probe "svelte build"     $SV  "npm run build"                       # → exit=0   盲
git checkout -- $AV/src/app.ts

# M4 — svelte の +server.ts に型エラー
printf '\nconst __mut: number = "x";\n' >> "$SV/src/routes/xrpc/[...path]/+server.ts"
probe "svelte check"     $SV  "npm run check"                       # → exit=1   見える
git checkout -- "$SV/src/routes/xrpc/[...path]/+server.ts"
```

読み方:

- **`src/app.ts` を見ている検査は 1 つも無い。** deploy もされず（§5）install もできず（§5）
  検査もされない 26 KB が、この repo で最大のソースファイルである。
- `kotoba/tsconfig.json` の `include` は `src/**/*.ts` だけなので **typecheck は `test/` に盲**。
- 変異を入れたら**入ったことを確かめてから**測る（`tail -1 <file>` で見る）。
  当たっていない変異で出た緑は、検査が通った証拠ではない。

### 検索テストは件数を固定していて一致を固定していない

論理を反転させても repo の 4 tests は緑のまま通る:

```bash
cd kotoba
perl -0pi -e 's/if \(!hay\.includes\(q\)\) return false;/if (hay.includes(q)) return false;/' src/registry.ts
env $NPM_CFG npm test      # → Tests 4 passed (4)   ← 反転しているのに緑
git checkout -- src/registry.ts
```

`q: "neodymium"` の期待が `.total === 1` なので、Neodymium ではなく Gold が 1 件
返っても等しく満たされる。一致を見るプローブなら同じ変異で落ちる:

```bash
cat > test/zz-probe.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import { registerMaterial, listMaterials } from "../src/index.js";
describe("probe", () => {
  it("q=neodymium returns Neodymium, not merely one row", async () => {
    const e: any = new MockEtzhayyim({ did: "did:web:toshi-kozan.etzhayyim.com" });
    await registerMaterial(e, { materialId: "M-AU", symbol: "Au", name: "Gold", category: "precious" });
    await registerMaterial(e, { materialId: "M-ND", symbol: "Nd", name: "Neodymium", category: "rare-earth" });
    const r = await listMaterials(e, { q: "neodymium" });
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBe("Neodymium");
  });
});
EOF
perl -0pi -e 's/if \(!hay\.includes\(q\)\) return false;/if (hay.includes(q)) return false;/' src/registry.ts
env $NPM_CFG npm test      # → AssertionError: expected 'Gold' to be 'Neodymium'
git checkout -- src/registry.ts && rm test/zz-probe.test.ts
```

**この 3 件（`src/app.ts` 無検査 / typecheck が `test/` に盲 / 件数だけの assertion）は
未修正である。** 直すのは test 軸の仕事なので、ここでは見えるようにするだけにした。

## 7. deploy — 今は立てられない

```bash
for h in toshi-kozan.etzhayyim.com tk7x9p2m.etzhayyim.com mcp.etzhayyim.com hc.etzhayyim.com etzhayyim.com; do
  for r in 1.1.1.1 8.8.8.8; do
    printf '%-30s @%-8s %s\n' "$h" "$r" \
      "$(dig +noall +comments +timeout=3 "$h" @$r | grep -o 'status: [A-Z]*' | head -1)"
  done
done
curl -s -o /dev/null -w 'did:web:toshi-kozan… -> %{http_code}\n' --max-time 10 https://toshi-kozan.etzhayyim.com/.well-known/did.json
curl -s -o /dev/null -w 'did:web:etzhayyim.com -> %{http_code}\n' --max-time 10 https://etzhayyim.com/.well-known/did.json
```

実測 — apex 以外の 4 host が 2 resolver とも **NXDOMAIN**、DID も apex だけが 200:

```
toshi-kozan.etzhayyim.com      @1.1.1.1  status: NXDOMAIN
tk7x9p2m.etzhayyim.com         @1.1.1.1  status: NXDOMAIN
mcp.etzhayyim.com              @1.1.1.1  status: NXDOMAIN
hc.etzhayyim.com               @1.1.1.1  status: NXDOMAIN
etzhayyim.com                  @1.1.1.1  status: NOERROR
did:web:toshi-kozan… -> 000
did:web:etzhayyim.com -> 200
```

したがって:

- `wrangler.jsonc` の route 2 本（`toshi-kozan.etzhayyim.com/*` / `tk7x9p2m.etzhayyim.com/*`）は
  **まだ存在しない zone レコードを指している**。
- `+server.ts` の転送先 `https://mcp.etzhayyim.com/xrpc/com.etzhayyim.mcp.message` も NXDOMAIN。
  だから §4 の `POST /xrpc` は 500 になる —— **コードの不具合ではなく上流の不在**。
- `kotodama.jsonld` の `@id` は `did:web:toshi-kozan.etzhayyim.com` だが解決しない。
  同ファイルの `component.path: /wasm/component.wasm` の実体もこの repo に無い
  （`find . -name '*.wasm'` → 0 件）。

**DNS と route を立てるのは owner の判断**なので、ここでは現在地の記録にとどめる。
`CLAUDE.md` の「Build & Deploy」節にある `etzhayyim deploy` はこの repo に存在しない。

## 8. スコア計器を読むときの注意

`manifest/itonami-maturity-evidence.edn` はこの repo を `src/bytes 0` / `test/bytes 0` と
測る。計器はリポジトリ**直下**の `src/**` と `test/**` を、拡張子
`cljc/cljs/clj/kotoba` に限って数えるためである。

- **`src/bytes 0` を「コードが無い」と読まないこと。** 実際には `kotoba/src/` に
  22 KB、`appview/` に 30 KB 以上の TypeScript がある。
- **`test/bytes 0` も同じ理由で 0 になるが、こちらは「実質的に薄い」も同時に真である** ——
  test は `kotoba/test/` の 4 本だけで、§6 のとおり `src/app.ts` は 1 本も覆われていない。
- ディレクトリを動かせばスコアだけ動いて実体は動かない。**やらないこと。**
