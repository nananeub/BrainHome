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
