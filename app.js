/* BrainHome 1.0 — local-first UX, safe backups, undo and inbox. */
(() => {
'use strict';
const V1_UNDO_KEY='brainhome-v10-undo';
const V1_PAYLOAD_FIELDS=['nodes','songs','shopping','routines','routineGroups','finances','privateOrder','trash','completionLog','knowledgeNodes','taskEvents','vouchers'];
const v1NewId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const v1CleanObject=o=>{const result={version:10};for(const key of V1_PAYLOAD_FIELDS)result[key]=Array.isArray(o?.[key])?JSON.parse(JSON.stringify(o[key])):[];return result};
const v1Json=o=>JSON.stringify(v1CleanObject(o));
const v1Html=s=>esc(s);
let v1Undo=[],v1Redo=[],v1Last=v1Json(data),v1SuppressHistory=false,v1ActiveSearch='';
try {const saved=JSON.parse(localStorage.getItem(V1_UNDO_KEY)||'{}');if(Array.isArray(saved.undo))v1Undo=saved.undo.slice(-18);if(Array.isArray(saved.redo))v1Redo=saved.redo.slice(-18)}catch{}
function v1SaveUndo(){
  try{
    v1Undo=v1Undo.slice(-18);v1Redo=v1Redo.slice(-18);
    let serialized=JSON.stringify({undo:v1Undo,redo:v1Redo});
    // Reserve localStorage capacity for the *real* BrainHome data, not history.
    while(serialized.length>650000&&(v1Undo.length||v1Redo.length)){
      if(v1Undo.length)v1Undo.shift();else v1Redo.shift();
      serialized=JSON.stringify({undo:v1Undo,redo:v1Redo});
    }
    localStorage.setItem(V1_UNDO_KEY,serialized);
  }catch{try{localStorage.removeItem(V1_UNDO_KEY)}catch{}}
}
function v1RemovalBatch(prev,next){
 const removed=[];
 for(const field of ['nodes','shopping','routines','routineGroups','finances']){
   const ids=new Set((next[field]||[]).map(v=>v.id));for(const record of prev[field]||[])if(!ids.has(record.id))removed.push({field,record});
 }
 // Songs have no IDs: retain any disappeared occurrences.
 const remaining=[...(next.songs||[])];for(const song of prev.songs||[]){const i=remaining.indexOf(song);if(i<0)removed.push({field:'songs',record:song});else remaining.splice(i,1)}
 return removed;
}
const v1OldSave=save;
save=function(){
 const next=v1Json(data),before=v1Last;
 if(next!==before){
   const prevObj=JSON.parse(before),nextObj=JSON.parse(next);
   if(!v1SuppressHistory){
     v1Undo.push(before);v1Undo=v1Undo.slice(-18);v1Redo=[];
     // The undo/redo arrows retain recent changes; no additional trash is created.
   }
   v1Last=v1Json(data);v1SaveUndo();
   queueMicrotask(()=>window.BHCloud?.markDirty?.());
 }
 v1OldSave();
};
function v1UndoAction(){if(!v1Undo.length){notice('Nichts rückgängig zu machen');return}v1Redo.push(v1Last);const snap=JSON.parse(v1Undo.pop());v1Apply(snap,{history:false,cloud:true});notice('Rückgängig gemacht')}
function v1RedoAction(){if(!v1Redo.length){notice('Nichts zum Wiederholen');return}v1Undo.push(v1Last);const snap=JSON.parse(v1Redo.pop());v1Apply(snap,{history:false,cloud:true});notice('Wiederholt')}
function v1Apply(payload,{history=true,cloud=true}={}){
 if(!Array.isArray(payload?.nodes)||!payload.nodes.every(n=>typeof n?.id==='string'&&typeof n?.name==='string'&&(typeof n.parent==='string'||n.parent===null)))throw Error('Ungültige Einträge im Backup.');
 const oldTab=data.tab,oldActive=data.active;
 if(history){v1Undo.push(v1Last);v1Undo=v1Undo.slice(-18);v1Redo=[]}
 const cleaned=v1CleanObject(payload);
 data={...data,...cleaned,tab:oldTab==='trash'||oldTab==='search'?'home':oldTab,active:oldActive};
 if(data.active&&!data.nodes.some(n=>n.id===data.active))data.active=null;
 for(const root of data.nodes.filter(n=>n.parent===null))if(!root.kind)root.kind='category';
 v1Last=v1Json(data);v1SaveUndo();v1OldSave();render();
 if(cloud)window.BHCloud?.markDirty?.();
}
function v1IsMeaningfulLocal(){
 if((data.knowledgeNodes||[]).length)return true;
 if((data.shopping||[]).length||(data.routines||[]).length||(data.finances||[]).length||(data.vouchers||[]).length||(data.songs||[]).length||(data.routineGroups||[]).length)return true;
 return (data.nodes||[]).some(n=>n.userCreated||n.privateSection||(n.parent!==null&&!(['Essen','Geschenke'].includes(n.name)&&n.kind==='category'&&n.parent===privateRoot()?.id)));
}
function v1RestoreTrash(id){const batch=(data.trash||[]).find(t=>t.id===id);if(!batch)return;
 for(const {field,record} of batch.items){if(field==='songs'){data.songs.push(record);continue}if(!Array.isArray(data[field]))data[field]=[];if(data[field].some(r=>r.id===record.id))continue;data[field].push({...record})}
 // Orphaned node paths can be restored to the inbox without discarding them.
 for(const {field,record} of batch.items){if(field!=='nodes')continue;const n=get(record.id);if(n&&n.parent!=='inbox'&&n.parent!==null&&!get(n.parent))n.parent='inbox'}
 data.trash=data.trash.filter(t=>t.id!==id);save();render();notice('Aus Papierkorb wiederhergestellt');
}
function v1Download(){const content={...v1CleanObject(data),exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BrainHome-Backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('exportBtn').onclick=v1Download;
$('importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const parsed=JSON.parse(await f.text());if(!Array.isArray(parsed.nodes))throw Error('Keine gültige BrainHome-Datei.');if(!confirm('Dieses Backup ersetzt die aktuellen Einträge. Bitte zuerst dein aktuelles Backup herunterladen. Fortfahren?'))return;v1Apply(parsed);$('backupDialog').close();notice('Backup erfolgreich geladen')}catch(err){alert('Import fehlgeschlagen: '+err.message)}finally{e.target.value=''}};

function v1InitHeader(){
 const header=document.querySelector('body > header');const oldBackup=$('backupBtn');const toolbar=document.createElement('div');toolbar.className='v1-head-actions';
 toolbar.innerHTML='<button class="v1-icon-btn" id="v1SearchBtn" title="Alle Einträge durchsuchen" aria-label="Suche">⌕</button><button class="v1-icon-btn" id="v1UndoBtn" title="Rückgängig" aria-label="Rückgängig">↶</button><button class="v1-icon-btn" id="v1RedoBtn" title="Wiederholen" aria-label="Wiederholen">↷</button><button class="btn v1-cloud-btn" id="v1CloudBtn" title="Cloud-Sicherung">☁ <span id="v1CloudDot">Offline</span></button>';
 oldBackup.parentNode.insertBefore(toolbar,oldBackup);toolbar.append(oldBackup);oldBackup.textContent='⇧ Backup';
 const nav=document.querySelector('nav.tabs'),home=document.createElement('button');home.dataset.tab='home';home.textContent='Startseite';nav.prepend(home);
 const oldInbox=nav.querySelector('[data-tab="inbox"]');if(oldInbox)oldInbox.textContent='Inbox';
 home.addEventListener('click',()=>setTab('home'));
 $('v1SearchBtn').onclick=()=>{setTab('search');document.getElementById('v1SearchInput')?.focus()};
 $('v1UndoBtn').onclick=v1UndoAction;$('v1RedoBtn').onclick=v1RedoAction;
 $('v1CloudBtn').onclick=()=>{const dlg=$('v1CloudDialog');if(!dlg)return;window.BHCloud?.refreshUI?.();dlg.showModal()};
}
function v1Date(d){if(!d)return'';const local=new Date(d+'T12:00:00');return isNaN(local)?d:local.toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}
function v1Home(){
 const now=localDay(),limit=new Date(now+'T12:00:00');limit.setDate(limit.getDate()+7);const in7=localDay(limit);
 // 'Sofort' for special entries is strictly opt-in; it does not follow from birthday proximity.
 const urgent=data.nodes.filter(n=>(isTask(n)||isPantry(n)&&n.pantryGroup==='In Zubereitung'&&n.prepTask===true)&&!n.done&&normalizePriority(n.priority)==='sofort').slice(0,8);
 const urgentRoutines=(data.routines||[]).filter(r=>(r.asTask===true||(r.asTask==null&&r.priority==='sofort'))&&normalizePriority(r.priority)==='sofort'&&routineDue(r));
 const urgentGifts=allNodesOfKind('gift').filter(n=>!n.done&&normalizePriority(n.priority)==='sofort');
 const due=data.nodes.filter(n=>isTask(n)&&!n.done&&normalizePriority(n.priority)!=='warten'&&n.due&&n.due<=in7).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
 // Only explicitly selected, unfinished gifts appear here; birthdays outside 28 days are allowed.
 const birthdays=allNodesOfKind('gift').filter(n=>n.giftPinned===true&&!n.done&&normalizePriority(n.priority)!=='sofort').sort((a,b)=>(nextBirthdayDays(a)??999)-(nextBirthdayDays(b)??999));
 const routines=(data.routines||[]).filter(r=>routineDue(r)&&!urgentRoutines.includes(r));
 const collapsedKey='brainhome-v23-home-collapsed';
 let collapsed={sofort:true,gifts:true,routines:true};
 try{collapsed={...collapsed,...JSON.parse(localStorage.getItem(collapsedKey)||'{}')}}catch{}
 const cell=(name,body,key='')=>!body?'':key?`<details class="v1-dash-card bh23-fold" data-bh23-fold="${key}" ${collapsed[key]?'':'open'}><summary>${name}<span class="bh23-fold-count">${key==='sofort'?urgent.length+urgentRoutines.length+urgentGifts.length:key==='routines'?routines.length:birthdays.length}</span></summary><div class="bh23-fold-body">${body}</div></details>`:`<section class="v1-dash-card"><h3>${name}</h3>${body}</section>`;
 const taskLink=(n,extra='')=>`<button class="v1-dash-row" data-action="v1-node" data-id="${v1Html(n.id)}"><span>${v1Html(n.name)}<small>${v1Html(rootName(n))}${extra?' · '+v1Html(extra):''}</small></span><span aria-hidden="true">↗</span></button>`;
 const giftRow=n=>`<button class="v1-dash-row" data-action="v1-gift-open" data-id="${v1Html(n.id)}"><span>${v1Html(n.name)}<small>${n.birthday?'Geburtstag in '+nextBirthdayDays(n)+' Tagen':'Geschenk noch offen'}</small></span><span aria-hidden="true">↗</span></button>`;
 const routineRow=r=>`<div class="v1-dash-row"><span>${v1Html(r.name)}<small>Alle ${Number(r.every)||1} ${r.unit==='weeks'?'Woche(n)':r.unit==='months'?'Monat(e)':'Tag(e)'}</small></span><button class="mini" data-action="routine-done" data-id="${v1Html(r.id)}">✓ Gemacht</button></div>`;
 const routineBody=routines.map(routineRow).join('');
 const urgentBody=[...urgent.map(n=>taskLink(n)),...urgentRoutines.map(routineRow),...urgentGifts.map(giftRow)].slice(0,8).join('');
 const cards=[
   cell('🔴 Sofort',urgentBody,'sofort'),
   cell('📅 Anstehende Termine',due.map(n=>taskLink(n,v1Date(n.due))).join('')),
   cell('🎁 Geschenke',birthdays.map(giftRow).join(''),'gifts'),
   cell('🌱 Routinen',routineBody,'routines')
 ].filter(Boolean).join('');
 return `<div class="v1-home-title"><h2>Startseite</h2></div>
 <form class="v1-capture" id="v1CaptureForm"><label for="v1CaptureInput">Inbox</label><div class="v1-capture-row"><input id="v1CaptureInput" required maxlength="250" placeholder="Gedanken oder Eintrag festhalten" autocomplete="off"><button type="submit" class="btn primary">＋ Merken</button></div></form>
 ${cards?`<div class="v1-dash-grid">${cards}</div>`:''}
 <div class="v1-home-areas"><div class="v1-title-row"><h3>Lebensbereiche</h3><button class="v1-small-plus" data-action="main-add" title="Neuen Lebensbereich anlegen" aria-label="Neuen Lebensbereich anlegen">＋</button></div><div class="project-grid">${data.nodes.filter(n=>n.parent===null).map(n=>`<button class="project" data-action="project" data-id="${v1Html(n.id)}"><strong>${v1Html(n.emoji||'🌿')} ${v1Html(n.name)}</strong><small>${descendants(n.id).map(get).filter(x=>x&&isTask(x)&&!x.done).length} offene Aufgaben</small></button>`).join('')}</div></div>`;
}
// Keep the two noisy home sections collapsed across refreshes and devices on this browser.
document.addEventListener('toggle',event=>{
 const details=event.target.closest?.('[data-bh23-fold]');if(!details)return;
 const key=details.dataset.bh23Fold;let state={};
 try{state=JSON.parse(localStorage.getItem('brainhome-v23-home-collapsed')||'{}')}catch{}
 state[key]=!details.open;
 localStorage.setItem('brainhome-v23-home-collapsed',JSON.stringify(state));
},true);
function v1SearchHTML(){return `<div class="v1-title-row"><h2>⌕ Alles durchsuchen</h2><button class="btn" data-action="v1-home">← Startseite</button></div><label class="v1-search-label" for="v1SearchInput">Suche in Aufgaben, Notizen, Kategorien, Routinen und Listen</label><input id="v1SearchInput" type="search" value="${v1Html(v1ActiveSearch)}" autocomplete="off" placeholder="Zum Beispiel Stadtführung, Leipzig, Finanzen …"><div id="v1SearchResults">${v1SearchResults()}</div>`}
function v1SearchResults(){const q=v1ActiveSearch.trim().toLocaleLowerCase('de');if(!q)return'<p class="hint">Tippe etwas ein, um deine Einträge zu finden.</p>';
 const entries=[];for(const n of data.nodes){const content=[n.name,n.notes,n.due,path(n)].join(' ').toLocaleLowerCase('de');if(content.includes(q))entries.push({label:n.name,detail:(n.parent==='inbox'?'Inbox':path(n)),action:'v1-node',id:n.id})}
 for(const [field,label,act] of [['shopping','Einkauf','shopping-edit'],['routines','Routine','routine-edit'],['finances','Finanzen','finance-edit']])for(const n of data[field]||[])if([n.name,n.notes||''].join(' ').toLocaleLowerCase('de').includes(q))entries.push({label:n.name,detail:label,action:act,id:n.id});
 for(const n of data.routineGroups||[])if(n.name.toLocaleLowerCase('de').includes(q))entries.push({label:n.name,detail:'Routinen-Untergruppe',action:'v1-panel',id:'routines'});
 for(const song of data.songs||[])if(song.toLocaleLowerCase('de').includes(q))entries.push({label:song,detail:'Lagerfeuer-Lieder',action:'v1-panel',id:'songs'});
 return `<p class="hint">${entries.length} Treffer${entries.length>100?' · die ersten 100 werden angezeigt':''}</p><div class="tasks">${entries.slice(0,100).map(n=>`<button class="v1-result" data-action="${n.action}" data-id="${v1Html(n.id)}"><strong>${v1Html(n.label)}</strong><small>${v1Html(n.detail)}</small></button>`).join('')||'<p class="hint">Keine passenden Einträge gefunden.</p>'}</div>`;
}
function v1TrashHTML(){const trash=data.trash||[];return `<div class="v1-title-row"><h2>♲ Papierkorb</h2><button class="btn" data-action="v1-home">← Startseite</button></div><p class="hint">Gelöschte Einträge lassen sich hier bis zu 30 Tage lang wiederherstellen. Einträge, die vor diesem Update gelöscht wurden, können nicht nachträglich gerettet werden.</p>${trash.length?trash.map(t=>`<div class="task"><div class="detail"><strong>${v1Html(t.label)}</strong><small>${t.items.length} Eintrag/Einträge · gelöscht am ${v1Date(t.deletedAt?.slice(0,10))}</small></div><button class="btn" data-action="v1-restore" data-id="${v1Html(t.id)}">↶ Wiederherstellen</button></div>`).join(''):'<div class="panel hint">Der Papierkorb ist leer.</div>'}`}
function v1AddFolderUI(){const app=$('app');if(data.tab==='projects'){
 const add=app.querySelector('.project-add');add?.remove();const h=app.querySelector('h2');if(h){const bar=document.createElement('div');bar.className='v1-title-row';h.parentNode.insertBefore(bar,h);bar.append(h);bar.insertAdjacentHTML('beforeend','<button class="v1-small-plus" data-action="main-add" aria-label="Hauptprojekt hinzufügen" title="Neues Hauptprojekt">＋</button>')}
 }
 if(data.tab==='tree'){
   app.querySelectorAll('.topline > [data-action="add"],.topline > .project-edit,.topline > [data-action="main-delete"]').forEach(el=>el.remove());
   const heading=app.querySelector('.topline h2');if(heading){heading.id='v1ProjectTitle';heading.setAttribute('title','Lange drücken oder rechtsklicken, um den Namen zu ändern');heading.setAttribute('tabindex','0');heading.setAttribute('role','button');heading.setAttribute('aria-label','Projektname – lange drücken zum Bearbeiten');}
 }
 if(data.tab==='inbox'){
   app.querySelector('h2')?.replaceChildren('Inbox');
 }
}
function v1PathIds(value){if(value==='inbox'||!value)return[];const chain=[];let cur=get(value),guard=0;while(cur&&guard++<50){chain.unshift(cur.id);cur=cur.parent?get(cur.parent):null}return chain}
let v1CurrentParent='inbox';
function v1UsableParent(n){if(!n)return false;const self=editId?get(editId):null;if(self&&(n.id===editId||descendants(editId).includes(n.id)))return false;return !['pantry','gift'].includes(kindOf(n))&&!isSpecialTreeNode(n)||!!n.privateSection}
function v1SetDestination(id){v1CurrentParent=id||'inbox';$('parent').value=v1CurrentParent;v1DrawPath()}
function v1DrawPath(){const div=$('v1PathPicker');if(!div)return;
 const chain=v1PathIds(v1CurrentParent),current=get(v1CurrentParent);
 const siblings=data.nodes.filter(n=>n.parent===(current?.id??null)&&v1UsableParent(n));
 const nav=`<button type="button" class="v1-breadcrumb" data-v1-path="inbox">Alle</button>${chain.map(id=>`<span>›</span><button type="button" class="v1-breadcrumb" data-v1-path="${v1Html(id)}">${v1Html(get(id)?.name||'…')}</button>`).join('')}`;
 const entries=(current?'<button type="button" class="v1-path-choice" data-v1-select="'+v1Html(current.id)+'">✓ Hier ablegen <small>'+v1Html(path(current))+'</small></button>':'<button type="button" class="v1-path-choice" data-v1-select="inbox">✓ In Inbox ablegen</button>')+siblings.map(n=>`<button type="button" class="v1-path-choice" data-v1-path="${v1Html(n.id)}">${v1Html(n.emoji||'▸')} ${v1Html(n.name)} <span>›</span></button>`).join('');
 div.innerHTML='<div class="v1-breadcrumbs">'+nav+'</div><p class="hint">Gewählter Ort: <strong>'+v1Html(current?path(current):'Inbox')+'</strong></p><div class="v1-path-level">'+entries+'</div>';
}
const v1OriginalEditor=openEditor;
openEditor=function(id,parent){v1OriginalEditor(id,parent);const select=$('parent');v1CurrentParent=select.value||'inbox';v1DrawPath()};
function v1InitPathPicker(){const field=$('parentField');field.querySelector('label').textContent='Speichern unter · Pfad auswählen';const div=document.createElement('div');div.id='v1PathPicker';field.append(div);const sel=$('parent');sel.setAttribute('aria-hidden','true');sel.tabIndex=-1;sel.style.display='none';}
function v1Render(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===data.tab||(data.tab==='tree'&&b.dataset.tab==='projects')));
 if(data.tab==='home'){$('app').innerHTML=v1Home();return}
 if(data.tab==='search'){$('app').innerHTML=v1SearchHTML();return}
 if(data.tab==='trash'){data.tab='home';$('app').innerHTML=v1Home();return}
 v1PreviousRender();v1AddFolderUI();
}
const v1PreviousRender=render;render=v1Render;
function v1InitEvents(){
 $('app').addEventListener('submit',e=>{if(e.target.id!=='v1CaptureForm')return;e.preventDefault();const name=$('v1CaptureInput').value.trim();if(!name)return;data.nodes.push({id:v1NewId(),parent:'inbox',name,kind:'list',checkable:false,done:false,priority:'',due:'',notes:'',collapsed:false});save();render();notice('In der Inbox gespeichert')});
 $('app').addEventListener('input',e=>{if(e.target.id==='v1SearchInput'){v1ActiveSearch=e.target.value;$('v1SearchResults').innerHTML=v1SearchResults()}});
 document.addEventListener('click',e=>{const pathBtn=e.target.closest('[data-v1-path]'),selectBtn=e.target.closest('[data-v1-select]');if(pathBtn){e.preventDefault();v1SetDestination(pathBtn.dataset.v1Path);return}if(selectBtn){e.preventDefault();v1SetDestination(selectBtn.dataset.v1Select);return}},true);
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
   if(!['v1-home','v1-search','v1-node','v1-panel','v1-restore','v1-gift-open'].includes(a))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(a==='v1-home'){setTab('home');return}
   if(a==='v1-search'){setTab('search');document.getElementById('v1SearchInput')?.focus();return}
   if(a==='v1-restore'){v1RestoreTrash(id);return}
   if(a==='v1-gift-open'){panels.gifts=true;localStorage.setItem(PANEL_KEY,JSON.stringify(panels));const priv=privateRoot();if(priv)openProject(priv.id);requestAnimationFrame(()=>document.querySelector('[data-panel="gifts"]')?.scrollIntoView({behavior:'smooth',block:'start'}));return}
   if(a==='v1-panel'){panels[id]=true;localStorage.setItem(PANEL_KEY,JSON.stringify(panels));const priv=privateRoot();if(priv)openProject(priv.id);requestAnimationFrame(()=>document.querySelector(`[data-panel="${id}"]`)?.scrollIntoView({behavior:'smooth'}));return}
   const n=get(id);if(!n)return;if(n.parent==='inbox'){setTab('inbox')}else{const root=rootOf(n);if(root)openProject(root.id)}openEditor(id);
 },true);
 // Long press only applies to the main project title, not to draggable tree nodes.
 let pressTimer=null,pressOrigin=null,blockClickUntil=0;
 const cancel=()=>{if(pressTimer)clearTimeout(pressTimer);pressTimer=null;pressOrigin=null};
 $('app').addEventListener('pointerdown',e=>{const heading=e.target.closest('#v1ProjectTitle');if(!heading||e.button!==0)return;cancel();pressOrigin={x:e.clientX,y:e.clientY};pressTimer=setTimeout(()=>{pressTimer=null;blockClickUntil=Date.now()+700;editMainProject()},560)});
 window.addEventListener('pointermove',e=>{if(pressOrigin&&Math.hypot(pressOrigin.x-e.clientX,pressOrigin.y-e.clientY)>12)cancel()});
 window.addEventListener('pointerup',cancel);window.addEventListener('pointercancel',cancel);
 $('app').addEventListener('contextmenu',e=>{if(e.target.closest('#v1ProjectTitle')){e.preventDefault();cancel();editMainProject()}});
 $('app').addEventListener('keydown',e=>{if(e.target.id==='v1ProjectTitle'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();editMainProject()}});
 $('app').addEventListener('click',e=>{if(e.target.closest('#v1ProjectTitle')&&Date.now()<blockClickUntil){e.preventDefault();e.stopPropagation()}},true);
}
function v1CloudUX(){const dlg=$('v1CloudDialog');dlg.querySelector('[data-v1-close]').onclick=()=>dlg.close();$('v1CloudOfflineNote').textContent='Auch ohne Cloud bleiben deine Einträge lokal verfügbar. Lade zur Sicherheit regelmäßig ein JSON-Backup herunter.';}
window.BH10={setDestination:id=>v1SetDestination(id),exportData:()=>v1CleanObject(data),applyData:payload=>v1Apply(payload,{history:true,cloud:false}),hasLocalData:v1IsMeaningfulLocal,exportBackup:v1Download,showNotice:notice,updateCloudStatus:(text,status='offline')=>{const node=$('v1CloudDot');if(node)node.textContent=text;const badge=$('v1CloudBtn');if(badge)badge.dataset.cloud=status;},undo:v1UndoAction};
if(!Array.isArray(data.trash))data.trash=[];
// The special Privat area keeps working even if the user renames its visible title.
const v1Private=data.nodes.find(n=>n.parent===null&&(n.privateArea||n.name==='Privat'||data.nodes.some(c=>c.parent===n.id&&c.name==='Essen')&&data.nodes.some(c=>c.parent===n.id&&c.name==='Geschenke')));
if(v1Private&&!v1Private.privateArea){v1Private.privateArea=true;v1Last=v1Json(data)}
privateRoot=function(){return data.nodes.find(n=>n.parent===null&&(n.privateArea||n.name==='Privat'))};
isSpecialTreeNode=function(n){
 if(!n)return false;
 if(n.privateSection||isPantry(n)||isGift(n))return true;
 const root=privateRoot();return !!(root&&n.parent===root.id&&isCategory(n)&&['Essen','Geschenke','Essen & Einkauf'].includes(n.name));
};
v1InitHeader();v1InitPathPicker();v1InitEvents();v1CloudUX();
data.tab='home';v1OldSave();render();
})();


