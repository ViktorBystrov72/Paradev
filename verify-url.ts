const targets = await fetch("http://127.0.0.1:9262/json/list").then((r) => r.json());
const target = targets.find((t: any) => t.type === "page" && t.url.startsWith("http://localhost:3185/"));
if (!target) throw new Error("Expected this worktree's renderer at localhost:3185");
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
const stage=Bun.argv[2]; const root=(Bun.argv[3]??".").replace(/\/$/, "")+"/";const fixture="http://127.0.0.1:19241";const requested=fixture+"/slow";
async function click(expression:string){const point=await evaluate(`(()=>{const e=${expression};if(!e)throw new Error("Missing address control");const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send("Input.dispatchMouseEvent",{type:"mouseMoved",...point});await send("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});await send("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});await Bun.sleep(100)}
async function state(){return evaluate(`(()=>{const n=window.__navProbe.node;const w=document.querySelector('webview');const t=document.querySelector('[class*="@container/browser-toolbar"]');const r=t.getBoundingClientRect();return{route:location.href,address:n.querySelector('input')?.value??n.innerText.trim(),committedGuestUrl:w.getURL(),loading:w.isLoading(),errors:window.__navProbe.errors,clip:{x:Math.max(0,r.x-6),y:Math.max(0,r.y-28),width:Math.min(innerWidth-r.x+6,r.width+12),height:145}}})()`)}
async function shot(name:string,clip:any){const image=await send("Page.captureScreenshot",{format:"png",clip:{...clip,scale:1}});await Bun.write(root+name+".png",Buffer.from(image.data,"base64"))}
try{
 const identity=await evaluate(`(async()=>{const {authClient}=await import('/lib/auth-client.ts');const x=await authClient.getSession({fetchOptions:{throw:false}});return{url:location.href,org:x.data?.session?.activeOrganizationId}})()`);
 if(identity.org!=="cf3826ed-3b65-4da1-b0d9-c8ea72fa842d"||!identity.url.includes("d965c714-4c79-480b-868a-897442b0abcd"))throw new Error("Wrong dev session");
 await fetch(fixture+"/release");
 await click(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Введите URL или запрос'))`);
 const input=await evaluate(`(()=>{const i=document.activeElement;if(!(i instanceof HTMLInputElement))throw new Error("Address input not focused");window.__navProbe={node:i.closest('form').parentElement,errors:[]};window.__navOriginalError??=console.error;console.error=(...args)=>{window.__navProbe.errors.push(args.map(String));window.__navOriginalError(...args)};return{value:i.value}})()`);
 if(input.value!=="")throw new Error("Expected a blank browser pane");
 await send("Input.insertText",{text:requested});
 const typed=await evaluate("document.activeElement.value");if(typed!==requested)throw new Error("Address was not typed");
 await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"});await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"});
 let status;for(let i=0;i<40;i++){status=await fetch(fixture+"/status").then(r=>r.json());if(status.pending===1)break;await Bun.sleep(50)}
 if(status.pending!==1)throw new Error("Fixture did not receive navigation");await Bun.sleep(250);
 const pending=await state();await shot(stage,pending.clip);const report={stage,identity,requested,typed,server:status,pending};await Bun.write(root+stage+".json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
 if(stage==="before"&&pending.address.includes(requested))throw new Error("Expected lost address before fix");if(stage==="after"&&pending.address!==requested)throw new Error("Expected pending address to remain visible");if(pending.committedGuestUrl!=="about:blank"||!pending.loading)throw new Error("Expected a pending main-frame navigation");if(pending.errors.length)throw new Error("Unexpected renderer error");
 await fetch(fixture+"/release");let completed;
 for(let i=0;i<40;i++){await Bun.sleep(50);completed=await state();if(completed.committedGuestUrl===requested&&!completed.loading)break}
 if(completed.committedGuestUrl!==requested||completed.loading)throw new Error("Navigation did not finish");await shot(stage+"-completed",completed.clip);await Bun.write(root+stage+"-completed.json",JSON.stringify(completed,null,2)+"\n");console.log("Navigation completed normally");
}finally{await fetch(fixture+"/release");ws.close()}
