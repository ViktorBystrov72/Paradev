# Split-terminal close verification

Final source: `66d281c51fab2951bd81bd0cad47d7c7d6185264` on `403af10dfd2864003e13b32b077cb3d09386dafa`.
UI-verified source: `8c30de370a7f62e6465bc9e25f8a09bdb9208c29` on `1097f1caef61adeb5e7de0131a47abd7c3cf7561`.
Before parallel probing: `5cd0e9017a9b8fbdfd3f9ac6f754470c9a6aab89`.

The four terminal guard and transport files have identical Git blob IDs between the UI-verified source and final source (`verified-source-blobs.json`). The verified snapshot is retained on `verification/paradev-terminal-close-multi-20261117`.

An isolated dev desktop from `/Users/viktor/Documents/MyOpenSource/worktrees/paradev/terminal-close-timeout` was attached at renderer localhost:3105, CDP 9256. The authenticated local test organization and actual workspace route were checked before each run. The installed app was not modified or restarted.

The fixture is a real workspace tab split into two terminals running `sleep 10000`. Six held HTTP requests occupy that dev host-service origin's Chromium connection pool. CDP mouse input clicks the real tab close button.

- Baseline complete run: tab closed after **4043.5 ms** (`before-closed.json`).
- Baseline screenshot: tab and both panes still present at **3578.4 ms**, all six requests still held (`before.png`, `before.json`). Releasing connections then allowed the ordinary running-process confirmation; Cancel retained both panes.
- Fixed run: tab closed after **2057.5 ms**, all six requests still held (`after.png`, `after.json`). Expected timeout warnings were captured; no console errors during the measured interactions.
- Healthy host: running-process confirmation appears. Cancel keeps both terminals; confirming closes both (`healthy-confirm.png`, `healthy.json`).
- Host terminal lists are empty after the fixture closes (`sessions-after-timeout.json`, `sessions-after-healthy.json`).

`fault-injection.diff` is temporary diagnostic code, removed before lint/tests/typecheck/commit. `verify-close.ts` and `verify-healthy.ts` drive the actual desktop through CDP. Reset console capture between repeated runs. Screenshots are direct CDP captures at half scale.

The saturated HTTP pool is synthetic fault injection. This does not claim reproduction of the original 13–14-agent workload, daemon-list correlation, or dropdown Remove path from issue #6376.

The regression test fails before parallel probing and passes afterward without waiting for a real deadline (`tests-before.log`, `tests-after.log`). The terminal suite passes 3973 tests, workspace-client passes 34, lint and scoped typecheck pass. `post-rebase-checks.json` records the repeated narrow validation on the fresh base. No new full monorepo test run is claimed.

Codex assisted with implementation and automated verification. No human review or manual testing is claimed. Task-specific dev desktop/host and Docker services were stopped after the test; no PTY daemon was stopped.
