# Hosts add installer fallback verification

Source commit: `736b1a180ed2a0599dc07dcbf31ccdd93ab009c6`. Baseline: `d31b92a172d46c486a370da1fb966193493302a2`.

Tested with Bun 1.4.3 on macOS arm64. Download this evidence branch and run from a source checkout with dependencies installed:

```sh
bun /path/to/probe.ts "$PWD" /path/to/install-baseline.sh > before.json
bun /path/to/probe.ts "$PWD" > after.json
```

The probe uses the source checkout's `installCliScript` helper and serves the actual installer and a small tarball from a loopback HTTP fixture. A shim redirects GitHub asset URLs to that server before calling the real curl binary. Files are installed only into temporary directories and removed after the run. No live SSH, signed-in CLI, user shell profile, or cloud registration is used.

The missing pin fails before the change and succeeds afterward. An existing pin is used directly; a manual pin and HTTP 500 stay strict; missing latest remains an error with no retry loop. Captured requests, exit codes, and output are in `evidence.json`.
