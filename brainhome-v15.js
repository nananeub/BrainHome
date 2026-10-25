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
