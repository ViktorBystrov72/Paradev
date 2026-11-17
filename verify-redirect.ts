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
 await click(`window.__navProbe.node.querySelector('button')`);
 const selection=await evaluate(`({value:document.activeElement.value,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd})`);
 if(selection.start!==0||selection.end!==selection.value.length)throw new Error("Address input not selected");
 await send("Input.insertText",{text:fixture+"/redirect"});await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"});await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
 let final;for(let i=0;i<40;i++){await Bun.sleep(50);final=await state();if(final.committedGuestUrl===fixture+"/fast"&&!final.loading)break}
 if(final.committedGuestUrl!==fixture+"/fast"||final.address!==fixture+"/fast")throw new Error("Redirect URL did not replace the pending address");
 await shot("redirect",final.clip);await Bun.write(root+"redirect.json",JSON.stringify(final,null,2)+"\n");console.log(JSON.stringify(final,null,2));
}finally{ws.close()}
