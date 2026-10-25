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
 <div id="bh17PriorityContainer" class="bh17-field" hidden><label for="bh17Priority">Priorität der Aufgabe</label><select id="bh17Priority"><option value="">Keine Priorität</option><option value="sofort">Sofort</option><option value="wichtig">Wichtig</option><option value="spaeter">Später</option></select><div class="bh17-help">Ist die Routine fällig, steht sie in „Alle Aufgaben“. Mit „Sofort“ zusätzlich auf der Startseite. Nach dem Abhaken erscheint sie wieder, sobald ihr Intervall abgelaufen ist.</div></div>
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
