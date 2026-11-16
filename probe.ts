import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const repo = resolve(Bun.argv[2] ?? process.cwd());
const { shellQuote } = await import(resolve(repo, "packages/cli/src/lib/shell-quote.ts"));
const { installCliScript } = await import(resolve(repo, "packages/cli/src/lib/ssh-host-setup/install.ts"));

const installer = resolve(repo, Bun.argv[3] ?? "apps/marketing/public/cli/install.sh");
const roots: string[] = [];


async function runInstaller({
	status,
	fallback = true,
	latestStatus = 200,
	version = "9.9.9",
}: {
	status: number;
	fallback?: boolean;
	latestStatus?: number;
	version?: string | null;
}) {
	const root = mkdtempSync(join(tmpdir(), "cli-installer-"));
	roots.push(root);
	const bin = join(root, "bin");
	const payload = join(root, "payload");
	const installDir = join(root, "installed CLI");
	mkdirSync(bin);
	mkdirSync(join(payload, "bin"), { recursive: true });
	for (const name of ["superset", "superset-host"]) {
		writeFileSync(
			join(payload, "bin", name),
			"#!/bin/sh\nprintf '2.0.5\\n'\n",
			{ mode: 0o755 },
		);
	}
	const archivePath = join(root, "release.tar.gz");
	const tar = Bun.spawnSync(["tar", "-czf", archivePath, "-C", payload, "."]);
	if (tar.exitCode !== 0) throw new Error(tar.stderr.toString());
	const archive = await Bun.file(archivePath).arrayBuffer();
	const requested: string[] = [];
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch(request) {
			const path = new URL(request.url).pathname;
			if (path === "/install.sh") return new Response(Bun.file(installer));
			requested.push(path);
			const code = path.includes("/cli-latest/") ? latestStatus : status;
			return new Response(code === 200 ? archive : "release unavailable", {
				status: code,
			});
		},
	});
	const curl = Bun.which("curl");
	if (!curl) throw new Error("curl is required for the installer test");
	writeFileSync(
		join(bin, "curl"),
		[
			"#!/bin/bash",
			"args=()",
			'for arg in "$@"; do',
			'  case "$arg" in',
			`    https://github.com/*) arg="$FIXTURE_ORIGIN/\${arg#https://github.com/}" ;;`,
			"  esac",
			'  args+=("$arg")',
			"done",
			`exec ${shellQuote(curl)} -q "\${args[@]}"`,
			"",
		].join("\n"),
		{ mode: 0o755 },
	);
	try {
		const command = fallback
			? installCliScript({
					installerUrl: `${server.url}install.sh`,
					installDir,
					version,
				})
			: `sh ${shellQuote(installer)} --no-next-steps`;
		const child = Bun.spawn(["sh", "-c", command], {
			env: {
				PATH: `${bin}:${join(installDir, "bin")}:${process.env.PATH ?? "/usr/bin:/bin"}`,
				SUPERSET_HOME: installDir,
				SUPERSET_VERSION: "cli-v9.9.9",
				FIXTURE_ORIGIN: server.url.toString().replace(/\/$/, ""),
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		const [exitCode, stdout, stderr] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		return { exitCode, stdout, stderr, requested, installDir };
	} finally {
		server.stop(true);
	}
}

const cases = [
 {name: "missing pin", status:404},
 {name: "published pin", status:200},
 {name: "explicit pin", status:404, fallback:false},
 {name: "server error", status:500},
 {name: "both missing", status:404, latestStatus:404},
 {name: "latest missing", status:404, latestStatus:404, version:null},
];
try {
 const rows=[];
 for (const scenario of cases) {
  const result=await runInstaller(scenario);
  const installed=Bun.file(join(result.installDir,"bin","superset"));
  const clean=(value:string)=>value.replace(/\x1b\[[0-9;]*m/g,"");
  rows.push({name:scenario.name,exitCode:result.exitCode,requests:result.requested,stdout:clean(result.stdout),stderr:clean(result.stderr),installed:await installed.exists()});
 }
 console.log(JSON.stringify(rows,null,2));
} finally {for(const root of roots) rmSync(root,{recursive:true,force:true});}