/* --- next BrainHome module --- */

/* BrainHome 1.1 — quiet overview, independent branches, remembered choices.
   No schema migration. The existing Firebase setup and node identifiers are unchanged. */
(() => {
'use strict';
const PREF_KEY='brainhome-v11-last-choices';
const prefs=(()=>{try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}catch{return{}}})();
function remember(section,fields){prefs[section]={...fields};try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}}
window.BH11Prefs={
 get routine(){return prefs.routine||{}},
 get finance(){return prefs.finance||{}},
 rememberRoutine:r=>remember('routine',r),
 rememberFinance:f=>remember('finance',f)
};
const oldEditor=openEditor;
openEditor=function(id,parent){
 oldEditor(id,parent);
 if(id)return;
 const p=prefs.entry||{};
 // A specific '+' in a branch always wins over the previously selected destination.
 if((!parent||parent==='inbox')&&p.parent&&p.parent!=='inbox'&&get(p.parent)){
   $('parent').value=p.parent;
   $('parent').value=p.parent;
   window.BH10?.setDestination?.(p.parent);
 }
 if(!['pantry','gift'].includes($('kind').value)){
   const kind=['task','category','list'].includes(p.kind)?p.kind:'task';
   $('kind').value=kind;
   $('priority').value=['','sofort','wichtig','spaeter'].includes(p.priority)?p.priority:'';
   $('checkable').checked=p.checkable!==false;
   updateEditorFields();
 }
};
$('editForm').addEventListener('submit',()=>{
 // This runs in the capture phase, before BrainHome persists the entry.
 if(editId)return;
 if(!['pantry','gift'].includes($('kind').value)){
   remember('entry',{kind:$('kind').value,priority:$('priority').value,checkable:$('checkable').checked,parent:$('parent').value});
 }
},true);

// Each sibling is independent. Completed nodes always follow their pending siblings.
// When a completed parent still contains active children, keep the branch available.
const bh11ChildrenIndex=new Map();
const bh11Index=()=>{bh11ChildrenIndex.clear();for(const node of data.nodes){if(!bh11ChildrenIndex.has(node.parent))bh11ChildrenIndex.set(node.parent,[]);bh11ChildrenIndex.get(node.parent).push(node)}};
function bh11HasVisibleDescendant(node,visited=new Set()){
 if(visited.has(node.id))return false;
 visited.add(node.id);
 for(const child of bh11ChildrenIndex.get(node.id)||[]){
   if(isSpecialTreeNode(child))continue;
   if(!isTask(child)||!child.done)return true;
   if(bh11HasVisibleDescendant(child,visited))return true;
 }
 return false;
}
function bh11Visible(n){return !isSpecialTreeNode(n)&&(showDone||!isTask(n)||!n.done||bh11HasVisibleDescendant(n))}
orderedTreeKids=function(id){
 const nodes=(bh11ChildrenIndex.get(id)||[]).filter(bh11Visible);
 const rank=n=>({sofort:0,wichtig:1,spaeter:2,warten:3,'':4})[normalizePriority(n.priority)]??4;
 return nodes.sort((a,b)=>Number(isTask(a)&&a.done)-Number(isTask(b)&&b.done)||(isTask(a)&&isTask(b)?rank(a)-rank(b):0));
};
const e=s=>esc(s);
function bh11Row(n){
 const children=orderedTreeKids(n.id),completed=isTask(n)&&n.done;
 const isGroup=isCategory(n),title=isGroup?'Kategorie':isTask(n)?(completed?'Erledigt':(priorityLabel[normalizePriority(n.priority)]||'')):'';
 return `<div class="bh11-row outline-row" data-kind="${e(kindOf(n))}" data-done="${completed?'yes':'no'}" data-node-id="${e(n.id)}">
  <span class="bh11-name">${isGroup?'▸ ':isTask(n)?(completed?'✓ ':'□ '):'• '}${e(n.name)}</span>
  ${title?`<span class="bh11-kind">${e(title)}</span>`:''}
  <span class="bh11-actions"><button class="mini" data-action="add" data-id="${e(n.id)}" title="Unterpunkt hinzufügen" aria-label="Unterpunkt hinzufügen">＋</button><button class="mini" data-action="edit" data-id="${e(n.id)}" title="Bearbeiten" aria-label="Bearbeiten">✎</button>${isTask(n)?`<button class="mini" data-action="done" data-id="${e(n.id)}" title="${completed?'Wieder öffnen':'Abhaken'}">${completed?'↺':'✓'}</button>`:''}${children.length?`<button class="mini" data-action="toggle" data-id="${e(n.id)}" title="Auf-/zuklappen">${n.collapsed?'▸':'▾'}</button>`:''}</span>
 </div>`;
}
const BH11_LIMIT=10;
function bh11PreviewChildren(id,state,seen=new Set(),depth=0){
 if(depth>32||seen.has(id))return'';
 seen=new Set(seen);seen.add(id);
 const children=orderedTreeKids(id);let result='';
 for(const child of children){
   // Count actionable AND plain list entries; keep categories as structural landmarks.
   if(!isCategory(child)){
     if(state.count>=BH11_LIMIT){state.hidden=true;continue}
     state.count++;
   }
   const inner=child.collapsed?'':bh11PreviewChildren(child.id,state,seen,depth+1);
   result+=`<div class="bh11-mini-node">${bh11Row(child)}${inner?`<div class="bh11-subnodes">${inner}</div>`:''}</div>`;
 }
 return result;
}
function bh11PreviewHTML(root){
 bh11Index();
 const top=orderedTreeKids(root.id);
 const sections=top.map(n=>{
   const state={count:isCategory(n)?0:1,hidden:false};
   const inner=n.collapsed?'':bh11PreviewChildren(n.id,state,new Set([root.id]),1);
   return `<section class="bh11-branch">${bh11Row(n)}${inner?`<div class="bh11-subnodes">${inner}</div>`:''}${state.hidden?'<div class="bh11-empty">Weitere Einträge im großen Baum ansehen …</div>':''}</section>`;
 }).join('');
 return `<div class="bh11-preview-wrap"><div class="bh11-preview-title">Äste im Überblick <button class="mini" data-action="add" data-id="${e(root.id)}" aria-label="Eintrag auf oberster Ebene hinzufügen" title="Eintrag auf oberster Ebene hinzufügen">＋</button></div><div class="bh11-preview-tree">${sections||'<p class="bh11-empty">Noch keine Einträge.</p>'}</div></div>`;
}
function bh11FullChildren(id,seen=new Set(),depth=0){
 if(depth>55||seen.has(id))return'';
 seen=new Set(seen);seen.add(id);
 return orderedTreeKids(id).map(n=>{
   const inner=n.collapsed?'':bh11FullChildren(n.id,seen,depth+1);
   return `<div class="bh11-full-node">${bh11Row(n)}${inner?`<div class="bh11-subnodes">${inner}</div>`:''}</div>`;
 }).join('');
}
function bh11DrawFull({resetScroll=false}={}){
 const dialog=$('bh11TreeDialog'),root=get(data.active);
 if(!dialog?.open||!root)return;
 bh11Index();
 const scroller=$('bh11TreeScroll'),x=scroller.scrollLeft,y=scroller.scrollTop;
 $('bh11TreeTitle').textContent=root.name;
 $('bh11TreeToggleDone').textContent=showDone?'✓ Erledigte sichtbar':'Erledigte zeigen';
 $('bh11TreeCount').textContent=(data.nodes.filter(n=>rootOf(n)?.id===root.id&&n.id!==root.id&&bh11Visible(n)).length)+' Einträge';
 const children=bh11FullChildren(root.id);
 $('bh11TreeContent').innerHTML=`<div class="bh11-branch">${bh11Row(root)}${children?`<div class="bh11-subnodes">${children}</div>`:''}</div>`;
 if(!resetScroll){scroller.scrollLeft=x;scroller.scrollTop=y}else{scroller.scrollTop=0;scroller.scrollLeft=0}
}
const oldTreeNode=nodeHTML,oldOutline=outlineHTML;
nodeHTML=function(n,depth){if(data.tab==='tree'&&n.id===data.active&&depth===0)return bh11PreviewHTML(n);return oldTreeNode(n,depth)};
outlineHTML=function(n,depth=0){if(data.tab==='tree'&&n.id===data.active&&depth===0)return bh11PreviewHTML(n);return oldOutline(n,depth)};
// The preview has no SVG branches; avoid the costly connector measurements altogether.
drawConnectors=function(){};
const oldRender=render;
render=function(){
 const modal=$('bh11TreeDialog'),open=modal?.open;
 bh11Index();oldRender();
 if(data.tab==='tree'){
   const app=$('app');
   app.querySelector('.zoom-toolbar')?.remove();
   app.querySelector('.bh09-tree-more')?.remove();
   const tree=app.querySelector('.tree-scroll');if(tree){tree.style.minHeight='0';tree.style.padding='0';tree.style.background='transparent';const content=tree.querySelector('.tree');if(content){content.style.display='block';content.style.minWidth='0';content.style.zoom='1';}}
   // The modal displays the entire subtree, even if the preview is short.
   const overview=app.querySelector('.bh11-preview-wrap');
   if(overview){const more=document.createElement('button');more.type='button';more.className='bh11-more';more.dataset.action='bh11-open-tree';more.textContent='⤢ Gesamten Baum ansehen';overview.after(more)}
   app.querySelectorAll('p.hint').forEach(h=>{if(/Tiefe erhöhen|lange gedrückt halten und verschieben|Einträge ohne Häkchen/i.test(h.textContent))h.remove()});
 }
 if(open){if(data.tab==='tree')bh11DrawFull();else modal.close()}
};
$('bh11TreeClose').onclick=()=>$('bh11TreeDialog').close();
$('bh11TreeToggleDone').onclick=()=>{showDone=!showDone;render()};
// If a task is checked in the full-screen dialog, the document listener will save;
// render() refreshes the full tree while preserving the scroll position.
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action="bh11-open-tree"]');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 const modal=$('bh11TreeDialog');modal.showModal();bh11DrawFull({resetScroll:true});
},true);

// Gift checkbox now means 'show this unfinished gift on the dashboard'.
// The separate button is the actual completed/not-completed state.
const prevSpecials=specialsHTML;
specialsHTML=function(){
 const html=prevSpecials(),host=document.createElement('div');host.innerHTML=html;
 const section=host.querySelector('[data-panel="gifts"] .private-panel-content');
 if(section){
   const giftRows=allNodesOfKind('gift').slice().sort((a,b)=>(nextBirthdayDays(a)??999)-(nextBirthdayDays(b)??999)).map(n=>{
     const checked=!!n.giftPinned&&!n.done;
     return `<div class="shopping-item bh11-gift-choice"><input type="checkbox" id="bh11-gift-${e(n.id)}" data-action="bh11-gift-pin" data-id="${e(n.id)}" ${checked?'checked':''} aria-label="${e(n.name)} auf Startseite anzeigen"><label for="bh11-gift-${e(n.id)}"><strong>${e(n.name)}</strong><small> ${n.birthday?'· '+e(n.birthday.slice(5).split('-').reverse().join('.')):''} ${nextBirthdayDays(n)!==null?'· in '+nextBirthdayDays(n)+' Tagen':''}</small></label><button class="mini bh11-gift-done" data-action="bh11-gift-done" data-id="${e(n.id)}" title="Geschenkstatus ändern">${n.done?'↺ Wieder offen':'✓ Geschenk fertig'}</button><button class="mini" data-action="edit" data-id="${e(n.id)}" title="Bearbeiten">✎</button></div>`;
   }).join('');
   section.innerHTML=`<div class="topline"><p class="hint">Häkchen = Geschenk noch offen und auf der Startseite anzeigen.</p><button class="btn" data-action="special-add" data-kind="gift">＋ Person</button></div>${giftRows||'<p class="hint">Noch keine Geburtstage.</p>'}`;
 }
 return host.innerHTML;
};
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action;
 if(!['bh11-gift-pin','bh11-gift-done'].includes(action))return;
 event.preventDefault();event.stopImmediatePropagation();
 const gift=get(target.dataset.id);if(!gift||!isGift(gift))return;
 if(action==='bh11-gift-pin'){
   gift.giftPinned=!gift.giftPinned;
   if(gift.giftPinned)gift.done=false;
 }else{
   gift.done=!gift.done;
   gift.giftPinned=!gift.done; // reopening an unfinished gift adds it to the home reminders
 }
 save();render();
},true);

// Remove the remaining promotional tagline (helps keep the app quiet).
document.querySelector('body>header small')?.remove();
render();
})();


/* --- next BrainHome module --- */

/* BrainHome v1.2: Inbox as a disposable capture list.
   Checking an Inbox item removes only the captured item; it never marks a
   completed task and never adds it to the completion history. Undo remains. */
(() => {
  'use strict';
  const previousRender = render;
  function inboxRows() {
    const captured = data.nodes.filter(node => node.parent === 'inbox');
    if (!captured.length) return '<p class="panel muted">Deine Inbox ist leer.</p>';
    return captured.map(node => `<div class="task bh12-inbox-item">
      <input type="checkbox" data-action="bh12-inbox-discard" data-id="${esc(node.id)}"
             aria-label="${esc(node.name)} aus der Inbox entfernen" title="Aus Inbox entfernen, nicht als erledigt speichern">
      <div class="detail"><strong>${esc(node.name)}</strong>${node.notes ? `<small>${esc(node.notes)}</small>` : ''}</div>
      <button class="btn" data-action="edit" data-id="${esc(node.id)}" title="In den Baum einsortieren oder bearbeiten">✎</button>
    </div>`).join('');
  }
  render = function() {
    previousRender();
    if (data.tab !== 'inbox') return;
    const host = $('app'), list = host.querySelector('.tasks');
    if (!list) return;
    list.innerHTML = inboxRows();
    const sub = host.querySelector('.topline .muted');
    if (sub) sub.textContent = 'Einträge zuerst im Baum einsortieren. Danach hier abhaken und verwerfen.';
  };
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-action="bh12-inbox-discard"]');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const node = get(control.dataset.id);
    if (!node || node.parent !== 'inbox') return;
    // Never orphan subnodes by deleting a parent without the user's knowledge.
    if (descendants(node.id).length) {
      notice('Dieser Inbox-Eintrag hat Unterpunkte. Bitte zuerst einsortieren.');
      render();
      return;
    }
    data.nodes = data.nodes.filter(n => n.id !== node.id);
    save(); // preserves one-step undo; does not produce a completed task
    render();
    notice('Aus Inbox entfernt · ↶ macht es rückgängig');
  }, true);
  render();
})();


/* --- next BrainHome module --- */

/* BrainHome 1.3 — compact mobile UI, real branch tree, gentle history chart.
   No changes to the existing data format, cloud keys or Firebase configuration. */
