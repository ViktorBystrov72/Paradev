const targets = await fetch("http://127.0.0.1:9256/json/list").then((r) => r.json());
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
const root="/Users/viktor/Documents/MyOpenSource/.tools/paradev-terminal-close-multi-20261117/";
async function click(selector:string){const point=await evaluate(`(()=>{const e=${selector};if(!e)throw new Error("Missing element");const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send("Input.dispatchMouseEvent",{type:"mouseMoved",...point});await send("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});await send("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});await Bun.sleep(350);}
async function state(){return evaluate(`({url:location.href,terminals:document.querySelectorAll(".xterm").length,tabs:document.querySelectorAll('button[aria-label="Закрыть вкладку"]').length,dialogs:[...document.querySelectorAll('[role="alertdialog"],[role="dialog"]')].map(e=>e.textContent),errors:window.__closeEvidence.errors})`)}
try{
 if(!(await state()).dialogs.length) await click(`document.querySelector('button[aria-label="Закрыть вкладку"]')`);
 let prompt=await state();for(let i=0;i<20&&!prompt.dialogs.length;i++){await Bun.sleep(50);prompt=await state()}if(prompt.dialogs.length!==1||prompt.tabs!==1)throw new Error(JSON.stringify(prompt));
 const view=await evaluate("({width:innerWidth,height:innerHeight})");const capture=await send("Page.captureScreenshot",{format:"png",clip:{x:0,y:0,...view,scale:0.5}});await Bun.write(root+"healthy-confirm.png",Buffer.from(capture.data,"base64"));
 await click(`[...document.querySelectorAll('[role="alertdialog"] button,[role="dialog"] button')].find(e=>e.textContent==="Cancel")`);
 const cancelled=await state();if(cancelled.tabs!==1||cancelled.terminals!==2||cancelled.dialogs.length!==0)throw new Error("Cancel did not retain tab");
 await click(`document.querySelector('button[aria-label="Закрыть вкладку"]')`);
 for(let i=0;i<20&&!(await state()).dialogs.length;i++)await Bun.sleep(50);
 await click(`[...document.querySelectorAll('[role="alertdialog"] button,[role="dialog"] button')].find(e=>e.textContent==="Закрыть вкладку")`);
 const closed=await state();if(closed.tabs!==0||closed.terminals!==0||closed.dialogs.length!==0||closed.errors.length)throw new Error("Confirm did not close cleanly");
 const report={prompt,cancelled,closed};await Bun.write(root+"healthy.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
}finally{ws.close()}
