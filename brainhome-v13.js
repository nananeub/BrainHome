/* BrainHome 1.3 — compact mobile UI, real branch tree, gentle history chart.
   No changes to the existing data format, cloud keys or Firebase configuration. */
(() => {
'use strict';
const H = s => esc(s);
const ROUTE_KEY='brainhome-v13-last-view', SORT_KEY='brainhome-v13-task-sort';
let sortMode='priority',areaFilter='all',period='week',periodOffset=0;
const graphPosition=new Map();
try { const p=JSON.parse(localStorage.getItem(SORT_KEY)||'{}');sortMode=p.mode==='area'?'area':'priority';areaFilter=typeof p.area==='string'?p.area:'all'; }catch{}
const saveSort=()=>{try{localStorage.setItem(SORT_KEY,JSON.stringify({mode:sortMode,area:areaFilter}))}catch{}};
// The old v1.0 startup always sent you to the dashboard; keep view+project for refresh.
// The route is UI-only, and does not trigger a cloud upload.
function rememberRoute(){
 if(!['home','projects','tree','inbox','all','history','search'].includes(data.tab))return;
 try{localStorage.setItem(ROUTE_KEY,JSON.stringify({tab:data.tab,active:data.tab==='tree'?data.active:null}))}catch{}
}
function restoreRoute(){
 try{const last=JSON.parse(localStorage.getItem(ROUTE_KEY)||'null');if(!last||!['home','projects','tree','inbox','all','history','search'].includes(last.tab))return;
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
 const pri=normalizePriority(n.priority),area=rootName(n),label=priorityLabel[pri]||'';
 return `<div class="task bh15-task-item" data-priority="${H(pri)}" data-area="${H(area)}"><input type="checkbox" data-action="done" data-id="${H(n.id)}" aria-label="${H(n.name)} abhaken"><button type="button" class="bh15-task-jump" data-action="bh15-task-jump" data-id="${H(n.id)}" title="Im Baum öffnen"><strong>${H(n.name)}</strong><small>${label?`<span class="tag ${H(pri)}">${H(label)}</span>`:''}${n.due?`<span>📅 ${H(n.due)}</span>`:''}</small></button><button type="button" class="btn" data-action="edit" data-id="${H(n.id)}" title="Bearbeiten" aria-label="${H(n.name)} bearbeiten">✎</button></div>`
 }).join('')}
function taskOverviewHTML(){
 const areas=data.nodes.filter(n=>n.parent===null);
 if(areaFilter!=='all'&&!areas.some(n=>n.id===areaFilter))areaFilter='all';
 let tasks=data.nodes.filter(n=>isTask(n)&&!n.done&&n.parent!=='inbox');
 let html='';
 if(sortMode==='priority'){
  const rank={sofort:0,wichtig:1,spaeter:2,'':3};
  tasks.sort((a,b)=>(rank[normalizePriority(a.priority)]??3)-(rank[normalizePriority(b.priority)]??3));
  html=bh15TaskRows(tasks);
 }else{
  if(areaFilter!=='all')tasks=tasks.filter(n=>rootOf(n)?.id===areaFilter);
  html=areas.filter(area=>areaFilter==='all'||areaFilter===area.id).map(area=>{
    const scoped=tasks.filter(n=>rootOf(n)?.id===area.id);
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
 const done=data.nodes.filter(n=>isTask(n)&&n.done).sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||''));
 const groups=new Map();for(const n of done){const key=n.completedAt?n.completedAt.slice(0,10):'unknown';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n)}
 const content=[...groups].map(([day,items])=>`<section class="bh13-history-day"><h3>${day==='unknown'?'Ohne Datum':new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</h3>${items.map(n=>`<div class="task" data-area="${H(rootName(n))}"><span class="history-check">✓</span><div class="detail"><strong>${H(n.name)}</strong><small>${H(path(n))}</small></div><button type="button" class="mini" data-action="done" data-id="${H(n.id)}" title="Wieder öffnen">↺</button></div>`).join('')}</section>`).join('');
 return `<section class="bh13-history"><h2>Erledigt</h2>${chartHTML()}${content||'<div class="bh13-history-empty">Noch keine erledigten Aufgaben.</div>'}</section>`;
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
restoreRoute();
render();
})();
