# ApexView Phase 3-6 Read-only Viewer

This is the read-only frontend for the `APEXVIEW-SNAPSHOT-v1.0` contract. The
same renderer now covers the Phase 4 lifecycle presentation and the Phase 5
Short Horizon selector without taking ownership of any decision.

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

## Static publish and Telegram handoff

The public repository includes `.github/workflows/pages.yml`. After GitHub
Pages is enabled for the repository with GitHub Actions as its source, a push
to `main` builds and publishes only `apexview/dist`. The expected public
origin for this repository is:

`https://pnaksawek-bit.github.io/apexview-public`

Set that origin as `APEXVIEW_PUBLIC_URL` in the Cloud bot only after the Pages
deployment is green. `/view TICKER` remains snapshot-only and validates the
current Short Horizon rows; `/view live TICKER` remains locked when the PC
heartbeat is stale. No bot token, database, or broker credential belongs in
this static project.
