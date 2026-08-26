import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

async function getGoogleChatAccessToken(capability: GoogleCapability): Promise<string> {
  const token = googleIdentity.getAccessToken();
  if (token && googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability)) return token;
  return googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
}

async function parseGoogleApiError(res: Response, prefix: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  try {
    const json = JSON.parse(raw);
    return `${prefix}: ${json?.error?.message || json?.error || `HTTP ${res.status}`}`;
  } catch {
    return `${prefix}: ${raw || `HTTP ${res.status}`}`;
  }
}

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }
function jsonHeaders(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

export interface ChatSpaceMember { name:string; displayName:string; avatarUrl?:string; type?:string; }
export interface ChatSpace { name:string; displayName?:string; type:string; spaceType?:string; spaceThreadingState?:string; singleUserBotDm?:boolean; members?:ChatSpaceMember[]; }
export interface ChatMessageResult { name:string; text?:string; thread?:{name:string}; space?:{name:string}; createTime?:string; sender?:string; }
export interface SpaceWebhookConfig { id:string; spaceId:string; name:string; webhookUrl:string; autoDailySummary:boolean; autoTaskAlerts:boolean; lastTriggered?:string; }
export function buildTaskApprovalCard(taskTitle:string,taskId:string,notes?:string,spaceName?:string){return {cardId:`task_approval_${taskId}_${Date.now()}`,card:{header:{title:'Task Execution Request',subtitle:'Elara Workspace Autonomous Action'},sections:[{widgets:[{textParagraph:{text:`<b>Title:</b> ${taskTitle}${notes?`<br><b>Notes:</b> ${notes}`:''}`}},{buttonList:{buttons:[{text:'Confirm & Add',onClick:{action:{function:'approve_task',parameters:[{key:'taskId',value:taskId},{key:'taskTitle',value:taskTitle},{key:'spaceName',value:spaceName||''}]}}},{text:'Cancel',onClick:{action:{function:'cancel_task',parameters:[{key:'taskId',value:taskId}]}}}]}}]}]}};}
export function buildDraftPreviewCard(title:string,summary:string,deepLinkUrl:string,type:'gmail'|'docs'|'sheet'|'chat'='gmail'){return {cardId:`draft_preview_${Date.now()}`,card:{header:{title:title||'Output Draft Ready',subtitle:`Elara Generated • ${type.toUpperCase()}`},sections:[{widgets:[{textParagraph:{text:summary}},{buttonList:{buttons:[{text:`Open in ${type==='gmail'?'Gmail Drafts':type==='docs'?'Google Docs':type==='sheet'?'Google Sheets':'Google Workspace'}`,onClick:{openLink:{url:deepLinkUrl}}}]}}]}]}};}
export function buildScheduleSweepCard(events:Array<{summary:string;time:string;location?:string}>){return {cardId:`schedule_sweep_${Date.now()}`,card:{header:{title:'Morning Schedule Sweep'},sections:[{widgets:[{textParagraph:{text:events.length?events.map((e,i)=>`<b>${i+1}. ${e.summary}</b><br>⏰ ${e.time}${e.location?`<br>📍 ${e.location}`:''}`).join('<br><br>'):'No upcoming events scheduled.'}},{buttonList:{buttons:[{text:'Open Google Calendar',onClick:{openLink:{url:'https://calendar.google.com'}}}]}}]}]}};}
export function buildSystemAlertCard(title:string,message:string,severity:'info'|'warning'|'alert'='info'){return {cardId:`system_alert_${Date.now()}`,card:{header:{title:title||'Elara System Status',subtitle:`Priority: ${severity.toUpperCase()}`},sections:[{widgets:[{textParagraph:{text:message}}]}]}};}
export async function listChatSpaces(pageSize=20):Promise<{spaces:ChatSpace[]}>{const token=await getGoogleChatAccessToken('chat.read');const res=await fetch(`https://chat.googleapis.com/v1/spaces?pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Chat spaces'));const d=await res.json();return {spaces:(d.spaces||[]).map((s:any)=>({name:s.name,displayName:s.displayName||'Workspace Space',type:s.type||s.spaceType||'SPACE',spaceType:s.spaceType||s.type,singleUserBotDm:s.singleUserBotDm||false}))};}
export async function createChatSpace(displayName:string,spaceType:'SPACE'|'GROUP_CHAT'='SPACE'):Promise<ChatSpace>{const token=await getGoogleChatAccessToken('chat.manage');const res=await fetch('https://chat.googleapis.com/v1/spaces',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({displayName,spaceType})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Chat space'));const d=await res.json();return {name:d.name,displayName:d.displayName||displayName,type:d.type||spaceType,spaceType:d.spaceType||spaceType};}
export async function listChatMessages(spaceName:string,pageSize=20):Promise<{messages:ChatMessageResult[]}>{const token=await getGoogleChatAccessToken('chat.read');const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages?pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Chat messages'));const d=await res.json();return {messages:(d.messages||[]).map((m:any)=>({name:m.name,text:m.text||'',thread:m.thread,space:m.space,createTime:m.createTime,sender:m.sender?.displayName||m.sender?.name||'User'}))};}
export async function sendChatMessage(spaceName:string,text:string,threadKey?:string):Promise<ChatMessageResult>{const token=await getGoogleChatAccessToken('chat.send');const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const body:any={text};if(threadKey)body.thread={threadKey};const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify(body)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to send Google Chat message'));const d=await res.json();return {name:d.name,text:d.text,thread:d.thread,space:d.space,createTime:d.createTime};}
export async function sendChatCardMessage(spaceName:string,cardsV2:any[],textFallback='',threadKey?:string):Promise<ChatMessageResult>{const token=await getGoogleChatAccessToken('chat.send');const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const body:any={text:textFallback,cardsV2:Array.isArray(cardsV2)?cardsV2:[cardsV2]};if(threadKey)body.thread={threadKey};const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify(body)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to send Google Chat card'));const d=await res.json();return {name:d.name,text:d.text,thread:d.thread,space:d.space,createTime:d.createTime};}
export async function postChatWebhook(webhookUrl:string,payload:any){if(!/^https?:\/\//.test(webhookUrl))throw new Error('Valid webhook URL required.');const res=await fetch(webhookUrl,{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(payload)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Google Chat webhook post failed'));try{return await res.json();}catch{return {status:'success'};}}
const LOCAL_WEBHOOKS_KEY='elara_google_chat_webhooks_v1';
export function loadSpaceWebhooks():SpaceWebhookConfig[]{try{const raw=localStorage.getItem(LOCAL_WEBHOOKS_KEY);return raw?JSON.parse(raw):[];}catch{return [];}}
export function saveSpaceWebhooks(configs:SpaceWebhookConfig[]){try{localStorage.setItem(LOCAL_WEBHOOKS_KEY,JSON.stringify(configs));}catch{}}
