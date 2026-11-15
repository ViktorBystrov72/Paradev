# Standalone shutdown probe

Source commit: `362942b9e309dad7d30ef74f0cf48ff6d65059e5`. Baseline: `c1782787d28989599639fadc0a8b346227e24bae`.

Tested with Bun 1.4.3 and Node 22.23.1. Run from a checkout with dependencies installed:

```sh
bun /path/to/probe.ts before "$PWD" c1782787d28989599639fadc0a8b346227e24bae
bun /path/to/probe.ts after "$PWD" c1782787d28989599639fadc0a8b346227e24bae
```

Keep `probe.ts` and `entry-fixture.ts` together. The probe bundles the actual standalone entry point, substitutes boot integrations, and runs an isolated Node child with a real HTTP listener and SQLite database. It signals only that child. The fixture does not start an installed host, provision user integrations, or start a terminal daemon.

`before-current.json` and `after-current.json` contain the captured results. Both signals skip disposal before the change; after it, disposal runs, the WAL is removed, the row is preserved, and the process exits with code 0. The production path never calls the fixture daemon-stop function.

This verifies shutdown wiring and SQLite closure, not the original issue's load-dependent event-loop stall.
