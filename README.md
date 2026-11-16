# Terminal close probe verification

Source commit: `4192ac399e348004271bfee099783f666b8109d6`. Baseline: `d31b92a172d46c486a370da1fb966193493302a2`.

An isolated dev desktop was launched from `/Users/viktor/Documents/MyOpenSource/worktrees/paradev/terminal-close-timeout`, renderer `http://localhost:3105`, CDP `9246`. Its local development organization and workspace were checked before interacting. The installed app was not changed or restarted.

The fixture contains a terminal running `sleep 10000`. The test starts six held HTTP requests to the same local host-service origin, then clicks the real tab close button with CDP mouse input. `fault-injection.diff` contains the temporary hold/release routes used to occupy connections. Those routes were removed before lint, typecheck, tests, and the source commit.

- Before: after 3594.8 ms the terminal tab is still present, no confirmation dialog, all six requests held.
- After: the tab closes after 2053.7 ms, while all six requests remain held. The expected probe timeout warning is logged; no console errors.
- Once connections are released, the host's terminal session list is empty (`sessions-after-timeout.json`).
- Healthy host: the running-process confirmation appears. Cancel retains the tab; confirming closes it. No console errors.

The screenshots and JSON measurements show actual input against the running desktop. HTTP saturation is synthetic fault injection; the original 13–14 session workload, daemon-list correlation, and dropdown Remove path were not reproduced or claimed fixed.

`verify-close.ts` and `verify-healthy.ts` are the CDP verification scripts. `before.json`, `after.json`, and `healthy.json` contain the measured state. Screenshots are unmodified CDP captures at half scale.

Validation: lint:fix and clean lint pass; typecheck 42/42 tasks pass; desktop 9683 tests pass (including three probe tests). Full monorepo test run with --continue: 28/30 tasks pass. The remaining failures are unchanged shared recurrence timezone test and two agent-setup system CLI fallback tests; isolated reruns reproduce these failures with package trees identical to the baseline.

Implementation and automated verification used Codex. No human review or manual testing is claimed. The task-specific dev processes and Docker stack were stopped after verification.
