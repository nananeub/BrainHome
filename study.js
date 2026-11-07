/* BrainHome 2.8 – private knowledge library & university spaced repetition.
 * Uses the existing knowledgeNodes hierarchy and a new exported knowledgeDocuments array.
 * Text-only: documents are synchronized through existing cloud payload (850KB cap).
 * Does not access Firebase directly and does not modify existing Cloud code.
 */
(() => {
'use strict';
const K='brainhome-v28-knowledge-path';
const SUBJECTS=['Innere Medizin','Pharmakologie','Mikrobiologie','Anatomie','Biochemie','Physiologie'];
const PALETTE={forest:{name:'Waldgrün',dark:'#345b46',light:'#e7f1e8'},lavender:{name:'Lavendel',dark:'#665b8c',light:'#f0ebf8'},terracotta:{name:'Terrakotta',dark:'#956349',light:'#fbede2'},blue:{name:'Blaugrau',dark:'#426b80',light:'#e7f2f5'},rose:{name:'Altrosa',dark:'#915f73',light:'#f9eaf0'},gold:{name:'Gold',dark:'#8f753a',light:'#f9f0d9'},sage:{name:'Salbei',dark:'#4e7965',light:'#e7f3ea'}};
const DEFAULT_COLORS={Uni:'lavender',Weisheiten:'gold',Leipzig:'terracotta',Studienstiftung:'blue'};
const DATE=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const newId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():'study-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const safe=x=>esc(x??'');
const node=id=>(data.knowledgeNodes||[]).find(n=>n.id===id);
const nodes=()=>data.knowledgeNodes||[];
const docs=()=>data.knowledgeDocuments||[];
// Original PDF files stay in IndexedDB, separate from the existing 850 KB
// Firestore document. Only lightweight document metadata is cloud-synced.
const PDF_DB='brainhome-original-pdfs-v1';
function pdfDatabase(){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window))return reject(new Error('Dieser Browser unterstützt keine lokale Dateispeicherung.'));
 const request=indexedDB.open(PDF_DB,1);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('pdfs'))db.createObjectStore('pdfs',{keyPath:'id'})};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error||new Error('PDF-Speicher nicht verfügbar.'));
 request.onblocked=()=>reject(new Error('Der PDF-Speicher ist noch in einem anderen Tab geöffnet.'));
})}
async function pdfRecord(id){const db=await pdfDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('pdfs','readonly'),r=tx.objectStore('pdfs').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error)}})}
async function putPdf(id,file){const db=await pdfDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('pdfs','readwrite');tx.objectStore('pdfs').put({id,blob:file,name:file.name,size:file.size,savedAt:new Date().toISOString()});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error||new Error('Speicherplatz oder Zugriffsrecht nicht verfügbar.'))};tx.onabort=()=>{db.close();reject(tx.error||new Error('PDF konnte nicht gespeichert werden.'))}})}
async function dropPdf(id){try{const db=await pdfDatabase();return await new Promise((resolve,reject)=>{const tx=db.transaction('pdfs','readwrite');tx.objectStore('pdfs').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch(e){console.warn('PDF entfernen',e)}}
const isPdf=d=>d?.fileType==='pdf'||/\.pdf$/i.test(d?.sourceName||'');
let pdfObjectURL=null;
function releasePdfUrl(){if(pdfObjectURL){URL.revokeObjectURL(pdfObjectURL);pdfObjectURL=null}}
async function attachPdfViewer(id){const frame=document.getElementById('kb32PdfFrame');if(!frame)return;const status=document.getElementById('kb32PdfStatus');try{
 const record=await pdfRecord(id);if(route.docId!==id||!frame.isConnected)return;
 if(!record){status.textContent='Die Original-PDF liegt auf diesem Gerät noch nicht vor. Du kannst sie hier erneut zuordnen; der gespeicherte Dokumenttext bleibt erhalten.';frame.hidden=true;return}
 releasePdfUrl();pdfObjectURL=URL.createObjectURL(record.blob);
 frame.src=pdfObjectURL;frame.hidden=false;const open=document.getElementById('kb32PdfOpen');if(open){open.href=pdfObjectURL;open.hidden=false}
 status.textContent='Original-PDF · '+Math.max(1,Math.ceil(record.size/1024))+' KB · lokal gespeichert';
 }catch(e){if(status)status.textContent='PDF-Speicher nicht erreichbar: '+e.message}
}
async function downloadOriginalPdf(){const d=resolveDoc(route.docId);if(!d)return;const record=await pdfRecord(d.id);if(!record){alert('Original-PDF auf diesem Gerät nicht vorhanden. Bitte über „Original zuordnen“ erneut auswählen.');return}
 const url=URL.createObjectURL(record.blob),a=document.createElement('a');a.href=url;a.download=record.name||d.title+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)};
let notesTimer=null,notesPending=false;
function flushCollectionNotes(){if(notesPending){clearTimeout(notesTimer);notesPending=false;save();const hint=document.getElementById('kb32NoteStatus');if(hint)hint.textContent='Gespeichert ✓'}}

const subs=id=>nodes().filter(n=>n.parent===id).sort((a,b)=>(a.order??0)-(b.order??0));
const ancestor=n=>{const visited=new Set();while(n&&!visited.has(n.id)){visited.add(n.id);if(n.parent===null)return n;n=node(n.parent)}return null};
const uni=()=>nodes().find(n=>n.parent===null&&(n.isUniRoot===true||n.name==='Uni'));
const inUni=n=>ancestor(n)?.id===uni()?.id;
const rootFor=id=>ancestor(node(id));
const themeOf=n=>{const root=ancestor(n)||n;return PALETTE[n?.color]||PALETTE[root?.color]||PALETTE[DEFAULT_COLORS[root?.name]]||PALETTE.sage};
const styleOf=n=>{const theme=themeOf(n);return `--kb-dark:${theme.dark};--kb-light:${theme.light}`};
const countDocs=id=>docs().filter(d=>{let n=node(d.folderId);while(n){if(n.id===id)return true;n=node(n.parent)}return false}).length+nodes().filter(n=>n.body?.trim()&&n.id!==id&&(()=>{let p=n;while(p){if(p.id===id)return true;p=node(p.parent)}return false})()).length;
let route={rootId:null,folderId:null,docId:null,mode:'library',filter:''};
try{route={...route,...JSON.parse(localStorage.getItem(K)||'{}')}}catch{}
let studyCard=null,answerOpen=false,studyFilter=null,reviewMessage='';
const saveRoute=()=>{try{localStorage.setItem(K,JSON.stringify(route))}catch{}};
const libraryRoute=()=>({rootId:null,folderId:null,docId:null,mode:'library',filter:''});
const currentHistory=()=>({bhLibraryRoute:{...route}});
let libraryHistoryReady=false;
function initLibraryHistory(){
 if(libraryHistoryReady)return;
 libraryHistoryReady=true;
 // Build the complete breadcrumb history when the PWA is opened directly into
 // an existing Uni folder/document after a browser reload. Every Android Back
 // moves exactly one level and never exits the app from the first library step.
 if(history.state?.bhLibraryRoute)return;
 try{
  history.replaceState({...history.state,bhLibraryLanding:true},'');
  const path=[libraryRoute()];
  if(route.rootId){
   const roots=[];let f=node(route.folderId),seen=new Set();
   while(f&&!seen.has(f.id)){seen.add(f.id);roots.unshift(f);f=f.parent?node(f.parent):null}
   for(const n of roots)path.push({rootId:route.rootId,folderId:n.id,docId:null,mode:'folder',filter:''});
   if(route.mode==='reader'&&route.docId)path.push({...route});
   if(route.mode==='study')path.push({...route});
  }
  for(const item of path)history.pushState({bhLibraryRoute:item},'');
 }catch{}
}
function changeRoute(changes,{push=true}={}){
 flushCollectionNotes();
 const next={...route,...changes};
 const changed=JSON.stringify({...next,filter:''})!==JSON.stringify({...route,filter:''});
 if(data.tab==='knowledge'&&changed){
  initLibraryHistory();
  if(push)try{history.pushState({bhLibraryRoute:{...next}},'')}catch{}
 }
 route=next;saveRoute();render();window.scrollTo?.({top:0,behavior:'instant'});
}
function oneLevelUp(){
 if(route.mode==='reader'){changeRoute({mode:'folder',docId:null});return}
 if(route.mode==='study'){changeRoute({mode:'folder',rootId:uni()?.id||null,folderId:uni()?.id||null,docId:null});return}
 if(route.mode==='folder'){
  const current=node(route.folderId);
  if(current?.parent){changeRoute({folderId:current.parent,docId:null,mode:'folder'});return}
  changeRoute(libraryRoute());return;
 }
 if(route.mode==='library')setTab('home');
}

function ensureRoots(){if(!Array.isArray(data.knowledgeNodes))data.knowledgeNodes=[];if(!Array.isArray(data.knowledgeDocuments))data.knowledgeDocuments=[];
 if(nodes().length===0){for(const name of ['Uni','Weisheiten','Leipzig','Studienstiftung'])data.knowledgeNodes.push({id:newId(),parent:null,name,body:'',order:nodes().length,createdAt:new Date().toISOString(),color:DEFAULT_COLORS[name],emoji:iconFor(name),...(name==='Uni'?{isUniRoot:true}:{})});save()}}
function ensureSubjects(){const u=uni();if(!u)return;let changed=false;for(const name of SUBJECTS){if(!subs(u.id).some(x=>x.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de'))){nodes().push({id:newId(),parent:u.id,name,order:subs(u.id).length,createdAt:new Date().toISOString()});changed=true}}if(changed)save()}
function validRoute(){if(route.rootId&&!node(route.rootId))route={rootId:null,folderId:null,docId:null,mode:'library',filter:''};if(route.rootId){const root=node(route.rootId);if(root?.parent!==null)route.rootId=null;if(!route.folderId||!node(route.folderId)||ancestor(node(route.folderId))?.id!==route.rootId)route.folderId=route.rootId}
 if(route.docId&&!resolveDoc(route.docId))route.docId=null;if(!route.rootId)route.mode='library';if(!['library','folder','reader','study'].includes(route.mode))route.mode='folder';if(route.mode==='reader'&&!route.docId)route.mode='folder';}
function resolveDoc(id){if(String(id).startsWith('legacy:')){const n=node(String(id).slice(7));return n?.body?.trim()?{id:'legacy:'+n.id,title:n.name,text:n.body,folderId:n.parent||n.id,legacy:true,sourceName:'Bisheriger Wissenseintrag',review:n.studyReview||{}}:null}return docs().find(d=>d.id===id)}
function docsHere(folderId){const explicit=docs().filter(d=>d.folderId===folderId);const legacy=subs(folderId).filter(n=>n.body?.trim()).map(n=>resolveDoc('legacy:'+n.id));const self=node(folderId);if(self?.body?.trim())legacy.unshift({id:'legacy:'+self.id,title:'Notizen · '+self.name,text:self.body,folderId:self.id,legacy:true,review:self.studyReview||{}});
 return [...explicit,...legacy.filter(Boolean)].sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''))}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function cardsFor(doc){if(!doc||!doc.text?.trim())return[];const lines=doc.text.replace(/\r\n/g,'\n').split('\n');const out=[];let heading=null,body=[];
 const flush=()=>{const text=body.join('\n').trim();if(text.length>=10&&heading){const title=heading.trim();out.push({id:hash(title.toLocaleLowerCase('de')+'|'+out.length),title,text,docId:doc.id,docTitle:doc.title,folderId:doc.folderId})}body=[]};
 for(const line of lines){const match=line.match(/^#{1,5}\s+(.+?)\s*#*\s*$/);if(match){flush();heading=match[1].trim()}else body.push(line)}flush();
 if(!out.length)out.push({id:'complete',title:doc.title,text:doc.text,docId:doc.id,docTitle:doc.title,folderId:doc.folderId});return out.slice(0,120)}
function allUniDocs(){const u=uni();if(!u)return[];const explicit=docs().filter(d=>inUni(node(d.folderId)));const legacy=nodes().filter(n=>inUni(n)&&n.body?.trim()).map(n=>resolveDoc('legacy:'+n.id));return [...explicit,...legacy.filter(Boolean)]}
const states=doc=>doc.legacy?node(doc.id.slice(7))?.studyReview||{}:doc.review||{};
function cardList(){const all=[];for(const doc of allUniDocs())for(const card of cardsFor(doc))all.push({...card,review:states(doc)[card.id]||null});return all}
function sessionQueue(){const all=cardList(),now=Date.now(),today=DATE();let newToday=0;for(const c of all)if(c.review?.firstReviewedAt?.slice(0,10)===today)newToday++;
 const due=all.filter(c=>c.review&&(!c.review.dueAt||new Date(c.review.dueAt).getTime()<=now)).sort((a,b)=>(a.review?.dueAt||'').localeCompare(b.review?.dueAt||''));
 const unseen=all.filter(c=>!c.review).slice(0,Math.max(0,5-newToday));return{all,queue:[...due,...unseen],due:due.length,newCount:all.filter(c=>!c.review).length,newToday}}
function cardForStudy(){const list=sessionQueue().queue;return list.find(c=>studyCard&&c.docId===studyCard.docId&&c.id===studyCard.id)||list[0]||null}
function rateCard(card,grade){const doc=resolveDoc(card.docId);if(!doc||!inUni(node(doc.folderId)))return;const now=new Date(),previous=states(doc)[card.id]||{};
 const reps=Number(previous.reps||0),oldInterval=Number(previous.interval||0),oldEase=Number(previous.ease||2.5);let interval=0,ease=oldEase,due;
 if(grade==='again'){due=new Date(now.getTime()+10*60000);interval=0;ease=Math.max(1.3,ease-.2)}
 else{if(grade==='hard'){interval=reps?Math.max(1,Math.round(oldInterval*1.2)):1;ease=Math.max(1.3,ease-.15)}
 else if(grade==='good'){interval=reps===0?1:reps===1?3:Math.max(1,Math.round(oldInterval*ease))}
 else{interval=reps===0?4:reps===1?8:Math.max(1,Math.round(oldInterval*ease*1.3));ease=Math.min(3.0,ease+.15)}
 due=new Date(now.getTime()+interval*86400000)}
 const entry={...previous,reps:grade==='again'?0:reps+1,interval,ease,dueAt:due.toISOString(),lastReviewedAt:now.toISOString(),firstReviewedAt:previous.firstReviewedAt||now.toISOString(),lastGrade:grade,lapses:Number(previous.lapses||0)+(grade==='again'?1:0)};
 if(doc.legacy){const n=node(doc.id.slice(7));n.studyReview={...(n.studyReview||{}),[card.id]:entry}}
 else{const record=docs().find(d=>d.id===doc.id);record.review={...(record.review||{}),[card.id]:entry}}
 studyCard=null;answerOpen=false;reviewMessage='';save();render()}
function emojiFor(n){return (n?.emoji&&String(n.emoji).trim())||iconFor(n?.name||'')}
function iconFor(name){if(name==='Uni')return '🎓';if(name==='Leipzig')return '🏛️';if(name==='Weisheiten')return '✨';if(name==='Studienstiftung')return '🤝';if(/medizin/i.test(name))return '🩺';if(/pharma/i.test(name))return '💊';if(/mikro/i.test(name))return '🦠';if(/anatomie/i.test(name))return '🫀';if(/biochem/i.test(name))return '🧬';if(/physio/i.test(name))return '🫁';return '📚'}
function crumbs(){const arr=[];let n=node(route.folderId);while(n){arr.unshift(n);n=node(n.parent)}return arr}
function actionBar(){return ''}
function rootScreen(){const roots=subs(null);return `<section class="kb28 kb31-library"><div class="kb31-pagehead"><h2>Wissensbaum</h2><button type="button" class="kb31-plus" data-kb-action="newroot" title="Wissensbereich hinzufügen" aria-label="Wissensbereich hinzufügen">＋</button></div><div class="kb28-rootgrid">${roots.map(n=>`<article class="kb28-root" style="${styleOf(n)}" data-kb-category="${safe(n.id)}"><button class="kb28-root-main" data-kb-action="openroot" data-id="${safe(n.id)}"><span class="kb28-root-icon">${safe(emojiFor(n))}</span><strong>${safe(n.name)}</strong></button><button class="kb28-overflow" data-kb-action="editfolder" data-id="${safe(n.id)}" title="Bereich bearbeiten oder löschen" aria-label="${safe(n.name)} bearbeiten">⋯</button></article>`).join('')}</div></section>`}
function folderCard(n){return `<article class="kb28-folder" style="${styleOf(n)}" data-kb-category="${safe(n.id)}"><button class="kb28-folder-main" data-kb-action="openfolder" data-id="${safe(n.id)}"><span class="kb28-folder-glyph">${safe(emojiFor(n))}</span><span class="kb28-folder-text"><strong>${safe(n.name)}</strong></span><span class="kb28-chevron">›</span></button><button class="kb28-overflow" data-kb-action="editfolder" data-id="${safe(n.id)}" title="Bearbeiten oder löschen" aria-label="${safe(n.name)} bearbeiten">⋯</button></article>`}
function docCard(d){const sections=cardsFor(d).length,updated=d.updatedAt||d.createdAt||'';return `<button class="kb28-doc" data-kb-action="opendoc" data-id="${safe(d.id)}"><span class="kb28-paper">${isPdf(d)?'📄':'▤'}</span><span class="kb28-doc-label"><strong>${safe(d.title)}</strong><small>${d.legacy?'Bisherige Notiz':d.sourceName?safe(d.sourceName):'BrainHome-Dokument'}${isPdf(d)?' · PDF':''}${inUni(node(d.folderId))?' · '+sections+' Lernabschnitt'+(sections===1?'':'e'):''}${updated?' · '+safe(updated.slice(0,10)):''}</small></span><span class="kb28-chevron">›</span></button>`}
function folderScreen(){const f=node(route.folderId),root=rootFor(f?.id);if(!f||!root)return rootScreen();if(f.id===uni()?.id)ensureSubjects();const direct=subs(f.id),atUni=inUni(f),documentList=atUni?docsHere(f.id):docs().filter(d=>d.folderId===f.id).sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')),q=atUni?sessionQueue():null;
 return `<section class="kb28 kb31-folder-page" style="${styleOf(root)}"><header class="kb31-folder-head"><button type="button" class="kb31-back" data-kb-action="backone" aria-label="Eine Ebene zurück">←</button><span class="kb31-title-emoji">${safe(emojiFor(f))}</span><h2>${safe(f.name)}</h2><button type="button" class="kb31-head-edit" data-kb-action="editfolder" data-id="${safe(f.id)}" title="Name, Emoji, Farbe oder Löschen">⋯</button></header>
 ${f.id===uni()?.id?`<div class="kb28-study-banner"><span class="kb28-study-icon">◉</span><div><strong>Heute wiederholen</strong><p>${q.due} fällige · ${q.newCount} neue</p></div><button class="kb28-study-btn" data-kb-action="study">Lernen ${q.queue.length?'('+q.queue.length+')':''}</button></div>`:''}
 ${!atUni?`<section class="kb32-collection"><div class="kb32-collection-head"><h3>Mein Sammeldokument</h3><span id="kb32NoteStatus">Wird automatisch gespeichert</span></div><textarea id="kb32CollectionEditor" aria-label="Sammeldokument für ${safe(f.name)}" placeholder="Schreibe hier alles zu ${safe(f.name)} hinein …\n\nGedanken, Fakten, Zitate, eigene Zusammenfassungen …">${safe(f.body||'')}</textarea></section>`:''}
 <div class="kb31-section-head"><h3>${f.id===uni()?.id?'Fächer':'Untergruppen'}</h3><button type="button" class="kb31-plus" data-kb-action="newfolder" title="Untergruppe hinzufügen" aria-label="Untergruppe hinzufügen">＋</button></div><div class="kb28-foldergrid">${direct.map(folderCard).join('')}</div>
 <div class="kb31-section-head kb31-doc-head"><h3>Weitere Dokumente</h3><div class="kb28-addbar"><button data-kb-action="upload">⇧ Importieren</button><button data-kb-action="newdoc">＋ Dokument</button></div></div>
 ${documentList.length?`<input type="search" id="kb28Search" placeholder="Dokumente durchsuchen …" aria-label="Dokumente durchsuchen" value="${safe(route.filter||'')}"><div class="kb28-docgrid" id="kb28DocumentList">${documentList.filter(d=>d.title.toLocaleLowerCase('de').includes((route.filter||'').toLocaleLowerCase('de'))).map(docCard).join('')}</div>`:atUni?'<div class="kb28-empty kb28-empty-doc">Noch keine Dokumente.</div>':''}
 </section>`}
function inlineMarkdown(text){let s=safe(text);s=s.replace(/`([^`]+)`/g,'<code>$1</code>');s=s.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');s=s.replace(/\*([^*\n]+)\*/g,'<em>$1</em>');s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');return s}
function markdown(text){const lines=String(text||'').replace(/\r\n/g,'\n').split('\n');let html='',inCode=false,code=[],para=[],list=null,headings=[];
 const flushPara=()=>{if(para.length){html+='<p>'+para.map(inlineMarkdown).join(' ')+'</p>';para=[]}};
 const flushList=()=>{if(list){html+=`</${list}>`;list=null}};
 for(let i=0;i<lines.length;i++){const raw=lines[i],str=raw.trim();if(str.startsWith('```')){flushPara();flushList();if(inCode){html+='<pre><code>'+safe(code.join('\n'))+'</code></pre>';code=[]}inCode=!inCode;continue}if(inCode){code.push(raw);continue}
 if(!str){flushPara();flushList();continue}const heading=str.match(/^(#{1,5})\s+(.+?)\s*#*$/);if(heading){flushPara();flushList();const level=Math.min(5,heading[1].length+1),id='kb28-heading-'+headings.length;headings.push({id,text:heading[2]});html+=`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`;continue}
 if(/^---+\s*$/.test(str)){flushPara();flushList();html+='<hr>';continue}
 if(/^>\s?/.test(str)){flushPara();flushList();html+='<blockquote>'+inlineMarkdown(str.replace(/^>\s?/,''))+'</blockquote>';continue}
 const item=str.match(/^([-*+]\s+|\d+[.)]\s+)(.*)$/);if(item){flushPara();const type=/^\d/.test(item[1])?'ol':'ul';if(list!==type){flushList();list=type;html+=`<${list}>`}html+='<li>'+inlineMarkdown(item[2])+'</li>';continue}
 flushList();para.push(str)}flushPara();flushList();if(inCode)html+='<pre><code>'+safe(code.join('\n'))+'</code></pre>';return {html,headings}}
function readerScreen(){const doc=resolveDoc(route.docId);if(!doc)return folderScreen();const root=rootFor(doc.folderId);const parsed=markdown(doc.text),atUni=inUni(node(doc.folderId));return `<section class="kb28" style="${styleOf(root)}">${actionBar()}<div class="kb28-reader-head"><button class="kb28-back" data-kb-action="backfolder">← Alle Dokumente</button><div class="kb28-reader-actions"><button class="btn" data-kb-action="download">↓ Markdown</button><button class="btn" data-kb-action="editdoc">✎ Bearbeiten</button>${atUni?'<button class="btn primary" data-kb-action="study">◉ Wiederholen</button>':''}</div></div><header class="kb28-document-title"><div class="kb28-kicker">${safe(root?.name||'WISSEN')} / ${safe(node(doc.folderId)?.name||'')}</div><h2>${safe(doc.title)}</h2>${doc.sourceName?`<small>Importiert aus ${safe(doc.sourceName)}</small>`:''}</header>${isPdf(doc)?`<div class="kb32-pdf-box"><div class="kb32-pdf-toolbar"><strong>📄 Original-PDF</strong><a class="btn" id="kb32PdfOpen" href="#" target="_blank" rel="noopener" hidden>↗ PDF öffnen</a><button type="button" class="btn" data-kb-action="pdfdownload">↓ PDF speichern</button><button type="button" class="btn" data-kb-action="pdfreattach">Original zuordnen</button><button type="button" class="btn" data-kb-action="pdfextract">Text für Anki auslesen</button></div><p class="kb32-pdf-status" id="kb32PdfStatus">PDF wird auf diesem Gerät gesucht …</p><iframe id="kb32PdfFrame" title="PDF: ${safe(doc.title)}" hidden></iframe><small>Die Original-PDF ist auf diesem Gerät gespeichert, nicht im bisherigen Cloud-Backup. Bitte die Originaldatei zusätzlich aufbewahren.</small></div>`:''}<div class="kb28-reader-grid">${parsed.headings.length>1?`<aside class="kb28-toc"><strong>INHALT</strong>${parsed.headings.map(h=>`<button data-kb-action="jump" data-id="${h.id}">${safe(h.text)}</button>`).join('')}</aside>`:''}${doc.text?.trim()?`<article class="kb28-paperbody">${parsed.html}</article>`:isPdf(doc)?'':'<article class="kb28-paperbody kb28-empty">Noch kein Text.</article>'}</div></section>`}
function studyScreen(){const u=uni();if(!u)return rootScreen();const q=sessionQueue();const card=cardForStudy();studyCard=card?{id:card.id,docId:card.docId}:null;
 return `<section class="kb28 kb28-study-page" style="${styleOf(u)}"><div class="kb28-study-top"><button data-kb-action="studyexit" class="kb28-back">← Uni</button><span>${q.due} fällige · ${q.newCount} neue</span></div><div class="kb28-study-header"><div class="kb28-kicker">AKTIVES ERINNERN · UNI</div><h2>Wiederholen</h2><p>Erst selbst erinnern, dann die Lösung aufdecken.</p></div>${card?`<div class="kb28-flash"><div class="kb28-flash-kicker">${safe(card.docTitle)}</div><div class="kb28-flash-question">${safe(card.title)}</div><div class="kb28-question-note">Was weißt du noch zu diesem Abschnitt?</div>${answerOpen?`<div class="kb28-flash-answer"><span>DEINE ZUSAMMENFASSUNG</span><div class="kb28-paperbody">${markdown(card.text).html}</div></div><div class="kb28-ratings"><button data-kb-action="rate" data-grade="again"><strong>Nochmal</strong><small>10 Minuten</small></button><button data-kb-action="rate" data-grade="hard"><strong>Schwer</strong><small>1+ Tag</small></button><button data-kb-action="rate" data-grade="good"><strong>Gut</strong><small>Wachsend</small></button><button data-kb-action="rate" data-grade="easy"><strong>Einfach</strong><small>Länger</small></button></div>`:`<button class="kb28-reveal" data-kb-action="reveal">Antwort anzeigen</button>`}</div>`:`<div class="kb28-study-done"><div>✓</div><h3>Für heute alles geschafft!</h3><p>Deine nächste Wiederholung erscheint automatisch, sobald ein Abschnitt wieder fällig ist.</p><button class="btn primary" data-kb-action="studyexit">Zurück zu Uni</button></div>`}<p class="kb28-foot">Die Zeitabstände orientieren sich an einem vereinfachten Spaced-Repetition-Verfahren. Sie sind keine exakte Anki/FSRS-Implementierung.</p></section>`}
function renderLibrary(){releasePdfUrl();ensureRoots();validRoute();if(route.rootId===uni()?.id&&route.mode!=='library')ensureSubjects();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='knowledge'));const app=document.getElementById('app');app.innerHTML=route.mode==='library'?rootScreen():route.mode==='reader'?readerScreen():route.mode==='study'?studyScreen():folderScreen();if(route.mode==='reader'&&isPdf(resolveDoc(route.docId)))void attachPdfViewer(route.docId)}
// Editors, shared by all knowledge sections.
const EMOJIS=['🎓','🩺','💊','🦠','🫀','🧬','🫁','📚','📝','💡','✨','🌿','🌸','🎨','🪴','🌍','🏛️','🤝','🧠','💬','🎼','📸','🔬','🧪','🧫','💻','💰','🏃','🎯','💗','🌙','🌞'];
const folderDialog=document.createElement('dialog');folderDialog.id='kb28FolderDialog';folderDialog.innerHTML=`<form class="modal kb31-category-editor"><h2 id="kb28FolderHeading">Bereich</h2><div class="field"><label for="kb28FolderName">Name</label><input id="kb28FolderName" required maxlength="180"></div><div class="field"><label for="kb31FolderEmoji">Emoji</label><div class="kb31-emoji-entry"><span id="kb31EmojiPreview">📚</span><input id="kb31FolderEmoji" maxlength="16" placeholder="Emoji eingeben oder unten auswählen" aria-label="Emoji"></div><div class="kb31-emoji-grid" role="group" aria-label="Emoji auswählen">${EMOJIS.map(e=>`<button type="button" class="kb31-emoji-option" data-kb-emoji="${e}" aria-label="${e}">${e}</button>`).join('')}</div></div><div class="field"><label for="kb28FolderColor">Farbe</label><select id="kb28FolderColor">${Object.entries(PALETTE).map(([id,x])=>`<option value="${id}">${x.name}</option>`).join('')}</select></div><footer><button type="button" class="btn" id="kb28FolderDelete">Löschen</button><button type="button" class="btn" id="kb28FolderCancel">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;document.body.append(folderDialog);
folderDialog.querySelectorAll('[data-kb-emoji]').forEach(b=>b.addEventListener('click',()=>{folderDialog.querySelector('#kb31FolderEmoji').value=b.dataset.kbEmoji;folderDialog.querySelector('#kb31EmojiPreview').textContent=b.dataset.kbEmoji}));
folderDialog.querySelector('#kb31FolderEmoji').addEventListener('input',e=>{folderDialog.querySelector('#kb31EmojiPreview').textContent=e.target.value||'📚'});
const docDialog=document.createElement('dialog');docDialog.id='kb28DocDialog';docDialog.innerHTML=`<form class="modal"><h2 id="kb28DocHeading">Dokument</h2><div class="field"><label for="kb28DocTitle">Titel</label><input id="kb28DocTitle" required maxlength="240"></div><div class="field"><label for="kb28DocBody">Notizen oder Zusammenfassung (Markdown möglich)</label><textarea id="kb28DocBody" rows="17" placeholder="# Thema\n\n## Überschrift\nErklärung …"></textarea></div><p class="hint">Jede Überschrift mit # wird zu einem eigenen Lernabschnitt. Nur Uni-Dokumente erscheinen in den Wiederholungen.</p><footer><button type="button" class="btn" id="kb28DocDelete">Löschen</button><button type="button" class="btn" id="kb28DocCancel">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer></form>`;document.body.append(docDialog);
const upload=document.createElement('input');upload.type='file';upload.accept='.md,.markdown,.txt,.docx,.pdf,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document';upload.hidden=true;document.body.append(upload);
let folderEditing=null,folderParent=null,docEditing=null;
function editFolder(id=null,parent=null){const n=id?node(id):null;folderEditing=id;folderParent=parent;folderDialog.querySelector('#kb28FolderHeading').textContent=n?'Kategorie bearbeiten':parent?'Untergruppe erstellen':'Wissensbereich erstellen';folderDialog.querySelector('#kb28FolderName').value=n?.name||'';const emoji=n?emojiFor(n):'📚';folderDialog.querySelector('#kb31FolderEmoji').value=emoji;folderDialog.querySelector('#kb31EmojiPreview').textContent=emoji;folderDialog.querySelector('#kb28FolderColor').value=n?.color||DEFAULT_COLORS[n?.name]||(parent&&themeOf(node(parent))&&Object.keys(PALETTE).find(k=>PALETTE[k]===themeOf(node(parent))))||'sage';folderDialog.querySelector('#kb28FolderDelete').hidden=!n;folderDialog.showModal()}
folderDialog.querySelector('#kb28FolderCancel').onclick=()=>folderDialog.close();
folderDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const name=folderDialog.querySelector('#kb28FolderName').value.trim();if(!name)return;
 const emoji=folderDialog.querySelector('#kb31FolderEmoji').value.trim().slice(0,16);const color=folderDialog.querySelector('#kb28FolderColor').value;
 if(folderEditing){const n=node(folderEditing);if(!n)return;if(n.parent===null&&n.name==='Uni')n.isUniRoot=true;n.name=name;n.emoji=emoji||iconFor(name);n.color=color;n.updatedAt=new Date().toISOString()}
 else{const parent=folderParent||null;nodes().push({id:newId(),parent,name,emoji:emoji||iconFor(name),body:'',order:subs(parent).length,createdAt:new Date().toISOString(),color})}
 save();folderDialog.close();render()};
// Category deletion preserves documents and child categories by promoting them.
folderDialog.querySelector('#kb28FolderDelete').onclick=()=>{const n=node(folderEditing);if(!n)return;
 const children=subs(n.id),directDocs=docs().filter(d=>d.folderId===n.id),hasBody=!!n.body?.trim();
 const hasContents=children.length||directDocs.length||hasBody;
 const question=hasContents?`„${n.name}“ entfernen? ${children.length} Untergruppen und ${directDocs.length+(hasBody?1:0)} Dokumente/Notizen bleiben erhalten und werden in die übergeordnete Ebene verschoben.`:`Leeren Bereich „${n.name}“ wirklich löschen?`;
 if(!confirm(question))return;
 const parent=n.parent;
 // Root folders have no document-bearing parent: retain their direct files in an archive root.
 let documentDestination=parent;
 if(parent===null&&(directDocs.length||hasBody)){
  let archive=nodes().find(x=>x.parent===null&&x.id!==n.id&&x.name==='Ablage');
  if(!archive){archive={id:newId(),parent:null,name:'Ablage',emoji:'🗂️',color:'sage',body:'',createdAt:new Date().toISOString(),order:subs(null).length};nodes().push(archive)}
  documentDestination=archive.id;
 }
 const baseOrder=subs(parent).length;children.forEach((child,index)=>{child.parent=parent;child.order=baseOrder+index;});
 for(const d of directDocs)d.folderId=documentDestination;
 if(hasBody){data.knowledgeDocuments=docs().concat({id:newId(),folderId:documentDestination,title:'Notizen · '+n.name,text:n.body,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),review:n.studyReview||{},sourceName:'Übernommene Bereichsnotiz'});}
 data.knowledgeNodes=nodes().filter(x=>x.id!==n.id);
 folderDialog.close();
 if(route.rootId===n.id){route=libraryRoute()}
 else if(route.folderId===n.id){route={...route,folderId:parent,docId:null,mode:parent?'folder':'library'}}
 saveRoute();save();render();
};
function currentDocTextSize(){try{return new TextEncoder().encode(JSON.stringify(window.BH10?.exportData?.()||data)).byteLength}catch{return 0}}
function canStoreDoc(candidate,old){const raw=new TextEncoder().encode(candidate.text||'').byteLength;if(raw>160000){alert('Diese Zusammenfassung ist zu groß (über 160 KB Text). Bitte teile sie in mehrere Dokumente.');return false}
 // The working Cloud module accepts at most 850KB for the entire payload.
 const size=currentDocTextSize()+raw-(old?new TextEncoder().encode(old.text||'').byteLength:0);if(size>760000){alert('BrainHome nähert sich der aktuellen Cloud-Grenze. Dieses Dokument wurde NICHT übernommen. Bitte sichere deinen Stand und teile die Wissensbibliothek später in eine separate Cloud-Speicherung auf.');return false}return true}
function editDoc(id=null){const d=id?resolveDoc(id):null;docEditing=id;docDialog.querySelector('#kb28DocHeading').textContent=d?'Dokument bearbeiten':'Neues Dokument';docDialog.querySelector('#kb28DocTitle').value=d?.legacy&&d.title.startsWith('Notizen · ')?node(id.slice(7))?.name:d?.title||'';docDialog.querySelector('#kb28DocBody').value=d?.text||'';docDialog.querySelector('#kb28DocDelete').hidden=!d;docDialog.showModal()}
docDialog.querySelector('#kb28DocCancel').onclick=()=>docDialog.close();
docDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const title=docDialog.querySelector('#kb28DocTitle').value.trim(),text=docDialog.querySelector('#kb28DocBody').value;const old=docEditing?resolveDoc(docEditing):null;if(!title||!canStoreDoc({text},old))return;let id=docEditing;
 if(old?.legacy){const n=node(id.slice(7));if(n){n.name=title.replace(/^Notizen · /,'');n.body=text;n.updatedAt=new Date().toISOString()}}
 else if(old){const d=docs().find(d=>d.id===id);if(d){d.title=title;d.text=text;d.updatedAt=new Date().toISOString()}}
 else{if(!Array.isArray(data.knowledgeDocuments))data.knowledgeDocuments=[];id=newId();data.knowledgeDocuments.push({id,folderId:route.folderId,title,text,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceName:'',review:{}})}
 docDialog.close();save();changeRoute({mode:'reader',docId:id})};
