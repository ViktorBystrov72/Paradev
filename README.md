# Browser pending-address verification

Final source: `f68c1fa8c3e468539fb3211cda411f65620c08ae` on `0f39bae78889d2d3f23510190b01d7fe67a979b9`.
UI-verified snapshot: `6c69c8a4ca23a07ad228a950905cf10e9eaebdb0` on `d1a5266ab06a13c2dfa83c9296ab9b5e1a5d154b`, retained on `verification/browser-pending-20261117`.
The three changed source/test files have identical blob IDs after rebase (`verified-source-blobs.json`).

The isolated `browser-pending-url-20261117` dev desktop used renderer localhost:3185 and CDP 9262. Its authenticated local test organization and workspace route were verified before each interaction. A real browser pane started at about:blank. CDP mouse and keyboard input entered `http://127.0.0.1:19241/slow` and pressed Enter. The local HTTP fixture held the response until explicitly released.

- Before: the server had one response pending, the guest's committed URL was about:blank and it was loading, but the address control showed its empty placeholder (`before.png`, `before.json`).
- After: with the same response held and the guest still about:blank/loading, the requested URL remained visible (`after.png`, `after.json`).
- Releasing the response completed navigation normally in both runs (`before-completed.json`, `after-completed.json`).
- A subsequent 302 navigation showed the actual /fast destination rather than the requested /redirect address (`redirect.png`, `redirect.json`).
- No console errors occurred during these measured interactions.

Screenshots are direct CDP captures clipped to the browser header. Only the local server response is controlled; no application/DOM state was injected. The cumulative request counter includes setup/restoration requests; each captured state had exactly one response pending.

The scripts contain guards for this test instance. `verify-url.ts` takes the stage as its first argument and an optional output directory as its second; target instance identifiers must match the reader's own dev fixture. `server.ts` is the local HTTP fixture. The published scripts only parameterize the output directory; the verification logic is the executed logic.

Registry tests: 20 pass; the new pending-address regression fails before the change (`unit-before.log`, `unit-after.log`). Browser subtree: 46 pass. Initial full run: desktop 8982 pass and monorepo 28/30 tasks pass; the unchanged shared recurrence timezone-format test and two agent-setup system-CLI fallback tests fail. Lint and all 42 typecheck tasks pass. Browser tests, lint and all typechecks passed again after rebase (`validation.json`).

This reproduces the pending-address loss from #8145. CLI pane registration succeeded here; the older guest-registration failure was not reproduced. The pending display URL is ephemeral: committed URLs continue to drive persistence/history/page actions.

The task dev desktop, host service, local HTTP fixture and Docker services were stopped after verification. The installed working app was not modified or restarted.
