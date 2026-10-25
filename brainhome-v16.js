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
