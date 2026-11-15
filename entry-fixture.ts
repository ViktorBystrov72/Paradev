import { DatabaseSync } from "node:sqlite";
import { statSync, writeFileSync } from "node:fs";
let sqlite: DatabaseSync;
export const env = { ORGANIZATION_ID:"shutdown-fixture",PORT:0,HOST_DB_PATH:process.env.SHUTDOWN_PROBE_DB,SUPERSET_HOST_RUN_MODE:"local",HOST_SERVICE_SECRET:"fixture-only",SUPERSET_API_URL:"http://127.0.0.1:1",AUTH_TOKEN:"fixture-only" };
export function createApp() {
 sqlite=new DatabaseSync(env.HOST_DB_PATH!);
 sqlite.exec("PRAGMA journal_mode=WAL; CREATE TABLE data(value TEXT); INSERT INTO data VALUES ('kept');");
 return {app:{fetch:()=>new Response("ok")},injectWebSocket:()=>{},api:{},db:{},launchSandboxAgent:()=>{},resumeCrashedAgents:()=>{},readLinkedPullRequests:()=>[],onPullRequestLinked:()=>()=>{},terminalAgentStore:{},dispose:async()=>{sqlite.close();writeFileSync(env.HOST_DB_PATH+".disposed","yes");}};
}
export function recordBootStamp(name:string) {if(name==="host.listening") process.send?.({ready:true,walBytes:statSync(env.HOST_DB_PATH+"-wal").size});}
export const processStartedAt=()=>0;
export const moveLegacyAppHome=()=>({move:"none",homeDir:"unused"});
export const getSupervisor=()=>({stop:async()=>writeFileSync(env.HOST_DB_PATH+".daemon-stopped","yes")});
export const configureSelfUpdater=()=>({status:()=>({updatable:false})});
class Provider {}
export {Provider as ConfigFileSessionTokenSource,Provider as JwtApiAuthProvider,Provider as SandboxApiAuthProvider,Provider as LocalGitCredentialProvider,Provider as PskHostAuthProvider};
export const startDaemonBootstrap=()=>{};
export const installConsoleTimestamps=()=>{};
export const provisionAgentIntegrations=async()=>{};
export const readSandboxBoxResources=()=>{};
export const resolveBrowserBridgeFromEnv=()=>null;
export const applyLoginShellEnvToProcess=async()=>{};
export const startSandboxAgentStatusReporter=()=>{};
export const startSandboxBoxPressureReporter=()=>{};
export const startSandboxCredentialRefresh=()=>{};
export const startSandboxKeepalive=()=>{};
export const startSandboxPullRequestReporter=()=>{};
export const startVitalsLog=()=>{};
export const detachFromLaunchDirectory=()=>{};
export const installProcessSafetyNet=()=>{};
export const installUpgradeSocketGuard=()=>{};
export const captureFatalStartupError=async()=>{};
export const initSentry=()=>{};
export const startTerminalBaseEnvResolution=()=>{};
export const startTerminalReaper=()=>{};
export const connectRelay=async()=>null;