(() => {
'use strict';
const H = s => esc(s);
const ROUTE_KEY='brainhome-v13-last-view', SORT_KEY='brainhome-v13-task-sort';
let sortMode='priority',areaFilter='all',period='week',periodOffset=0;
const graphPosition=new Map();
let bhRouteReady=false;
window.BHRoute={remember:()=>rememberRoute(),restore:()=>restoreRoute(),activate:()=>{restoreRoute();bhRouteReady=true;}};
try { const p=JSON.parse(localStorage.getItem(SORT_KEY)||'{}');sortMode=p.mode==='area'?'area':'priority';areaFilter=typeof p.area==='string'?p.area:'all'; }catch{}
const saveSort=()=>{try{localStorage.setItem(SORT_KEY,JSON.stringify({mode:sortMode,area:areaFilter}))}catch{}};
// The old v1.0 startup always sent you to the dashboard; keep view+project for refresh.
// The route is UI-only, and does not trigger a cloud upload.
function rememberRoute(){
 if(!bhRouteReady)return;
 if(!['home','projects','tree','inbox','all','history','search','knowledge'].includes(data.tab))return;
 try{localStorage.setItem(ROUTE_KEY,JSON.stringify({tab:data.tab,active:data.tab==='tree'?data.active:null}))}catch{}
}
function restoreRoute(){
 try{const last=JSON.parse(localStorage.getItem(ROUTE_KEY)||'null');if(!last||!['home','projects','tree','inbox','all','history','search','knowledge'].includes(last.tab))return;
  if(last.tab==='tree'){
   if(!get(last.active)||get(last.active).parent!==null)return;
   data.active=last.active;
  }
  data.tab=last.tab;
 }catch{}
}
// Restore the default visual tree ONCE for people who unknowingly ended up with the folder mode.
try{if(!localStorage.getItem('brainhome-v13-view-initialized')){viewMode='visual';localStorage.setItem(V04_PREF,'visual');localStorage.setItem('brainhome-v13-view-initialized','1')}}catch{}

function topHeading(title,action,parent,tooltip){return `<div class="bh13-heading"><h2>${title}</h2><button type="button" class="bh13-icon-add" data-action="${H(action)}" ${parent?`data-id="${H(parent)}"`:''} title="${H(tooltip)}" aria-label="${H(tooltip)}">＋</button></div>`}
function inboxHTML(){
 const rows=data.nodes.filter(n=>n.parent==='inbox');
 const rowHTML=rows.map(n=>`<div class="task bh12-inbox-item"><input type="checkbox" data-action="bh12-inbox-discard" data-id="${H(n.id)}" aria-label="${H(n.name)} aus Inbox entfernen"><div class="detail"><strong>${H(n.name)}</strong>${n.notes?`<small>${H(n.notes)}</small>`:''}</div><button type="button" class="mini" data-action="edit" data-id="${H(n.id)}" title="Bearbeiten oder einsortieren">✎</button></div>`).join('');
 return topHeading('Inbox','add','inbox','Neuen Eintrag hinzufügen')+`<div class="tasks bh13-compact-tasks">${rowHTML||'<button type="button" class="bh13-empty-add" data-action="add" data-id="inbox">＋ Deine Inbox ist leer · etwas hinzufügen</button>'}</div>`;
}
const bh15PriorityRank=n=>({sofort:0,wichtig:1,spaeter:2,'':3})[normalizePriority(n.priority)]??3;
function bh15TaskRows(nodes){return nodes.map(n=>{
 const pri=normalizePriority(n.priority),area=n.__bhRoutine?'Privat':rootName(n),label=priorityLabel[pri]||'';
 if(n.__bhRoutine)return `<div class="task bh15-task-item bh17-routine-task" data-priority="${H(pri)}" data-area="${H(area)}"><input type="checkbox" data-action="routine-done" data-id="${H(n.id)}" aria-label="${H(n.name)} erledigen"><button type="button" class="bh15-task-jump" data-action="bh17-routine-open" data-id="${H(n.id)}" title="Bei Routinen öffnen"><strong>${H(n.name)}</strong><small>${label?`<span class="tag ${H(pri)}">${H(label)}</span>`:''}<span>↻ Routine</span></small></button><button type="button" class="btn" data-action="routine-edit" data-id="${H(n.id)}" title="Routine bearbeiten" aria-label="${H(n.name)} bearbeiten">✎</button></div>`;
 return `<div class="task bh15-task-item" data-priority="${H(pri)}" data-area="${H(area)}"><input type="checkbox" data-action="done" data-id="${H(n.id)}" aria-label="${H(n.name)} abhaken"><button type="button" class="bh15-task-jump" data-action="bh15-task-jump" data-id="${H(n.id)}" title="Im Baum öffnen"><strong>${H(n.name)}</strong><small>${label?`<span class="tag ${H(pri)}">${H(label)}</span>`:''}${n.due?`<span>📅 ${H(n.due)}</span>`:''}</small></button><button type="button" class="btn" data-action="edit" data-id="${H(n.id)}" title="Bearbeiten" aria-label="${H(n.name)} bearbeiten">✎</button></div>`
 }).join('')}
function taskOverviewHTML(){
 const areas=data.nodes.filter(n=>n.parent===null);
 if(areaFilter!=='all'&&!areas.some(n=>n.id===areaFilter))areaFilter='all';
 let tasks=[...data.nodes.filter(n=>(isTask(n)&&n.parent!=='inbox'||isPantry(n)&&n.pantryGroup==='In Zubereitung'&&n.prepTask===true)&&!n.done),...(data.routines||[]).filter(r=>(r.asTask===true||(r.asTask==null&&r.priority==='sofort'))&&routineDue(r)).map(r=>({...r,__bhRoutine:true}))].filter(n=>normalizePriority(n.priority)!=='warten');
 let html='';
 if(sortMode==='priority'){
  const rank={sofort:0,wichtig:1,spaeter:2,'':3};
  tasks.sort((a,b)=>(rank[normalizePriority(a.priority)]??3)-(rank[normalizePriority(b.priority)]??3));
  html=bh15TaskRows(tasks);
 }else{
  if(areaFilter!=='all')tasks=tasks.filter(n=>n.__bhRoutine?privateRoot()?.id===areaFilter:rootOf(n)?.id===areaFilter);
  html=areas.filter(area=>areaFilter==='all'||areaFilter===area.id).map(area=>{
    const scoped=tasks.filter(n=>n.__bhRoutine?privateRoot()?.id===area.id:rootOf(n)?.id===area.id);
    return scoped.length?`<h3 class="bh13-area-heading">${H(area.emoji||'🌿')} ${H(area.name)} · ${scoped.length}</h3>${bh15TaskRows(scoped.sort((a,b)=>bh15PriorityRank(a)-bh15PriorityRank(b)))}`:'';
  }).join('');
 }
 const areaSelect=sortMode==='area'?`<select id="bh13-area-filter" class="bh13-area-filter" aria-label="Lebensbereich auswählen"><option value="all">Alle Lebensbereiche</option>${areas.map(a=>`<option value="${H(a.id)}" ${a.id===areaFilter?'selected':''}>${H(a.emoji||'🌿')} ${H(a.name)}</option>`).join('')}</select>`:'';
 return topHeading('Aufgaben','add','inbox','Neue Aufgabe hinzufügen')+
 `<div class="bh13-sort-panel" role="group" aria-label="Aufgaben sortieren"><button type="button" class="bh13-chip" data-bh13-sort="priority" aria-pressed="${sortMode==='priority'}">Priorität</button><button type="button" class="bh13-chip" data-bh13-sort="area" aria-pressed="${sortMode==='area'}">Lebensbereich</button>${areaSelect}</div>`+
 `<div class="tasks bh13-compact-tasks bh15-compact-tasks">${html||'<p class="bh13-history-empty">Keine offenen Aufgaben.</p>'}</div>`;
}

// A real top-down branching diagram, using CSS connectors rather than expensive SVG measurements.
// Each direct branch is included. Preview limits only actionable/list entries IN THAT branch.
function shownKids(id){return orderedTreeKids(id)}
function graphNode(n){
 const kind=kindOf(n),done=isTask(n)&&!!n.done;
 const pri=isTask(n)?normalizePriority(n.priority):'';
 let status=kind==='category'?'Kategorie':done?'Erledigt':priorityLabel[pri]||'';
 const children=shownKids(n.id);
 return `<div class="bh13-node node" data-node-id="${H(n.id)}" data-kind="${H(kind)}" data-done="${done?'yes':'no'}" data-area="${H(rootName(n))}" data-priority="${H(pri)}">
  <span class="bh13-name">${H(n.emoji&&n.parent===null?n.emoji+' ':'')}${H(n.name)}</span>${status?`<span class="bh13-status">${H(status)}</span>`:''}
  <div class="bh13-actions"><button type="button" class="mini" data-action="add" data-id="${H(n.id)}" aria-label="Unterpunkt hinzufügen" title="Unterpunkt hinzufügen">＋</button><button type="button" class="mini" data-action="edit" data-id="${H(n.id)}" aria-label="Bearbeiten" title="Bearbeiten">✎</button>${isTask(n)?`<button type="button" class="mini" data-action="done" data-id="${H(n.id)}" title="${done?'Wieder öffnen':'Erledigen'}">${done?'↺':'✓'}</button>`:''}${children.length?`<button type="button" class="mini" data-action="toggle" data-id="${H(n.id)}" title="Zweig ein-/ausklappen">${n.collapsed?'▸':'▾'}</button>`:''}</div>
 </div>`;
}
function branchHTML(n,remaining,seen=new Set(),depth=0){
 if(depth>32||seen.has(n.id))return'';
 const nextSeen=new Set(seen);nextSeen.add(n.id);
 const kids=(!n.collapsed?shownKids(n.id):[]);
 let parts=[],hidden=false;
 for(const child of kids){
  if(depth===0){ // the root's first-level branches always show, even past the ten-item budget
   const own={used:isCategory(child)?0:1};
   parts.push(branchHTML(child,own,nextSeen,depth+1));
  }else if(!remaining){parts.push(branchHTML(child,null,nextSeen,depth+1))}
  else if(!isCategory(child)&&remaining.used>=10){hidden=true;}
  else{
   if(!isCategory(child))remaining.used++;
   parts.push(branchHTML(child,remaining,nextSeen,depth+1));
  }
 }
 const note=hidden?'<div class="bh13-branch-limit">Weitere Einträge im großen Baum</div>':'';
 return `<div class="bh13-branch">${graphNode(n)}${parts.length?`<div class="bh13-kids">${parts.join('')}</div>`:''}${note}</div>`;
}
function graphHTML(root,full=false){
 const kids=(!root.collapsed?shownKids(root.id):[]);
 const pieces=kids.map(child=>branchHTML(child,full?null:{used:isCategory(child)?0:1},new Set([root.id]),1)).join('');
 return `<div class="bh13-branch">${graphNode(root)}${pieces?`<div class="bh13-kids">${pieces}</div>`:''}</div>`;
}
function drawGraphPreview(){
 if(data.tab!=='tree'||viewMode!=='visual')return;
 const root=get(data.active),app=$('app');if(!root)return;
 const scroller=app.querySelector('.tree-scroll'),tree=scroller?.querySelector('.tree');if(!tree)return;
 scroller.classList.add('bh13-graph-scroll');tree.classList.add('bh13-tree');
 tree.innerHTML=graphHTML(root,false);window.BH15?.applyZoom?.('preview');
 const prior=app.querySelector('.bh11-more');if(prior)prior.remove();
 const buttons=document.createElement('div');buttons.className='bh13-graph-controls';
 const count=shownKids(root.id).length;
 buttons.innerHTML=`<span>${count} ${count===1?'Ast':'Äste'} · seitlich wischen</span><button class="bh11-more" data-action="bh13-open-tree">⤢ Gesamten Baum ansehen</button>`;
 scroller.after(buttons);
 const previous=graphPosition.get(root.id);
 if(previous){scroller.scrollLeft=previous.x;scroller.scrollTop=previous.y}
 else{scroller.scrollLeft=Math.max(0,(scroller.scrollWidth-scroller.clientWidth)/2);scroller.scrollTop=0}
 // Avoid a costly line-layout pass from older code: the CSS is now the connector.
}
function drawFullGraph(resetScroll=false){
 const dlg=$('bh11TreeDialog'),root=get(data.active);if(!dlg?.open||!root)return;
 const s=$('bh11TreeScroll'),pos={x:s.scrollLeft,y:s.scrollTop};
 $('bh11TreeTitle').textContent=root.name;
 $('bh11TreeToggleDone').textContent=showDone?'✓ Erledigte sichtbar':'Erledigte zeigen';
 $('bh11TreeCount').textContent=data.nodes.filter(n=>rootOf(n)?.id===root.id&&n.id!==root.id).length+' Einträge';
 s.classList.add('bh13-full-scroll');
 const tree=$('bh11TreeContent');tree.classList.add('bh13-full-tree');tree.innerHTML=graphHTML(root,true);window.BH15?.applyZoom?.('full');
 if(resetScroll){s.scrollTop=0;s.scrollLeft=Math.max(0,(s.scrollWidth-s.clientWidth)/2)}
 else{s.scrollLeft=pos.x;s.scrollTop=pos.y}
}
// Weekly / monthly / yearly completion counts. Unknown dates remain in the list, not assigned fictitious days.
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dlocal(iso){const d=new Date(iso);return Number.isFinite(d.getTime())?d:null}
function chartDataset(){
 const now=new Date();now.setHours(12,0,0,0);
 let base,start,ends=[],label='',current=[];
 if(period==='week'){
  start=new Date(now);start.setDate(start.getDate()-((start.getDay()+6)%7)+7*periodOffset);
  for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);ends.push(d)}
  const until=ends[6];label=`${start.toLocaleDateString('de-DE',{day:'numeric',month:'short'})} – ${until.toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'})}`;
 }else if(period==='month'){
  start=new Date(now.getFullYear(),now.getMonth()+periodOffset,1,12);
  const count=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
  for(let i=1;i<=count;i++)ends.push(new Date(start.getFullYear(),start.getMonth(),i,12));
  label=start.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
 }else{
  start=new Date(now.getFullYear()+periodOffset,0,1,12);
  for(let i=0;i<12;i++)ends.push(new Date(start.getFullYear(),i,1,12));
  label=String(start.getFullYear());
 }
 const counts=new Map();for(const n of data.nodes){if(!isTask(n)||!n.done||!n.completedAt)continue;const parsed=dlocal(n.completedAt);if(!parsed)continue;const key=period==='year'?`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}`:dateKey(parsed);
  counts.set(key,(counts.get(key)||0)+1)}
 for(const event of data.completionLog||[]){
  if(!['routine','gift','prep'].includes(event.kind)||!event.at)continue;
  const date=dlocal(event.at);if(!date)continue;
  const key=period==='year'?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`:dateKey(date);
  counts.set(key,(counts.get(key)||0)+1);
 }
 current=ends.map(d=>{const key=period==='year'?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:dateKey(d);const short=period==='week'?d.toLocaleDateString('de-DE',{weekday:'short'}).replace('.',''):period==='month'?String(d.getDate()):d.toLocaleDateString('de-DE',{month:'short'}).replace('.','');
  return {label:short,count:counts.get(key)||0,key};});
 return {label,points:current};
}
function chartHTML(){
 const {label,points}=chartDataset(),max=Math.max(1,...points.map(p=>p.count)),sum=points.reduce((s,x)=>s+x.count,0);
 const variants=[['week','Woche'],['month','Monat'],['year','Jahr']].map(([value,name])=>`<button data-bh13-period="${value}" aria-pressed="${period===value}">${name}</button>`).join('');
 const bars=points.map(p=>`<div class="bh13-bar-slot" title="${H(p.key)}: ${p.count} erledigt"><span class="bh13-bar-num">${p.count||''}</span><div class="bh13-bar" style="height:${Math.max(2,Math.round(p.count/max*73))}px"></div><span class="bh13-bar-label">${H(p.label)}</span></div>`).join('');
 return `<section class="bh13-chart"><div class="bh13-chart-head"><strong style="font-size:12px">Erledigte Aufgaben</strong><div class="bh13-periods">${variants}</div></div><div class="bh13-chart-nav"><button data-bh13-nav="-1" title="Vorheriger Zeitraum">‹</button><span>${H(label)}</span><button data-bh13-nav="1" title="Nächster Zeitraum">›</button></div><div class="bh13-chart-scroller"><div class="bh13-bars ${period}">${bars}</div></div><p class="bh13-chart-total">${sum} ${sum===1?'Aufgabe':'Aufgaben'} in diesem Zeitraum</p></section>`;
}
function compactHistory(){
 const normal=data.nodes.filter(n=>isTask(n)&&n.done).map(n=>({kind:'task',name:n.name,at:n.completedAt||'',id:n.id,record:n}));
 const specials=(data.completionLog||[]).filter(ev=>['routine','gift','prep'].includes(ev.kind)&&ev.at).map(ev=>({kind:ev.kind,name:ev.name,at:ev.at,id:ev.sourceId}));
 const done=[...normal,...specials].sort((a,b)=>(b.at||'').localeCompare(a.at||''));
 const groups=new Map();for(const item of done){const day=item.at&&dlocal(item.at)?dateKey(dlocal(item.at)):'unknown';if(!groups.has(day))groups.set(day,[]);groups.get(day).push(item)}
 const labels={routine:'Routine',gift:'Geschenk',prep:'Zubereitung'};
 const content=[...groups].map(([day,items])=>`<section class="bh13-history-day"><h3>${day==='unknown'?'Ohne Datum':new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</h3>${items.map(item=>item.kind==='task'?`<div class="task" data-area="${H(rootName(item.record))}"><span class="history-check">✓</span><div class="detail"><strong>${H(item.name)}</strong><small>${H(path(item.record))}</small></div><button type="button" class="mini" data-action="done" data-id="${H(item.id)}" title="Wieder öffnen">↺</button></div>`:`<div class="task bh16-history-special"><button type="button" class="bh16-history-link" data-action="bh16-open-completion" data-kind="${H(item.kind)}" data-id="${H(item.id)}" aria-label="${H(item.name)} anzeigen"><span class="history-check">✓</span><span>${H(item.name)}</span><span class="bh16-history-kind">${labels[item.kind]}</span></button></div>`).join('')}</section>`).join('');
 return `<section class="bh13-history"><h2>Erledigt</h2>${chartHTML()}${content||'<div class="bh13-history-empty">Noch keine erledigten Einträge.</div>'}</section>`;
}

// Bridge the old rendering pipeline. Each desired page is replaced only AFTER the legacy
// components have initialized, avoiding changes to the stored data and cloud contracts.
const oldRender=render;
render=function(){
 const oldScroller=$('app')?.querySelector('.bh13-graph-scroll');
 if(oldScroller&&data.active)graphPosition.set(data.active,{x:oldScroller.scrollLeft,y:oldScroller.scrollTop});
 oldRender();
 const host=$('app');
 if(data.tab==='inbox')host.innerHTML=inboxHTML();
 else if(data.tab==='all')host.innerHTML=taskOverviewHTML();
 else if(data.tab==='history')host.innerHTML=compactHistory();
 else if(data.tab==='tree'){
  // Clear the old 1.1 folder-based preview in visual mode only.
  drawGraphPreview();
  const bar=host.querySelector('.private-organize');if(bar){
    bar.querySelector('p.hint')?.remove();
    const header=bar.querySelector('h3'),add=bar.querySelector('[data-action="private-add"]');
    if(header&&add){add.className='bh13-icon-add';add.textContent='＋';add.title='Neue Privat-Kategorie';add.setAttribute('aria-label','Neue Privat-Kategorie');header.after(add)}
  }
  host.querySelectorAll('p.hint').forEach(el=>{if(/Kategorien sind dauerhaft|Aufgaben können jederzeit in Kategorien/i.test(el.textContent))el.remove()});
  // Preserve the large-modal presentation after checking/toggling a node.
  if($('bh11TreeDialog')?.open)drawFullGraph();
 }
 rememberRoute();
};
// Intercept our standalone interactions before the original delegated handlers.
document.addEventListener('click',event=>{
 const sortBtn=event.target.closest('[data-bh13-sort]');if(sortBtn){event.preventDefault();sortMode=sortBtn.dataset.bh13Sort;saveSort();render();return}
 const periodBtn=event.target.closest('[data-bh13-period]');if(periodBtn){event.preventDefault();period=periodBtn.dataset.bh13Period;periodOffset=0;render();return}
 const navBtn=event.target.closest('[data-bh13-nav]');if(navBtn){event.preventDefault();periodOffset+=Number(navBtn.dataset.bh13Nav);render();return}
 const open=event.target.closest('[data-action="bh13-open-tree"]');if(open){event.preventDefault();event.stopImmediatePropagation();$('bh11TreeDialog').showModal();drawFullGraph(true);return}
},true);
$('app').addEventListener('change',event=>{if(event.target.id==='bh13-area-filter'){areaFilter=event.target.value;saveSort();render()}});
// Handle full-screen toggle ourselves; the legacy toggle otherwise redraws the folder list.
$('bh11TreeToggleDone').onclick=()=>{showDone=!showDone;render()};

// Long press on a routine opens a small action menu; remove tiny delete crosses.
const menu=document.createElement('dialog');menu.id='bh13RoutineMenu';menu.className='bh13-menu';
menu.innerHTML='<h3 id="bh13RoutineMenuTitle">Routine</h3><button data-bh13-routine="edit">✎ Bearbeiten</button><button data-bh13-routine="move">↗ Verschieben</button><button data-bh13-routine="delete" class="danger">× Löschen</button><button data-bh13-routine="close">Abbrechen</button>';
document.body.append(menu);
let routineTarget=null;
function openRoutineMenu(kind,id){routineTarget={kind,id};const record=kind==='routine'?data.routines.find(r=>r.id===id):data.routineGroups.find(g=>g.id===id);if(!record)return;menu.querySelector('h3').textContent=record.name;menu.querySelector('[data-bh13-routine="move"]').hidden=kind!=='routine';menu.showModal()}
function delegatedOldAction(action,id){const temp=document.createElement('button');temp.dataset.action=action;temp.dataset.id=id;temp.style.display='none';document.body.append(temp);try{temp.click()}finally{temp.remove()}}
menu.addEventListener('click',event=>{
 const control=event.target.closest('[data-bh13-routine]');if(!control||!routineTarget)return;
 const command=control.dataset.bh13Routine,{kind,id}=routineTarget;
 if(command==='close'){menu.close();return}
 menu.close();
 if(command==='edit'){delegatedOldAction(kind==='routine'?'routine-edit':'routine-group-rename',id)}
 if(command==='move'){delegatedOldAction('routine-move',id)}
 if(command==='delete'){
  if(kind==='routine'){if(!confirm('Routine löschen?'))return;data.routines=data.routines.filter(r=>r.id!==id)}
  else {const r=data.routineGroups.find(g=>g.id===id);if(!r)return;delegatedOldAction('routine-group-delete',id);return}
  save();render();notice('Gelöscht · ↶ stellt die Routine wieder her');
 }
});
let hold=null,suppressClicksUntil=0;
function cancelHold(){if(hold?.timer)clearTimeout(hold.timer);hold=null}
function startHold(event){
 if(event.type==='pointerdown'&&event.pointerType==='touch')return; // touch uses touchstart below
 if(event.type==='pointerdown'&&event.button!==0)return;
 if(event.target.closest('button,input,select,textarea,a'))return;
 const row=null; /* Routine long press handled by v1.4 */
 const group=event.target.closest('.routine-subgroup > summary');
 if(!row&&!group)return;
 let id,kind;if(row){id=row.querySelector('[data-action="routine-edit"]')?.dataset.id;kind='routine'}else{id=group.querySelector('[data-action="routine-group-rename"]')?.dataset.id;kind='group'}
 if(!id)return;
 const p=event.touches?.[0]||event;
 cancelHold();hold={id,kind,x:p.clientX,y:p.clientY,timer:setTimeout(()=>{const item=hold;if(!item)return;hold=null;suppressClicksUntil=Date.now()+700;openRoutineMenu(item.kind,item.id)},530)};
}
$('app').addEventListener('pointerdown',startHold);
$('app').addEventListener('touchstart',startHold,{passive:true});
const moved=e=>{const p=e.touches?.[0]||e;if(hold&&p&&Math.hypot(p.clientX-hold.x,p.clientY-hold.y)>14)cancelHold()};
window.addEventListener('pointermove',moved);window.addEventListener('touchmove',moved,{passive:true});
window.addEventListener('pointerup',cancelHold);window.addEventListener('touchend',cancelHold);window.addEventListener('pointercancel',cancelHold);window.addEventListener('touchcancel',cancelHold);
$('app').addEventListener('contextmenu',event=>{const row=null; /* Routine long press handled by v1.4 */if(!row)return;const id=row.querySelector('[data-action="routine-edit"]')?.dataset.id;if(!id)return;event.preventDefault();cancelHold();openRoutineMenu('routine',id)});
document.addEventListener('click',event=>{if(Date.now()<suppressClicksUntil&&event.target.closest('.routine-record,.routine-subgroup>summary')){event.preventDefault();event.stopImmediatePropagation()}},true);

// Load last UI location after all legacy startup scripts have finished.
window.BH13={enabled:true};
// Final route restoration runs after all modules, including knowledge, initialize.
})();


/* --- next BrainHome module --- */

/* BrainHome 1.4 — gesture-based routines and compact navigation.
   UI-only changes except explicitly requested routine grouping. */
(() => {
'use strict';
const app = document.getElementById('app');
const html = s => esc(s);
const lastRender = render;

function refineProjectUI(){
 const head=app.querySelector('.topline');
 const back=head?.querySelector('[data-action="back"]');
 if(back){back.textContent='←';back.classList.add('bh14-back');back.title='Zurück zu den Lebensbereichen';back.setAttribute('aria-label','Zurück zu den Lebensbereichen')}
 const title=head?.querySelector('#v1ProjectTitle');
 if(title)title.classList.add('bh14-project-title');
 const toolbar=app.querySelector('.toolbar');
 if(toolbar){
  toolbar.querySelector('.view-switch')?.remove();
  const oldSwitcher=toolbar.querySelector('[data-action="bh14-view-toggle"]');
  oldSwitcher?.remove();
  const switcher=document.createElement('button');
  switcher.type='button';switcher.className='btn bh14-view-toggle';
  switcher.dataset.action='bh14-view-toggle';
  switcher.textContent=viewMode==='visual'?'🌳 Verzweigter Baum':'☷ Ordnerbaum';
  switcher.title=viewMode==='visual'?'Zur Ordneransicht wechseln':'Zum verzweigten Baum wechseln';
  switcher.setAttribute('aria-label',switcher.title);
  toolbar.prepend(switcher);
  const done=toolbar.querySelector('[data-action="showdone"]');
  if(done){done.classList.add('bh14-done-toggle');done.textContent=showDone?'✓ Erledigte sichtbar':'Erledigte anzeigen';}
  toolbar.classList.add('bh14-tree-toolbar');
 }
}
function refineRoutines(){
 const panel=app.querySelector('.private-panel[data-panel="routines"]');
 if(!panel)return;
 panel.querySelectorAll('.routine-record [data-action="routine-move"]').forEach(b=>b.remove());
 panel.querySelectorAll('.routine-record').forEach(row=>{
  const id=row.querySelector('[data-action="routine-edit"]')?.dataset.id;
  if(id){row.dataset.bh14DragRoutine=id;row.classList.add('bh14-routine-draggable');row.setAttribute('title','Lange drücken und auf eine Untergruppe ziehen');}
 });
 // No visible “Ohne Gruppe” drop box: ungrouped routines appear directly below groups.
 for(const group of panel.querySelectorAll('.routine-subgroup')){
  const id=group.querySelector(':scope > summary [data-action="routine-group-rename"]')?.dataset.id;
  if(!id)continue;
  const summary=group.querySelector(':scope > summary');
  if(summary){summary.dataset.bh14DropGroup=id;summary.title='Hierhin Routine ziehen';}
  const body=group.querySelector(':scope > .routine-subgroup-body');
  if(body)body.dataset.bh14DropGroup=id;
 }
}
function refineHistory(){
 for(const row of app.querySelectorAll('.bh13-history-day .task')){
  const doneButton=row.querySelector('[data-action="done"]');
  const id=doneButton?.dataset.id;
  const label=row.querySelector('.detail strong')?.textContent;
  if(!id||!label)continue;
  row.classList.add('bh14-history-item');
  const details=row.querySelector('.detail'),check=row.querySelector('.history-check');
  details?.remove();check?.remove();
  const jump=document.createElement('button');
  jump.type='button';jump.className='bh14-history-jump';jump.dataset.action='bh14-jump';jump.dataset.id=id;
  jump.setAttribute('aria-label',label+' im Baum öffnen');
  jump.innerHTML='<span class="bh14-history-tick" aria-hidden="true">✓</span><span class="bh14-history-name">'+html(label)+'</span><span class="bh14-history-arrow" aria-hidden="true">↗</span>';
  row.prepend(jump);
  doneButton?.setAttribute('aria-label','Aufgabe wieder öffnen');
 }
}
function refineProjects(){
 for(const item of app.querySelectorAll('p.hint')){
  if(/Inbox ist dein Eingang|Inbox ist dein schneller Eingang|ungeordnete Gedanken/i.test(item.textContent||''))item.remove();
 }
}
render=function(){
 lastRender();
 if(data.tab==='projects')refineProjects();
 if(data.tab==='tree'){refineProjectUI();refineRoutines();}
 if(data.tab==='history')refineHistory();
};

function jumpToCompleted(id){
 const entry=get(id),root=entry&&rootOf(entry);
 if(!entry||!root||root.parent!==null){notice('Der Eintrag ist nicht mehr im Baum.');return;}
 // Completed entries are otherwise invisible in the preview.
 showDone=true;
 viewMode='visual';
 try{localStorage.setItem(V04_PREF,'visual')}catch{}
 let cursor=entry,depth=0;
 while(cursor&&depth++<60){cursor.collapsed=false;cursor=cursor.parent?get(cursor.parent):null}
 openProject(root.id);
 const opener=app.querySelector('[data-action="bh13-open-tree"]');
 if(opener)opener.click();
 const focus=()=>{
  const dlg=document.getElementById('bh11TreeDialog');
  const node=[...dlg?.querySelectorAll('.bh13-node[data-node-id]')||[]].find(el=>el.dataset.nodeId===id);
  if(!node)return;
  node.classList.add('bh14-target-node');
  const scroll=document.getElementById('bh11TreeScroll');
  if(scroll){
   const n=node.getBoundingClientRect(),s=scroll.getBoundingClientRect();
   scroll.scrollLeft+=n.left-s.left-(s.width-n.width)/2;
   scroll.scrollTop+=n.top-s.top-Math.min(120,s.height/4);
  }
 };
 requestAnimationFrame(()=>requestAnimationFrame(focus));
}

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 if(button.dataset.action==='bh14-view-toggle'){
  event.preventDefault();event.stopImmediatePropagation();
  viewMode=viewMode==='visual'?'outline':'visual';
  localStorage.setItem(V04_PREF,viewMode);
  render();return;
 }
 if(button.dataset.action==='bh14-jump'){
  event.preventDefault();event.stopImmediatePropagation();
  jumpToCompleted(button.dataset.id);return;
 }
},true);

// Drag by long-press. Touch uses touch events so Android can scroll normally before a hold
// and scroll is prevented only after dragging actually begins.
const HOLD_MS=480, MOVE_LIMIT=12;
let pending=null,drag=null,ghost=null,target=null,suppressUntil=0;
let pressMenu=null;
function routineIdFrom(row){return row?.dataset.bh14DragRoutine||null}
function position(e){return e.touches?.[0]||e.changedTouches?.[0]||e}
function clearPending(){if(pending?.timer)clearTimeout(pending.timer);pending=null}
function cleanTargets(){for(const el of document.querySelectorAll('.bh14-drop-active'))el.classList.remove('bh14-drop-active');target=null}
function cleanupDrag(){ghost?.remove();ghost=null;drag=null;cleanTargets();document.body.classList.remove('bh14-dragging')}
function startHold(e,isTouch){
 if(!isTouch&&e.button!==0)return;
 const row=e.target.closest('.routine-record[data-bh14-drag-routine]');
 if(!row||e.target.closest('button,input,select,textarea,a,summary'))return;
 const p=position(e),id=routineIdFrom(row);
 if(!id)return;
 // Prevent v1.3's old long-press menu from pre-empting our drag.
 e.stopImmediatePropagation();
 if(pending||drag)return;
 const item={id,row,isTouch,x:p.clientX,y:p.clientY,lastX:p.clientX,lastY:p.clientY,timer:0};
 item.timer=setTimeout(()=>activateDrag(item),HOLD_MS);pending=item;
}
function activateDrag(item){
 if(pending!==item)return;
 pending=null;drag={...item,moved:false};
 const record=(data.routines||[]).find(r=>r.id===item.id);
 if(!record){cleanupDrag();return}
 ghost=document.createElement('div');ghost.className='bh14-drag-ghost';ghost.textContent='↳ '+record.name;
 document.body.append(ghost);document.body.classList.add('bh14-dragging');
 moveGhost(item.lastX,item.lastY);
 if(navigator.vibrate)try{navigator.vibrate(18)}catch{}
}
function moveGhost(x,y){if(ghost){ghost.style.left=x+'px';ghost.style.top=y+'px'}}
function getDestination(x,y){
 const el=document.elementFromPoint(x,y);
 if(!el)return null;
 // The smallest nested group wins, even if the cursor is over its routine row.
 const group=el.closest('.routine-subgroup');
 const groupHeader=el.closest('[data-bh14-drop-group]');
 if(groupHeader){ // body or summary can also contain nested groups
  if(group){
   const nested=group.querySelector(':scope > summary [data-action="routine-group-rename"]')?.dataset.id;
   if(nested)return {id:nested,el:group.querySelector(':scope > summary')};
  }
  return {id:groupHeader.dataset.bh14DropGroup,el:groupHeader};
 }
 if(group){
  const id=group.querySelector(':scope > summary [data-action="routine-group-rename"]')?.dataset.id;
  if(id)return {id,el:group.querySelector(':scope > summary')};
 }
 const ungrouped=el.closest('.bh14-ungrouped');
 if(ungrouped)return {id:'',el:ungrouped};
 // Un-grouped routine rows are valid drop targets too.
 const row=el.closest('.routine-record[data-bh14-drag-routine]');
 if(row){const other=(data.routines||[]).find(r=>r.id===row.dataset.bh14DragRoutine);if(other)return {id:other.groupId||'',el:row}}
 // Drag onto blank routines panel space to remove grouping.
 const content=el.closest('.private-panel[data-panel="routines"] .private-panel-content');
 if(content)return {id:'',el:content};
 return null;
}
function updateDropTarget(x,y){
 const result=getDestination(x,y);
 if(target?.el!==result?.el){cleanTargets();if(result){target=result;result.el?.classList.add('bh14-drop-active')}}
 if(drag){drag.lastX=x;drag.lastY=y;drag.moved=drag.moved||Math.hypot(x-drag.x,y-drag.y)>MOVE_LIMIT}
 moveGhost(x,y);
 if(y<85)window.scrollBy(0,-14);
 else if(y>window.innerHeight-85)window.scrollBy(0,14);
}
function moveHold(e,isTouch){
 const p=position(e);if(!p)return;
 if(pending&&pending.isTouch===isTouch){
  pending.lastX=p.clientX;pending.lastY=p.clientY;
  if(Math.hypot(p.clientX-pending.x,p.clientY-pending.y)>MOVE_LIMIT)clearPending();
 }
 if(drag&&drag.isTouch===isTouch){
  if(e.cancelable)e.preventDefault();
  updateDropTarget(p.clientX,p.clientY);
 }
}
function routineMenu(id){
 if(!pressMenu){
  pressMenu=document.createElement('dialog');pressMenu.id='bh14RoutineActions';pressMenu.className='bh13-menu';
  pressMenu.innerHTML='<h3 id="bh14RoutineTitle"></h3><button type="button" data-bh14-menu="edit">✎ Bearbeiten</button><button type="button" data-bh14-menu="delete" class="danger">× Löschen</button><button type="button" data-bh14-menu="close">Abbrechen</button>';
  document.body.append(pressMenu);
  pressMenu.addEventListener('click',e=>{
   const b=e.target.closest('[data-bh14-menu]');if(!b)return;
   const action=b.dataset.bh14Menu,rid=pressMenu.dataset.routineId;
   pressMenu.close();if(action==='close')return;
   if(action==='edit'){
    const button=app.querySelector(`[data-action="routine-edit"][data-id="${CSS.escape(rid)}"]`);button?.click();return;
   }
   if(action==='delete'){
    if(!confirm('Routine löschen?'))return;
    data.routines=data.routines.filter(r=>r.id!==rid);save();render();notice('Gelöscht · ↶ macht es rückgängig');
   }
  });
 }
 pressMenu.dataset.routineId=id;
 pressMenu.querySelector('h3').textContent=(data.routines||[]).find(r=>r.id===id)?.name||'Routine';
 pressMenu.showModal();
}
function endHold(e,isTouch){
 if(pending?.isTouch===isTouch)clearPending();
 if(!drag||drag.isTouch!==isTouch)return;
 const ended=drag;let finalTarget=target;
 const p=position(e);if(p&&Number.isFinite(p.clientX))finalTarget=getDestination(p.clientX,p.clientY)||target;
 suppressUntil=Date.now()+700;
 cleanupDrag();
 if(!ended.moved){routineMenu(ended.id);return}
 if(!finalTarget){notice('Auf eine Untergruppe ziehen, um zu verschieben');return}
 const routine=data.routines.find(r=>r.id===ended.id);
 if(!routine)return;
 if((routine.groupId||'')===finalTarget.id){notice('Routine ist schon in dieser Gruppe');return}
 routine.groupId=finalTarget.id;
 save();render();notice('Routine verschoben · ↶ macht es rückgängig');
}
app.addEventListener('touchstart',e=>startHold(e,true),{capture:true,passive:true});
app.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')startHold(e,false)},true);
window.addEventListener('touchmove',e=>moveHold(e,true),{passive:false,capture:true});
window.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')moveHold(e,false)},true);
window.addEventListener('touchend',e=>endHold(e,true),true);
window.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')endHold(e,false)},true);
window.addEventListener('touchcancel',()=>{clearPending();cleanupDrag()},true);
window.addEventListener('pointercancel',()=>{clearPending();cleanupDrag()},true);
app.addEventListener('click',e=>{if(Date.now()<suppressUntil&&e.target.closest('.routine-record')){e.preventDefault();e.stopImmediatePropagation()}},true);
app.addEventListener('contextmenu',e=>{if(!e.target.closest('.routine-record'))return;e.preventDefault();e.stopImmediatePropagation();},true);

window.BH14={version:'1.4'};
render();
})();


/* --- next BrainHome module --- */

/* BrainHome 1.5 – touch zoom, neat task navigation, drag-to-order private sections.
   No changes to storage format, keys, authentication or cloud protocols. */
(() => {
'use strict';
const app=document.getElementById('app');

// Two-finger pinch to zoom on both the tree preview and its large dialog.
// CSS 'zoom' changes layout dimensions (and scrollWidth), unlike transforms that
// leave a big invisible hitbox and poorly aligned connectors.
const zoomPerTree=new Map();
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const key=mode=>String(data.active||'')+'|'+mode;
function treeFor(mode){return mode==='full'?document.getElementById('bh11TreeContent'):app.querySelector('.bh13-graph-scroll .bh13-tree')}
function scrollFor(mode){return mode==='full'?document.getElementById('bh11TreeScroll'):app.querySelector('.bh13-graph-scroll')}
function applyZoom(mode){
 const tree=treeFor(mode);if(!tree)return;
 const z=zoomPerTree.get(key(mode))||1;
 tree.style.setProperty('zoom',String(z),'important');
}
function setZoom(mode,z){
 z=clamp(z,.35,2.5);zoomPerTree.set(key(mode),z);applyZoom(mode);
}
function dist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function middle(a,b){return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}}
let gesture=null;
window.addEventListener('touchstart',e=>{
 if(e.touches.length!==2)return;
 const target=e.target.closest?.('.bh13-graph-scroll,.bh13-full-scroll');if(!target)return;
 const mode=target.classList.contains('bh13-full-scroll')?'full':'preview';
 const scroll=scrollFor(mode),tree=treeFor(mode);if(!scroll||!tree)return;
 const a=e.touches[0],b=e.touches[1],d=dist(a,b);if(d<1)return;
 const m=middle(a,b),r=scroll.getBoundingClientRect(),z=zoomPerTree.get(key(mode))||1;
 gesture={mode,scroll,root:data.active,initialDist:d,startZoom:z,
   anchorX:(scroll.scrollLeft+m.x-r.left)/z,anchorY:(scroll.scrollTop+m.y-r.top)/z};
},{capture:true,passive:true});
window.addEventListener('touchmove',e=>{
 if(!gesture||e.touches.length!==2)return;
 if(data.active!==gesture.root){gesture=null;return}
 if(e.cancelable)e.preventDefault();
 const [a,b]=e.touches,z=clamp(gesture.startZoom*dist(a,b)/gesture.initialDist,.35,2.5);
 const m=middle(a,b),r=gesture.scroll.getBoundingClientRect();
 setZoom(gesture.mode,z);
 gesture.scroll.scrollLeft=gesture.anchorX*z-(m.x-r.left);
 gesture.scroll.scrollTop=gesture.anchorY*z-(m.y-r.top);
},{capture:true,passive:false});
window.addEventListener('touchend',e=>{if(e.touches.length<2)gesture=null},{capture:true});
window.addEventListener('touchcancel',()=>{gesture=null},{capture:true});

// The task overview is intentionally free of long location paths.
// Tapping a task opens its full tree and scrolls the right node into view.
function goToTask(id){
 const n=get(id),root=n&&rootOf(n);
 if(!n||!root||root.parent!==null){notice('Dieser Eintrag ist nicht mehr im Baum');return}
 let cur=n,guard=0;
 while(cur&&guard++<60){cur.collapsed=false;cur=cur.parent?get(cur.parent):null}
 // Private custom categories intentionally live in their foldable Privat panels,
 // outside the global tree. Open the actual panel rather than a tree that hides it.
 let section=n,steps=0;
 while(section&&!section.privateSection&&steps++<50)section=section.parent?get(section.parent):null;
 if(section?.privateSection){
  const panelKey='custom:'+section.id;
  panels[panelKey]=true;
  try{localStorage.setItem(PANEL_KEY,JSON.stringify(panels))}catch{}
  openProject(root.id);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const panel=[...app.querySelectorAll('.private-panel[data-panel]')].find(el=>el.dataset.panel===panelKey);
   if(!panel)return;
   panel.open=true;
   const item=panel.querySelector('[data-action="edit"][data-id="'+CSS.escape(id)+'"]');
   const target=item?.closest('.outline-row')||panel.querySelector('summary');
   if(target){target.classList.add('bh14-target-node');target.scrollIntoView({block:'center',behavior:'instant'})}
  }));
  return;
 }
 viewMode='visual';try{localStorage.setItem(V04_PREF,'visual')}catch{}
 if(n.done)showDone=true;
 openProject(root.id);
 const btn=app.querySelector('[data-action="bh13-open-tree"]');
 if(btn)btn.click();
 const position=()=>{
  const dlg=document.getElementById('bh11TreeDialog');if(!dlg?.open)return;
  const el=[...dlg.querySelectorAll('.bh13-node[data-node-id]')].find(x=>x.dataset.nodeId===id);
  const scroller=document.getElementById('bh11TreeScroll');if(!el||!scroller)return;
  el.classList.add('bh14-target-node');
  const r=el.getBoundingClientRect(),s=scroller.getBoundingClientRect();
  scroller.scrollLeft+=r.left-s.left-(s.width-r.width)/2;
  scroller.scrollTop+=r.top-s.top-Math.min(100,s.height/4);
 };
 requestAnimationFrame(()=>requestAnimationFrame(position));
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action="bh15-task-jump"]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();goToTask(b.dataset.id);
},true);

// Private-panel sorting without any arrow buttons: hold the panel title, drag
// it onto another section heading, and release. The routine drag handler lives
// in a separate subtree and does not conflict with this one.
let hold=null,drag=null,ghost=null,drop=null,blockClickUntil=0;
const HOLD=480,THRESHOLD=12;
function clearHold(){if(hold?.timer)clearTimeout(hold.timer);hold=null}
function clearDrop(){if(drop?.classList)drop.classList.remove('bh15-sort-target');drop=null}
function clearDrag(){
 drag?.summary?.classList.remove('bh15-sort-source');drag=null;
 ghost?.remove();ghost=null;clearDrop();
}
function sourceSummary(el){
 const summary=el.closest?.('.private-panel > summary');
 if(!summary||!summary.closest('.specials'))return null;
 if(el.closest('button,input,a'))return null;
 return summary;
}
function begin(e,touch){
 if(!touch&&e.button!==0)return;
 const summary=sourceSummary(e.target);if(!summary)return;
 if(hold||drag)return;
 const p=touch?e.touches?.[0]:e;if(!p)return;
 const panel=summary.parentElement,key=panel.dataset.panel;if(!key)return;
 const next={summary,key,x:p.clientX,y:p.clientY,isTouch:touch,timer:0};
 next.timer=setTimeout(()=>{
  if(hold!==next)return;hold=null;drag={...next,moved:false};
  ghost=document.createElement('div');ghost.className='bh15-sort-ghost';
  ghost.textContent=summary.querySelector('.panel-title')?.textContent||'Kategorie';
  document.body.append(ghost);summary.classList.add('bh15-sort-source');
  positionGhost(next.x,next.y);
 },HOLD);hold=next;
}
function positionGhost(x,y){if(ghost){ghost.style.left=x+'px';ghost.style.top=y+'px'}}
function destAt(x,y){
 const el=document.elementFromPoint(x,y),summary=el?.closest?.('.private-panel > summary');
 return summary&&summary.closest('.specials')?summary:null;
}
function move(e,touch){
 const p=touch?e.touches?.[0]:e;if(!p)return;
 if(hold&&hold.isTouch===touch&&Math.hypot(hold.x-p.clientX,hold.y-p.clientY)>THRESHOLD)clearHold();
 if(!drag||drag.isTouch!==touch)return;
 if(e.cancelable)e.preventDefault();
 drag.moved ||= Math.hypot(drag.x-p.clientX,drag.y-p.clientY)>THRESHOLD;
 const d=destAt(p.clientX,p.clientY);
 if(d!==drop){clearDrop();drop=d;if(drop&&drop!==drag.summary)drop.classList.add('bh15-sort-target')}
 positionGhost(p.clientX,p.clientY);
 if(p.clientY<80)window.scrollBy(0,-12);
 else if(p.clientY>window.innerHeight-70)window.scrollBy(0,12);
}
function finish(e,touch){
 if(hold?.isTouch===touch)clearHold();
 if(!drag||drag.isTouch!==touch)return;
 const origin=drag,point=touch?(e.changedTouches?.[0]||null):e;
 const d=point?destAt(point.clientX,point.clientY):drop;
 blockClickUntil=Date.now()+750;clearDrag();
 if(!origin.moved||!d||d===origin.summary)return;
 const targetKey=d.parentElement.dataset.panel;
 const order=Array.isArray(data.privateOrder)?data.privateOrder.slice():[];
 const from=order.indexOf(origin.key),to=order.indexOf(targetKey);
 if(from<0||to<0||from===to)return;
 order.splice(from,1);
 order.splice(to,0,origin.key);
 data.privateOrder=order;
 save();render();notice('Kategorie verschoben · ↶ macht es rückgängig');
}
app.addEventListener('touchstart',e=>begin(e,true),{capture:true,passive:true});
app.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')begin(e,false)},true);
window.addEventListener('touchmove',e=>move(e,true),{passive:false,capture:true});
window.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')move(e,false)},true);
window.addEventListener('touchend',e=>finish(e,true),true);
window.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')finish(e,false)},true);
window.addEventListener('touchcancel',()=>{clearHold();clearDrag()},true);
window.addEventListener('pointercancel',()=>{clearHold();clearDrag()},true);
app.addEventListener('click',e=>{
 if(Date.now()<blockClickUntil&&e.target.closest('.private-panel>summary')){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
app.addEventListener('contextmenu',e=>{
 if(sourceSummary(e.target)){e.preventDefault();e.stopImmediatePropagation()}
},true);

window.BH15={applyZoom,setZoom,goToTask};
render();
})();


/* --- next BrainHome module --- */

/* BrainHome 1.6 — optional meal-preparation tasks, repeated completion events.
   Existing node IDs, pretty trees, cloud configuration and local storage key remain unchanged. */
(() => {
'use strict';
const app=document.getElementById('app');
if(!Array.isArray(data.completionLog))data.completionLog=[];

// In Zubereitung is still a food item, but an optional task flag makes it
// visible in Alle Aufgaben without duplicating it inside the project tree.
const editBase=openEditor;
const fieldsBase=updateEditorFields;
function updatePrepVisibility(){
 const isPrep=$('kind').value==='pantry'&&$('pantryGroup').value==='In Zubereitung';
 $('bh16PrepTaskField').hidden=!isPrep;
 $('bh16PrepPriorityField').hidden=!isPrep||!$('bh16PrepAsTask').checked;
}
updateEditorFields=function(){fieldsBase();$('priorityField').hidden=!['task','gift'].includes($('kind').value);updatePrepVisibility()};
openEditor=function(id,parent){
 editBase(id,parent);
 const n=id?get(id):null;
 $('bh16PrepAsTask').checked=!!n?.prepTask;
 $('bh16PrepPriority').value=n?.prepTask?normalizePriority(n.priority):'';
 $('priorityField').hidden=!['task','gift'].includes($('kind').value);
 updatePrepVisibility();
};
$('pantryGroup').addEventListener('change',updatePrepVisibility);
$('bh16PrepAsTask').addEventListener('change',updatePrepVisibility);
$('kind').addEventListener('change',()=>queueMicrotask(updatePrepVisibility));

// Birthdays use the same optional priority field as ordinary tasks.
// No separate urgent toggle is displayed in the gift list.
function recordCompletion(kind,source){
 data.completionLog.push({id:uid(),kind,sourceId:source.id,name:source.name,at:new Date().toISOString()});
}
// Keep the original setDone (including the existing save / undo mechanism).
const oldSetDone=setDone;
setDone=function(id,newValue){
 const n=get(id);if(!n)return;
 if(!!n.done!==!!newValue){
  const kind=isGift(n)?'gift':isPantry(n)&&n.pantryGroup==='In Zubereitung'&&n.prepTask?'prep':null;
  if(kind&&newValue)recordCompletion(kind,n);
 }
 oldSetDone(id,newValue);
};

// Capture at window level, before older document-level event handlers. This
// prevents the original routine button from both saving and recording twice.
window.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='routine-done'){
  event.preventDefault();event.stopImmediatePropagation();
  const r=(data.routines||[]).find(x=>x.id===b.dataset.id);
  if(!r||!routineDue(r))return;
  recordCompletion('routine',r);
  r.lastDone=localDay();
  // Sofort is a one-time decision for the current occurrence only.
  if(normalizePriority(r.priority)==='sofort')r.priority='';
  save();render();
  return;
 }
 if(action==='bh11-gift-done'){
  event.preventDefault();event.stopImmediatePropagation();
  const gift=get(b.dataset.id);if(!gift||!isGift(gift))return;
  if(!gift.done)recordCompletion('gift',gift);
  gift.done=!gift.done;
  gift.giftPinned=!gift.done;
  save();render();
  return;
 }
 if(action==='bh16-open-completion'){
  event.preventDefault();event.stopImmediatePropagation();
  const key=({routine:'routines',gift:'gifts',prep:'food'})[b.dataset.kind];
  const priv=privateRoot();if(!key||!priv)return;
  panels[key]=true;
  try{localStorage.setItem(PANEL_KEY,JSON.stringify(panels))}catch{}
  openProject(priv.id);
  requestAnimationFrame(()=>{
   const panel=app.querySelector(`.private-panel[data-panel="${key}"]`);
   if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'})}
  });
 }
},true);

window.BH16={recordCompletion};
})();


/* --- next BrainHome module --- */

/* BrainHome 1.7 — A routine may optionally be a recurring task.
   Existing routine IDs, recurrence dates, completionLog entries and cloud format are preserved.
   As before, only due routines appear as open tasks. No separate routine urgent toggle. */
(() => {
'use strict';
const app=document.getElementById('app');
const H=s=>esc(s);
const routineIsTask=r=>r.asTask===true||(r.asTask==null&&normalizePriority(r.priority)==='sofort');

// Keep visual design of the routines panel, but show the task status unobtrusively.
const previousRoutineRow=bh09RoutineRow;
bh09RoutineRow=function(r,active){
 const html=previousRoutineRow(r,active);
 if(!routineIsTask(r))return html;
 const pri=normalizePriority(r.priority);
 const badge=` <span class="bh17-task-badge ${H(pri)}">${H(priorityLabel[pri]||'Aufgabe')}</span>`;
 return html.replace('</strong>',badge+'</strong>');
};

const css=document.createElement('style');
css.textContent=`
#bh17RoutineDialog{border:0;padding:0;border-radius:17px;width:min(92vw,410px);max-height:88dvh;box-shadow:0 16px 46px #263d3159;color:#284c38;background:#fff}
#bh17RoutineDialog::backdrop{background:#13281c8c}
#bh17RoutineDialog .bh17-form{padding:21px;display:grid;gap:14px;margin:0}
#bh17RoutineDialog h2{font-size:20px;margin:0 0 2px}
#bh17RoutineDialog .bh17-field{display:grid;gap:5px}
#bh17RoutineDialog label{font-size:12px;font-weight:650;color:#3b5945}
#bh17RoutineDialog input:not([type="checkbox"]),#bh17RoutineDialog select{font:inherit;padding:9px 10px;border:1px solid #cadaca;background:#fff;border-radius:9px;width:100%;box-sizing:border-box}
#bh17RoutineDialog .bh17-frequency{display:grid;grid-template-columns:85px 1fr;gap:9px}
#bh17RoutineDialog .bh17-checkbox{display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer}
#bh17RoutineDialog .bh17-checkbox input{height:18px;width:18px;accent-color:#315b47}
#bh17RoutineDialog .bh17-actions{display:flex;justify-content:end;gap:8px;margin-top:5px}
#bh17RoutineDialog .bh17-help{font-size:11px;color:#64756a;line-height:1.5}
#app .bh17-task-badge{font-size:10px;display:inline-block;margin-left:5px;padding:2px 6px;border-radius:8px;background:#eaf2e9;color:#44644d;font-weight:550;white-space:nowrap}
#app .bh17-task-badge.sofort{background:#fbe0dd;color:#b33b38}
#app .bh17-task-badge.wichtig{background:#ffebc9;color:#82580d}
#app .bh17-routine-task .bh15-task-jump small{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
`;
document.head.append(css);

const dlg=document.createElement('dialog');
dlg.id='bh17RoutineDialog';
dlg.innerHTML=`<form id="bh17RoutineForm" class="bh17-form">
 <h2 id="bh17RoutineTitle">Routine</h2>
 <div class="bh17-field"><label for="bh17Name">Name</label><input id="bh17Name" maxlength="250" required autocomplete="off"></div>
 <div class="bh17-field"><label for="bh17Every">Wiederholen</label><div class="bh17-frequency"><input id="bh17Every" type="number" min="1" max="10000" step="1" required><select id="bh17Unit"><option value="days">Tage</option><option value="weeks">Wochen</option><option value="months">Monate</option></select></div></div>
 <div class="bh17-field"><label for="bh17Group">Untergruppe</label><select id="bh17Group"><option value="">Direkt unter Routinen</option></select></div>
 <label class="bh17-checkbox" for="bh17Task"><input id="bh17Task" type="checkbox">Auch als Aufgabe führen</label>
 <div id="bh17PriorityContainer" class="bh17-field" hidden><label for="bh17Priority">Priorität der Aufgabe</label><select id="bh17Priority"><option value="">Keine Priorität</option><option value="sofort">Sofort</option><option value="wichtig">Wichtig</option><option value="spaeter">Später</option><option value="warten">Warten</option></select><div class="bh17-help">Ist die Routine fällig, steht sie in „Alle Aufgaben“. Mit „Sofort“ zusätzlich auf der Startseite. Nach dem Abhaken erscheint sie wieder, sobald ihr Intervall abgelaufen ist.</div></div>
 <div class="bh17-actions"><button type="button" class="btn" id="bh17Cancel">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div>
</form>`;
document.body.append(dlg);
const field=id=>document.getElementById(id);
let editingId=null;
field('bh17Cancel').addEventListener('click',()=>dlg.close());
function drawPriority(){field('bh17PriorityContainer').hidden=!field('bh17Task').checked;}
field('bh17Task').addEventListener('change',drawPriority);

function groupOptions(){
 const groups=Array.isArray(data.routineGroups)?data.routineGroups:[];
 const used=new Set();let out='';
 const add=(parent,depth)=>{
  for(const g of groups.filter(g=>(g.parentId||'')===parent)){
   if(used.has(g.id))continue;used.add(g.id);
   out+=`<option value="${H(g.id)}">${'　'.repeat(Math.min(depth,12))}${H(g.name)}</option>`;
   add(g.id,depth+1);
  }
 };
 add('',0); // Show imported or orphan groups without losing them.
 for(const g of groups)if(!used.has(g.id))out+=`<option value="${H(g.id)}">${H(g.name)}</option>`;
 return '<option value="">Direkt unter Routinen</option>'+out;
}
function startEditor(id,groupId){
 const r=id?(data.routines||[]).find(x=>x.id===id):null;
 if(id&&!r)return;
 editingId=r?.id||null;
 const pref=window.BH11Prefs?.routine||{};
 field('bh17RoutineTitle').textContent=r?'Routine bearbeiten':'Neue Routine';
 field('bh17Name').value=r?.name||'';
 field('bh17Every').value=Math.max(1,Number(r?.every||pref.every||1));
 field('bh17Unit').value=r?.unit||pref.unit||'days';
 field('bh17Group').innerHTML=groupOptions();
 const selected=r?.groupId??groupId??pref.groupId??'';
 field('bh17Group').value=selected;
 if(field('bh17Group').value!==selected)field('bh17Group').value='';
 field('bh17Task').checked=r?routineIsTask(r):false;
 field('bh17Priority').value=r&&routineIsTask(r)?normalizePriority(r.priority):'';
 drawPriority();
 dlg.showModal();field('bh17Name').focus();
}
field('bh17RoutineForm').addEventListener('submit',e=>{
 e.preventDefault();
 const name=field('bh17Name').value.trim(),every=Number(field('bh17Every').value);
 if(!name||!Number.isInteger(every)||every<1||every>10000)return;
 const unit=field('bh17Unit').value,groupId=field('bh17Group').value;
 const asTask=field('bh17Task').checked,priority=asTask?field('bh17Priority').value:'';
 const fields={name,every,unit,groupId,asTask,priority};
 const old=editingId?(data.routines||[]).find(r=>r.id===editingId):null;
 if(old)Object.assign(old,fields);
 else data.routines.push({id:uid(),...fields,lastDone:null});
 window.BH11Prefs?.rememberRoutine?.({every,unit,groupId});
 save();dlg.close();render();notice('Routine gespeichert');
});

// Intercept previous plain-text prompts without changing older event handlers or
// the existing long-press-to-drag gestures.
window.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action]');if(!b)return;
 const a=b.dataset.action;
 if(a==='routine-add'||a==='routine-edit'){
  e.preventDefault();e.stopImmediatePropagation();
  startEditor(a==='routine-edit'?b.dataset.id:null,b.dataset.groupId||'');
  return;
 }
 if(a==='bh17-routine-open'){
  e.preventDefault();e.stopImmediatePropagation();
  const r=(data.routines||[]).find(r=>r.id===b.dataset.id),priv=privateRoot();
  if(!r||!priv)return;
  panels.routines=true;
  try{localStorage.setItem(PANEL_KEY,JSON.stringify(panels))}catch{}
  openProject(priv.id);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const panel=app.querySelector('.private-panel[data-panel="routines"]');if(!panel)return;
   panel.open=true;
   const row=[...panel.querySelectorAll('.routine-record')].find(row=>row.querySelector('[data-action="routine-edit"]')?.dataset.id===r.id);
   if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('bh14-target-node')}
   else panel.scrollIntoView({behavior:'smooth',block:'start'});
  }));
 }
},true);

window.BH17={routineIsTask,startEditor};
render();
})();


/* --- next BrainHome module --- */

/* BrainHome 1.8 — manually reset routines while preserving all earlier completed checks.
   Existing cloud format, local storage and tree rendering are unchanged. */
(() => {
'use strict';
const previousRoutineRow=bh09RoutineRow;
bh09RoutineRow=function(r,active){
  const html=previousRoutineRow(r,active);
  if(active)return html;
  const button=`<button type="button" class="mini bh18-routine-reset" data-action="bh18-routine-reset" data-id="${esc(r.id)}" title="Diese Routine jetzt wieder fällig machen">↺ Wieder öffnen</button>`;
  return html.replace(/<\/div>$/,button+'</div>');
};
window.addEventListener('click',event=>{
  const control=event.target.closest?.('[data-action="bh18-routine-reset"]');
  if(!control)return;
  event.preventDefault();event.stopImmediatePropagation();
  const r=(data.routines||[]).find(x=>x.id===control.dataset.id);
  if(!r||routineDue(r))return;
  r.lastDone=null;
  save();render();notice('Routine wieder offen · ↶ macht es rückgängig');
},true);
})();


/* --- next BrainHome module --- */

/* BrainHome 1.9 — Wissensbaum MVP. All records are included in existing export, undo and cloud payload. */
(() => {
'use strict';
const initialNames=['Uni','Weisheiten','Leipzig','Studienstiftung'];
const newid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():'knowledge-'+Date.now()+'-'+Math.random().toString(36).slice(2);
if(!Array.isArray(data.knowledgeNodes))data.knowledgeNodes=[];
const nodes=()=>data.knowledgeNodes;
const find=id=>nodes().find(n=>n.id===id);
const children=id=>nodes().filter(n=>n.parent===id).sort((a,b)=>(a.order??0)-(b.order??0));
const isUni=n=>{let current=n;const visited=new Set();while(current&&!visited.has(current.id)){visited.add(current.id);if(current.parent===null)return current.name==='Uni';current=find(current.parent)}return false};
function removeOldInterestRoot(){const root=nodes().find(n=>n.parent===null&&n.name==='Interessen');if(!root)return;const roots=children(null).filter(n=>n.id!==root.id);const kids=children(root.id);for(const n of kids){n.parent=null;n.order=roots.length++}data.knowledgeNodes=nodes().filter(n=>n.id!==root.id);save()}

let active=null,editing=null;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const safe=s=>esc(s||'');
const nav=document.querySelector('nav.tabs');
const tab=document.createElement('button');tab.dataset.tab='knowledge';tab.textContent='Wissensbaum';
const projectTab=nav.querySelector('[data-tab="projects"]');
if(projectTab)projectTab.replaceWith(tab);else nav.append(tab);
// The original navigation binds onclick before this extension loads.
tab.addEventListener('click',e=>{e.stopImmediatePropagation();setTab('knowledge')},true);
const dialog=document.createElement('dialog');dialog.id='bh19Editor';dialog.innerHTML=`<form class="modal" id="bh19Form"><h2 id="bh19Heading">Wissenseintrag</h2><div class="field"><label for="bh19Title">Titel</label><input id="bh19Title" required maxlength="250"></div><div class="field"><label for="bh19Body">Notizen / Zusammenfassung</label><textarea id="bh19Body" rows="11" placeholder="Stichpunkte, Zusammenfassungen, Erkenntnisse …"></textarea></div><div class="field"><label><input type="checkbox" id="bh19Review"> Für tägliche Uni-Wiederholung vormerken</label></div><footer><button type="button" class="btn" id="bh19Cancel">Abbrechen</button><button type="button" class="btn" id="bh19Delete">Löschen</button><button class="btn primary" type="submit">Speichern</button></footer></form>`;
document.body.append(dialog);
const form=dialog.querySelector('form'),title=dialog.querySelector('#bh19Title'),body=dialog.querySelector('#bh19Body'),review=dialog.querySelector('#bh19Review');
dialog.querySelector('#bh19Cancel').onclick=()=>dialog.close();
function edit(id,parent=null){editing=id||null;active=parent;const n=id?find(id):null;title.value=n?.name||'';body.value=n?.body||'';review.checked=!!n?.review;dialog.querySelector('#bh19Heading').textContent=n?'Wissenseintrag bearbeiten':'Wissenseintrag erstellen';dialog.querySelector('#bh19Delete').hidden=!n;review.closest('.field').hidden=!(n?isUni(n):(parent?isUni(find(parent)):false));dialog.showModal();title.focus()}
form.addEventListener('submit',e=>{e.preventDefault();const name=title.value.trim();if(!name)return;if(editing){const n=find(editing);if(!n)return;n.name=name;n.body=body.value;n.review=isUni(n)&&review.checked;n.updatedAt=new Date().toISOString()}else nodes().push({id:newid(),parent:active,name,body:body.value,review:!!(active&&isUni(find(active)))&&review.checked,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),order:nodes().length});save();dialog.close();render()});
dialog.querySelector('#bh19Delete').onclick=()=>{if(!editing)return;const count=(id)=>children(id).reduce((sum,n)=>sum+1+count(n.id),0);if(!confirm(`Diesen Eintrag und ${count(editing)} Unterpunkte löschen?`))return;const ids=new Set([editing]);for(const n of nodes()){let p=n.parent;while(p){if(ids.has(p)){ids.add(n.id);break}p=find(p)?.parent}}data.knowledgeNodes=nodes().filter(n=>!ids.has(n.id));save();dialog.close();render()};
function row(n,depth=0){const kids=children(n.id);const expanded=!n.collapsed;return `<div class="bh19-branch" data-k-branch="${safe(n.id)}" style="margin-left:${Math.min(depth,12)*18}px"><div class="bh19-line" data-k-line="${safe(n.id)}"><button class="bh19-toggle" data-k-toggle="${safe(n.id)}" title="Aufklappen">${kids.length?(expanded?'▾':'▸'):'•'}</button><button class="bh19-name" data-k-edit="${safe(n.id)}" title="Kurz tippen: bearbeiten · lange halten und ziehen: verschieben">${safe(n.name)}</button><button class="mini" data-k-add="${safe(n.id)}" title="Unterpunkt hinzufügen">＋</button></div>${n.body?`<div class="bh19-excerpt">${safe(n.body).slice(0,110)}${n.body.length>110?'…':''}</div>`:''}${expanded?kids.map(x=>row(x,depth+1)).join(''):''}</div>`}
function renderKnowledge(){const app=document.getElementById('app');const roots=children(null);const due=nodes().filter(n=>isUni(n)&&n.review&&n.body&&(!n.reviewedAt||n.reviewedAt.slice(0,10)<today()));const candidate=due.length?due[Math.abs([...today()].reduce((v,c)=>v*31+c.charCodeAt(0),7))%due.length]:null;app.innerHTML=`<section class="bh19-page"><div class="topline"><div><h2>🌱 Dein Wissensbaum</h2><p class="muted">Wissen sammeln, vertiefen und wiederfinden</p></div><button class="btn primary" data-k-add="">＋ Bereich</button></div><div class="bh19-actions"><button class="btn" id="bh19Full">⛶ Baum groß öffnen</button><span class="muted">${nodes().length} Einträge</span></div>${candidate?`<div class="bh19-review"><strong>🎓 Heutige Wiederholung</strong><p>${safe(candidate.name)}</p><button class="btn" data-k-edit="${safe(candidate.id)}">Zusammenfassung öffnen</button><button class="btn" data-k-reviewed="${safe(candidate.id)}">Heute wiederholt ✓</button></div>`:''}<div class="bh19-tree" id="bh19Tree">${roots.map(x=>row(x)).join('')}</div></section>`;
app.querySelector('#bh19Full').onclick=()=>{const d=document.getElementById('bh19FullDialog');d.querySelector('.bh19-zoomcontent').innerHTML=roots.map(x=>row(x)).join('');d.showModal()};}
const fullscreen=document.createElement('dialog');fullscreen.id='bh19FullDialog';fullscreen.innerHTML='<div class="bh19-fullhead"><strong>🌱 Wissensbaum</strong><button class="btn" id="bh19CloseFull">✕ Schließen</button></div><div class="bh19-zoomtools"><button class="btn" id="bh19ZoomOut">−</button><span id="bh19ZoomLabel">100%</span><button class="btn" id="bh19ZoomIn">＋</button><button class="btn" id="bh19ZoomReset">Zurücksetzen</button></div><div class="bh19-canvas" tabindex="0"><div class="bh19-zoomcontent"></div></div>';document.body.append(fullscreen);fullscreen.querySelector('#bh19CloseFull').onclick=()=>fullscreen.close();
let zoom=1;
function setZoom(value){zoom=Math.max(.55,Math.min(2.2,value));const content=fullscreen.querySelector('.bh19-zoomcontent');content.style.zoom=String(zoom);fullscreen.querySelector('#bh19ZoomLabel').textContent=Math.round(zoom*100)+'%'}
fullscreen.querySelector('#bh19ZoomOut').onclick=()=>setZoom(zoom-.15);
fullscreen.querySelector('#bh19ZoomIn').onclick=()=>setZoom(zoom+.15);
fullscreen.querySelector('#bh19ZoomReset').onclick=()=>setZoom(1);

const style=document.createElement('style');style.textContent=`.bh19-page{max-width:1050px;margin:auto}.bh19-actions{display:flex;align-items:center;gap:12px;margin:14px 0}.bh19-tree,.bh19-canvas{background:var(--card,#fff);border:1px solid #a1b9a166;border-radius:16px;padding:16px;overflow:auto}.bh19-branch{min-width:240px}.bh19-line{display:flex;align-items:center;gap:8px;padding:6px 0}.bh19-toggle{border:0;background:transparent;cursor:pointer;color:inherit;width:25px}.bh19-name{border:0;background:transparent;color:inherit;text-align:left;font:inherit;font-weight:600;cursor:pointer;flex:1}.bh19-name:hover{text-decoration:underline}.bh19-excerpt{margin:0 0 8px 34px;white-space:pre-wrap;color:#718578;font-size:.83rem;max-width:700px}.bh19-review{border-radius:12px;background:#dce9df30;padding:16px;margin:14px 0}.bh19-review button{margin-right:8px}#bh19FullDialog{width:95vw;max-width:none;height:90vh;max-height:none;border:0;border-radius:16px;padding:15px}#bh19FullDialog[open]{display:flex;flex-direction:column}.bh19-fullhead{display:flex;align-items:center;justify-content:space-between;padding:8px}.bh19-canvas{flex:1;overflow:auto;touch-action:pan-x pan-y}#bh19Body{min-height:240px}.bh19-zoomtools{display:flex;gap:8px;align-items:center;padding:6px 8px}.bh19-zoomcontent{width:max-content;min-width:100%;transform-origin:top left}`;document.head.append(style);
const previousRender=render;render=function(...args){if(data.tab==='knowledge'){window.BHRoute?.remember?.();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='knowledge'));renderKnowledge();return}return previousRender(...args)};
document.addEventListener('click',e=>{const b=e.target.closest('[data-k-add],[data-k-edit],[data-k-toggle],[data-k-reviewed]');if(!b)return;if(Date.now()<suppressEditUntil&&b.hasAttribute('data-k-edit')){e.preventDefault();e.stopImmediatePropagation();return}e.preventDefault();e.stopImmediatePropagation();if(b.hasAttribute('data-k-add'))edit(null,b.dataset.kAdd||null);else if(b.hasAttribute('data-k-edit'))edit(b.dataset.kEdit);else if(b.hasAttribute('data-k-toggle')){const n=find(b.dataset.kToggle);if(n){n.collapsed=!n.collapsed;save();render();if(fullscreen.open)fullscreen.querySelector('.bh19-zoomcontent').innerHTML=children(null).map(x=>row(x)).join('')}}else if(b.hasAttribute('data-k-reviewed')){const n=find(b.dataset.kReviewed);if(n){n.reviewedAt=new Date().toISOString();save();render()}}},true);
// Long-press reorder within the same parent, compatible with touch and mouse.
let drag=null,dragTimer=null,suppressEditUntil=0;
function clearDrag(){clearTimeout(dragTimer);dragTimer=null;document.querySelectorAll('.bh19-dragging,.bh19-drop-target').forEach(e=>e.classList.remove('bh19-dragging','bh19-drop-target'));drag=null}
function dropTarget(x,y){const line=document.elementFromPoint(x,y)?.closest('[data-k-line]');if(!line||!drag)return null;const target=find(line.dataset.kLine),source=find(drag.id);return target&&source&&target.id!==source.id&&target.parent===source.parent?line:null}
document.addEventListener('pointerdown',e=>{const name=e.target.closest('.bh19-name');if(!name||e.button!==0)return;const id=name.dataset.kEdit;drag={id,x:e.clientX,y:e.clientY,active:false,target:null};dragTimer=setTimeout(()=>{if(!drag||drag.id!==id)return;drag.active=true;name.closest('.bh19-line')?.classList.add('bh19-dragging');navigator.vibrate?.(25)},480)},true);
document.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.active){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>12)clearDrag();return}e.preventDefault();document.querySelectorAll('.bh19-drop-target').forEach(el=>el.classList.remove('bh19-drop-target'));const line=dropTarget(e.clientX,e.clientY);drag.target=line?.dataset.kLine||null;line?.classList.add('bh19-drop-target')},{capture:true,passive:false});
document.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;if(d.active){suppressEditUntil=Date.now()+700;const target=dropTarget(e.clientX,e.clientY);const to=target?.dataset.kLine||d.target;if(to){const source=find(d.id),dest=find(to);if(source&&dest&&source.parent===dest.parent){const list=children(source.parent).filter(n=>n.id!==source.id);const idx=list.findIndex(n=>n.id===to);list.splice(idx,0,source);list.forEach((n,i)=>n.order=i);save();render();if(fullscreen.open)fullscreen.querySelector('.bh19-zoomcontent').innerHTML=children(null).map(n=>row(n)).join('')}}e.preventDefault()}clearDrag()},true);
document.addEventListener('pointercancel',clearDrag,true);
document.addEventListener('click',e=>{if(Date.now()<suppressEditUntil&&e.target.closest('[data-k-edit]')){e.preventDefault();e.stopImmediatePropagation()}},true);
const dragStyle=document.createElement('style');dragStyle.textContent='.bh19-name{touch-action:none;user-select:none;-webkit-user-select:none}.bh19-line.bh19-dragging{opacity:.55;outline:2px dashed #6b937a;border-radius:8px}.bh19-line.bh19-drop-target{background:#b3d6ba66;outline:2px solid #5b8969;border-radius:8px}';document.head.append(dragStyle);
// Seed only when there is no knowledge tree, without touching existing task nodes.
removeOldInterestRoot();
if(!nodes().length){for(const name of initialNames)nodes().push({id:newid(),parent:null,name,body:'',review:false,createdAt:new Date().toISOString(),order:nodes().length});save()}
// Existing trees can have custom order; default Uni first for the initial migration only.
if(!localStorage.getItem('brainhome-v19-order-migrated')){const roots=children(null),uni=roots.find(n=>n.name==='Uni');if(uni){const reordered=[uni,...roots.filter(n=>n.id!==uni.id)];reordered.forEach((n,i)=>n.order=i);save()}localStorage.setItem('brainhome-v19-order-migrated','1')}
})();
// Non-destructive one-time tidy-up: rename only the top-level Promotion area.
if(!localStorage.getItem('brainhome-v23-labor-rename')){
 const old=data.nodes.find(n=>n.parent===null&&n.name==='Promotion');
 if(old&&!data.nodes.some(n=>n.parent===null&&n.name==='Labor')){old.name='Labor';save()}
 localStorage.setItem('brainhome-v23-labor-rename','1');
}
// Restore the last page only after the knowledge module has registered its view.
window.BHRoute?.activate?.();
render();




