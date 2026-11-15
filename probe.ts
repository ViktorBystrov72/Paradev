import { fork, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
const root=import.meta.dir;
const repo=realpathSync(Bun.argv[3]??process.cwd());
const node=Bun.which("node");if(!node)throw new Error("Node.js is required");
const baselineSha=Bun.argv[4]??"c1782787d28989599639fadc0a8b346227e24bae";
const entry=realpathSync(path.join(repo,"packages/host-service/src/serve.ts"));
const phase=Bun.argv[2];
if(!phase||!/^[a-z-]+$/.test(phase))throw new Error("Use before or after as the probe phase");
if(!/^[0-9a-f]{40}$/.test(baselineSha))throw new Error("Use a full baseline commit SHA");
const output=root+"/serve-"+phase+".mjs";
const baseline=phase.startsWith("before")?execFileSync("git",["-C",repo,"show",`${baselineSha}:packages/host-service/src/serve.ts`],{encoding:"utf8"}):null;
const mocked=new Set<string>();
const built=await Bun.build({entrypoints:[entry],target:"node",format:"esm",define:{"process.env.NODE_ENV":JSON.stringify("production")},plugins:[{name:"isolated-boot",setup(build){
if(baseline)build.onLoad({filter:/serve\.ts$/},args=>args.path===entry?{contents:baseline,loader:"ts"}:undefined);
build.onResolve({filter:/.*/},args=>{
 if(args.importer===entry && !["@hono/node-server","./standalone-shutdown"].includes(args.path)){mocked.add(args.path);return {path:root+"/entry-fixture.ts"};}
});}}]});
if(!built.success)throw new Error(built.logs.join("\n"));
for(const required of ["./app","./env","./daemon","./runtime/agent-provisioning","@superset/agent-setup/legacy-home-move"])if(!mocked.has(required))throw new Error("Boot dependency was not isolated: "+required);
await Bun.write(output,await built.outputs[0].text());
const results=[];
for(const signal of ["SIGTERM","SIGINT"] as const) {
 const dir=mkdtempSync(path.join(root,phase+"-"+signal+"-"));
 const dbPath=dir+"/host.db";
 const child=fork(output,[],{execPath:node,execArgv:[],env:{NODE_ENV:"production",SHUTDOWN_PROBE_DB:dbPath},stdio:["ignore","pipe","pipe","ipc"]});
 let stdout="",stderr="";
 child.stdout!.on("data",d=>stdout+=d);child.stderr!.on("data",d=>stderr+=d);
 const timeout=setTimeout(()=>child.kill("SIGKILL"),10000);
 const exited=new Promise<{code:number|null,signal:string|null}>(resolve=>child.once("exit",(code,signal)=>resolve({code,signal})));
 const ready=await new Promise<any>((resolve,reject)=>{child.once("message",resolve);child.once("error",reject);child.once("exit",()=>reject(new Error(stderr)));});
 child.kill(signal);
 const result=await exited;clearTimeout(timeout);
 const walAfter=existsSync(dbPath+"-wal")?statSync(dbPath+"-wal").size:0;
 const row=JSON.parse(execFileSync(node,["--input-type=module","-e",'import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.SHUTDOWN_PROBE_DB,{readOnly:true});console.log(JSON.stringify(db.prepare("select value from data").get()));db.close();'],{env:{SHUTDOWN_PROBE_DB:dbPath},encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
 const record={requestedSignal:signal,...result,walBefore:ready.walBytes,walAfter,disposed:existsSync(dbPath+".disposed"),daemonStopped:existsSync(dbPath+".daemon-stopped"),row};
 results.push(record);console.log(JSON.stringify(record));
 await Bun.write(dir+"/stdout.log",stdout);await Bun.write(dir+"/stderr.log",stderr);
}
await Bun.write(root+"/"+phase+".json",JSON.stringify(results,null,2)+"\n");
