/* BrainHome cloud sync: optional Firebase Spark; local app never depends on this file. */
const el=id=>document.getElementById(id);
const config=window.BRAINHOME_FIREBASE_CONFIG||{};
const ui=window.BH10;
const status=(message,type='offline')=>{
 ui?.updateCloudStatus?.(message,type);
 if(el('v1CloudState'))el('v1CloudState').textContent=message;
};
const errorText=error=>{
 const code=String(error?.code||'');
 if(code.includes('invalid-credential')||code.includes('wrong-password'))return 'E-Mail oder Passwort stimmt nicht.';
 if(code.includes('email-already-in-use'))return 'Diese E-Mail-Adresse hat bereits ein Konto.';
 if(code.includes('weak-password'))return 'Bitte ein Passwort mit mindestens 6 Zeichen verwenden.';
 if(code.includes('invalid-email'))return 'Die E-Mail-Adresse ist ungültig.';
 if(code.includes('network'))return 'Keine Verbindung. Deine Daten sind weiterhin lokal vorhanden.';
 if(code.includes('permission-denied'))return 'Zugriff verweigert. Prüfe die Firestore-Sicherheitsregeln aus der Anleitung.';
 return error?.message||String(error)||'Unbekannter Fehler';
};
function message(text,warning=false){const box=el('v1CloudMessage');if(box){box.textContent=text;box.dataset.warning=String(warning)}}
function configured(){return !!(config.apiKey&&config.projectId&&config.authDomain&&config.appId)}
if(!configured()){
 status('Cloud einrichten');
 el('v1CloudLoginBox')?.setAttribute('hidden','');
 el('v1CloudSetupBox')?.removeAttribute('hidden');
 message('Die App läuft vollständig lokal. Für automatische Cloud-Backups bitte zuerst Firebase kostenlos einrichten.');
}else{
 try{
   const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut},{getFirestore,doc,getDoc,setDoc,collection,getDocs,deleteDoc,runTransaction,serverTimestamp}]=await Promise.all([
     import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
     import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
     import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
   ]);
   const firebaseApp=initializeApp(config),auth=getAuth(firebaseApp),db=getFirestore(firebaseApp);
   let user=null,ready=false,baseRevision=null,cloudBusy=false,dirty=false,uploadTimer=null,pendingChoice=null,lastSnapshotDay='',lastSyncedHash='';
   const key=(suffix)=>'brainhome-v1-cloud-'+suffix+'-'+(user?.uid||'');
   const payload=()=>ui.exportData();
   const serialize=o=>JSON.stringify(o);
   const digest=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
   const today=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')};
   const refs=()=>({current:doc(db,'users',user.uid,'brainhome','current'),snapshots:collection(db,'users',user.uid,'snapshots')});
   function showAuth(){const logged=!!user;el('v1CloudLoginBox').hidden=logged;el('v1CloudAccountBox').hidden=!logged;if(logged)el('v1CloudEmail').textContent=user.email||'Angemeldet';}
   function setReady(v){ready=v;el('v1CloudSyncBtn').disabled=!v;el('v1CloudHistoryBtn').disabled=!v}
   async function dailyBackup(prior){if(!user||!prior)return;
     const day=today();if(day===lastSnapshotDay)return;
     const snapRef=doc(refs().snapshots,day);
     try{const old=await getDoc(snapRef);if(!old.exists())await setDoc(snapRef,{payload:prior,createdAt:new Date().toISOString(),kind:'daily'});lastSnapshotDay=day;await pruneSnapshots()}catch(e){console.warn('Tägliche Sicherung:',e)}
   }
   async function pruneSnapshots(){try{const found=await getDocs(refs().snapshots);const daily=found.docs.filter(d=>d.data()?.kind==='daily').sort((a,b)=>a.id.localeCompare(b.id));for(const entry of daily.slice(0,Math.max(0,daily.length-30)))await deleteDoc(entry.ref)}catch(e){console.warn('Alte Sicherungen:',e)}}
   async function upload({force=false}={}){
     if(!user||!ready||cloudBusy||!navigator.onLine){dirty=true;if(!navigator.onLine)status('Offline · lokal gespeichert');return}
     cloudBusy=true;clearTimeout(uploadTimer);
     const input=payload(),json=serialize(input),hash=digest(json);
     if(new Blob([json]).size>850000){status('Backup zu groß');message('Deine Einträge sind für ein einzelnes Cloud-Dokument zu groß. Bitte JSON-Backup exportieren.',true);cloudBusy=false;return}
     let previous=null,latestRevision=null,newRevision=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();
     try{
       status('Synchronisiere …','working');
       await runTransaction(db,async tx=>{
         const current=refs().current,found=await tx.get(current);
         const old=found.exists()?found.data():null;
         latestRevision=old?.revision||null;
         if(!force&&latestRevision!==baseRevision)throw Object.assign(new Error('Cloud wurde auf einem anderen Gerät geändert.'),{code:'brainhome/conflict'});
         previous=old?.payload||null;
         tx.set(current,{payload:input,revision:newRevision,updatedAt:serverTimestamp(),clientUpdatedAt:new Date().toISOString()});
       });
       baseRevision=newRevision;localStorage.setItem(key('revision'),newRevision);
       lastSyncedHash=hash;localStorage.setItem(key('hash'),hash);dirty=digest(serialize(payload()))!==hash;
       status('Gesichert ✓','online');message('Aktueller Stand automatisch gesichert. Die App funktioniert auch offline.');
       await dailyBackup(previous||input);
       if(dirty)requestUpload();
     }catch(e){
       if(e.code==='brainhome/conflict'){
         status('Konflikt prüfen');setReady(false);dirty=true;
         const remote=await getDoc(refs().current);if(remote.exists())showConflict(remote.data()?.payload,remote.data()?.revision,'Auf einem anderen Gerät wurde etwas geändert. Entscheide, welche Version weiterverwendet wird.');
       }else{status('Nicht gesichert');message('Cloud-Sicherung fehlgeschlagen: '+errorText(e),true);dirty=true}
     }finally{cloudBusy=false}
   }
   function requestUpload(){dirty=true;if(!user||!ready)return;clearTimeout(uploadTimer);uploadTimer=setTimeout(()=>upload(),4500)}
   function showConflict(remote,rev,description){pendingChoice={remote,revision:rev};setReady(false);el('v1CloudChoice').hidden=false;el('v1CloudChoiceText').textContent=description;message('Bitte zwischen den Datenständen wählen. Bis dahin wird nichts überschrieben.',true);status('Auswahl erforderlich');}
   function hideConflict(){el('v1CloudChoice').hidden=true;pendingChoice=null}
   async function loadRemote(remote,rev){if(!remote||!Array.isArray(remote.nodes))throw Error('Das Cloud-Backup enthält keine gültigen Daten.');
     // Keep a downloadable local backup before replacing even a small local database.
     if(ui.hasLocalData()){ui.exportBackup()}
     ui.applyData(remote);baseRevision=rev;localStorage.setItem(key('revision'),rev||'');lastSyncedHash=digest(serialize(payload()));localStorage.setItem(key('hash'),lastSyncedHash);dirty=false;setReady(true);hideConflict();status('Gesichert ✓','online');message('Cloud-Daten auf diesem Gerät geladen.');
   }
   async function firstRead(){if(!user||!navigator.onLine){status('Offline · lokal gespeichert');return}cloudBusy=true;setReady(false);
     try{
       status('Verbinde …','working');const snap=await getDoc(refs().current),remote=snap.exists()?snap.data():null;
       const local=payload(),hash=digest(serialize(local));baseRevision=remote?.revision||null;
       const knownHash=localStorage.getItem(key('hash')),knownRevision=localStorage.getItem(key('revision'));
       if(!remote){setReady(true);cloudBusy=false;dirty=true;await upload();return}
       const remoteHash=digest(serialize(remote.payload));
       if(hash===remoteHash){lastSyncedHash=hash;localStorage.setItem(key('hash'),hash);localStorage.setItem(key('revision'),baseRevision);setReady(true);status('Gesichert ✓','online');message('Handy und Cloud sind auf dem gleichen Stand.');return}
       if(!ui.hasLocalData()||(knownHash===hash&&knownRevision&&knownRevision!==remote.revision)){
         await loadRemote(remote.payload,remote.revision);return;
       }
       showConflict(remote.payload,remote.revision,'Es gibt lokale Einträge und einen abweichenden Cloud-Datenstand. Wähle bewusst, welche Version übernommen wird.');
     }catch(e){status('Verbindung fehlgeschlagen');message(errorText(e),true)}finally{cloudBusy=false}
   }
   window.BHCloud={markDirty:requestUpload,refreshUI:showAuth,syncNow:()=>upload()};
   el('v1CloudLoginForm').onsubmit=async e=>{e.preventDefault();const email=el('v1CloudLoginEmail').value.trim(),password=el('v1CloudLoginPassword').value;if(!email||!password)return;message('Anmeldung läuft …');try{await signInWithEmailAndPassword(auth,email,password)}catch(e){message(errorText(e),true)}};
   el('v1CloudSignUp').onclick=async()=>{const email=el('v1CloudLoginEmail').value.trim(),pw=el('v1CloudLoginPassword').value;if(!email||pw.length<6){message('Bitte E-Mail-Adresse und Passwort mit mindestens 6 Zeichen eingeben.',true);return}if(!confirm('Ein persönliches Cloud-Konto mit dieser E-Mail anlegen?'))return;try{await createUserWithEmailAndPassword(auth,email,pw)}catch(e){message(errorText(e),true)}};
   el('v1CloudReset').onclick=async()=>{const email=el('v1CloudLoginEmail').value.trim();if(!email)return message('Bitte erst die E-Mail-Adresse eintragen.',true);try{await sendPasswordResetEmail(auth,email);message('Wenn ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.')}catch(e){message(errorText(e),true)}};
   el('v1CloudLogOut').onclick=async()=>{clearTimeout(uploadTimer);if(dirty&&!confirm('Möglicherweise sind noch lokale Änderungen ungesichert. Trotzdem abmelden?'))return;await signOut(auth)};
   el('v1CloudSyncBtn').onclick=()=>{dirty=true;upload()};
   el('v1CloudUseRemote').onclick=async()=>{if(!pendingChoice)return;try{await loadRemote(pendingChoice.remote,pendingChoice.revision)}catch(e){message(errorText(e),true)}};
   el('v1CloudKeepLocal').onclick=async()=>{if(!pendingChoice)return;
     if(!confirm('Lokale Daten als neuen Cloud-Stand verwenden? Der bisherige Cloud-Stand wird vorher separat gesichert.'))return;
     try{
       const prior=pendingChoice.remote;
       await setDoc(doc(refs().snapshots,'konflikt-'+new Date().toISOString().replace(/[:.]/g,'-')),{payload:prior,createdAt:new Date().toISOString(),kind:'conflict'});
       baseRevision=pendingChoice.revision;hideConflict();setReady(true);dirty=true;await upload();
     }catch(e){message('Cloud-Sicherung nicht möglich: '+errorText(e),true)}
   };
   el('v1CloudHistoryBtn').onclick=async()=>{
     const host=el('v1CloudHistory');host.textContent='Sicherungen werden geladen …';
     try{const snapshots=await getDocs(refs().snapshots);const all=snapshots.docs.sort((a,b)=>b.id.localeCompare(a.id)).slice(0,40);
       host.replaceChildren();if(!all.length){host.textContent='Noch keine älteren Sicherungen vorhanden.';return}
       for(const entry of all){const row=document.createElement('div');row.className='v1-cloud-history-row';const label=document.createElement('span');label.textContent=entry.id+(entry.data().kind==='conflict'?' · Konfliktsicherung':'');const btn=document.createElement('button');btn.className='btn';btn.textContent='Wiederherstellen';btn.onclick=async()=>{if(!confirm('Eine ältere Sicherung laden? Die derzeitigen lokalen Einträge werden vorher als JSON-Datei gesichert.'))return;const saved=entry.data().payload;if(!saved?.nodes)return message('Diese Sicherung ist ungültig.',true);ui.exportBackup();ui.applyData(saved);host.textContent='Sicherung geladen. Wird in die Cloud geschrieben …';requestUpload();};row.append(label,btn);host.append(row)}
     }catch(e){host.textContent='Laden fehlgeschlagen: '+errorText(e)}
   };
   onAuthStateChanged(auth,async u=>{
     clearTimeout(uploadTimer);user=u;dirty=false;baseRevision=null;setReady(false);hideConflict();showAuth();
     if(!u){status('Anmelden');message('Anmelden, um eine automatische private Cloud-Sicherung zu aktivieren.');return}
     await firstRead();
   });
   window.addEventListener('online',()=>{if(user){if(!ready&&!pendingChoice)firstRead();else if(dirty)requestUpload()}});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user){if(!ready&&!pendingChoice)firstRead();else if(dirty)requestUpload()}});
   status('Anmelden');
 }catch(e){status('Cloud nicht verfügbar');message('Firebase konnte nicht geladen werden. Offline funktioniert BrainHome weiter: '+errorText(e),true)}
}