/* BrainHome 2.5 — navigation, true list relocation, task event statistics and notes.
   Kept in app.js (no extra application files). Existing Firebase and node IDs stay intact. */
(() => {
'use strict';
const ACTIVE_ROUTE = 'brainhome-v25-active-route';
const STATS_OPEN = 'brainhome-v25-stats-visible';
const rootRelationship = () => data.nodes.find(n => n.parent===null && /^Beziehung(en)?$/i.test(n.name));
const oldPrivateRoot = () => privateRoot();
const stamp = () => new Date().toISOString();
const isTaskRecord = n => !!n && isTask(n);
const visibleRoute = () => ({tab:data.tab, active:data.tab==='tree'?data.active:null});

// One authoritative route key, restored before the initial 2.5 render. No changes
// to this navigation record are transmitted to Firebase or saved in task history.
function routeSave() {
 const route=visibleRoute();
 if (!['home','projects','tree','inbox','all','history','search','knowledge'].includes(route.tab)) return;
 try {localStorage.setItem(ACTIVE_ROUTE,JSON.stringify(route));localStorage.setItem('brainhome-v13-last-view',JSON.stringify(route));}catch(e){console.warn('Navigation',e)}
}
function routeRestore() {
 try {
  const route=JSON.parse(localStorage.getItem(ACTIVE_ROUTE)||localStorage.getItem('brainhome-v13-last-view')||'null');
  if(!route || !['home','projects','tree','inbox','all','history','search','knowledge'].includes(route.tab))return;
  if(route.tab==='tree'){
   const root=get(route.active);
   if(!root || root.parent!==null)return;
   data.active=root.id;
  }
  data.tab=route.tab;
 } catch(e){console.warn('Navigation wiederherstellen',e)}
}
routeRestore();

// Split the *real* gift and song panels by owner. No duplicate lists or cloned
// records; all editing, checkboxes, history and undo use the original arrays.
function moveActualPanels() {
 if(data.tab!=='tree')return;
 const root=get(data.active),rel=rootRelationship(),priv=oldPrivateRoot();
 if(!root)return;
 const target=document.querySelector('#app');
 if(rel && root.id===rel.id){
   const div=document.createElement('div');div.innerHTML=specialsHTML();
   const panels=div.querySelectorAll('details[data-panel="gifts"],details[data-panel="songs"]');
   if(!panels.length)return;
   const section=document.createElement('section');section.className='bh25-relationship-lists';
   section.innerHTML='<h3>Listen zu Beziehungen</h3>';
   const wrap=document.createElement('div');wrap.className='specials';
   for(const panel of panels)wrap.append(panel);
   section.append(wrap);target.append(section);
 }
 if(priv && root.id===priv.id){
   target.querySelectorAll('details[data-panel="gifts"],details[data-panel="songs"]').forEach(panel=>panel.remove());
 }
}
function ensureCategory(root,name) {
 let existing=data.nodes.find(n=>n.parent===root.id&&n.name===name&&isCategory(n));
 if(existing)return existing;
 existing={id:uid(),parent:root.id,name,kind:'category',checkable:false,done:false,priority:'',due:'',notes:'',collapsed:false,userCreated:true,createdAt:stamp()};
 data.nodes.push(existing);return existing;
}
// Idempotent migration. Preserve every existing subnode, note and task ID.
function migrateRelationshipLists() {
 const rel=rootRelationship();if(!rel)return;
 const before=JSON.stringify(data.nodes);
 const priv=oldPrivateRoot();
 const names=['Aktivitäten','Bastelideen','Erziehung','Geschenke','Lagerfeuerlieder'];
 for(const name of names){
  let candidates=data.nodes.filter(n=>n.name===name && isCategory(n) && (n.parent===rel.id || n.parent===priv?.id || n.privateSection===true));
  let target=candidates.find(n=>n.parent===rel.id) || candidates.find(n=>!n.privateSection) || candidates[0];
  if(!target)target=ensureCategory(rel,name);
  target.parent=rel.id;
  // Previous v2.4 placeholders must not keep the wrong "Privat" notice.
  if(target.notes==='Bestehende Speziallisten bleiben weiterhin unter Privat erreichbar.')target.notes='';
  delete target.privateSection;
  if(name==='Geschenke'||name==='Lagerfeuerlieder')target.collapsed=true;
  for(const duplicate of candidates){
   if(duplicate.id===target.id)continue;
   // Never throw away a meaningful user entry merely because names match.
   for(const child of data.nodes.filter(n=>n.parent===duplicate.id))child.parent=target.id;
   if(duplicate.notes?.trim() && duplicate.notes!=='Bestehende Speziallisten bleiben weiterhin unter Privat erreichbar.') {
     target.notes=[target.notes,duplicate.notes].filter(Boolean).join('\n\n');
   }
   data.nodes=data.nodes.filter(n=>n.id!==duplicate.id);
  }
 }
 const giftCategory=data.nodes.find(n=>n.parent===rel.id&&n.name==='Geschenke'&&isCategory(n));
 if(giftCategory)for(const gift of data.nodes.filter(isGift))gift.parent=giftCategory.id;
 if(before!==JSON.stringify(data.nodes))save();
}
migrateRelationshipLists();
// Gift and song panels have been moved to Relationships. Hide only their
// empty tree placeholders; any user-created task children keep them visible.
const oldSpecialNode = isSpecialTreeNode;
isSpecialTreeNode=function(n){
 const rel=rootRelationship();
 if(rel && n?.parent===rel.id && isCategory(n) && ['Geschenke','Lagerfeuerlieder'].includes(n.name)){
  const meaningful=!!n.notes?.trim() || data.nodes.some(x=>x.parent===n.id && !isGift(x));
  if(!meaningful)return true;
 }
 return oldSpecialNode(n);
};

// Task timeline: true creation and completion timestamps, not total inventory.
if(!Array.isArray(data.taskEvents))data.taskEvents=[];
let known=new Map((data.nodes||[]).map(n=>[n.id,{task:isTaskRecord(n),done:!!n.done}]));
const originalSave=save;
save=function(...args){
 if(!Array.isArray(data.taskEvents))data.taskEvents=[];
 // New gifts created through the legacy editor also belong to Relationships.
 const rel=rootRelationship();
 const giftBucket=rel&&data.nodes.find(n=>n.parent===rel.id&&n.name==='Geschenke'&&isCategory(n));
 if(giftBucket)for(const n of data.nodes)if(isGift(n)&&n.parent!==giftBucket.id)n.parent=giftBucket.id;
 const updated=new Map();
 let change=false;
 for(const n of data.nodes){
  const task=isTaskRecord(n),prior=known.get(n.id),done=!!n.done;
  if(task&&(!prior||!prior.task)){
    // Prior unknown historical tasks stay undated; conversions and new tasks
    // get a real creation date at the moment we observe the transition.
    if(!n.createdAt)n.createdAt=stamp();
    data.taskEvents.push({id:uid(),type:'created',taskId:n.id,name:n.name,at:n.createdAt,source:n.parent==='inbox'?'inbox':'tree'});change=true;
  }
  if(task && prior && prior.task && !prior.done && done){
    data.taskEvents.push({id:uid(),type:'completed',taskId:n.id,name:n.name,at:n.completedAt||stamp()});change=true;
  }
  if(task && (!prior || !prior.task) && done){
    data.taskEvents.push({id:uid(),type:'completed',taskId:n.id,name:n.name,at:n.completedAt||stamp()});change=true;
  }
  updated.set(n.id,{task,done});
 }
 known=updated;
 return originalSave(...args);
};
function resetKnown(){known=new Map((data.nodes||[]).map(n=>[n.id,{task:isTaskRecord(n),done:!!n.done}]));}
// Ensure undo/redo and cloud replacement do not generate fictional events.
const prevApply=window.BH10?.applyData;
if(prevApply){window.BH10.applyData=function(payload){const route=visibleRoute();const result=prevApply(payload);resetKnown();
 if(route.tab==='tree'&&get(route.active)) {data.tab='tree';data.active=route.active;}
 else if(['home','projects','inbox','all','history','search','knowledge'].includes(route.tab))data.tab=route.tab;
 routeSave();render();return result;};}

// Completion without an assignment: discard Inbox capture. A capture explicitly
// converted into a task is genuinely completed and appears in timeline+history.
window.addEventListener('click',event=>{
 const control=event.target.closest?.('[data-action="bh12-inbox-discard"]');
 if(!control)return;
 const n=get(control.dataset.id);if(!n||n.parent!=='inbox')return;
 event.preventDefault();event.stopImmediatePropagation();
 if(isTaskRecord(n)){
   setDone(n.id,true); // Existing completion path and new timeline are preserved.
   notice('Aufgabe erledigt und in der Statistik erfasst');
 }else{
   if(descendants(n.id).length){notice('Bitte zuerst die Unterpunkte einsortieren.');return;}
   data.nodes=data.nodes.filter(item=>item.id!==n.id);save();render();notice('Inbox-Eintrag entfernt');
 }
},true);
// Legacy Inbox and overview draw their own markup; keep checkbox behavior
// dynamic so tasks get a proper accessible description.
function adjustInbox() {
 if(data.tab!=='inbox')return;
 const host=document.getElementById('app');
 for(const checkbox of host.querySelectorAll('[data-action="bh12-inbox-discard"]')){
  const item=get(checkbox.dataset.id);if(!item)continue;
  if(item.done){checkbox.closest('.bh12-inbox-item')?.remove();continue;}
  const task=isTaskRecord(item);
  checkbox.title=task?'Als Aufgabe erledigen und für Statistik zählen':'Notiz aus Inbox entfernen';
  checkbox.setAttribute('aria-label',checkbox.title);
  if(task){const row=checkbox.closest('.bh12-inbox-item');const title=row?.querySelector('strong');if(title&&!row.querySelector('.bh25-task-chip'))title.insertAdjacentHTML('afterend',' <small class="bh25-task-chip">Aufgabe</small>');}
 }
}

// Notes live on the original root node, synced by the existing cloud export.
const dlg=document.createElement('dialog');dlg.className='bh25-notes-dialog';dlg.innerHTML=`<form class="modal" id="bh25NotesForm"><h2 id="bh25NotesHeading">Bereichsnotizen</h2><label class="field">Notizen<textarea id="bh25NotesBody" rows="12" placeholder="Gedanken, Ideen, Zusammenfassungen …"></textarea></label><footer><button type="button" id="bh25NotesCancel" class="btn">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;
document.body.append(dlg);
let notesRoot=null;
dlg.querySelector('#bh25NotesCancel').onclick=()=>dlg.close();
dlg.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const root=get(notesRoot);if(root){root.notes=dlg.querySelector('#bh25NotesBody').value;save();render();notice('Bereichsnotizen gespeichert')}dlg.close()});
function addNotesButton() {
 if(data.tab!=='tree')return;
 const root=get(data.active),bar=document.querySelector('#app .topline');if(!root||!bar)return;
 if(bar.querySelector('[data-bh25-notes]'))return;
 const button=document.createElement('button');button.type='button';button.className='btn bh25-notes-button';button.dataset.bh25Notes=root.id;
 button.textContent='📝 Notizen'+(root.notes?.trim()?' ✓':'');button.title='Notizen für '+root.name;bar.append(button);
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-bh25-notes]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();const root=get(b.dataset.bh25Notes);if(!root)return;
 notesRoot=root.id;dlg.querySelector('#bh25NotesHeading').textContent='📝 '+root.name+' · Notizen';dlg.querySelector('#bh25NotesBody').value=root.notes||'';dlg.showModal();},true);
// Gift and songs quick links must now navigate to their actual visible owner.
window.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='v1-gift-open' || (action==='v1-panel'&&['gifts','songs'].includes(b.dataset.id))){
  const rel=rootRelationship();if(!rel)return;
  e.preventDefault();e.stopImmediatePropagation();
  const panel=action==='v1-gift-open'?'gifts':b.dataset.id;
  panels[panel]=true;localStorage.setItem(PANEL_KEY,JSON.stringify(panels));openProject(rel.id);
  requestAnimationFrame(()=>document.querySelector(`[data-panel="${panel}"]`)?.scrollIntoView({block:'start',behavior:'smooth'}));
 }
},true);

// The statistical report is hidden by default. It is shown only inside Erledigt
// and includes real time-based incoming/completed counts.
// The completed series is always visible; the incoming series is opt-in.
let statsShowIncoming=false;
let statsPeriod='week',statsOffset=0;
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function isoWeek(date){
 const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
 d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
 const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,1));
 return {number:Math.ceil((((d-first)/86400000)+1)/7),year};
}
function statsSlots(){
 const today=new Date();today.setHours(12,0,0,0);
 let slots=[],title='';
 if(statsPeriod==='week'){
  const start=new Date(today);start.setDate(today.getDate()-((today.getDay()+6)%7)+7*statsOffset);
  for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);slots.push({key:dayKey(d),label:['Mo','Di','Mi','Do','Fr','Sa','So'][i]});}
  const kw=isoWeek(start);title=`KW ${kw.number} · ${kw.year}`;
 }else if(statsPeriod==='month'){
  const start=new Date(today.getFullYear(),today.getMonth()+statsOffset,1,12);
  const days=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
  for(let i=1;i<=days;i++){const d=new Date(start.getFullYear(),start.getMonth(),i,12);slots.push({key:dayKey(d),label:String(i)});}
  title=start.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
 }else{
  const year=today.getFullYear()+statsOffset;
  for(let month=0;month<12;month++){const d=new Date(year,month,1,12);slots.push({key:year+'-'+String(month+1).padStart(2,'0'),label:d.toLocaleDateString('de-DE',{month:'short'}).replace('.','')});}
  title=String(year);
 }
 const totals=new Map(slots.map(item=>[item.key,{incoming:0,outgoing:0}]));
 const keyFor=raw=>{const d=new Date(raw);if(!Number.isFinite(d.getTime()))return null;return statsPeriod==='year'?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:dayKey(d)};
 const registered=new Set();
 for(const event of data.taskEvents||[]){
  if(!event?.at||!['created','completed'].includes(event.type))continue;
  if(event.type==='completed')registered.add(event.taskId);
  const slot=totals.get(keyFor(event.at));if(slot)slot[event.type==='created'?'incoming':'outgoing']++;
 }
 for(const node of data.nodes){
  if(!isTaskRecord(node)||!node.done||!node.completedAt||registered.has(node.id))continue;
  const slot=totals.get(keyFor(node.completedAt));if(slot)slot.outgoing++;
 }
 for(const event of data.completionLog||[]){
  if(!event?.at||!['routine','gift','prep'].includes(event.kind))continue;
  const slot=totals.get(keyFor(event.at));if(slot)slot.outgoing++;
 }
 const all=slots.map(slot=>({...slot,...totals.get(slot.key)}));
 return {all,title,incoming:all.reduce((sum,s)=>sum+s.incoming,0),outgoing:all.reduce((sum,s)=>sum+s.outgoing,0)};
}
function reportHTML(){
 const {all,title,incoming,outgoing}=statsSlots();
 const max=Math.max(1,...all.map(x=>statsShowIncoming?Math.max(x.incoming,x.outgoing):x.outgoing));
 const bars=all.map(s=>{
  const inBar=statsShowIncoming?`<span class="bh26-bar bh26-in" style="height:${s.incoming?Math.max(3,Math.round(s.incoming/max*78)):2}px" aria-hidden="true"></span>`:'';
  const doneBar=`<span class="bh26-bar bh26-done" style="height:${s.outgoing?Math.max(3,Math.round(s.outgoing/max*78)):2}px" aria-hidden="true"></span>`;
  const number=statsShowIncoming?`${s.incoming||''}${s.incoming||s.outgoing?' / ':''}${s.outgoing||''}`:(s.outgoing||'');
  return `<div class="bh26-slot" title="${esc(s.key)}: ${s.outgoing} erledigt${statsShowIncoming?', '+s.incoming+' hinzugefügt':''}"><span class="bh26-value">${esc(number)}</span><div class="bh26-pair">${inBar}${doneBar}</div><span class="bh26-label">${esc(s.label)}</span></div>`;
 }).join('');
 const periodButtons=[['week','Woche'],['month','Monat'],['year','Jahr']].map(([id,label])=>`<button type="button" data-bh25-period="${id}" aria-pressed="${statsPeriod===id}" class="bh26-period">${label}</button>`).join('');
 return `<section class="bh26-report"  aria-label="Aufgabenstatistik">
 <div class="bh26-top"><strong>Erledigte Aufgaben</strong><div class="bh26-periods" role="group" aria-label="Zeitraum">${periodButtons}</div></div>
 <div class="bh26-nav"><button type="button" data-bh25-shift="-1" aria-label="Vorheriger Zeitraum">‹</button><span>${esc(title)}</span><button type="button" data-bh25-shift="1" aria-label="Nächster Zeitraum">›</button></div>
 <div class="bh26-scroller"><div class="bh26-bars bh26-${statsPeriod}">${bars}</div></div>
 <div class="bh26-bottom"><span class="bh26-done-total">✓ ${outgoing} erledigt</span>${statsShowIncoming?`<span class="bh26-in-total">＋ ${incoming} hinzugefügt</span>`:''}<button class="bh26-in-toggle" type="button" data-bh25-stats-toggle aria-pressed="${statsShowIncoming}">${statsShowIncoming?'✓ Hinzugefügte sichtbar':'＋ Hinzugefügte anzeigen'}</button></div>
 </section>`;
}
function adjustHistory(){
 if(data.tab!=='history')return;
 const history=document.querySelector('#app .bh13-history');if(!history)return;
 history.querySelector('.bh13-chart')?.remove();history.querySelector('.bh24-flow')?.remove();
 const headline=history.querySelector('h2');if(!headline)return;
 headline.insertAdjacentHTML('afterend',reportHTML());
 // Reopened tasks continue to have their former completion events.
 const done=new Set(data.nodes.filter(n=>isTaskRecord(n)&&n.done).map(n=>n.id));
 const old=(data.taskEvents||[]).filter(e=>e.type==='completed'&&!done.has(e.taskId));
 if(old.length){const section=document.createElement('section');section.className='bh25-past-completions';section.innerHTML='<h3>Frühere Abschlüsse (erneut geöffnet)</h3>'+old.slice().reverse().map(e=>`<div class="task"><span class="history-check">✓</span><div class="detail"><strong>${esc(e.name)}</strong><small>${esc(e.at.slice(0,10))}</small></div></div>`).join('');history.append(section)}
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-bh25-stats-toggle],[data-bh25-period],[data-bh25-shift]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-bh25-stats-toggle'))statsShowIncoming=!statsShowIncoming;
 if(b.hasAttribute('data-bh25-period')){statsPeriod=b.dataset.bh25Period;statsOffset=0}
 if(b.hasAttribute('data-bh25-shift'))statsOffset+=Number(b.dataset.bh25Shift);
 render();
},true);


// Studienstiftung: nested projects and dated events, stored as existing nodes.
// Appointments are non-checkable entries, so a calendar event does not distort
// the completion statistic. Every entry retains its ordinary node ID and notes.
const foundationRoot=()=>data.nodes.find(n=>n.parent===null && /^Studienstiftung(?: des deutschen Volkes)?$/i.test(n.name));
// v2.7: folders from 2.6 are internal storage containers, NEVER visible tree branches.
const foundationTreeSpecial=isSpecialTreeNode;
isSpecialTreeNode=function(n){
 const root=foundationRoot();
 if(root && rootOf(n)?.id===root.id){
  if(n.appointment)return true;
  if(n.parent===root.id && isCategory(n) && ['Projekte','Termine'].includes(n.name))return true;
 }
 return foundationTreeSpecial(n);
};
function foundationFolder(name){
 const root=foundationRoot();if(!root)return null;
 return data.nodes.find(n=>n.parent===root.id && isCategory(n) && n.name===name)||null;
}
function ensureFoundationFolders(){
 const root=foundationRoot();if(!root)return;
 let changed=false;
 for(const name of ['Projekte','Termine']){
  if(foundationFolder(name))continue;
  data.nodes.push({id:uid(),parent:root.id,name,kind:'category',checkable:false,done:false,priority:'',due:'',notes:'',collapsed:false,userCreated:true});changed=true;
 }
 if(changed)save();
}
const foundationDialog=document.createElement('dialog');
foundationDialog.className='bh26-appointment-dialog';
foundationDialog.innerHTML=`<form class="modal" id="bh26AppointmentForm"><h2 id="bh26AppointmentTitle">Termin eintragen</h2>
<div class="field"><label for="bh26AppointmentName">Termin</label><input id="bh26AppointmentName" maxlength="250" required autocomplete="off"></div>
<div class="field"><label for="bh26AppointmentDate">Datum</label><input type="date" id="bh26AppointmentDate" required></div>
<div class="field"><label for="bh26AppointmentTime">Uhrzeit (optional)</label><input type="time" id="bh26AppointmentTime"></div>
<div class="field"><label for="bh26AppointmentParent">Zuordnung</label><select id="bh26AppointmentParent"></select></div>
<div class="field"><label for="bh26AppointmentNotes">Notizen (optional)</label><textarea id="bh26AppointmentNotes" rows="3"></textarea></div>
<footer><button type="button" class="btn" data-bh26-appointment-cancel>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;
document.body.append(foundationDialog);
let editingAppointment=null;
const fld=id=>foundationDialog.querySelector('#'+id);
function foundationBranches(){
 const root=foundationRoot();if(!root)return[];
 const results=[],pending=[root],seen=new Set();
 while(pending.length){const parent=pending.shift();if(seen.has(parent.id))continue;seen.add(parent.id);
  for(const child of kids(parent.id))if(isCategory(child)){
   results.push(child);pending.push(child);
  }
 }
 return results;
}
function openFoundationAppointment(id=null){
 ensureFoundationFolders();const entry=id?get(id):null;
 editingAppointment=entry?.id||null;
 const container=foundationFolder('Projekte'),dates=foundationFolder('Termine');
 const choices=foundationBranches().filter(n=>n.id===dates?.id || n.id===container?.id || (container && (n.parent===container.id || descendants(container.id).includes(n.id))) || n.id===entry?.parent);
 fld('bh26AppointmentParent').replaceChildren(...choices.map(n=>new Option(path(n),n.id)));
 fld('bh26AppointmentParent').value=entry?.parent||foundationFolder('Termine')?.id||foundationRoot()?.id;
 fld('bh26AppointmentName').value=entry?.name||'';
 fld('bh26AppointmentDate').value=entry?.due||'';
 fld('bh26AppointmentTime').value=entry?.appointmentTime||'';
 fld('bh26AppointmentNotes').value=entry?.notes||'';
 fld('bh26AppointmentTitle').textContent=entry?'Termin bearbeiten':'Termin eintragen';
 foundationDialog.showModal();fld('bh26AppointmentName').focus();
}
foundationDialog.querySelector('[data-bh26-appointment-cancel]').onclick=()=>foundationDialog.close();
foundationDialog.querySelector('form').addEventListener('submit',e=>{
 e.preventDefault();const root=foundationRoot();if(!root)return;
 const name=fld('bh26AppointmentName').value.trim(),due=fld('bh26AppointmentDate').value;
 const parent=fld('bh26AppointmentParent').value;
 if(!name||!due||!foundationBranches().some(n=>n.id===parent))return;
 const fields={name,due,parent,notes:fld('bh26AppointmentNotes').value,appointment:true,appointmentTime:fld('bh26AppointmentTime').value,kind:'list',checkable:false,done:false,priority:''};
 if(editingAppointment){const n=get(editingAppointment);if(n)Object.assign(n,fields)}
 else data.nodes.push({id:uid(),collapsed:false,...fields});
 save();foundationDialog.close();render();notice('Termin gespeichert');
});
function foundationPanelRows(parentId,depth=0,seen=new Set()){
 if(depth>10||seen.has(parentId))return '';
 const visited=new Set(seen);visited.add(parentId);
 return kids(parentId).filter(n=>!n.appointment).map(n=>{
  const children=foundationPanelRows(n.id,depth+1,visited);
  return `<div class="bh27-project-row" style="--depth:${depth}">
   <div class="bh27-project-line"><span class="bh27-project-title">${isCategory(n)?'▣ ':isTask(n)?'□ ':'• '}${esc(n.name)}</span>
   ${n.due?`<small>📅 ${esc(n.due)}</small>`:''}<button type="button" class="mini" data-bh27-project-edit="${esc(n.id)}" aria-label="Projekt bearbeiten">✎</button>
   <button type="button" class="mini" data-bh27-project-sub="${esc(n.id)}" aria-label="Unterprojekt hinzufügen">＋</button></div>
   ${n.notes?.trim()?`<small class="bh27-project-note">${esc(n.notes)}</small>`:''}${children}
  </div>`;
 }).join('');
}
function foundationPanel(){
 const root=foundationRoot();if(!root)return '';
 const projects=foundationFolder('Projekte'),appointments=data.nodes.filter(n=>n.appointment && n.due && rootOf(n)?.id===root.id && !n.archived)
 .sort((a,b)=>(a.due+'T'+(a.appointmentTime||'00:00')).localeCompare(b.due+'T'+(b.appointmentTime||'00:00')));
 return `<section class="bh27-foundation-panel" aria-label="Studienstiftung Notizen und Projekte">
  <section class="bh27-foundation-notes"><h3>📝 Notizen</h3><textarea id="bh27FoundationNotes" rows="5" placeholder="Deine Gedanken zur Studienstiftung …">${esc(root.notes||'')}</textarea><button class="btn" type="button" data-bh27-save-notes>Notizen speichern</button></section>
  <section class="bh27-foundation-projects"><div class="bh27-foundation-heading"><h3>▣ Projekte</h3><button class="btn" type="button" data-bh27-add-project="${esc(projects?.id||'')}">＋ Projekt</button></div>
   ${projects?foundationPanelRows(projects.id):''}${projects&&!kids(projects.id).length?'<p class="muted">Hier kannst du eigene Projekte anlegen.</p>':''}</section>
  <section class="bh27-foundation-appointments"><div class="bh27-foundation-heading"><h3>📅 Termine</h3><button class="btn" type="button" data-bh27-add-appointment>＋ Termin</button></div>
   ${appointments.map(n=>`<button type="button" class="bh27-appointment-row" data-bh27-edit-appointment="${esc(n.id)}"><time>${esc(new Date(n.due+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'}))}${n.appointmentTime?' · '+esc(n.appointmentTime):''}</time><span>${esc(n.name)}</span><span>✎</span></button>`).join('')||'<p class="muted">Noch keine Termine eingetragen.</p>'}</section>
 </section>`;
}
function addFoundationUI(){
 const root=foundationRoot();if(!root||data.tab!=='tree'||data.active!==root.id)return;
 ensureFoundationFolders();
 const host=document.querySelector('#app');if(!host)return;
 host.querySelectorAll('[data-bh26-add-project],[data-bh26-add-date],.bh26-foundation-dates,.bh27-foundation-panel').forEach(n=>n.remove());
 host.querySelector('[data-bh25-notes]')?.remove();
 host.insertAdjacentHTML('beforeend',foundationPanel());
}
// Existing v2.6 projects and appointments retain their node IDs, descendants, dates,
// notes, cloud history and backup representation. Only their VIEW changes.
const foundationProjectDialog=document.createElement('dialog');
foundationProjectDialog.className='bh27-project-dialog';
foundationProjectDialog.innerHTML=`<form class="modal" id="bh27ProjectForm"><h2 id="bh27ProjectHeading">Projekt anlegen</h2><label class="field">Projektname<input id="bh27ProjectName" maxlength="250" required></label><label class="field">Unterprojekt von<select id="bh27ProjectParent"></select></label><label class="field">Notizen<textarea id="bh27ProjectNotes" rows="4"></textarea></label><footer><button type="button" class="btn" data-bh27-project-cancel>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;
document.body.append(foundationProjectDialog);
let editingFoundationProject=null;
function openFoundationProject(id=null,parentId=null){
 ensureFoundationFolders();const current=id?get(id):null,container=foundationFolder('Projekte');if(!container)return;
 editingFoundationProject=current?.id||null;
 const categories=[container];const visit=(parent,seen=new Set())=>{if(seen.has(parent.id))return;seen.add(parent.id);for(const n of kids(parent.id))if(isCategory(n)){categories.push(n);visit(n,seen)}};visit(container);
 const select=foundationProjectDialog.querySelector('#bh27ProjectParent');
 select.replaceChildren(...categories.filter(n=>!current||n.id!==current.id&&!descendants(current.id).includes(n.id)).map(n=>new Option(n.id===container.id?'Projekte':path(n).replace(/^.*?Projekte › /,''),n.id)));
 select.value=current?.parent||parentId||container.id;
 foundationProjectDialog.querySelector('#bh27ProjectHeading').textContent=current?'Projekt bearbeiten':'Projekt anlegen';
 foundationProjectDialog.querySelector('#bh27ProjectName').value=current?.name||'';
 foundationProjectDialog.querySelector('#bh27ProjectNotes').value=current?.notes||'';
 foundationProjectDialog.showModal();
}
foundationProjectDialog.querySelector('[data-bh27-project-cancel]').onclick=()=>foundationProjectDialog.close();
foundationProjectDialog.querySelector('form').addEventListener('submit',e=>{
 e.preventDefault();const container=foundationFolder('Projekte'),name=foundationProjectDialog.querySelector('#bh27ProjectName').value.trim(),parent=foundationProjectDialog.querySelector('#bh27ProjectParent').value;
 if(!container||!name||!get(parent))return;
 const fields={name,parent,notes:foundationProjectDialog.querySelector('#bh27ProjectNotes').value,kind:'category',checkable:false,done:false,priority:''};
 if(editingFoundationProject){const n=get(editingFoundationProject);if(n)Object.assign(n,fields)}
 else data.nodes.push({id:uid(),collapsed:false,userCreated:true,...fields});
 save();foundationProjectDialog.close();render();notice('Projekt gespeichert');
});

document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-bh27-add-project],[data-bh27-project-sub],[data-bh27-project-edit],[data-bh27-add-appointment],[data-bh27-edit-appointment],[data-bh27-save-notes]');
 if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-bh27-add-project'))openFoundationProject(null,b.dataset.bh27AddProject);
 if(b.hasAttribute('data-bh27-project-sub'))openFoundationProject(null,b.dataset.bh27ProjectSub);
 if(b.hasAttribute('data-bh27-project-edit'))openFoundationProject(b.dataset.bh27ProjectEdit);
 if(b.hasAttribute('data-bh27-add-appointment'))openFoundationAppointment();
 if(b.hasAttribute('data-bh27-edit-appointment'))openFoundationAppointment(b.dataset.bh27EditAppointment);
 if(b.hasAttribute('data-bh27-save-notes')){const root=foundationRoot();if(root){root.notes=document.getElementById('bh27FoundationNotes')?.value||'';save();render();notice('Notizen gespeichert')}}
},true);
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-bh26-add-project],[data-bh26-add-date],[data-bh26-edit-date]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-bh26-add-date')){openFoundationAppointment();return;}
 if(b.hasAttribute('data-bh26-edit-date')){openFoundationAppointment(b.dataset.bh26EditDate);return;}
 const folder=foundationFolder('Projekte');if(!folder)return;
 openEditor(null,folder.id);
 $('kind').value='category';$('priority').value='';$('checkable').checked=false;updateEditorFields();
},true);
// Keep the correct page even after legacy render wrappers and cloud replacement.
const beforeRender=render;
render=function(...args){
 // Initialize the new folders only when Studienstiftung is actually opened.
 // Doing it at application boot could make a fresh device look nonempty before Cloud restore.
 if(data.tab==='tree' && data.active===foundationRoot()?.id)ensureFoundationFolders();
 const result=beforeRender(...args);
 adjustInbox();addNotesButton();moveActualPanels();adjustHistory();addFoundationUI();
 resetKnown();
 if(!document.querySelector('#bh19FullDialog')?.open)routeSave();
 return result;
};
const priorSetTab=setTab;setTab=function(t){const result=priorSetTab(t);routeSave();return result;};
const priorOpen=openProject;openProject=function(id){const result=priorOpen(id);routeSave();return result;};
// Extra restoration before the first useful render and on pageshow (bfcache).
routeRestore();render();
window.addEventListener('pageshow',e=>{if(e.persisted){routeRestore();render()}});
window.BH25={getRoute:visibleRoute,statsSlots,rerender:()=>render()};
const style=document.createElement('style');style.textContent=`
.bh25-relationship-lists{margin-top:18px}.bh25-relationship-lists h3{margin:0 0 10px}
.bh25-notes-button{margin:8px 0}.bh25-task-chip{display:inline-block;color:#397c56;font-size:.72rem;border:1px solid #b8d0bc;border-radius:10px;padding:1px 6px}.bh25-notes-dialog{max-width:min(94vw,640px)}.bh25-notes-dialog textarea{min-height:220px;width:100%}.bh25-past-completions{margin-top:22px}
.bh26-report{background:#fafdf9;border:1px solid #dbe7db;border-radius:13px;padding:12px 11px;margin:6px 0 15px;color:#355c43}
.bh26-top,.bh26-bottom{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}
.bh26-top strong{font-size:12px}.bh26-periods{display:flex;gap:4px}
.bh26-period{border:1px solid #d9e6d7;background:#f4f8f2;color:#456950;font-size:11px;padding:6px 10px;border-radius:8px;min-height:30px}
.bh26-period[aria-pressed="true"]{background:#315b42;color:#fff;border-color:#315b42;box-shadow:0 0 0 1px #315b42}
.bh26-nav{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 0 4px;font-size:12px;color:#496a55;font-weight:600}
.bh26-nav button{background:transparent;border:0;color:#54775e;padding:5px 10px;font-size:19px;min-width:34px}
.bh26-scroller{overflow-x:auto;scrollbar-width:thin;touch-action:pan-x}
.bh26-bars{display:flex;align-items:flex-end;width:100%;height:122px;gap:3px;padding:5px 0 1px;border-bottom:1px solid #dbe7db}
.bh26-bars.bh26-month{min-width:430px}
.bh26-slot{min-width:0;flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}
.bh26-value{height:11px;font-size:9px;color:#355c43;line-height:11px;white-space:nowrap}
.bh26-pair{height:79px;display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%}
.bh26-bar{display:block;min-width:3px;width:min(38%,22px);border-radius:4px 4px 1px 1px}
.bh26-bar.bh26-done{background:#689977}.bh26-bar.bh26-in{background:#202620}
.bh26-label{height:13px;font-size:9px;line-height:13px;color:#72917b;white-space:nowrap}
.bh26-bottom{padding-top:10px;justify-content:flex-start;font-size:11px}
.bh26-done-total{font-weight:650;color:#397c56}.bh26-in-total{font-weight:600;color:#202620}
.bh26-in-toggle{margin-left:auto;font-size:11px;background:#f0f6ef;color:#3d674b;border:1px solid #d3e3d4;border-radius:8px;padding:6px 9px;min-height:30px}
.bh26-in-toggle[aria-pressed="true"]{background:#e3efe5;border-color:#90b398}
.bh26-color{display:flex;align-items:center;gap:5px;font-size:10px;color:#687e6c}
.bh26-color input{width:26px;height:23px;padding:0;border:0;background:transparent}
.bh26-foundation-actions{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}
.bh26-foundation-actions .btn{font-size:12px;padding:7px 9px}
.bh26-foundation-dates{background:#f6f0fb;border:1px solid #dacbe9;border-radius:12px;margin:9px 0 13px;padding:10px}
.bh26-foundation-dates h3{font-size:12px;font-weight:680;margin:0 0 6px;color:#69548f}
.bh26-foundation-date{width:100%;border:0;border-top:1px solid #e5d9ee;background:transparent;display:flex;align-items:center;gap:10px;text-align:left;padding:7px 1px;font-size:12px;color:#514165}
.bh26-foundation-date time{white-space:nowrap;min-width:106px;color:#796394;font-size:11px}
.bh26-foundation-date span:nth-child(2){flex:1}.bh26-foundation-date:hover{background:#ede3f5}
@media(max-width:460px){.bh26-foundation-date{flex-wrap:wrap;gap:3px 8px}.bh26-foundation-date time{min-width:0}.bh26-foundation-actions{width:100%}}

.bh27-foundation-panel{display:grid;gap:14px;margin-top:22px}
.bh27-foundation-panel>section{padding:14px;border:1px solid #dbe7da;border-radius:13px;background:#f9fcf8}
.bh27-foundation-panel h3{margin:0;font-size:15px;color:#345d42}
.bh27-foundation-notes textarea{display:block;width:100%;min-height:105px;margin:12px 0 9px;border:1px solid #c9d9c9;border-radius:9px;background:#fff;padding:11px;font:inherit;color:inherit;resize:vertical}
.bh27-foundation-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}
.bh27-project-row{margin:4px 0 4px calc(var(--depth)*13px);border-left:2px solid #dce9de;padding-left:9px}
.bh27-project-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:5px 0}
.bh27-project-title{flex:1;font-weight:600;min-width:120px}.bh27-project-line small,.bh27-project-note{color:#65816b}
.bh27-project-note{display:block;white-space:pre-wrap;margin:0 0 8px 0}
.bh27-appointment-row{display:flex;gap:9px;width:100%;align-items:center;text-align:left;border:0;border-top:1px solid #dce9de;background:transparent;color:inherit;padding:9px 2px;font:inherit}
.bh27-appointment-row time{font-size:11px;color:#6b816f;white-space:nowrap}.bh27-appointment-row span:nth-child(2){flex:1}
.bh27-vouchers{border-top:1px solid #cfdecf;margin-top:13px;padding-top:13px}.bh27-vouchers h4{margin:0}
.bh27-voucher-row{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #e0e9df}
.bh27-voucher-row .bh27-voucher-info{flex:1}.bh27-voucher-row small{display:block;color:#6b826f}
.bh27-voucher-row.is-used{opacity:.6}.bh27-voucher-row.is-used strong{text-decoration:line-through}
.bh27-voucher-dialog{max-width:min(94vw,540px)}.bh27-voucher-dialog input,.bh27-voucher-dialog textarea{width:100%}
.bh27-drag-ghost{position:fixed;z-index:99999;pointer-events:none;transform:translate(12px,14px);background:#e3f0e6;border:1px solid #658e70;padding:8px 13px;border-radius:9px;box-shadow:0 5px 22px #203e2960;max-width:230px;color:#264f31;font-size:13px}
.bh27-drop-node{outline:3px solid #55996a!important;background:#dceddf!important;border-radius:10px}
.bh27-drag-source{opacity:.4}.bh27-dragging{user-select:none}
`;document.head.append(style);
})();

