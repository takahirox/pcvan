// Explicit real-model validation: headed browser, production assets, unchanged
// roster, one consented shipped model. No worker replacement or forced replies.
import { chromium, expect } from '@playwright/test';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const url = process.env.PCVAN_MODEL_URL ?? 'http://127.0.0.1:14375';
const worldSeed = process.env.PCVAN_WORLD_SEED ?? '0046b7c97f978224a1052effc70981ac';
if (!/^[a-f0-9]{32}$/.test(worldSeed)) throw new Error('PCVAN_WORLD_SEED must be 32 lowercase hex digits.');
const result = { worldSeed, qualityReview: {status:'pending',note:'Routing assertions do not grade Japanese relevance or persona quality.'}, date: new Date().toISOString(), model: process.env.PCVAN_MODEL_ID ?? 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', errors: [], acceptanceFailures: [], stages: [] };
const profile = process.env.PCVAN_MODEL_PROFILE ?? await mkdtemp(join(tmpdir(), 'pcvan-model-'));
const browser = await chromium.launchPersistentContext(profile, { headless: false, reducedMotion: 'reduce' });
const page = await browser.newPage();
page.on('pageerror', (e) => result.errors.push(e.message.slice(0, 300)));
const snapshot = () => page.evaluate(async () => {
 const db = await new Promise((resolve, reject) => { const r = indexedDB.open('pcvan-local'); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
 const tx = db.transaction(['settings','posts','mail'], 'readonly');
 const [rows,posts,mail] = await Promise.all(['settings','posts','mail'].map(store=>new Promise(resolve=>{const r=tx.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);}))); db.close();
 return { posts:posts.filter(p=>p.simulation), mail:mail.filter(m=>m.simulation), roster:rows.find(r=>r.id==='ai-residents')?.value, activity:rows.find(r=>r.id==='ai-activity')?.value, rooms: rows.find(r=>r.id==='olt-rooms')?.value, profiles: rows.find(r=>r.id==='ai-residents')?.value.profiles.length,modelId:rows.find(r=>r.id==='ai-activity')?.value.modelId,seed:rows.find(r=>r.id==='ai-activity')?.value.seed };
});
const command = async (text) => { const input=page.locator('#command'); await input.fill(text); await input.press('Enter'); await expect(page.locator('.output')).toContainText(`> ${text}`); };
try {
 // Fix only readActivity's seed ID at world initialization. All authored
 // profiles and schedule calculations remain exactly as shipped. Later IDs
 // and worker sampling stay random. Assert the intended seed after startup.
 await page.addInitScript((seed) => {
  const native = crypto.getRandomValues.bind(crypto); let used = false;
  crypto.getRandomValues = (view) => {
   if (!used && view instanceof Uint8Array && view.length === 16 && new Error().stack?.includes('.readActivity')) {
    used = true; view.set(seed.match(/../g).map((hex) => parseInt(hex, 16))); return view;
   }
   return native(view);
  };
 }, worldSeed);
 await page.clock.install({time:new Date('2026-10-21T13:04:00Z')});
 // Reset only this owned validation profile's app records; preserve model cache.
 await page.route('**/__model_evidence_reset__', route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Owned validation setup</title>'}));
 await page.goto(url+'/__model_evidence_reset__');
 await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('pcvan-local');r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Validation database still open'));}));
 await page.unroute('**/__model_evidence_reset__');
 await page.goto(url);
 result.environment = await page.evaluate(async()=> { const a=await navigator.gpu?.requestAdapter(); return {userAgent:navigator.userAgent, secure:isSecureContext, adapter:!!a, info:a ? {vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description}:null}; });
 if(!result.environment.adapter) throw new Error('No WebGPU adapter');
 await page.locator('#command').press('Escape'); await page.locator('#command').press('Escape');
 await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
 await command('Y'); await expect(page.locator('.output')).toContainText('ハンドル名='); await command('検証の客'); await expect(page.locator('.output')).toContainText('登録しました');
 const initialWorld=await snapshot(), initialRoster=initialWorld.roster;
 expect(initialWorld.seed,'Reproducible ordinary-world seed').toBe(worldSeed);
 result.profiles=initialWorld.profiles;
 const correspondents=initialRoster.profiles.filter(p=>p.weekdayHours.includes(22)&&p.reply>=.5&&p.inactivity<.7)
  .sort((a,b)=>initialWorld.activity.nextDue[a.id].localeCompare(initialWorld.activity.nextDue[b.id])).slice(0,3);
 result.testCorrespondents=correspondents.map(p=>p.id);
 // Public test material and an addressed synthetic letter enter through normal UI.
 await command('J MITI'); await command('3'); await command('9'); await command('WRITE');
 await command('双眼鏡の選び方'); await command('星を見たい初心者です。手持ちの双眼鏡は何倍くらいが使いやすいですか。'); await command('.END'); await command('Y'); await command('MAIN');
 await command('1');
 for(const p of correspondents) {
  await command(`WRITE ${p.id}`); await command('星見の相談');
  await command('初めて月を双眼鏡で見ようと思います。手ぶれを減らす工夫を一つ教えてください。'); await command('.END'); await command('Y');
 }
 await command('MAIN');
 await page.evaluate(()=>{
  window.modelEvidence={requests:[],commits:[],decisions:[]};
  const Native=window.Worker;
  window.Worker=class extends Native { postMessage(message,...rest) {
   if(message.kind==='chatCompletionNonStreaming') {
    const p=JSON.parse(message.content.request.messages[1].content.split('\n\n')[0]); const row={id:message.uuid,kind:p.kind??'forum',at:performance.now(),speaker:p.personaId,room:p.roomId,target:p.replyTo?.number,addressee:p.addressee?.id,forum:p.forumId,replyToPostId:p.replyToPostId,replyTarget:p.kind==='olt'?undefined:p.replyTarget,recipient:p.recipientId}; window.modelEvidence.requests.push(row);
    const receive=this.onmessage; this.onmessage=(event)=>{if(event.data.uuid===message.uuid) { row.completed=performance.now(); row.finishReason=event.data.content?.choices?.[0]?.finish_reason; row.workerResult=event.data.kind; row.output=String(event.data.content?.choices?.[0]?.message?.content??'').slice(0,1000); } receive?.call(this,event);};
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
 await page.locator('.activity-form input[name=maxPosts]').fill('12');
 await page.getByRole('button',{name:'活動設定を保存',exact:true}).click();
 await expect.poll(async()=> (await snapshot()).activity.maxPosts).toBe(12);
 await expect.poll(async()=> (await snapshot()).modelId).toBe(result.model);
 await page.getByRole('button',{name:'モデルを読み込む',exact:true}).click();
 const loadAt=performance.now(); await page.getByRole('button',{name:'同意してモデルを読み込む',exact:true}).click();
 console.log('Loading actual Qwen model…');
 const progress=setInterval(async()=>console.log((await page.locator('.ai-status').textContent().catch(()=>''))?.match(/モデル読込中…[^\n]*/)?.[0]??'Waiting for model readiness'),30000);
 try { await expect(page.locator('.ai-status')).toContainText('モデル準備完了',{timeout:900000}); } finally {clearInterval(progress);}
 result.loadMs=Math.round(performance.now()-loadAt);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();
 console.log('Loaded',result.loadMs,'ms; observing MAIN without joining');
 // Preserve a failed autonomous-chat assertion, then collect the independent
 // human/forum/mail diagnostics too. The run still exits unsuccessfully.
 try {
  await expect.poll(async()=> (await snapshot()).rooms.rooms.some(r=>new Set(r.lines.filter(l=>l.kind==='say').map(l=>l.authorId)).size>=2 && r.lines.some(l=>l.replyToNumber!==undefined)),{timeout:240000,intervals:[3000]}).toBe(true);
 } catch (error) {
  result.acceptanceFailures.push({stage:'unattended resident dialogue',message:error.message.slice(0,500)});
  console.log('Unattended exchange assertion failed; continuing independent diagnostics');
 }
 const before=await snapshot(); result.worldSeed=before.seed; result.profiles=before.profiles; result.unattended=before.rooms.rooms.map(r=>({room:r.id,visitors:r.visitors.length,speech:r.lines.filter(l=>l.kind==='say')})); result.unattendedDialogueVerified=before.rooms.rooms.some(r=>new Set(r.lines.filter(l=>l.kind==='say').map(l=>l.authorId)).size>=2 && r.lines.some(l=>l.replyToNumber!==undefined)); if(result.unattendedDialogueVerified) result.stages.push('unattended persisted dialogue');
 const room=before.rooms.rooms.find(r=>new Set(r.lines.filter(l=>l.kind==='say').map(l=>l.authorId)).size>=2) ?? before.rooms.rooms.find(r=>r.lines.some(l=>l.kind==='say')) ?? [...before.rooms.rooms].sort((a,b)=>b.residents.length-a.residents.length)[0];
 if(room.id==='wakaba'){await command('16'); await command('2'); await command('JOIN 1');}
 else {await command('13'); await command('2'); await command('OLT'); await command(`JOIN ${room.id==='night'?2:1}`);}
 await expect(page.locator('.output')).toContainText('発言=');
 result.joinedRoom=room.id;
 for(const l of room.lines.filter(l=>l.kind==='say')) await expect(page.locator('.output')).toContainText(l.text);
 console.log('Listening in the joined room without speaking for 180 seconds');
 const listeningStart=await snapshot();
 await new Promise(resolve=>setTimeout(resolve,180000));
 const listeningEnd=await snapshot();
 result.listening={durationMs:180000,before:listeningStart.rooms.rooms.find(r=>r.id===room.id).lines.filter(l=>l.kind==='say'),after:listeningEnd.rooms.rooms.find(r=>r.id===room.id).lines.filter(l=>l.kind==='say')};
 const greetingsAt=performance.now(); await command('こんにちは');
 await page.locator('#command').fill('書きかけの日本語'); await page.locator('#command').evaluate(el=>el.setSelectionRange(2,5)); await page.locator('#command').dispatchEvent('compositionstart');
 console.log('Greeting submitted once; observing for 60 seconds');
 await new Promise(resolve=>setTimeout(resolve,60000));
 result.greetingObservationMs=Math.round(performance.now()-greetingsAt); result.afterGreeting=await snapshot();
 result.draft=await page.locator('#command').evaluate(el=>({value:el.value,selection:[el.selectionStart,el.selectionEnd],focused:document.activeElement===el}));
 await page.locator('#command').dispatchEvent('compositionend'); await command('今夜は何を観察していますか。');
 await new Promise(resolve=>setTimeout(resolve,60000)); result.afterFollowUp=await snapshot();
 const finalRoom=result.afterFollowUp.rooms.rooms.find(r=>r.id===result.joinedRoom);
 const greeting=finalRoom.lines.find(l=>l.origin==='local-human'&&l.text==='こんにちは');
 const question=finalRoom.lines.find(l=>l.origin==='local-human'&&l.text==='今夜は何を観察していますか。');
 result.responses={greeting:finalRoom.lines.filter(l=>l.replyToNumber===greeting?.number),followUp:finalRoom.lines.filter(l=>l.replyToNumber===question?.number)};
 result.humanEvents=[greeting,question];
 result.stages.push('joined prior dialogue','180 seconds listening','greeting and follow-up observations');
 console.log('OLT response excerpts:',JSON.stringify(result.responses));
 // Leave OLT; advance one visible hour in <=30-second increments. Never jump
 // over a closed period or accelerate an in-flight inference/its lease.
 await command('/LEAVE'); await command('MAIN');
 console.log('Observing one accelerated visible world hour, including forum/mail visits');
 result.slowerServices={clock:'one hour, 30-second visible steps; actual worker time unaccelerated',activityLimit:12};
 for(let step=0;step<120;step++) {
  await expect.poll(async()=>{const s=await snapshot();return await page.evaluate(()=>window.modelEvidence.requests.every(r=>r.completed)) && s.rooms.rooms.every(r=>!r.pending) && !s.activity.batch?.runs.some(r=>r.status==='running');},{timeout:65000,intervals:[250]}).toBe(true);
  await page.clock.fastForward(30000); await new Promise(resolve=>setTimeout(resolve,250));
  if(step%20===19) {const s=await snapshot();console.log(`World +${(step+1)/2} min: ${s.posts.length} forum posts, ${s.mail.length} letters`);}
 }
 await expect.poll(async()=>{const s=await snapshot();return await page.evaluate(()=>window.modelEvidence.requests.every(r=>r.completed)) && s.rooms.rooms.every(r=>!r.pending) && !s.activity.batch?.runs.some(r=>r.status==='running');},{timeout:65000,intervals:[250]}).toBe(true);
 const final=await snapshot();
 result.finalWorld=final.rooms.rooms.map(r=>({id:r.id,speech:r.lines.filter(l=>l.kind==='say')}));
 expect(final.roster).toEqual(initialRoster);
 result.slowerServices.posts=final.posts; result.slowerServices.mail=final.mail;
 result.slowerServices.observedResidents=Object.entries(final.activity.observations??{}).filter(([,seen])=>seen.length).map(([id,seen])=>({id,events:seen.length}));
 await page.getByRole('button',{name:'設定 / Options',exact:true}).click();
 result.finalStatus=await page.locator('.ai-status').textContent();
 result.oltCounts=JSON.parse(result.finalStatus.match(/OLT 生成集計: (\{[^\n]+\})/)[1]);
 result.evidence=await page.evaluate(()=>window.modelEvidence);
 result.workerCounts={started:result.evidence.requests.length,completed:result.evidence.requests.filter(r=>r.finishReason==='stop').length,failed:result.evidence.requests.filter(r=>r.completed&&r.finishReason!=='stop').length,unfinished:result.evidence.requests.filter(r=>!r.completed).length};
 expect(result.responses.greeting.length,'A real committed greeting response').toBeGreaterThan(0);
 expect(result.responses.followUp.length,'A real committed follow-up response').toBeGreaterThan(0);
 expect(result.draft).toEqual({value:'書きかけの日本語',selection:[2,5],focused:true});
 expect(final.posts.length,'Actual generated forum participation').toBeGreaterThan(0);
 expect(final.mail.length,'Actual generated correspondence').toBeGreaterThan(0);
 result.stages.push('forum and addressed mail generation');
} catch(e) {
 result.blocker=e.message.slice(0,1200);
 result.snapshot=await snapshot().catch(()=>null);
 await page.getByRole('button',{name:'設定 / Options',exact:true}).click().catch(()=>{});
 result.status=await page.locator('.ai-status').textContent().catch(()=>null);
 result.evidence=await page.evaluate(()=>window.modelEvidence).catch(()=>null);
 console.log('Real-model validation incomplete:',result.blocker);
} finally {
 result.evidence??=await page.evaluate(()=>window.modelEvidence).catch(()=>null);
 if(!result.oltCounts) { const match=(result.finalStatus??result.status??'').match(/OLT 生成集計: (\{[^\n]+\})/); if(match) result.oltCounts=JSON.parse(match[1]); }
 if(result.evidence) result.workerCounts={started:result.evidence.requests.length,completed:result.evidence.requests.filter(r=>r.finishReason==='stop').length,failed:result.evidence.requests.filter(r=>r.completed&&r.finishReason!=='stop').length,unfinished:result.evidence.requests.filter(r=>!r.completed).length};
 if(result.afterGreeting) result.afterGreeting={rooms:result.afterGreeting.rooms.rooms.map(r=>({id:r.id,speech:r.lines.filter(l=>l.kind==='say').length}))};
 if(result.afterFollowUp) delete result.afterFollowUp;
 if(result.snapshot) result.snapshot={profiles:result.snapshot.profiles,rooms:result.snapshot.rooms?.rooms.map(r=>({id:r.id,residents:r.residents.length,speech:r.lines.filter(l=>l.kind==='say')}))};
 await writeFile('docs/resident-model-evidence.json',JSON.stringify(result,null,2)+'\n');
 await browser.close();
 if(!process.env.PCVAN_MODEL_PROFILE) await rm(profile,{recursive:true,force:true});
 console.log('Evidence: docs/resident-model-evidence.json');
 if(result.blocker || result.acceptanceFailures.length) process.exitCode=1;
}
