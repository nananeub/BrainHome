/* BrainHome 1.2 — local-first, quiet Firebase backup.
 * After initial sign-in an established device is authoritative; changes are
 * uploaded automatically and conflicts are snapshotted without choice dialogs.
 * A truly fresh device restores the existing cloud database BEFORE writing.
 * Offline saves always work; no background push or periodic polling required.
 */
const byId = id => document.getElementById(id);
const firebaseConfig = window.BRAINHOME_FIREBASE_CONFIG || {};
const appUI = window.BH10;
const cloudStatus = (message, type='offline') => {
  appUI?.updateCloudStatus?.(message,type);
  if (byId('v1CloudState')) byId('v1CloudState').textContent=message;
};
function cloudMessage(text, warning=false) {
  const element=byId('v1CloudMessage');
  if (element) { element.textContent=text; element.dataset.warning=String(warning); }
}
function readableError(error) {
  const code=String(error?.code || '');
  if (/invalid-credential|wrong-password/.test(code)) return 'E-Mail oder Passwort stimmt nicht.';
  if (code.includes('email-already-in-use')) return 'Für diese E-Mail-Adresse gibt es bereits ein Konto.';
  if (code.includes('weak-password')) return 'Bitte mindestens sechs Zeichen als Passwort verwenden.';
  if (code.includes('invalid-email')) return 'Die E-Mail-Adresse ist ungültig.';
  if (/network|unavailable/.test(code)) return 'Verbindung vorübergehend nicht verfügbar. Alles bleibt lokal gespeichert.';
  if (code.includes('permission-denied')) return 'Firebase-Zugriff nicht erlaubt. Prüfe deine Firestore-Regeln.';
  return error?.message || String(error) || 'Unbekannter Fehler';
}
const configured=!!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
if (!configured) {
  cloudStatus('Cloud einrichten');
  byId('v1CloudLoginBox')?.setAttribute('hidden','');
  byId('v1CloudSetupBox')?.removeAttribute('hidden');
  cloudMessage('BrainHome speichert lokal. Für die Cloud bitte einmal Firebase einrichten.');
} else {
  try {
    const [appModule,authModule,firestoreModule]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
    ]);
    const {initializeApp}=appModule;
    const {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut}=authModule;
    const {getFirestore,doc,getDoc,setDoc,collection,getDocs,deleteDoc,runTransaction,serverTimestamp}=firestoreModule;
    const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
    let user=null,ready=false,busy=false,dirty=false,revision=null,syncedHash='',timer=null,session=0;
    let latestInput=null,lastDailyCheck='',inFlightRead=false;
    const LINKED_ACCOUNT='brainhome-v12-linked-account';
    const key=tag=>'brainhome-v1-cloud-'+tag+'-'+(user?.uid||'');
    const serialize=obj=>JSON.stringify(obj);
    const digest=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
    const currentPayload=()=>appUI.exportData();
    const hashNow=()=>digest(serialize(currentPayload()));
    const dayKey=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`};
    const currentRef=()=>doc(db,'users',user.uid,'brainhome','current');
    const snapshotCollection=()=>collection(db,'users',user.uid,'snapshots');
    const recordId=()=>new Date().toISOString().replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,7);
    const validPayload=p=>p&&Array.isArray(p.nodes)&&p.nodes.every(n=>typeof n?.id==='string'&&typeof n?.name==='string');
    function persistRevision(newRevision,hash) {
      revision=newRevision||null;
      syncedHash=hash;
      localStorage.setItem(key('revision'),revision||'');
      localStorage.setItem(key('hash'),hash);
      localStorage.setItem(LINKED_ACCOUNT,user.uid);
    }
    function showAccount() {
      const active=!!user;
      byId('v1CloudLoginBox').hidden=active;
      byId('v1CloudAccountBox').hidden=!active;
      if (active) byId('v1CloudEmail').textContent=user.email||'Angemeldet';
    }
    function setReady(flag) {
      ready=flag;
      byId('v1CloudSyncBtn').disabled=!flag;
      byId('v1CloudHistoryBtn').disabled=!flag;
    }
    function scheduleUpload(ms=2000) {
      dirty=true;
      if (!user || !ready || !navigator.onLine) {
        if (!navigator.onLine) cloudStatus('Offline · lokal gespeichert');
        return;
      }
      clearTimeout(timer);
      timer=setTimeout(()=>{void upload()},ms);
    }
    function markDirty() { scheduleUpload(); }
    function isTooLarge(payload) { return new Blob([serialize(payload)]).size>850000; }
    async function dailyBackup(previous,connectedSession) {
      if (!previous || connectedSession!==session || !user) return;
      const day=dayKey();
      if (day===lastDailyCheck) return;
      try {
        const ref=doc(snapshotCollection(),day),existing=await getDoc(ref);
        if (!existing.exists()) await setDoc(ref,{payload:previous,createdAt:new Date().toISOString(),kind:'daily'});
        lastDailyCheck=day;
        // Cleanup runs only on a new daily snapshot, not every change.
        const found=await getDocs(snapshotCollection());
        const daily=found.docs.filter(s=>s.data()?.kind==='daily').sort((a,b)=>a.id.localeCompare(b.id));
        for (const old of daily.slice(0,Math.max(0,daily.length-30))) await deleteDoc(old.ref);
      } catch(error) {console.warn('BrainHome: tägliche Sicherung',error);}
    }
    async function upload() {
      if (!user || !ready || !navigator.onLine) { dirty=true;return; }
      if (busy) { dirty=true;return; }
      const token=session,uid=user.uid;
      busy=true;clearTimeout(timer);
      const input=currentPayload(),json=serialize(input),hash=digest(json);
      if (isTooLarge(input)) {
        busy=false;cloudStatus('Cloud-Grenze erreicht');
        cloudMessage('Cloud-Dokument zu groß. Bitte zusätzlich ein JSON-Backup exportieren.',true);
        return;
      }
      let previous=null,newRevision=null;
      try {
        cloudStatus('Sichere …','working');
        await runTransaction(db,async transaction=>{
          const reference=doc(db,'users',uid,'brainhome','current');
          const oldSnapshot=await transaction.get(reference);
          const old=oldSnapshot.exists()?oldSnapshot.data():null;
          previous=validPayload(old?.payload)?old.payload:null;
          const remoteRev=old?.revision||null;
          // If the cloud changed elsewhere, keep its entire content BEFORE
          // replacing it with the established device's local database.
          if (previous && remoteRev!==revision) {
            transaction.set(doc(db,'users',uid,'snapshots','abweichung-'+recordId()),{
              payload:previous,createdAt:new Date().toISOString(),kind:'conflict',
              note:'Automatisch vor der lokalen Aktualisierung gesichert'
            });
          }
          newRevision=(crypto.randomUUID?.()||recordId());
          transaction.set(reference,{
            payload:input,revision:newRevision,updatedAt:serverTimestamp(),
            clientUpdatedAt:new Date().toISOString()
          });
        });
        if (token!==session || user?.uid!==uid) return;
        persistRevision(newRevision,hash);
        const updated=hashNow()!==hash;
        dirty=updated;
        cloudStatus('Gesichert ✓','online');
        cloudMessage('Änderungen werden automatisch gesichert, solange BrainHome geöffnet ist.');
        void dailyBackup(previous||input,token);
      } catch(error) {
        dirty=true;cloudStatus('Lokal gespeichert · Cloud später');
        cloudMessage('Lokaler Stand bleibt erhalten. Cloud-Sicherung: '+readableError(error),true);
      } finally {
        busy=false;
        if (dirty && token===session && user && ready && navigator.onLine) {
          // Retry after a failure without spamming the service or asking for choices.
          scheduleUpload(60000);
        }
      }
    }
    function stashLocal(uid) {
      // Automatic local recovery copy, not a download prompt or an active backup.
      try {
        const name='brainhome-v12-before-device-restore-'+uid;
        localStorage.setItem(name,JSON.stringify({date:new Date().toISOString(),payload:currentPayload()}));
      } catch(error) {console.warn('BrainHome: lokale Schutzkopie',error);}
    }
    async function restoreRemote(remote,remoteRevision) {
      if (!validPayload(remote)) throw Error('Cloud-Daten sind nicht lesbar. Der lokale Stand wurde nicht verändert.');
      if (appUI.hasLocalData()) stashLocal(user.uid);
      appUI.applyData(remote);
      persistRevision(remoteRevision,hashNow());
      dirty=false;
      setReady(true);
      cloudStatus('Gesichert ✓','online');
      cloudMessage('Dein Cloud-Stand wurde auf diesem Gerät wiederhergestellt.');
    }
    async function connect() {
      if (!user || busy || inFlightRead) return;
      if (!navigator.onLine) {cloudStatus('Offline · lokal gespeichert');return;}
      const token=session,uid=user.uid;
      inFlightRead=true;setReady(false);
      const beforeHash=hashNow();
      try {
        cloudStatus('Verbinde …','working');
        const snapshot=await getDoc(currentRef());
        if (token!==session || user?.uid!==uid) return;
        const remote=snapshot.exists()?snapshot.data():null;
        if (remote && !validPayload(remote.payload)) throw Error('Cloud-Daten ungültig. Kein Überschreiben durchgeführt.');
        revision=remote?.revision||null;
        const linked=localStorage.getItem(LINKED_ACCOUNT);
        const knownRev=localStorage.getItem(key('revision'));
        if (linked && linked!==uid) {
          // Switching Firebase accounts must never upload a different person's
          // local data into the newly signed-in account.
          if (remote) {
            await restoreRemote(remote.payload,remote.revision);
          } else {
            cloudStatus('Konto ohne Sicherung');
            cloudMessage('Für dieses Konto gibt es noch keine Sicherung. Melde dich zum bisherigen Konto zurück oder exportiere zunächst ein JSON-Backup.',true);
          }
          return;
        }
        if (!remote) {
          setReady(true);
          scheduleUpload(0);
          return;
        }
        const remoteHash=digest(serialize(remote.payload));
        if (remoteHash===beforeHash && hashNow()===beforeHash) {
          persistRevision(remote.revision,beforeHash);
          dirty=false;setReady(true);
          cloudStatus('Gesichert ✓','online');
          cloudMessage('Dein lokaler Datenstand ist bereits gesichert.');
          return;
        }
        // New / empty installation => restore instead of uploading empty roots.
        if (!appUI.hasLocalData() && hashNow()===beforeHash) {
          await restoreRemote(remote.payload,remote.revision);
          return;
        }
        // An established device is local-first. Keep its contents without a
        // confirmation dialog; upload() archives an opposing cloud revision.
        // If the cloud advanced elsewhere, preserve the exact newer remote copy too.
        if (remote && (!knownRev || knownRev!==remote.revision)) {
          // Snapshot the unrecognised remote before adopting this existing local copy.
          try {await setDoc(doc(snapshotCollection(),'erstverbindung-'+recordId()),{
            payload:remote.payload,createdAt:new Date().toISOString(),kind:'conflict',
            note:'Cloud-Stand vor automatischer Übernahme des lokalen Stands'
          });} catch(error) {
            // On failure, do not risk overwriting the only remote copy.
            throw Error('Schutzkopie der bisherigen Cloud nicht möglich. Keine Daten überschrieben: '+readableError(error));
          }
        }
        setReady(true);
        scheduleUpload(100);
        cloudMessage('Der aktuelle lokale Stand wird automatisch in der Cloud gesichert.');
      } catch(error) {
        cloudStatus('Lokal gespeichert · Cloud später');
        cloudMessage('Cloud-Verbindung: '+readableError(error),true);
      } finally {
        inFlightRead=false;
        if (ready && dirty && navigator.onLine && !timer) scheduleUpload();
      }
    }
    window.BHCloud={markDirty,refreshUI:showAccount,syncNow:()=>{
      if(!ready){void connect();return;}scheduleUpload(0);
    }};
    byId('v1CloudLoginForm').onsubmit=async event=>{
      event.preventDefault();
      const email=byId('v1CloudLoginEmail').value.trim(),password=byId('v1CloudLoginPassword').value;
      if (!email || !password) return;
      cloudMessage('Anmeldung läuft …');
      try {await signInWithEmailAndPassword(auth,email,password)} catch(error) {cloudMessage(readableError(error),true)}
    };
    byId('v1CloudSignUp').onclick=async()=>{
      const email=byId('v1CloudLoginEmail').value.trim(),pw=byId('v1CloudLoginPassword').value;
      if (!email || pw.length<6) {cloudMessage('Bitte E-Mail und Passwort mit mindestens sechs Zeichen eingeben.',true);return;}
      if (!confirm('Ein persönliches Cloud-Konto mit dieser E-Mail-Adresse erstellen?')) return;
      try {await createUserWithEmailAndPassword(auth,email,pw)} catch(error) {cloudMessage(readableError(error),true)}
    };
    byId('v1CloudReset').onclick=async()=>{
      const email=byId('v1CloudLoginEmail').value.trim();
      if (!email) {cloudMessage('Bitte zuerst eine E-Mail-Adresse eingeben.',true);return;}
      try {await sendPasswordResetEmail(auth,email);cloudMessage('Sofern das Konto existiert, bekommst du eine E-Mail zum Zurücksetzen.');}
      catch(error) {cloudMessage(readableError(error),true)}
    };
    byId('v1CloudLogOut').onclick=async()=>{
      clearTimeout(timer);
      if (dirty && !confirm('Es könnten noch ungesicherte Änderungen vorliegen. Trotzdem abmelden?')) return;
      await signOut(auth);
    };
    byId('v1CloudSyncBtn').onclick=()=>scheduleUpload(0);
    byId('v1CloudHistoryBtn').onclick=async()=>{
      const host=byId('v1CloudHistory');
      host.textContent='Ältere Sicherungen werden geladen …';
      try {
        const result=await getDocs(snapshotCollection());
        const all=result.docs.sort((a,b)=>b.id.localeCompare(a.id)).slice(0,40);
        host.replaceChildren();
        if (!all.length) {host.textContent='Noch keine älteren Sicherungen vorhanden.';return;}
        for (const entry of all) {
          const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');
          row.className='v1-cloud-history-row';
          label.textContent=entry.id+(entry.data().kind==='conflict'?' · vor dem Überschreiben geschützt':'');
          button.className='btn';button.textContent='Wiederherstellen';
          button.onclick=async()=>{
            if (!confirm('Diese ältere Sicherung wiederherstellen? Der momentane Stand wird vorher als JSON gespeichert.'))return;
            const saved=entry.data().payload;
            if (!validPayload(saved)) {cloudMessage('Ungültige Sicherung.',true);return;}
            appUI.exportBackup();appUI.applyData(saved);
            host.textContent='Ältere Sicherung geladen – wird automatisch hochgeladen.';
            scheduleUpload(100);
          };
          row.append(label,button);host.append(row);
        }
      } catch(error) {host.textContent='Laden fehlgeschlagen: '+readableError(error);}
    };
    onAuthStateChanged(auth,async nextUser=>{
      clearTimeout(timer);timer=null;session++;
      user=nextUser;busy=false;inFlightRead=false;dirty=false;revision=null;setReady(false);
      showAccount();
      if (!user) {
        cloudStatus('Anmelden');
        cloudMessage('Zum automatischen Cloud-Backup einmal mit E-Mail anmelden.');
        return;
      }
      await connect();
    });
    window.addEventListener('online',()=>{
      if (!user) return;
      if (!ready) void connect();
      else if (dirty || hashNow()!==syncedHash) scheduleUpload(1000);
    });
    document.addEventListener('visibilitychange',()=>{
      if (!user) return;
      if (!document.hidden) {
        if (!ready) void connect();
        else if (dirty || hashNow()!==syncedHash) scheduleUpload(1000);
      } else if (ready && dirty) {
        // Best effort only; browsers may suspend the app immediately.
        scheduleUpload(0);
      }
    });
    cloudStatus('Anmelden');
  } catch(error) {
    cloudStatus('Cloud vorübergehend nicht verfügbar');
    cloudMessage('Offline nutzbar. Cloud-Modul: '+readableError(error),true);
  }
}
