const stage = Bun.argv[2];
const destination = Bun.argv[3] ?? ".";
const org = "cd881bc9-0cab-4f76-84bc-16cfddefbfd5";
const route = "http://localhost:3025/#/workspace/957d7b45-762d-42b6-ae4e-27c314eaf287";
type Target = {id:string; type:string; url:string; webSocketDebuggerUrl:string};
const targets = ((await fetch("http://127.0.0.1:9268/json/list").then(r=>r.json())) as Target[]).filter(t=>t.type==="page"&&t.url===route);
if(targets.length!==2) throw new Error("Expected exactly two dev workspace windows");
async function connect(t:Target){
 const ws=new WebSocket(t.webSocketDebuggerUrl);
 const waiting=new Map<number,{resolve:(r:any)=>void;reject:(e:Error)=>void}>();
 let i=0;
 await new Promise<void>((resolve,reject)=>{ws.onopen=()=>resolve();ws.onerror=()=>reject(new Error("CDP socket failed"))});
 ws.onmessage=event=>{const m=JSON.parse(event.data.toString());const p=waiting.get(m.id);if(!p)return;waiting.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result)};
 function send(method:string, params:Record<string,unknown>={}){return new Promise<any>((resolve,reject)=>{const id=++i;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
 async function evaluate(s:string){const result=await send("Runtime.evaluate",{expression:s,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value}
 const auth=await evaluate(`(async()=>{const {authClient}=await import("/lib/auth-client.ts");const x=await authClient.getSession({fetchOptions:{throw:false}});return {route:location.href,org:x.data?.session?.activeOrganizationId}})()`);
 if(auth.org!==org||auth.route!==route){ws.close();throw new Error("Wrong dev session")}
 async function read(){return evaluate(`(()=>{const a=document.querySelector('aside[aria-label="Активность рабочего пространства"]');return {route:location.href,hidden:a?.getAttribute("aria-hidden")==="true",paneWidth:a?.parentElement.clientWidth,inset:a?.parentElement.style.getPropertyValue("--pane-aside-inset"),pref:JSON.parse(localStorage.getItem("workspace-activity-panel")??"null")?.state?.hidden,width:innerWidth,height:innerHeight}})()`)}
 async function toggle(){
  await send("Page.bringToFront");
  const point=await evaluate(`(()=>{const b=document.querySelector('button[aria-label="Активность рабочего пространства"]');const r=b.getBoundingClientRect();if(!r.width)throw new Error("Missing activity button");return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...point});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...point});
 }
 return {id:t.id,send,read,toggle,close:()=>ws.close()};
}
const a=await connect(targets[1]!);
const b=await connect(targets[0]!);
async function waitShown(w:Awaited<ReturnType<typeof connect>>){for(let i=0;i<80;i++){const s=await w.read();if(s.paneWidth>=1496&&s.hidden===false&&s.inset==="340px")return;await Bun.sleep(125)}throw new Error("Expected visible docked panel before toggle")}
try {
 if(stage==="after") {
  await Promise.all([a.send("Page.reload",{ignoreCache:true}),b.send("Page.reload",{ignoreCache:true})]);
  for(let i=0;i<80;i++){if((await a.read()).paneWidth>=1496&&(await b.read()).paneWidth>=1496)break;await Bun.sleep(125)}
 }
 const start=await a.read();
 if(start.hidden)await a.toggle();
 await waitShown(a);
 const peer=await b.read();
 if(peer.hidden){await b.send("Page.reload");await waitShown(b)}
 await waitShown(b);
 const initial={a:await a.read(),b:await b.read()};
 await a.toggle();
 await Bun.sleep(850);
 if(stage==="after"){for(let i=0;i<32;i++){if((await b.read()).hidden)break;await Bun.sleep(125)}}
 const result={stage,a:await a.read(),b:await b.read(),initial};
 if(!result.a.hidden||!result.a.pref||result.b.pref!==true)throw new Error("Local toggle did not write the shared choice");
 if(result.b.hidden!==(stage==="after"))throw new Error("Unexpected state in the second window: "+JSON.stringify(result));
 await b.send("Page.bringToFront");
 const shot=await b.send("Page.captureScreenshot",{format:"png",clip:{x:result.b.width-456,y:0,width:456,height:515,scale:1}});
 await Bun.write(destination+"/activity-windows-"+stage+".png",Buffer.from(shot.data,"base64"));
 await Bun.write(destination+"/activity-windows-"+stage+".json",JSON.stringify(result,null,2)+"\n");
 console.log(JSON.stringify(result,null,2));
} finally {a.close();b.close()}