/* BrainHome 2.7 — vouchers and long-press tree moves. Cloud integration uses existing payload. */
(() => {
'use strict';
// Vouchers are stored independently from monthly recurring payments.
const vouchers=()=>Array.isArray(data.vouchers)?data.vouchers:(data.vouchers=[]);
const previousFinanceHTML=financesHTML;
financesHTML=function(){
 const original=previousFinanceHTML();
 const items=vouchers().slice().sort((a,b)=>Number(!!a.redeemed)-Number(!!b.redeemed)||(a.expires||'9999').localeCompare(b.expires||'9999'));
 const rows=items.map(v=>`<div class="bh27-voucher-row ${v.redeemed?'is-used':''}">
  <input type="checkbox" data-bh27-voucher-toggle="${esc(v.id)}" ${v.redeemed?'checked':''} aria-label="${esc(v.name)} eingelöst">
  <span class="bh27-voucher-info"><strong>${esc(v.name)}</strong><small>${v.value!==''&&v.value!=null?euro(Number(v.value))+' · ':''}${v.expires?'Gültig bis '+esc(v.expires)+' · ':''}${v.redeemed?'Eingelöst':'Offen'}${v.code?' · Code: '+esc(v.code):''}${v.notes?' · '+esc(v.notes):''}</small></span>
  <button type="button" class="mini" data-bh27-voucher-edit="${esc(v.id)}" aria-label="Gutschein bearbeiten">✎</button>
  <button type="button" class="mini" data-bh27-voucher-delete="${esc(v.id)}" aria-label="Gutschein löschen">×</button>
 </div>`).join('');
 return original+`<section class="bh27-vouchers"><div class="topline"><h4>🎟️ Offene Gutscheine (${items.filter(v=>!v.redeemed).length})</h4><button type="button" class="btn" data-bh27-voucher-add>＋ Gutschein</button></div>${rows||'<p class="hint">Hier kannst du Gutscheine sammeln, die du noch einlösen möchtest.</p>'}</section>`;
};
const voucherDialog=document.createElement('dialog');voucherDialog.className='bh27-voucher-dialog';
voucherDialog.innerHTML=`<form class="modal" id="bh27VoucherForm"><h2>🎟️ Gutschein</h2>
<label class="field">Gutschein / Geschäft<input id="bh27VoucherName" maxlength="200" required></label>
<label class="field">Wert in Euro (optional)<input id="bh27VoucherValue" type="number" min="0" step="0.01"></label>
<label class="field">Gültig bis (optional)<input id="bh27VoucherExpires" type="date"></label>
<label class="field">Code (optional)<input id="bh27VoucherCode" maxlength="300"></label>
<label class="field">Notizen<textarea id="bh27VoucherNotes" rows="3"></textarea></label>
<footer><button type="button" class="btn" data-bh27-voucher-cancel>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;
document.body.append(voucherDialog);
let editingVoucher=null;
const vf=id=>voucherDialog.querySelector('#bh27Voucher'+id);
function openVoucher(id=null){
 const voucher=id?vouchers().find(v=>v.id===id):null;
 editingVoucher=voucher?.id||null;
 vf('Name').value=voucher?.name||'';vf('Value').value=voucher?.value??'';vf('Expires').value=voucher?.expires||'';
 vf('Code').value=voucher?.code||'';vf('Notes').value=voucher?.notes||'';
 voucherDialog.showModal();vf('Name').focus();
}
voucherDialog.querySelector('[data-bh27-voucher-cancel]').onclick=()=>voucherDialog.close();
voucherDialog.querySelector('form').addEventListener('submit',e=>{
 e.preventDefault();const name=vf('Name').value.trim();if(!name)return;
 const fields={name,value:vf('Value').value===''?'':Number(vf('Value').value),expires:vf('Expires').value,code:vf('Code').value.trim(),notes:vf('Notes').value};
 const voucher=editingVoucher?vouchers().find(v=>v.id===editingVoucher):null;
 if(voucher)Object.assign(voucher,fields);else vouchers().push({id:uid(),...fields,redeemed:false});
 save();voucherDialog.close();render();notice('Gutschein gespeichert');
});
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-bh27-voucher-add],[data-bh27-voucher-edit],[data-bh27-voucher-delete]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-bh27-voucher-add'))openVoucher();
 else if(b.hasAttribute('data-bh27-voucher-edit'))openVoucher(b.dataset.bh27VoucherEdit);
 else if(b.hasAttribute('data-bh27-voucher-delete')){
  if(!confirm('Diesen Gutschein löschen?'))return;
  data.vouchers=vouchers().filter(v=>v.id!==b.dataset.bh27VoucherDelete);save();render();
 }
},true);
document.addEventListener('change',e=>{
 const b=e.target.closest?.('[data-bh27-voucher-toggle]');if(!b)return;
 const voucher=vouchers().find(v=>v.id===b.dataset.bh27VoucherToggle);
 if(voucher){voucher.redeemed=b.checked;save();render();}
},true);

// Manual ordering beats automatic priority *only* within a group explicitly reordered.
// Other branches retain their existing automatic priority sorting.
const previousOrderedTreeKids=orderedTreeKids;
orderedTreeKids=function(id){
 const result=previousOrderedTreeKids(id);
 if(result.length && result.every(n=>Number.isFinite(n.bh27Order)))return result.sort((a,b)=>a.bh27Order-b.bh27Order);
 return result;
};

const HOLD_MS=520,MOVE_THRESHOLD=13;
let hold=null,active=null,ghost=null,destination=null,ignoreClickUntil=0;
function candidate(node){
 const row=node?.closest?.('.bh13-node[data-node-id],.bh11-row[data-node-id],.outline-row');
 if(!row)return null;
 if(!row.closest('#app,#bh11TreeDialog'))return null;
 const id=row.dataset.nodeId||row.querySelector('[data-action="edit"][data-id]')?.dataset.id;
 const record=id&&get(id);
 if(!record||record.parent===null||isPantry(record)||isGift(record)||record.appointment||record.privateSection)return null;
 return {row,record};
}
function dragHandle(el){
 return !!el?.closest?.('.bh13-name,.outline-name,.bh11-name,.name') && !el.closest('button,input,textarea,select,a,summary,.bh27-foundation-panel');
}
function clearHold(){if(hold?.timer)clearTimeout(hold.timer);hold=null}
function clearDestination(){destination?.row?.classList.remove('bh27-drop-node');destination=null}
function cleanDrag(){active?.row?.classList.remove('bh27-drag-source');ghost?.remove();ghost=null;active=null;clearDestination();document.body.classList.remove('bh27-dragging')}
function at(x,y){const el=document.elementFromPoint(x,y);return candidate(el)}
function sameRoot(a,b){return rootOf(a)?.id===rootOf(b)?.id}
function valid(source,target){return source&&target&&source.id!==target.id&&sameRoot(source,target)&&!descendants(source.id).includes(target.id)}
function start(e,touch){
 if(!touch&&(e.button!==0||e.pointerType==='touch'))return;
 if(!dragHandle(e.target))return;
 const item=candidate(e.target),p=touch?e.touches?.[0]:e;
 if(!item||!p||hold||active)return;
 const next={...item,touch,x:p.clientX,y:p.clientY,lastX:p.clientX,lastY:p.clientY,timer:0};
 next.timer=setTimeout(()=>{
  if(hold!==next)return;hold=null;
  if(!get(next.record.id))return;
  active={...next,moved:false};active.row.classList.add('bh27-drag-source');
  ghost=document.createElement('div');ghost.className='bh27-drag-ghost';ghost.textContent=next.record.name;
  ghost.style.left=next.lastX+'px';ghost.style.top=next.lastY+'px';document.body.append(ghost);
  document.body.classList.add('bh27-dragging');
  try{navigator.vibrate?.(22)}catch{}
 },HOLD_MS);
 hold=next;
}
function moving(e,touch){
 const p=touch?e.touches?.[0]:e;if(!p)return;
 if(hold&&hold.touch===touch){
  hold.lastX=p.clientX;hold.lastY=p.clientY;
  if(Math.hypot(hold.x-p.clientX,hold.y-p.clientY)>MOVE_THRESHOLD)clearHold();
 }
 if(!active||active.touch!==touch)return;
 if(e.cancelable)e.preventDefault();
 active.moved ||= Math.hypot(active.x-p.clientX,active.y-p.clientY)>MOVE_THRESHOLD;
 ghost.style.left=p.clientX+'px';ghost.style.top=p.clientY+'px';
 const hit=at(p.clientX,p.clientY);
 const next=hit&&valid(active.record,hit.record)?hit:null;
 if(destination?.row!==next?.row){clearDestination();destination=next;next?.row.classList.add('bh27-drop-node')}
 if(p.clientY<75)window.scrollBy(0,-9);
 else if(p.clientY>window.innerHeight-75)window.scrollBy(0,9);
}
function finish(e,touch){
 if(hold?.touch===touch)clearHold();
 if(!active||active.touch!==touch)return;
 const item=active,p=touch?e.changedTouches?.[0]:e;
 const hit=p?at(p.clientX,p.clientY):destination;
 ignoreClickUntil=Date.now()+750;
 cleanDrag();
 if(!item.moved||!hit||!valid(item.record,hit.record))return;
 const source=get(item.record.id),target=get(hit.record.id);if(!source||!target)return;
 // A drop on a category places the task IN that category. Reordering two
 // sibling categories instead reorders them at their current level.
 const asSibling=!isCategory(target)||(isCategory(source)&&isCategory(target)&&source.parent===target.parent);
 const newParent=asSibling?target.parent:target.id;
 if(newParent===source.id||descendants(source.id).includes(newParent))return;
 const siblings=orderedTreeKids(newParent).filter(n=>n.id!==source.id);
 if(asSibling){const i=siblings.findIndex(n=>n.id===target.id);siblings.splice(i<0?siblings.length:i,0,source)}
 else {siblings.push(source);target.collapsed=false}
 source.parent=newParent;
 // Include any hidden siblings in the new manual ordering without deleting them.
 siblings.forEach((n,index)=>{n.bh27Order=index});
 save();render();notice('Eintrag verschoben · ↶ macht es rückgängig');
}
// Touch and mouse are handled separately to prevent Android synthetic mouse events.
document.addEventListener('touchstart',e=>start(e,true),{capture:true,passive:true});
document.addEventListener('pointerdown',e=>start(e,false),true);
window.addEventListener('touchmove',e=>moving(e,true),{capture:true,passive:false});
window.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')moving(e,false)},true);
window.addEventListener('touchend',e=>finish(e,true),true);
window.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')finish(e,false)},true);
window.addEventListener('touchcancel',()=>{clearHold();cleanDrag()},true);
window.addEventListener('pointercancel',()=>{clearHold();cleanDrag()},true);
document.addEventListener('click',e=>{
 if(Date.now()<ignoreClickUntil&&e.target.closest('.bh13-node,.outline-row,.bh11-row')){e.preventDefault();e.stopImmediatePropagation()}
},true);
document.addEventListener('contextmenu',e=>{
 if(dragHandle(e.target)&&candidate(e.target))e.preventDefault();
},true);
})();
