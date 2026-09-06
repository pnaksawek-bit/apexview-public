# ApexView Public

This repository contains the public, read-only ApexView Quant Observatory.

Only the viewer project under `apexview/` is published here. The ApexThinker
bot, databases, PC Muscle transport, Telegram credentials, and trading logic
remain in the private repository.

The site is built from `apexview/` and deployed to GitHub Pages at:

`https://pnaksawek-bit.github.io/apexview-public`

The viewer renders the snapshot data bundled under `apexview/public/data/`.
It does not fetch private services and it cannot change scoring, TAGs, or
production decisions.

The current presentation uses a calm observatory layout built around the three
project objectives: relationship evidence, capital-time efficiency and a
paper-only operating boundary. The Overview opens with those three signals,
then keeps the existing Trade Eye, stored market chart and evidence journal
available through named navigation. A separate Capital velocity view explains
when the metric is unavailable; an em dash means no published account report,
not zero velocity. Published candidates remain backend ordered, test fixtures
are marked as `DEMO`, and failed/partial exports are kept distinct from an
observed empty candidate set.

The browser remains a display layer. It does not calculate scores, promote
rows, infer relationships from animation, start a bot, confirm a trade or send
an order to a broker. The visual controls only change presentation: navigation,
chart range, camera, motion and fullscreen.
