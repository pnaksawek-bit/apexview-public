# ApexView Phase 3-9 Read-only Viewer

This is the read-only frontend for the `APEXVIEW-SNAPSHOT-v1.0` contract. The
same renderer now covers the Phase 4 lifecycle presentation and the Phase 5
Short Horizon selector without taking ownership of any decision. Phase 8 adds
backend-owned evidence replay, and Phase 9 adds a paper-only Trade Lens with a
fail-closed Cloud Risk Gate contract.

## Run

```powershell
cd apexview
pnpm install
pnpm dev
```

The page reads `public/data/manifest.json` and the snapshot URL declared by
that manifest. The committed RKLB artifact is a Phase 2 test fixture only; it
is not inserted into the Short Horizon candidate universe.

The asset loader respects Vite's base path, so the same build works locally at
the root path and on a project-hosted static URL below the repository path.

## Truth boundary

- TAG color is read from the snapshot polarity/mood projection.
- TAG size is derived from the absolute snapshot score for display only.
- Edges are drawn only from declared `tag.components` entries.
- `appeared`, `persisted`, and `disappeared` transitions are read from
  snapshot lifecycle fields; the browser does not compare or invent evidence.
- Critical pulse rings and dust are visual presentation around nodes already
  marked critical; they do not create relationships or scores.
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
- `apexthinker/trade_tags.py` provides up to six explanatory Trade Lens tags
  from the existing Short Horizon execution context. They do not affect the
  main score or TAG admission.
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
