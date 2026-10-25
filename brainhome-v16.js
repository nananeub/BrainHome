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

// Optional 'Sofort' switches. New gifts and routines are never marked automatically.
// Existing priority values survive editing, and a flagged routine appears as urgent only when due.
const originalSpecials=specialsHTML;
specialsHTML=function(){
 const host=document.createElement('div');host.innerHTML=originalSpecials();
 const panel=host.querySelector('.private-panel[data-panel="gifts"]');
 if(!panel)return host.innerHTML;
 for(const row of panel.querySelectorAll('.bh11-gift-choice')){
  const editor=row.querySelector('[data-action="edit"]');if(!editor)continue;
  const gift=get(editor.dataset.id);if(!gift||!isGift(gift))continue;
  const selected=normalizePriority(gift.priority)==='sofort';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='mini bh16-urgent-flag';
  toggle.dataset.action='bh16-gift-sofort';toggle.dataset.id=gift.id;toggle.setAttribute('aria-pressed',String(selected));
  toggle.title='Sofort-Kennzeichnung '+(selected?'entfernen':'setzen');toggle.textContent=selected?'● Sofort':'○ Sofort';
  editor.before(toggle);
 }
 return host.innerHTML;
};
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
 if(action==='bh16-gift-sofort'){
  event.preventDefault();event.stopImmediatePropagation();
  const record=get(b.dataset.id);
  if(!record)return;
  record.priority=normalizePriority(record.priority)==='sofort'?'':'sofort';
  save();render();return;
 }
 if(action==='routine-done'){
  event.preventDefault();event.stopImmediatePropagation();
  const r=(data.routines||[]).find(x=>x.id===b.dataset.id);
  if(!r||!routineDue(r))return;
  recordCompletion('routine',r);
  r.lastDone=localDay();
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
