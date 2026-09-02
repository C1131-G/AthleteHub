# instant-nav rig: AthleteHub

- BUILD: `bun run instant:server` runs a fresh production build and serves it on `http://127.0.0.1:3100`.
- EXPOSE: `EXPOSE_TESTING_API=1` is set only by the local instant-navigation server script; it is not enabled for normal production builds.
- RUN: `bun run test:instant` runs Playwright against the local production server at `http://127.0.0.1:3100`.
- TEST USER: UI-only fixture account with `athletehub@example.test` and a local password; login accepts the form and redirects to `/athletes` without a backend session.
- DRIFT: localStorage seed state, browser viewport, and the UI-only login flow; there are no feature flags, plans, roles, locale gates, or remote data dependencies.
- LOOP: local build → production server → Playwright instant-navigation tests; fully agent-drivable, with no deploy approvals or secrets.
- LIVENESS: n/a for the local fresh build-and-start rig.
- WALLS: Electron is not part of the browser rig; the same Next standalone server is used so the shell is measured independently of the desktop wrapper.