docDialog.querySelector('#kb28DocDelete').onclick=()=>{const d=resolveDoc(docEditing);if(!d||!confirm('Dokument wirklich löschen? Bitte vorher ein Backup exportieren.'))return;
 if(d.legacy){const n=node(docEditing.slice(7));if(n){n.body='';n.studyReview={}}}else data.knowledgeDocuments=docs().filter(x=>x.id!==docEditing);
 if(isPdf(d))void dropPdf(d.id);docDialog.close();save();changeRoute({mode:'folder',docId:null})};
function downloadDoc(){const doc=resolveDoc(route.docId);if(!doc)return;const blob=new Blob([doc.text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=doc.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,100)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
// Minimal .docx ZIP extraction using browser-native deflate-raw; no external library/CDN.
async function docxText(file){const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('Die DOCX-Datei enthält kein lesbares ZIP-Verzeichnis.');const count=view.getUint16(end+10,true),start=view.getUint32(end+16,true);let ptr=start,xmlBytes=null;
 for(let i=0;i<count;i++){if(view.getUint32(ptr,true)!==0x02014b50)break;const method=view.getUint16(ptr+10,true),size=view.getUint32(ptr+20,true),fn=view.getUint16(ptr+28,true),extra=view.getUint16(ptr+30,true),comment=view.getUint16(ptr+32,true),offset=view.getUint32(ptr+42,true),name=new TextDecoder().decode(bytes.slice(ptr+46,ptr+46+fn));
 if(name==='word/document.xml'){const dataStart=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);const contents=bytes.slice(dataStart,dataStart+size);if(method===0)xmlBytes=contents;else if(method===8){try{const stream=new Blob([contents]).stream().pipeThrough(new DecompressionStream('deflate-raw'));xmlBytes=new Uint8Array(await new Response(stream).arrayBuffer())}catch{throw Error('Dieses Gerät kann DOCX derzeit nicht direkt entpacken. Bitte als .md oder .txt exportieren.')}}else throw Error('DOCX-Komprimierung wird nicht unterstützt.');break}ptr+=46+fn+extra+comment}
 if(!xmlBytes)throw Error('Der Text der Word-Datei konnte nicht gelesen werden.');const xml=new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes),'application/xml');if(xml.querySelector('parsererror'))throw Error('Das DOCX-Dokument enthält ungültiges XML.');const ps=[...xml.getElementsByTagNameNS('*','p')];const result=[];
 for(const p of ps){const nodesT=[...p.getElementsByTagNameNS('*','t')];const contents=nodesT.map(t=>t.textContent||'').join('').trim();if(!contents){if(result.at(-1)!=='')result.push('');continue}const style=p.getElementsByTagNameNS('*','pStyle')[0];const styleName=style?.getAttribute('w:val')||style?.getAttribute('val')||'';const level=styleName.match(/(?:Heading|berschrift|Title|Titel)(\d)/i);const depth=level?Math.min(5,Number(level[1])):null;result.push(depth?'#'.repeat(depth)+' '+contents:contents,'')}
 return result.join('\n').replace(/\n{3,}/g,'\n\n').trim()}
