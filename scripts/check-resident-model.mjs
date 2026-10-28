// Explicit real-model validation: headed browser, production assets, unchanged
// roster, one consented shipped model. No worker replacement or forced replies.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const url = process.env.PCVAN_MODEL_URL ?? 'http://127.0.0.1:14375';
const result = { qualityReview: {status:'pending',note:'Routing assertions do not grade Japanese relevance or persona quality.'}, date: new Date().toISOString(), model: process.env.PCVAN_MODEL_ID ?? 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', errors: [], stages: [] };
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ reducedMotion: 'reduce' });
page.on('pageerror', (e) => result.errors.push(e.message.slice(0, 300)));
const snapshot = () => page.evaluate(async () => {
 const db = await new Promise((resolve, reject) => { const r = indexedDB.open('pcvan-local'); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
 const tx = db.transaction('settings', 'readonly'); const rows = await new Promise((resolve) => { const r=tx.objectStore('settings').getAll(); r.onsuccess=()=>resolve(r.result); }); db.close();
 return { rooms: rows.find(r=>r.id==='olt-rooms')?.value, profiles: rows.find(r=>r.id==='ai-residents')?.value.profiles.length,modelId:rows.find(r=>r.id==='ai-activity')?.value.modelId,seed:rows.find(r=>r.id==='ai-activity')?.value.seed };
});
const command = async (text) => { const input=page.locator('#command'); await input.fill(text); await input.press('Enter'); await expect(page.locator('.output')).toContainText(`> ${text}`); };
try {
 await page.clock.install({time:new Date('2026-10-21T13:04:00Z')});
 await page.goto(url);
 result.environment = await page.evaluate(async()=> { const a=await navigator.gpu?.requestAdapter(); return {userAgent:navigator.userAgent, secure:isSecureContext, adapter:!!a, info:a ? {vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description}:null}; });
 if(!result.environment.adapter) throw new Error('No WebGPU adapter');
 await page.locator('#command').press('Escape'); await page.locator('#command').press('Escape');
 await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
 await command('Y'); await expect(page.locator('.output')).toContainText('ハンドル名='); await command('検証の客'); await expect(page.locator('.output')).toContainText('登録しました');
 await page.evaluate(()=>{
  window.modelEvidence={requests:[],commits:[],decisions:[]};
  const Native=window.Worker;
  window.Worker=class extends Native { postMessage(message,...rest) {
   if(message.kind==='chatCompletionNonStreaming') {
    const p=JSON.parse(message.content.request.messages[1].content); const row={id:message.uuid,kind:p.kind??'forum',at:performance.now(),speaker:p.personaId,room:p.roomId,target:p.replyTo?.number,addressee:p.addressee?.id}; window.modelEvidence.requests.push(row);
    const receive=this.onmessage; this.onmessage=(event)=>{if(event.data.uuid===message.uuid) { row.completed=performance.now(); row.finishReason=event.data.content?.choices?.[0]?.finish_reason; row.output=String(event.data.content?.choices?.[0]?.message?.content??'').slice(0,1000); } receive?.call(this,event);};
   } return super.postMessage(message,...rest);
  }};
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,key){if(this.name==='settings'&&value.id==='olt-rooms') { for(const r of value.value.rooms) for(const d of r.decisions??[]) { const key=`${r.id}:${d.authorId}:${d.targetNumber??'topic'}:${d.readyAt}`; if(!window.modelEvidence.decisions.some(x=>x.key===key)) window.modelEvidence.decisions.push({key,room:r.id,speaker:d.authorId,target:d.targetNumber,at:performance.now()}); } const speech=value.value.rooms.flatMap(r=>r.lines.filter(l=>l.kind==='say').map(l=>({room:r.id,...l}))); this.transaction.addEventListener('complete',()=>{for(const l of speech) if(!window.modelEvidence.commits.some(x=>x.id===l.id)) window.modelEvidence.commits.push({...l,at:performance.now()});}); } return key===undefined?put.call(this,value):put.call(this,value,key);};
 });
 await page.evaluate(()=>new MutationObserver(()=>{for(const l of window.modelEvidence.commits) if(!l.visibleAt && document.querySelector('.output')?.textContent.includes(l.text)) requestAnimationFrame(()=>{l.visibleAt??=performance.now();});}).observe(document.querySelector('.output'),{subtree:true,childList:true,characterData:true}));
 result.asset=await page.locator('script[type=module]').getAttribute('src');
 await page.getByRole('button',{name:'設定 / Options',exact:true}).click(); await page.locator('.ai-panel > summary').click();
 await page.locator('.model-select').selectOption(result.model);
 await expect.poll(async()=> (await snapshot()).modelId).toBe(result.model);
 await page.getByRole('button',{name:'モデルを読み込む',exact:true}).click();
 const loadAt=performance.now(); await page.getByRole('button',{name:'同意してモデルを読み込む',exact:true}).click();
 console.log('Loading actual Qwen model…');
 await expect(page.locator('.ai-status')).toContainText('モデル準備完了',{timeout:240000}); result.loadMs=Math.round(performance.now()-loadAt);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();
 console.log('Loaded',result.loadMs,'ms; observing MAIN without joining');
 await expect.poll(async()=> (await snapshot()).rooms.rooms.flatMap(r=>r.lines).filter(l=>l.origin.startsWith('local-ai:')).length,{timeout:240000,intervals:[3000]}).toBeGreaterThanOrEqual(3);
 const before=await snapshot(); result.worldSeed=before.seed; result.profiles=before.profiles; result.unattended=before.rooms.rooms.map(r=>({room:r.id,visitors:r.visitors.length,speech:r.lines.filter(l=>l.kind==='say')})); result.stages.push('unattended persisted speech');
 const room=before.rooms.rooms.find(r=>new Set(r.lines.filter(l=>l.kind==='say').map(l=>l.authorId)).size>=2) ?? before.rooms.rooms.find(r=>r.lines.some(l=>l.kind==='say'));
 if(room.id==='wakaba'){await command('16'); await command('2'); await command('JOIN 1');}
 else {await command('13'); await command('2'); await command('OLT'); await command(`JOIN ${room.id==='night'?2:1}`);}
 await expect(page.locator('.output')).toContainText('発言=');
 result.joinedRoom=room.id;
 for(const l of room.lines.filter(l=>l.kind==='say')) await expect(page.locator('.output')).toContainText(l.text);
 console.log('Listening in the joined room without speaking for 30 seconds');
 await new Promise(resolve=>setTimeout(resolve,30000));
 const greetingsAt=performance.now(); await command('こんにちは');
 await page.locator('#command').fill('書きかけの日本語'); await page.locator('#command').evaluate(el=>el.setSelectionRange(2,5)); await page.locator('#command').dispatchEvent('compositionstart');
 console.log('Greeting submitted once; observing for 60 seconds');
 await new Promise(resolve=>setTimeout(resolve,60000));
 result.greetingObservationMs=Math.round(performance.now()-greetingsAt); result.afterGreeting=await snapshot();
 result.draft=await page.locator('#command').evaluate(el=>({value:el.value,selection:[el.selectionStart,el.selectionEnd],focused:document.activeElement===el}));
 await page.locator('#command').dispatchEvent('compositionend'); await command('今夜は何を観察していますか。');
 await new Promise(resolve=>setTimeout(resolve,60000)); result.afterFollowUp=await snapshot(); result.evidence=await page.evaluate(()=>window.modelEvidence);
 const finalRoom=result.afterFollowUp.rooms.rooms.find(r=>r.id===result.joinedRoom);
 const greeting=finalRoom.lines.find(l=>l.origin==='local-human'&&l.text==='こんにちは');
 const question=finalRoom.lines.find(l=>l.origin==='local-human'&&l.text==='今夜は何を観察していますか。');
 result.responses={greeting:finalRoom.lines.filter(l=>l.replyToNumber===greeting?.number),followUp:finalRoom.lines.filter(l=>l.replyToNumber===question?.number)};
 result.humanEvents=[greeting,question];
 expect(result.responses.greeting.length,'A real committed greeting response').toBeGreaterThan(0);
 expect(result.responses.followUp.length,'A real committed follow-up response').toBeGreaterThan(0);
 expect(result.draft).toEqual({value:'書きかけの日本語',selection:[2,5],focused:true});
 result.stages.push('joined prior dialogue','greeting and follow-up observations');
} catch(e) {
 result.blocker=e.message.slice(0,1200);
 result.snapshot=await snapshot().catch(()=>null);
 await page.getByRole('button',{name:'設定 / Options',exact:true}).click().catch(()=>{});
 result.status=await page.locator('.ai-status').textContent().catch(()=>null);
 result.evidence=await page.evaluate(()=>window.modelEvidence).catch(()=>null);
 console.log('Real-model validation incomplete:',result.blocker);
} finally {
 if(result.afterGreeting) result.afterGreeting={rooms:result.afterGreeting.rooms.rooms.map(r=>({id:r.id,speech:r.lines.filter(l=>l.kind==='say').length}))};
 if(result.afterFollowUp) delete result.afterFollowUp;
 if(result.snapshot) result.snapshot={profiles:result.snapshot.profiles,rooms:result.snapshot.rooms?.rooms.map(r=>({id:r.id,residents:r.residents.length,speech:r.lines.filter(l=>l.kind==='say')}))};
 await writeFile('docs/resident-model-evidence.json',JSON.stringify(result,null,2)+'\n');
 await browser.close(); console.log('Evidence: docs/resident-model-evidence.json');
}
