# ApexView Public

This repository contains the public, read-only ApexView galaxy viewer.

Only the viewer project under `apexview/` is published here. The ApexThinker
bot, databases, PC Muscle transport, Telegram credentials, and trading logic
remain in the private repository.

The site is built from `apexview/` and deployed to GitHub Pages at:

`https://pnaksawek-bit.github.io/apexview-public`

The viewer renders the snapshot data bundled under `apexview/public/data/`.
It does not fetch private services and it cannot change scoring, TAGs, or
production decisions.
