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