// PDF import: extract text (not the original page geometry) with Mozilla PDF.js on demand.
// PDF.js is loaded only for PDFs. No original PDF binary enters Firestore.
async function pdfText(file){
 let pdfjs;
 try{pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.min.mjs')}
 catch{throw Error('Für den PDF-Import wird eine Internetverbindung benötigt, um die PDF-Bibliothek zu laden. Bitte versuche es online erneut.')}
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs';
 const bytes=new Uint8Array(await file.arrayBuffer());let pdf;
 try{pdf=await pdfjs.getDocument({data:bytes,isEvalSupported:false}).promise}
 catch(e){if(/password/i.test(String(e?.name||'')))throw Error('Passwortgeschützte PDFs bitte zuerst entsperren.');throw Error('Die PDF-Datei konnte nicht gelesen werden. '+(e?.message||''))}
 if(pdf.numPages>160)throw Error('PDF mit mehr als 160 Seiten bitte auf mehrere Dateien aufteilen.');
 const out=[];
 for(let p=1;p<=pdf.numPages;p++){
  const page=await pdf.getPage(p),content=await page.getTextContent();
  const lines=[];let current='',lastY=null;
  for(const item of content.items){if(typeof item.str!=='string')continue;
   const y=item.transform?.[5];
   if(lastY!==null&&y!==undefined&&Math.abs(y-lastY)>4&&current.trim()){lines.push(current.trim());current=''}
   const segment=item.str.trim();
   if(segment){if(current&&!/[-\s]$/.test(current)&&!/^\s*[,.;:!?)]/.test(segment))current+=' ';current+=segment}
   if(item.hasEOL&&current.trim()){lines.push(current.trim());current=''}
   if(y!==undefined)lastY=y;
  }
  if(current.trim())lines.push(current.trim());
  if(lines.length)out.push('## Seite '+p+'\n\n'+lines.join('\n'));
 }
 try{await pdf.destroy()}catch{}
 const result=out.join('\n\n');
 if(!result.trim())throw Error('Dieses PDF enthält keinen erkennbaren Text (möglicherweise ein Scan). OCR ist noch nicht eingebaut.');
 return result;
}
let pdfAttachTarget=null;
async function checkPdfFile(file){if(file.size>25*1024*1024)throw Error('PDF größer als 25 MB. Bitte verkleinern.');if(!file.size)throw Error('Die PDF-Datei ist leer.');const head=new TextDecoder('latin1').decode(await file.slice(0,1024).arrayBuffer());if(!head.includes('%PDF-'))throw Error('Die ausgewählte Datei ist kein lesbares PDF.');}
upload.onchange=async()=>{const file=upload.files?.[0],target=pdfAttachTarget;upload.value='';pdfAttachTarget=null;if(!file)return;
 try{
 const ext=file.name.split('.').at(-1).toLowerCase();
 if(target&&ext!=='pdf')throw Error('Bitte eine PDF-Datei auswählen.');
 if(!['docx','md','markdown','txt','pdf'].includes(ext))throw Error('Bitte PDF, Word-DOCX, Markdown oder TXT verwenden.');
 if(ext==='pdf'){
  await checkPdfFile(file);
  const existing=target?resolveDoc(target):null;
  if(target&&!existing)throw Error('Das Dokument zum Verknüpfen wurde nicht gefunden.');
  const id=existing?.id||newId();
  if(!existing&&currentDocTextSize()+500>820000)throw Error('Cloud-Speichergrenze erreicht. Bitte zuerst ein Backup anlegen.');
  await putPdf(id,file); // The upload succeeds even when PDF.js cannot read its text.
  if(existing&&!existing.legacy){const d=docs().find(x=>x.id===id);d.fileType='pdf';d.pdfStorage='device';d.pdfSize=file.size;d.sourceName=file.name;d.updatedAt=new Date().toISOString()}
  else if(!existing){if(!Array.isArray(data.knowledgeDocuments))data.knowledgeDocuments=[];const title=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');data.knowledgeDocuments.push({id,folderId:route.folderId,title,text:'',sourceName:file.name,fileType:'pdf',pdfStorage:'device',pdfSize:file.size,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),review:{}})}
  save();changeRoute({mode:'reader',docId:id});notice('Original-PDF gespeichert');return;
 }
 if(file.size>3e6)throw Error('Die Datei ist größer als 3 MB. Bitte teile sie in kleinere Dokumente.');
 const text=(ext==='docx'?await docxText(file):await file.text()).replace(/^\ufeff/,'');if(!text.trim())throw Error('Die Datei hat keinen auslesbaren Text.');if(!canStoreDoc({text}))return;
 const title=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '),id=newId();if(!Array.isArray(data.knowledgeDocuments))data.knowledgeDocuments=[];data.knowledgeDocuments.push({id,folderId:route.folderId,title,text,sourceName:file.name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),review:{}});save();changeRoute({mode:'reader',docId:id});notice('Dokument importiert')
 }catch(error){alert('Datei konnte nicht importiert werden: '+error.message)}
};
async function extractPdfForStudy(){const d=resolveDoc(route.docId);if(!d||!isPdf(d))return;const record=await pdfRecord(d.id);if(!record){alert('Bitte zuerst die Original-PDF auf diesem Gerät zuordnen.');return}
 const status=document.getElementById('kb32PdfStatus');if(status)status.textContent='PDF-Text wird ausgelesen …';
 try{const file=new File([record.blob],record.name||'Datei.pdf',{type:'application/pdf'});const text=await pdfText(file);if(!canStoreDoc({text},d))return;const item=docs().find(x=>x.id===d.id);if(!item)throw Error('Das Dokument wurde nicht gefunden.');item.text=text;item.updatedAt=new Date().toISOString();save();render();notice('Text übernommen. Unter Uni sind die Abschnitte jetzt lernbar.')}
 catch(e){if(status)status.textContent='Original-PDF bleibt gespeichert. Text konnte nicht ausgelesen werden: '+e.message;alert('Original-PDF bleibt gespeichert. Texterkennung: '+e.message)}
}

// Delegate only new data-kb-action controls; legacy knowledge code does not match them.
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-kb-action]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const act=b.dataset.kbAction,id=b.dataset.id;
 switch(act){case'backone':oneLevelUp();break;case'home':changeRoute({rootId:null,folderId:null,docId:null,mode:'library',filter:''});break;
 case'openroot':if(id===uni()?.id)ensureSubjects();changeRoute({rootId:id,folderId:id,docId:null,mode:'folder',filter:''});break;
 case'openfolder':{const n=node(id);if(!n)return;changeRoute({rootId:ancestor(n)?.id,folderId:id,docId:null,mode:'folder',filter:''});break}
 case'backfolder':changeRoute({mode:'folder',docId:null});break;
 case'newroot':editFolder(null,null);break;case'newfolder':editFolder(null,route.folderId);break;case'editfolder':editFolder(id);break;
 case'newdoc':editDoc();break;case'editdoc':editDoc(route.docId);break;case'opendoc':{const d=resolveDoc(id);if(!d)return;const f=node(d.folderId);changeRoute({rootId:ancestor(f)?.id,folderId:d.folderId,docId:id,mode:'reader'});break}
 case'upload':pdfAttachTarget=null;upload.click();break;case'pdfreattach':pdfAttachTarget=route.docId;upload.accept='.pdf,application/pdf';upload.click();upload.accept='.md,.markdown,.txt,.docx,.pdf,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document';break;case'pdfdownload':void downloadOriginalPdf().catch(e=>alert('PDF konnte nicht geöffnet werden: '+e.message));break;case'pdfextract':void extractPdfForStudy().catch(e=>alert('Texterkennung fehlgeschlagen: '+e.message));break;case'download':downloadDoc();break;
 case'jump':document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});break;
 case'study':studyCard=null;answerOpen=false;changeRoute({rootId:uni()?.id,folderId:uni()?.id,docId:null,mode:'study'});break;
 case'studyexit':answerOpen=false;studyCard=null;changeRoute({rootId:uni()?.id,folderId:uni()?.id,docId:null,mode:'folder'});break;
 case'reveal':answerOpen=true;render();break;
 case'rate':{if(!answerOpen)return;const c=cardForStudy();if(c&&['again','hard','good','easy'].includes(b.dataset.grade))rateCard(c,b.dataset.grade);break}
 }} ,true);
