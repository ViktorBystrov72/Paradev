const targets = await fetch("http://127.0.0.1:9246/json/list").then((r) => r.json());
const target = targets.find((t: any) => t.type === "page" && t.url.startsWith("http://localhost:3105/"));
if (!target) throw new Error("Expected this worktree's renderer at localhost:3105");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map<number, {resolve: (v:any)=>void; reject: (v:any)=>void}>();
ws.onmessage = (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) return;
  const promise = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) promise?.reject(message.error); else promise?.resolve(message.result);
};
function send(method: string, params: any = {}) {
  return new Promise<any>((resolve,reject) => { const next = ++id; pending.set(next,{resolve,reject}); ws.send(JSON.stringify({id:next,method,params})); });
}
async function evaluate(expression: string) {
  const result = await send("Runtime.evaluate", {expression, returnByValue:true, awaitPromise:true});
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const stage = Bun.argv[2];
const output = "/Users/viktor/Documents/MyOpenSource/.tools/paradev-terminal-close-20261116/";
const host = "http://127.0.0.1:48734";
try {
 const identity = await evaluate(`(async()=>{const {authClient}=await import("/lib/auth-client.ts");const x=await authClient.getSession({fetchOptions:{throw:false}});return {url:location.href,org:x.data?.session?.activeOrganizationId,suppressed:localStorage.getItem("terminal-close-confirm-v1")};})()`);
 if (identity.org !== "db013dfd-011a-49b2-b87b-cf201cbcc483" || !identity.url.includes("eb4215de-43e1-426f-bd40-b9859f42cfce") || JSON.parse(identity.suppressed??"null")?.state?.suppressed) throw new Error("Wrong test session or suppressed guard");
 await fetch(host+"/__verification/release");
 await evaluate(`window.__closeEvidence={errors:[],warnings:[]}; const originalError=console.error; const originalWarn=console.warn; console.error=(...args)=>{window.__closeEvidence.errors.push(args.map(String));originalError(...args)};console.warn=(...args)=>{window.__closeEvidence.warnings.push(args.map(String));originalWarn(...args)};performance.setResourceTimingBufferSize(5000);window.__verificationHolds=Array.from({length:6},(_,i)=>fetch("${host}/__verification/hold?slot="+i).catch(e=>String(e))); true`);
 let held = 0;
 for (let i=0;i<30;i++){held=await fetch(host+"/__verification/status").then(r=>r.json()).then(x=>x.held);if(held===6)break;await Bun.sleep(100)}
 if (held!==6) throw new Error("Could not occupy six connections: "+held);
 const point=await evaluate(`(()=>{const e=document.querySelector('button[aria-label="Закрыть вкладку"]');if(!e)throw new Error("No terminal tab close button");const r=e.getBoundingClientRect();window.__closeEvidence.start=performance.now();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send("Input.dispatchMouseEvent",{type:"mouseMoved",...point});
 await send("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});
 await send("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});
 let state;
 for(let i=0;i<35;i++){await Bun.sleep(100);state=await evaluate(`({url:location.href,elapsedMs:performance.now()-window.__closeEvidence.start,closeButtons:document.querySelectorAll('button[aria-label="Закрыть вкладку"]').length,terminals:document.querySelectorAll('.xterm').length,dialogText:[...document.querySelectorAll('[role="alertdialog"],[role="dialog"]')].map(e=>e.textContent),errors:window.__closeEvidence.errors,warnings:window.__closeEvidence.warnings})`);if(stage==="after"&&state.closeButtons===0)break;}
 const heldAfter=await fetch(host+"/__verification/status").then(r=>r.json());
 const view=await evaluate("({width:innerWidth,height:innerHeight})");
 const capture=await send("Page.captureScreenshot",{format:"png",clip:{x:0,y:0,...view,scale:0.5}});
 await Bun.write(output+stage+".png",Buffer.from(capture.data,"base64"));
 const report={stage,identity,heldBefore:held,heldAfter:heldAfter.held,...state};
 await Bun.write(output+stage+".json",JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
 if(stage==="before" && (state.closeButtons!==1 || state.dialogText.length!==0))throw new Error("Expected close to stay pending");
 if(stage==="after" && (state.closeButtons!==0 || state.elapsedMs>3000))throw new Error("Expected bounded close");
 if(state.errors.length)throw new Error("Unexpected console errors");
} finally {await fetch(host+"/__verification/release");ws.close();}
