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
 return nodes.sort((a,b)=>Number(isTask(a)&&a.done)-Number(isTask(b)&&b.done));
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