document.addEventListener('input',e=>{if(e.target?.id==='kb32CollectionEditor'){const f=node(route.folderId);if(f&&!inUni(f)){f.body=e.target.value;f.updatedAt=new Date().toISOString();notesPending=true;clearTimeout(notesTimer);const label=document.getElementById('kb32NoteStatus');if(label)label.textContent='Speichert …';notesTimer=setTimeout(flushCollectionNotes,800)}return}if(e.target?.id==='kb28Search'){route.filter=e.target.value;saveRoute();const f=node(route.folderId);const matches=(inUni(f)?docsHere(f?.id):docs().filter(d=>d.folderId===f?.id)).filter(d=>d.title.toLocaleLowerCase('de').includes(route.filter.toLocaleLowerCase('de')));document.getElementById('kb28DocumentList').innerHTML=matches.map(docCard).join('')||'<p class="kb28-empty">Keine passenden Dokumente.</p>'}},true);
window.addEventListener('pagehide',flushCollectionNotes);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushCollectionNotes()});
// The visible Wissensbaum tab is also a reliable "back to library overview" control.
// Run in capture phase before legacy tab handlers on the button.
document.addEventListener('click',e=>{
 const tab=e.target.closest?.('nav.tabs [data-tab="knowledge"]');
 if(!tab)return;
 if(data.tab==='knowledge'){
  e.preventDefault();e.stopImmediatePropagation();
  changeRoute(libraryRoute());
 }else{
  // Entering from another application tab establishes an in-app Back destination.
  libraryHistoryReady=false;
  route=libraryRoute();saveRoute();
  initLibraryHistory();
 }
},true);
// Android system/browser Back: restore the previous level without reloading or
// navigating out of the PWA. Other app tabs keep their old behavior.
window.addEventListener('popstate',e=>{
 if(e.state?.bhLibraryRoute){
  route={...libraryRoute(),...e.state.bhLibraryRoute};
  data.tab='knowledge';saveRoute();render();return;
 }
 if(e.state?.bhLibraryLanding){
  route=libraryRoute();saveRoute();libraryHistoryReady=false;
  setTab('home');return;
 }
 if(data.tab==='knowledge'){
  // Fallback for older history entries created by prior BrainHome versions.
  oneLevelUp();
 }
});
// Root and nested category cards support reorder by long-press and drag, preserving order.
let holding=null,pressTimer=null,suppressUntil=0;
const clearHold=()=>{clearTimeout(pressTimer);document.querySelectorAll('.kb28-grabbing,.kb28-drop').forEach(x=>x.classList.remove('kb28-grabbing','kb28-drop'));holding=null};
document.addEventListener('pointerdown',e=>{const target=e.target.closest?.('.kb28-root-main,.kb28-folder-main');if(!target||e.button!==0||data.tab!=='knowledge')return;const card=target.closest('[data-kb-category]');holding={id:card.dataset.kbCategory,x:e.clientX,y:e.clientY,active:false,to:null};pressTimer=setTimeout(()=>{if(holding){holding.active=true;card.classList.add('kb28-grabbing');navigator.vibrate?.(20)}},520)},true);
document.addEventListener('pointermove',e=>{if(!holding)return;const d=holding;if(!d.active){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>12)clearHold();return}e.preventDefault();document.querySelectorAll('.kb28-drop').forEach(x=>x.classList.remove('kb28-drop'));const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-kb-category]');if(card&&card.dataset.kbCategory!==d.id&&node(card.dataset.kbCategory)?.parent===node(d.id)?.parent){d.to=card.dataset.kbCategory;card.classList.add('kb28-drop')}},{capture:true,passive:false});
document.addEventListener('pointerup',e=>{if(!holding)return;const d=holding;if(d.active){suppressUntil=Date.now()+650;e.preventDefault();if(d.to){const n=node(d.id),to=node(d.to);if(n&&to&&n.parent===to.parent){const original=subs(n.parent),from=original.findIndex(x=>x.id===n.id),dest=original.findIndex(x=>x.id===to.id),siblings=original.filter(x=>x.id!==n.id),index=siblings.findIndex(x=>x.id===to.id);siblings.splice(from<dest?index+1:index,0,n);siblings.forEach((x,i)=>x.order=i);save();render()}}}clearHold()},true);
document.addEventListener('pointercancel',clearHold,true);
document.addEventListener('click',e=>{if(Date.now()<suppressUntil&&e.target.closest('.kb28-root-main,.kb28-folder-main')){e.preventDefault();e.stopImmediatePropagation()}},true);
// Restore from route only when knowledge is active, leaving all other pages unchanged.
const oldRender=render;
render=function(...args){if(data.tab==='knowledge'){window.BHRoute?.remember?.();renderLibrary();return}return oldRender(...args)};
if(data.tab==='knowledge'){initLibraryHistory();render();}
const css=document.createElement('style');css.textContent=String.raw`
.kb28{max-width:1100px;margin:auto;color:#294334}.kb28 button{cursor:pointer}.kb28-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:4px 0 24px;flex-wrap:wrap}.kb28-top h2{font-size:clamp(26px,4vw,40px);letter-spacing:-1.5px;margin:4px 0}.kb28-top p{color:#708273;margin:0}.kb28-kicker{font-size:10px;font-weight:800;letter-spacing:.15em;color:var(--kb-dark,#55735d);text-transform:uppercase}.kb28-rootgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px}.kb28-root{position:relative;background:var(--kb-light);border:1px solid color-mix(in srgb,var(--kb-dark),white 75%);border-radius:20px;min-height:185px;transition:transform .15s}.kb28-root:hover{transform:translateY(-2px)}.kb28-root-main{background:none;border:0;text-align:left;width:100%;display:flex;flex-direction:column;align-items:start;padding:24px;color:var(--kb-dark)}.kb28-root-icon{font-size:32px;margin-bottom:20px}.kb28-root-main strong{font-size:23px;letter-spacing:-.4px}.kb28-root-main>span:last-child{font-size:12px;color:var(--kb-dark);opacity:.75;margin-top:9px}.kb28-overflow{position:absolute;top:12px;right:12px;background:#ffffffaf;color:#456;min-width:30px;height:30px;border:0;border-radius:9px;font-size:20px}.kb28-foot{font-size:12px;color:#799080;margin:20px 2px;line-height:1.5}.kb28-crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:1px 0 16px}.kb28-crumb button{color:#577360;padding:6px 4px;background:transparent;border:0;font-size:12px}.kb28-crumb span{color:#abc0ae}.kb28-crumb [aria-current]{font-weight:700;color:#355b43}.kb28-hero{background:var(--kb-light);border:1px solid color-mix(in srgb,var(--kb-dark),white 80%);border-radius:18px;padding:22px;display:flex;align-items:center;gap:18px;position:relative}.kb28-heroicon{background:#ffffffb5;border-radius:14px;display:grid;place-items:center;width:58px;height:58px;font-size:31px;flex-shrink:0}.kb28-hero h2{font-size:clamp(23px,4vw,32px);margin:4px 0;color:var(--kb-dark)}.kb28-hero p{margin:2px 0;color:var(--kb-dark);opacity:.8;font-size:13px}.kb28-header-menu{margin-left:auto;align-self:flex-start;color:var(--kb-dark);background:#ffffffb7;border:0;border-radius:9px;padding:8px 12px}.kb28-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:27px 0 12px;flex-wrap:wrap}.kb28-section-head h3{font-size:17px;margin:0;color:#2c4b37}.kb28-count{font-size:12px;font-weight:500;color:#78907f}.kb28-section-head button,.kb28-addbar button{font-size:12px;color:var(--kb-dark,#3b664a);background:#f0f6ef;border:1px solid #e0eadf;padding:8px 10px;border-radius:10px}.kb28-addbar{display:flex;gap:6px;flex-wrap:wrap}.kb28-foldergrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.kb28-folder{position:relative;background:white;border:1px solid #e2eae2;border-radius:15px;min-height:92px}.kb28-folder:hover{border-color:#a5bfa8}.kb28-folder-main{width:100%;height:100%;display:flex;gap:12px;align-items:center;text-align:left;background:none;border:0;color:#294736;padding:17px 35px 17px 16px}.kb28-folder-glyph{font-size:23px;background:#f2f6ef;width:39px;height:42px;display:grid;place-items:center;border-radius:10px}.kb28-folder-text{display:flex;flex-direction:column;gap:4px;min-width:0}.kb28-folder-text strong{font-size:14px;overflow-wrap:anywhere}.kb28-folder-text small{font-size:11px;color:#8a9b8c}.kb28-chevron{margin-left:auto;font-size:25px;color:#a3b2a3}.kb28-folder .kb28-overflow{top:6px;right:6px}.kb28-docgrid{display:grid;gap:8px}.kb28-doc{width:100%;background:#fff;border:1px solid #e1e9de;padding:14px 17px;border-radius:13px;display:flex;gap:12px;align-items:center;text-align:left;color:#314b38}.kb28-doc:hover{border-color:#94b49c;background:#fafdfa}.kb28-paper{font-size:24px;color:var(--kb-dark);background:var(--kb-light);min-width:43px;height:44px;border-radius:11px;display:grid;place-items:center}.kb28-doc-label{flex:1;min-width:0}.kb28-doc-label strong{display:block;font-size:14px;overflow-wrap:anywhere}.kb28-doc-label small{display:block;font-size:11px;color:#819382;margin-top:4px;overflow-wrap:anywhere}.kb28-empty{border:1px dashed #dbe4db;background:#fafcf9;color:#899c8b;padding:18px;border-radius:13px;font-size:13px;grid-column:1/-1}.kb28-empty-doc{padding:30px}#kb28Search{border-radius:11px;border:1px solid #dce7dc;padding:12px 14px;width:100%;margin:0 0 12px;background:white;font-size:14px}.kb28-study-banner{margin:15px 0 0;background:#fff;border:1px solid #e4e0ef;border-radius:14px;display:flex;align-items:center;gap:12px;padding:14px}.kb28-study-icon{background:#f1ecfc;border-radius:12px;color:#67588f;padding:10px;font-size:22px}.kb28-study-banner>div{flex:1}.kb28-study-banner strong{font-size:14px}.kb28-study-banner p{font-size:11px;color:#8b839d;margin:4px 0}.kb28-study-btn{background:#655a85;color:white;border:0;border-radius:10px;padding:10px 14px;font-size:13px}.kb28-reader-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 20px}.kb28-back{background:none;border:0;color:#55735f;padding:8px 0}.kb28-reader-actions{display:flex;gap:6px;flex-wrap:wrap}.kb28-reader-actions .btn{font-size:12px}.kb28-document-title{padding:20px 4px}.kb28-document-title h2{font-size:clamp(26px,4vw,40px);letter-spacing:-1px;line-height:1.2;margin:9px 0}.kb28-document-title small{color:#819484}.kb28-reader-grid{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,1fr);gap:16px}.kb28-reader-grid:not(:has(.kb28-toc)){display:block}.kb28-toc{align-self:start;position:sticky;top:8px;background:#f3f7f1;border-radius:13px;padding:16px;max-height:80vh;overflow:auto}.kb28-toc>strong{font-size:10px;letter-spacing:.12em;color:#76917c}.kb28-toc button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #e4ece2;color:#557461;padding:9px 2px;font-size:12px;overflow-wrap:anywhere}.kb28-paperbody{background:#fff;padding:clamp(17px,4vw,36px);border:1px solid #e7ede5;border-radius:15px;color:#2b3e32;line-height:1.72;font-size:14px;overflow-wrap:anywhere}.kb28-paperbody h2,.kb28-paperbody h3,.kb28-paperbody h4,.kb28-paperbody h5{line-height:1.3;margin:1.4em 0 .6em;color:#284d37;scroll-margin-top:20px}.kb28-paperbody h2:first-child{margin-top:0}.kb28-paperbody p{margin:.7em 0}.kb28-paperbody li{margin:4px 0}.kb28-paperbody pre{padding:12px;background:#f2f6f1;overflow:auto;border-radius:10px}.kb28-paperbody code{background:#eef3ec;padding:1px 4px;border-radius:4px}.kb28-paperbody blockquote{border-left:3px solid #91b79a;margin:10px 0;padding:8px 14px;background:#f7faf6}.kb28-paperbody hr{border:0;border-top:1px solid #e4ebe3}.kb28-study-page{max-width:780px}.kb28-study-top{display:flex;justify-content:space-between;align-items:center;color:#85998a;font-size:12px}.kb28-study-header{text-align:center;margin:18px 0}.kb28-study-header h2{font-size:32px;margin:7px 0}.kb28-study-header p{font-size:13px;color:#829488}.kb28-flash{background:#fff;box-shadow:0 8px 30px #2638270b;border:1px solid #e1e9df;border-radius:19px;min-height:310px;padding:clamp(20px,5vw,36px);text-align:center}.kb28-flash-kicker{font-size:11px;color:#8ba08d;margin-bottom:19px}.kb28-flash-question{font-size:clamp(21px,4vw,29px);font-weight:700;color:#315440;line-height:1.35}.kb28-question-note{font-size:12px;color:#9ba89b;margin:15px 0 24px}.kb28-reveal{display:block;background:#456e56;border:0;color:white;border-radius:11px;padding:13px 25px;margin:30px auto}.kb28-flash-answer{border-top:1px solid #e6ece5;margin-top:25px;padding-top:16px;text-align:left}.kb28-flash-answer>span{font-size:10px;color:#819684;font-weight:700;letter-spacing:.11em}.kb28-flash-answer .kb28-paperbody{margin-top:10px;border:0;padding:4px;font-size:13px}.kb28-ratings{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:20px}.kb28-ratings button{background:#eff5ef;border:1px solid #d9e6da;padding:9px 3px;border-radius:10px;color:#396349}.kb28-ratings button:first-child{background:#f9eee8;border-color:#ecd5c8;color:#926049}.kb28-ratings button:last-child{background:#e7f2e7;color:#366648}.kb28-ratings strong{display:block;font-size:12px}.kb28-ratings small{display:block;font-size:9px;margin-top:3px;opacity:.7}.kb28-study-done{text-align:center;padding:40px 20px;background:white;border:1px solid #e3ece1;border-radius:17px}.kb28-study-done>div{color:#477455;font-size:40px}.kb28-study-done h3{margin:8px 0}.kb28-study-done p{color:#809280}.kb28-grabbing{opacity:.55;outline:2px dashed #6a9874}.kb28-drop{outline:3px solid #6e9b79;background:#e9f4e7}.kb28-root-main,.kb28-folder-main{touch-action:pan-y;user-select:none;-webkit-user-select:none}#kb28DocDialog{max-width:min(95vw,850px)}#kb28DocBody{min-height:260px;line-height:1.5}#kb28FolderDialog,#kb28DocDialog{max-height:94vh;overflow-y:auto}@media(max-width:680px){.kb28-rootgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.kb28-root{min-height:155px}.kb28-root-main{padding:18px 12px}.kb28-root-main strong{font-size:18px}.kb28-root-icon{font-size:28px;margin-bottom:15px}.kb28-hero{padding:15px;gap:11px}.kb28-heroicon{width:43px;height:43px;font-size:23px}.kb28-reader-grid{display:block}.kb28-toc{position:static;max-height:190px;margin-bottom:10px}.kb28-ratings{gap:3px}.kb28-ratings strong{font-size:11px}.kb28-ratings small{font-size:8px}}
`;document.head.append(css);
const kb31Style=document.createElement('style');kb31Style.textContent=String.raw`
/* v3.1: quiet knowledge architecture, compact editorial interface */
.kb31-pagehead,.kb31-folder-head{display:flex;align-items:center;gap:10px;margin:0 0 16px;min-height:41px}
.kb31-pagehead h2,.kb31-folder-head h2{font-size:clamp(17px,2.8vw,21px)!important;letter-spacing:-.25px;line-height:1.3;margin:0!important;font-weight:700}
.kb31-pagehead .kb31-plus{margin-left:auto}
.kb31-folder-head{padding:2px 0 11px;border-bottom:1px solid #e5ebe4}
.kb31-folder-head h2{flex:1;color:var(--kb-dark,#33513f)}
.kb31-title-emoji{font-size:21px;line-height:1.1}
.kb31-back,.kb31-head-edit{border:0;background:transparent;color:var(--kb-dark,#4e6c59);height:34px;min-width:32px;padding:2px;border-radius:9px;font-size:19px}
.kb31-back:hover,.kb31-head-edit:hover{background:#edf3ec}
.kb31-plus{display:grid;place-items:center;width:31px;height:31px;min-width:31px;border-radius:9px;background:#f1f5ef;border:1px solid #dfebe0;color:var(--kb-dark,#3b6145);font-size:21px;line-height:1;padding:0;font-weight:450}
.kb31-plus:hover{background:#e7f0e5}
.kb31-section-head{display:flex;align-items:center;justify-content:space-between;margin:20px 0 9px;gap:10px}
.kb31-section-head h3{font-size:13px;font-weight:700;letter-spacing:0;color:#42604a;margin:0}
.kb31-doc-head{margin-top:22px}
.kb31-doc-head .kb28-addbar{margin-left:auto}
.kb31-doc-head .kb28-addbar button{font-size:11px;padding:7px 9px}
.kb31-library .kb28-rootgrid{grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px}
.kb31-library .kb28-root{min-height:115px;border-radius:15px}
.kb31-library .kb28-root-main{padding:18px 15px;min-height:115px;gap:6px}
.kb31-library .kb28-root-icon{font-size:26px;margin-bottom:2px;line-height:1.2}
.kb31-library .kb28-root-main strong{font-size:15px;max-width:100%;overflow-wrap:anywhere}
.kb28-foldergrid{grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:9px}
.kb31-folder-page .kb28-folder{min-height:62px;border-radius:12px;background:var(--kb-light,#fff);border-color:color-mix(in srgb,var(--kb-dark,#567b65),white 80%)}
.kb31-folder-page .kb28-folder-main{padding:11px 38px 11px 12px;min-height:62px;gap:9px}
.kb31-folder-page .kb28-folder-glyph{font-size:21px;width:35px;height:35px;flex-shrink:0}
.kb31-folder-page .kb28-folder-text strong{font-size:13px}
.kb31-folder-page .kb28-chevron{font-size:19px}
.kb28-overflow{font-size:18px;min-width:28px;height:28px}
.kb31-folder-page .kb28-study-banner{margin:8px 0 10px;padding:10px 12px}
.kb31-folder-page .kb28-study-icon{padding:6px;font-size:16px}
.kb31-folder-page .kb28-study-banner strong{font-size:13px}
.kb31-folder-page .kb28-study-banner p{font-size:11px}
.kb31-folder-page .kb28-study-btn{padding:8px 11px}
.kb31-folder-page .kb28-empty-doc{padding:15px}
.kb31-emoji-entry{display:flex;gap:12px;align-items:center}
.kb31-emoji-entry span{display:grid;place-items:center;min-width:48px;height:43px;background:#f0f6ee;border-radius:10px;font-size:27px}
.kb31-emoji-entry input{flex:1;min-width:0}
.kb31-emoji-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;max-height:162px;overflow:auto;margin-top:9px}
.kb31-emoji-option{display:grid;place-items:center;border:0;border-radius:8px;background:#f4f7f3;min-height:32px;font-size:21px;padding:4px}
.kb31-emoji-option:hover,.kb31-emoji-option:focus{background:#dcebdd}
.kb31-category-editor{width:min(94vw,540px)}
@media(max-width:680px){.kb31-library .kb28-rootgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kb31-library .kb28-root{min-height:105px}.kb31-library .kb28-root-main{min-height:105px;padding:13px}.kb31-library .kb28-root-main strong{font-size:14px}.kb31-folder-page .kb28-foldergrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.kb31-folder-page .kb28-folder-main{padding:9px 31px 9px 8px;gap:6px}.kb31-folder-page .kb28-folder-glyph{width:30px;height:32px;font-size:18px}.kb31-folder-page .kb28-folder-text strong{font-size:12px}.kb31-folder-page .kb28-chevron{display:none}.kb31-emoji-grid{grid-template-columns:repeat(7,minmax(0,1fr))}}
`;document.head.append(kb31Style);
const kb32Style=document.createElement('style');kb32Style.textContent=String.raw`
/* v3.2: one knowledge area per row and a document-first reading layout */
.kb31-library .kb28-rootgrid{display:grid;grid-template-columns:minmax(0,1fr)!important;gap:9px}
.kb31-library .kb28-root{min-height:74px!important;border-radius:15px}
.kb31-library .kb28-root-main{display:flex;flex-direction:row;align-items:center;gap:16px;padding:13px 52px 13px 18px!important;min-height:74px!important}
.kb31-library .kb28-root-icon{font-size:30px;margin:0;min-width:38px;text-align:center}
.kb31-library .kb28-root-main strong{font-size:16px}
.kb32-collection{background:#fff;border:1px solid #dde7db;border-radius:15px;padding:14px 15px;margin:20px 0 6px}
.kb32-collection-head{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:10px}
.kb32-collection-head h3{font-size:14px;margin:0;color:#365a42}
.kb32-collection-head span{font-size:11px;color:#79917e}
#kb32CollectionEditor{display:block;width:100%;min-height:290px;max-height:75vh;resize:vertical;border:0;border-radius:7px;background:#fff;padding:8px;color:#2c4434;font:inherit;font-size:14px;line-height:1.65;outline-offset:3px}
#kb32CollectionEditor:focus{outline:2px solid #c6dfcb}
.kb32-pdf-box{background:#fff;border:1px solid #dfebdf;padding:14px;border-radius:15px;margin-bottom:15px}
.kb32-pdf-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.kb32-pdf-toolbar strong{flex:1;min-width:100px;font-size:14px}
.kb32-pdf-toolbar button,.kb32-pdf-toolbar .btn{font-size:12px;padding:8px 9px;text-decoration:none}
.kb32-pdf-status{font-size:12px;color:#5b7665;margin:11px 0}
#kb32PdfFrame{width:100%;height:72vh;min-height:430px;border:1px solid #dce7de;border-radius:10px;background:#fafafa}
.kb32-pdf-box>small{display:block;color:#7e8b81;font-size:11px;margin-top:10px;line-height:1.5}
@media(max-width:680px){.kb31-library .kb28-rootgrid{grid-template-columns:minmax(0,1fr)!important}.kb31-library .kb28-root-main{padding:12px 42px 12px 12px!important;min-height:70px!important}.kb31-library .kb28-root{min-height:70px!important}.kb32-collection{padding:12px}.kb32-collection-head span{font-size:10px}#kb32CollectionEditor{min-height:320px}#kb32PdfFrame{height:60vh;min-height:390px}}
`;document.head.append(kb32Style);
})();
