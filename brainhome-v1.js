/* BrainHome 1.0 — local-first UX, safe backups, undo and inbox. */
(() => {
'use strict';
const V1_UNDO_KEY='brainhome-v10-undo';
const V1_PAYLOAD_FIELDS=['nodes','songs','shopping','routines','routineGroups','finances','privateOrder','trash','completionLog'];
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
 if((data.shopping||[]).length||(data.routines||[]).length||(data.finances||[]).length||(data.songs||[]).length||(data.routineGroups||[]).length)return true;
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
 const urgentRoutines=(data.routines||[]).filter(r=>r.priority==='sofort'&&routineDue(r));
 const urgentGifts=allNodesOfKind('gift').filter(n=>!n.done&&normalizePriority(n.priority)==='sofort');
 const due=data.nodes.filter(n=>isTask(n)&&!n.done&&n.due&&n.due<=in7).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
 // Only explicitly selected, unfinished gifts appear here; birthdays outside 28 days are allowed.
 const birthdays=allNodesOfKind('gift').filter(n=>n.giftPinned===true&&!n.done&&normalizePriority(n.priority)!=='sofort').sort((a,b)=>(nextBirthdayDays(a)??999)-(nextBirthdayDays(b)??999));
 const routines=(data.routines||[]).filter(r=>routineDue(r)&&r.priority!=='sofort');
 const cell=(name,body)=>body?`<section class="v1-dash-card"><h3>${name}</h3>${body}</section>`:'';
 const taskLink=(n,extra='')=>`<button class="v1-dash-row" data-action="v1-node" data-id="${v1Html(n.id)}"><span>${v1Html(n.name)}<small>${v1Html(rootName(n))}${extra?' · '+v1Html(extra):''}</small></span><span aria-hidden="true">↗</span></button>`;
 const giftRow=n=>`<button class="v1-dash-row" data-action="v1-gift-open" data-id="${v1Html(n.id)}"><span>${v1Html(n.name)}<small>${n.birthday?'Geburtstag in '+nextBirthdayDays(n)+' Tagen':'Geschenk noch offen'}</small></span><span aria-hidden="true">↗</span></button>`;
 const routineRow=r=>`<div class="v1-dash-row"><span>${v1Html(r.name)}<small>Alle ${Number(r.every)||1} ${r.unit==='weeks'?'Woche(n)':r.unit==='months'?'Monat(e)':'Tag(e)'}</small></span><button class="mini" data-action="routine-done" data-id="${v1Html(r.id)}">✓ Gemacht</button></div>`;
 const routineBody=routines.length?routineRow(routines[0])+(routines.length>1?`<details class="v11-more-routines"><summary>${routines.length-1} weitere Routine${routines.length===2?'':'n'} anzeigen</summary>${routines.slice(1).map(routineRow).join('')}</details>`:''):'';
 const urgentBody=[...urgent.map(n=>taskLink(n)),...urgentRoutines.map(routineRow),...urgentGifts.map(giftRow)].slice(0,8).join('');
 const cards=[
   cell('🔴 Sofort',urgentBody),
   cell('📅 Anstehende Termine',due.map(n=>taskLink(n,v1Date(n.due))).join('')),
   cell('🎁 Geschenke',birthdays.map(giftRow).join('')),
   cell('🌱 Routinen',routineBody)
 ].filter(Boolean).join('');
 return `<div class="v1-home-title"><h2>Startseite</h2></div>
 <form class="v1-capture" id="v1CaptureForm"><label for="v1CaptureInput">Inbox</label><div class="v1-capture-row"><input id="v1CaptureInput" required maxlength="250" placeholder="Gedanken oder Eintrag festhalten" autocomplete="off"><button type="submit" class="btn primary">＋ Merken</button></div></form>
 ${cards?`<div class="v1-dash-grid">${cards}</div>`:''}
 <div class="v1-home-areas"><div class="v1-title-row"><h3>Lebensbereiche</h3><button class="v1-small-plus" data-action="main-add" title="Neuen Lebensbereich anlegen" aria-label="Neuen Lebensbereich anlegen">＋</button></div><div class="project-grid">${data.nodes.filter(n=>n.parent===null).map(n=>`<button class="project" data-action="project" data-id="${v1Html(n.id)}"><strong>${v1Html(n.emoji||'🌿')} ${v1Html(n.name)}</strong><small>${descendants(n.id).map(get).filter(x=>x&&isTask(x)&&!x.done).length} offene Aufgaben</small></button>`).join('')}</div></div>`;
}
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
