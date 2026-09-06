# ApexView Phase 3-9 Read-only Viewer

This is the read-only frontend for the `APEXVIEW-SNAPSHOT-v1.0` contract. The
renderer keeps the existing snapshot/VI evidence lane separate from the
Phase 9 Trade Eye: the Eye renders only a bounded set of execution Trade TAGs
from Short Horizon, without taking ownership of any decision. Phase 8 adds
backend-owned evidence replay, and Phase 9 adds a paper-only Trade Map with a
fail-closed Cloud Risk Gate contract.

## Run

```powershell
cd apexview
pnpm install
pnpm dev
```

Build and test the presentation layer with:

```powershell
pnpm test
pnpm build
```

The page reads `public/data/manifest.json` and the snapshot URL declared by
that manifest. The committed RKLB artifact is a Phase 2 test fixture only; it
is not inserted into the Short Horizon candidate universe.

## Quant Observatory presentation

The current UI is organized as a small research workspace rather than a
trading terminal:

- Overview shows the published opportunity count, capital velocity availability
  and paper-only mode before the relationship explorer.
- Opportunities preserves upstream order and makes the empty, partial and
  unavailable publication states readable without turning them into a market
  conclusion.
- Market chart and Evidence journal retain the stored OHLCV and declared event
  contracts. Capital velocity is a read-only explanatory view waiting for an
  upstream paper account report.
- The inspector keeps the selected snapshot, factor overview, Trade Map and
  evidence chain together. `DEMO` marks the committed RKLB fixture.
- Desktop uses a persistent named rail; mobile uses a bottom navigation bar.
  The motion toggle and keyboard-visible labels make the 3D presentation
  optional and accessible.

The asset loader respects Vite's base path, so the same build works locally at
the root path and on a project-hosted static URL below the repository path.

## Truth boundary

- The Trade Eye renders only `trade_eye.visible_tags` (or the bounded legacy
  `trade.tags` compatibility lane); generic VI `snapshot.nodes` are not drawn
  as Trade Eye stars.
- Trade TAG color/status/weight are read from the backend projection. The
  browser does not calculate a score, reorder factors, or promote a candidate.
- Stars, glow, pulse, position, distance, and inert background points are
  presentation only; they are never evidence or hidden relationships.
- Trade Movement is read only from declared `trade_eye.movement` events or
  backend exact snapshot comparison. The browser does not infer transitions.
- The ticker selector is populated from `manifest.stocks`, which is the
  read-only export of the current Short Horizon candidate gate. `test_fixtures`
  stay visibly separate from candidates.
- The browser never calculates a score, changes a gate, promotes a candidate,
  or authorizes a trade.
- The galaxy animation is visual presentation; it cannot create evidence.

To move beyond the fixture, replace the generated manifest and snapshot
artifacts from `apexview_universe_export.py` without changing the renderer.

## Phase 8-9 additions

- `apexthinker/apexview_timeline.py` provides the bounded
  `APEXVIEW-EVIDENCE-TIMELINE-v1.0` event stream. The browser replays declared
  events and exact snapshot comparisons; it does not infer relationships from
  animation or distance.
- `apexthinker/apexview_market_chart.py` provides stored OHLCV points only.
  Range buttons select a display window and never fabricate missing candles or
  turn daily history into an intraday feed.
- `apexthinker/trade_tags.py` provides up to six visible Trade Eye factors and
  keeps diagnostic factors outside the star field. They come from the existing
  Short Horizon execution context and do not affect the main score or TAG
  admission.
- `apexthinker/trade_timeframes.py` declares the 1D/1H/15M/5M stack and
  display-only factor weights. The current daily feed activates 1D; intraday
  lanes remain pending until verified point-in-time data, freshness, latency,
  cost, and paper-execution evidence exist.
- The `Short Horizon / Candidate Board` reads the upstream manifest order and
  opens a selected ticker in the Trade Eye/Paper Trade Map. It never ranks,
  admits, or executes a candidate in the browser.
- `apexthinker/trade_risk_gate.py` and `apexthinker/paper_trade_journal.py`
  stop at paper-only review. `can_submit_broker` is always false in the
  current contract, so this frontend remains a read-only eye.

The Phase 8-9 boundary and remaining production exit criteria are recorded in
`APEXVIEW_PHASE8_9.md` and `ROADMAP_STATUS.md`.

## Static publish and Telegram handoff

The public deployment lives in the separate `pnaksawek-bit/apexview-public`
repository. Its `.github/workflows/pages.yml` builds this viewer and publishes
only `apexview/dist` to GitHub Pages. The expected public origin is:

`https://pnaksawek-bit.github.io/apexview-public`

Set that origin as `APEXVIEW_PUBLIC_URL` in the Cloud bot only after the Pages
deployment is green. `/view TICKER` remains snapshot-only and validates the
current Short Horizon rows; `/view live TICKER` remains locked when the PC
heartbeat is stale. No bot token, database, or broker credential belongs in
this static project.
