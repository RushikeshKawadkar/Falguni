/* ============ data ============ */
const KEY = 'queuenova.v3';
let S = null;
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }

function seed(){
  return {
    nextToken: 25,
    session: { role:null, uid:null },
    doctors: [
      { id:'d1', name:'Dr. Anjali Mehta',  dept:'General Physician',  room:'Room 3', avg:15, available:true,  pin:'1111' },
      { id:'d2', name:'Dr. Salim Qureshi', dept:'Orthopaedics',       room:'Room 7', avg:20, available:true,  pin:'2222' },
      { id:'d3', name:'Dr. Neha Raut',     dept:'Paediatrics',        room:'Room 5', avg:12, available:false, pin:'3333' }
    ],
    nurses: [
      { id:'n1', name:'Nurse Kavita Pawar', shift:'Morning', pin:'1234', active:true },
      { id:'n2', name:'Nurse Imran Shaikh', shift:'Evening', pin:'1234', active:true }
    ],
    adminPin: '0000',
    patients: [
      { id:'p1', name:'Rohit Deshmukh', age:68, sex:'Male',   phone:'9876543210', pin:'1234', blood:'B+',  address:'Dharampeth, Nagpur', allergy:'None',
        reports:[{n:'Blood_Test.pdf', d:'2026-08-02'}],
        history:[{date:'2026-08-04', doctor:'Dr. Anjali Mehta', dx:'Seasonal viral fever', rx:'Paracetamol 500mg, 3 times a day, 3 days', notes:'Rest and drink plenty of fluids.'}] },
      { id:'p2', name:'Sunita Bhoyar', age:46, sex:'Female', phone:'9822011223', pin:'1234', blood:'O+', address:'Sitabuldi, Nagpur', allergy:'Sulpha drugs', reports:[], history:[] },
      { id:'p3', name:'Mohd. Arif',    age:34, sex:'Male',   phone:'9130044556', pin:'1234', blood:'A+', address:'Mominpura, Nagpur', allergy:'None', reports:[], history:[] },
      { id:'p4', name:'Pallavi Kale',  age:22, sex:'Female', phone:'9011778899', pin:'1234', blood:'AB+',address:'Wardha Road, Nagpur', allergy:'None', reports:[], history:[] },
      { id:'p5', name:'Gopal Ingle',   age:71, sex:'Male',   phone:'9764332211', pin:'1234', blood:'B-', address:'Manewada, Nagpur', allergy:'Penicillin', reports:[], history:[] }
    ],
    queue: [
      { tid:'t21', no:21, pid:'p2', did:'d1', status:'consult', prio:false, at:Date.now()-2400000, reason:'Knee pain and swelling' },
      { tid:'t22', no:22, pid:'p3', did:'d1', status:'wait',    prio:false, at:Date.now()-2100000, reason:'Persistent cough' },
      { tid:'t23', no:23, pid:'p4', did:'d1', status:'wait',    prio:false, at:Date.now()-1800000, reason:'Skin rash' },
      { tid:'t24', no:24, pid:'p5', did:'d1', status:'wait',    prio:false, at:Date.now()-1200000, reason:'BP follow-up' }
    ],
    notes: []
  };
}
S = load() || seed();

/* ============ helpers ============ */
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doc = id => S.doctors.find(d=>d.id===id);
const pat = id => S.patients.find(p=>p.id===id);
const tok = id => S.queue.find(t=>t.tid===id);
const me  = () => pat(S.session.uid);
const ST = {
  wait:['Waiting','wait'], called:['Called','called'], consult:['In Consultation','cons'],
  done:['Completed','done'], skip:['Skipped','skip']
};
const tagOf = s => `<span class="tag ${ST[s][1]}">${ST[s][0]}</span>`;
const hhmm = t => new Date(t).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
const sortQ = l => l.slice().sort((a,b)=>(b.prio?1:0)-(a.prio?1:0)||a.no-b.no);
const liveQ = did => sortQ(S.queue.filter(t=>t.did===did && (t.status==='wait'||t.status==='called')));
function ahead(t){ const q=liveQ(t.did); const i=q.findIndex(x=>x.tid===t.tid); return i<0?0:i; }
function waitMin(t){ const d=doc(t.did); return (!d||!d.available) ? null : ahead(t)*d.avg; }
function serving(did){ return S.queue.find(t=>t.did===did && t.status==='consult') || S.queue.filter(t=>t.did===did && t.status==='called').sort((a,b)=>a.no-b.no)[0] || null; }

function notify(pid, title, body){
  S.notes.unshift({ pid, title, body, at:Date.now() });
  save();
  if(S.session.role==='patient' && S.session.uid===pid) toast(title, body);
}
function toast(t,b){
  const e = document.createElement('div');
  e.className = 'toast';
  e.innerHTML = '<div>'+esc(t)+'</div>' + (b?'<small>'+esc(b)+'</small>':'');
  $('toasts').appendChild(e);
  setTimeout(()=>e.remove(), 6500);
}
function turnAlerts(did){
  liveQ(did).forEach((t,i)=>{
    if(i<=1 && !t.alerted){
      t.alerted = true;
      notify(t.pid, 'Your turn is coming soon',
        'Token '+t.no+' — '+(i===0?'you are next':'1 patient ahead of you')+'. Please come to '+doc(did).room+'.');
    }
  });
}
function sheet(h){ $('sheet').innerHTML = h; $('modal').classList.add('on'); }
function closeSheet(){ $('modal').classList.remove('on'); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });

/* ============ login ============ */
function gate(role){
  $('rolePick').style.display = 'none';
  const b = $('loginBox'); b.style.display = 'block';
  const back = '<button class="back" onclick="backHome()">&larr; Back</button>';

  if(role==='patient'){
    b.innerHTML = back + `<div class="card">
      <h3>Patient Login</h3>
      <div class="f" style="margin-top:14px"><label for="lp">Mobile Number</label><input id="lp" type="tel" value="9876543210" inputmode="numeric"></div>
      <div class="f"><label for="lq">4-Digit PIN</label><input id="lq" type="tel" value="1234" inputmode="numeric" maxlength="4"></div>
      <button class="big" onclick="loginPatient()">Log In</button>
      <button class="big grey" style="margin-top:12px" onclick="signupForm()">Create New Account</button>
    </div>`;
  } else if(role==='nurse'){
    b.innerHTML = back + `<div class="card"><h3>Nurse Login</h3>
      <div class="f" style="margin-top:14px"><label for="ln">Select Your Name</label>
        <select id="ln">${S.nurses.filter(n=>n.active).map(n=>`<option value="${n.id}">${esc(n.name)} (${esc(n.shift)})</option>`).join('')}</select></div>
      <div class="f"><label for="lnp">PIN</label><input id="lnp" type="tel" value="1234" maxlength="4" inputmode="numeric"></div>
      <button class="big teal" onclick="loginNurse()">Log In</button></div>`;
  } else if(role==='doctor'){
    b.innerHTML = back + `<div class="card"><h3>Doctor Login</h3>
      <div class="f" style="margin-top:14px"><label for="ld">Select Your Name</label>
        <select id="ld">${S.doctors.map(d=>`<option value="${d.id}">${esc(d.name)} — ${esc(d.dept)}</option>`).join('')}</select></div>
      <div class="f"><label for="ldp">PIN</label><input id="ldp" type="tel" value="1111" maxlength="4" inputmode="numeric"></div>
      <button class="big purple" onclick="loginDoctor()">Log In</button>
      <p style="font-size:14px;color:var(--soft)">PINs: Anjali 1111 &middot; Salim 2222 &middot; Neha 3333</p></div>`;
  } else {
    b.innerHTML = back + `<div class="card"><h3>Admin Login</h3>
      <div class="f" style="margin-top:14px"><label for="lap">PIN</label><input id="lap" type="tel" value="0000" maxlength="4" inputmode="numeric"></div>
      <button class="big orange" onclick="loginAdmin()">Log In</button></div>`;
  }
}
function backHome(){ $('loginBox').style.display='none'; $('rolePick').style.display='block'; }

function loginPatient(){
  const p = S.patients.find(x=>x.phone===$('lp').value.trim() && x.pin===$('lq').value.trim());
  if(!p){ alert('Mobile number or PIN is incorrect. Please try again.'); return; }
  S.session = { role:'patient', uid:p.id }; save(); boot();
}
function signupForm(){
  $('loginBox').innerHTML = `<button class="back" onclick="gate('patient')">&larr; Back</button>
  <div class="card"><h3>Create New Account</h3>
    <div class="f" style="margin-top:14px"><label for="sN">Full Name</label><input id="sN" type="text"></div>
    <div class="two"><div class="f"><label for="sA">Age</label><input id="sA" type="number" inputmode="numeric"></div>
    <div class="f"><label for="sS">Sex</label><select id="sS"><option>Male</option><option>Female</option><option>Other</option></select></div></div>
    <div class="f"><label for="sP">Mobile Number</label><input id="sP" type="tel" inputmode="numeric"></div>
    <div class="f"><label for="sK">Create a 4-Digit PIN</label><input id="sK" type="tel" maxlength="4" inputmode="numeric"></div>
    <button class="big" onclick="doSignup()">Create Account</button></div>`;
}
function doSignup(){
  const n=$('sN').value.trim(), ph=$('sP').value.trim(), k=$('sK').value.trim();
  if(!n || !ph || k.length!==4){ alert('Name, mobile number and a 4-digit PIN are all required.'); return; }
  if(S.patients.some(p=>p.phone===ph)){ alert('This mobile number already has an account. Please log in instead.'); return; }
  const p = { id:'p'+Date.now(), name:n, age:$('sA').value, sex:$('sS').value, phone:ph, pin:k, blood:'', address:'', allergy:'None', reports:[], history:[] };
  S.patients.push(p); S.session = { role:'patient', uid:p.id }; save(); boot();
}
function loginNurse(){
  const n = S.nurses.find(x=>x.id===$('ln').value);
  if(n.pin !== $('lnp').value.trim()){ alert('Incorrect PIN.'); return; }
  S.session = { role:'nurse', uid:n.id }; save(); boot();
}
function loginDoctor(){
  const d = doc($('ld').value);
  if(d.pin !== $('ldp').value.trim()){ alert('Incorrect PIN.'); return; }
  S.session = { role:'doctor', uid:d.id }; save(); boot();
}
function loginAdmin(){
  if($('lap').value.trim() !== S.adminPin){ alert('Incorrect PIN.'); return; }
  S.session = { role:'admin', uid:null }; save(); boot();
}
function signOut(){
  if(!confirm('Are you sure you want to sign out?')) return;
  S.session = { role:null, uid:null }; save(); location.reload();
}

/* ============ shell ============ */
const TABS = {
  patient: [['pHome','My Token','🎫'],['pBook','New Token','➕'],['pFiles','My Reports','📄'],['pMe','My Details','👤']],
  nurse:   [['nQ','Queue','📋'],['nNew','New Patient','➕'],['nDoc','Doctors','🩺']],
  doctor:  [['dNow','Current Patient','🧑'],['dQ','My Queue','📋']],
  admin:   [['aStat','Statistics','📊'],['aDoc','Doctors','🩺'],['aNur','Nurses','👩\u200d⚕️'],['aPat','Patients','🧑'],['aFlow','System Flow','🔁']]
};
let page = '';

function boot(){
  const r = S.session.role;
  $('home').style.display = r ? 'none' : 'flex';
  $('app').style.display = r ? 'block' : 'none';
  if(!r) return;
  const nm = { patient:()=>me().name, nurse:()=>S.nurses.find(n=>n.id===S.session.uid).name,
    doctor:()=>doc(S.session.uid).name, admin:()=>'Administrator' }[r]();
  const rl = { patient:'Patient', nurse:'Nurse', doctor:'Doctor', admin:'Admin' }[r];
  $('barName').textContent = nm; $('barRole').textContent = rl;
  $('tabs').innerHTML = TABS[r].map(t=>`<button id="tab_${t[0]}" onclick="go('${t[0]}')"><span class="ic">${t[2]}</span>${t[1]}</button>`).join('');
  go(TABS[r][0][0]);
}
function go(p){
  page = p;
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('sel'));
  const b = $('tab_'+p); if(b) b.classList.add('sel');
  render(); window.scrollTo(0,0);
}
function render(){ $('view').innerHTML = (P[page] || (()=>''))(); }
function H(t,s){ return `<h2 style="font-size:25px;margin-bottom:4px">${esc(t)}</h2><p style="color:var(--soft);font-size:16px;margin:0 0 18px">${esc(s||'')}</p>`; }

const P = {};

/* ============ PATIENT ============ */
const myLive = () => S.queue.filter(t=>t.pid===S.session.uid).find(t=>t.status==='wait'||t.status==='called'||t.status==='consult');

P.pHome = function(){
  const p = me(), t = myLive();
  if(!t) return H('Hello, '+p.name.split(' ')[0], "You don't have an active token right now.") +
    `<div class="card" style="text-align:center">
      <div style="font-size:56px">🎫</div>
      <h3 style="margin:8px 0 6px">No Token Today</h3>
      <p style="font-size:16px;color:var(--soft);margin:0 0 18px">Tap below to get a token for a doctor. Your number is generated instantly.</p>
      <button class="big" onclick="go('pBook')">➕ Get New Token</button></div>`;

  const d = doc(t.did), a = ahead(t), w = waitMin(t), ns = serving(t.did), q = liveQ(t.did);
  let msg;
  if(t.status==='consult') msg = `<div class="msg ok">✅ It's your turn right now. Please go to ${esc(d.room)}.</div>`;
  else if(!d.available) msg = `<div class="msg bad">⏸ The doctor is unavailable right now. Your token is safe — please wait a little.</div>`;
  else if(a<=1 || t.status==='called') msg = `<div class="msg">🔔 Your turn is coming soon. Please reach ${esc(d.room)} now.</div>`;
  else msg = `<div class="msg ok">🏠 You can stay at home. You'll get an alert here when your turn is close.</div>`;

  return H('Hello, '+p.name.split(' ')[0], 'Your token and queue status') +
  `<div class="token"><div class="lab">YOUR TOKEN NUMBER</div><div class="no">${t.no}</div>
    <div class="sub">${esc(d.name)} &middot; ${esc(d.room)}</div></div>
  <div class="two-box">
    <div class="box"><div class="n">${ns?ns.no:'—'}</div><div class="t">Now Serving</div></div>
    <div class="box hi"><div class="n">${t.status==='consult'?0:(w===null?'—':w)}</div><div class="t">Minutes Estimated Wait</div></div>
  </div>
  ${msg}
  <div class="card"><h3>${t.status==='consult'?0:a} patient(s) ahead of you</h3>
    <div class="qrow" style="margin-top:12px">${ns?`<span class="qn now">${ns.no}</span>`:''}${q.map(x=>`<span class="qn ${x.tid===t.tid?'me':''}">${x.no}</span>`).join('')}</div>
    <p style="font-size:14.5px;color:var(--soft);margin:12px 0 0">Green = being served now, orange = your token.</p>
    <div class="stack" style="margin-top:16px">
      <button class="big grey" onclick="render()">🔄 Refresh</button>
      ${t.status==='wait'?`<button class="big red out" onclick="cancelTok('${t.tid}')">Cancel My Token</button>`:''}
    </div></div>
  ${S.notes.filter(n=>n.pid===p.id).length ? `<div class="card"><h3>Notifications</h3>
    ${S.notes.filter(n=>n.pid===p.id).slice(0,4).map(n=>`<div style="border-top:1px solid var(--line);padding:12px 0">
      <b style="font-size:16.5px">${esc(n.title)}</b><div style="font-size:15px;color:var(--soft)">${esc(n.body)}</div>
      <div style="font-size:13px;color:var(--soft)">${hhmm(n.at)}</div></div>`).join('')}</div>` : ''}`;
};
function cancelTok(tid){
  if(!confirm('Cancel this token? You will need to book again for a new number.')) return;
  S.queue = S.queue.filter(t=>t.tid!==tid); save(); render();
}

P.pBook = function(){
  if(myLive()) return H('New Token', 'You already have an active token.') +
    `<div class="msg">You already have a token in progress. Please complete or cancel it first.</div>
     <button class="big" onclick="go('pHome')">View My Token</button>`;
  return H('Get a New Token', 'Pick a doctor — your number is generated instantly.') +
  S.doctors.map(d=>`<div class="item">
    <div class="top"><span style="font-size:32px">🩺</span>
      <span><span class="nm">${esc(d.name)}</span><span class="dt">${esc(d.dept)} &middot; ${esc(d.room)}</span></span></div>
    <div style="margin-top:10px"><span class="tag ${d.available?'on':'off'}">${d.available?'Available':'Unavailable'}</span>
      <span class="tag">${liveQ(d.id).length} in queue</span>
      <span class="tag">~${liveQ(d.id).length*d.avg} min</span></div>
    <div class="acts">${d.available?`<button class="big teal" onclick="bookSheet('${d.id}')">Book with this doctor</button>`:`<button class="big grey" disabled>Currently Unavailable</button>`}</div>
  </div>`).join('');
};
function bookSheet(did){
  const d = doc(did);
  sheet(`<h3 style="font-size:22px">${esc(d.name)}</h3>
    <p style="color:var(--soft);font-size:16px">${esc(d.dept)} &middot; ${esc(d.room)}</p>
    <div class="f" style="margin-top:16px"><label for="bR">What's the problem?</label>
      <input id="bR" type="text" placeholder="e.g. Fever for 3 days"></div>
    <p style="font-size:16px">Name: <b>${esc(me().name)}</b> &middot; Age ${esc(me().age)} &middot; ${esc(me().phone)}</p>
    <div class="stack" style="margin-top:14px">
      <button class="big" onclick="doBook('${did}')">✅ Confirm Token</button>
      <button class="big grey" onclick="closeSheet()">Cancel</button></div>`);
}
function doBook(did){
  const d = doc(did);
  const t = { tid:'t'+Date.now(), no:S.nextToken++, pid:S.session.uid, did, status:'wait', prio:false, at:Date.now(), reason:$('bR').value.trim()||'General check-up' };
  S.queue.push(t);
  const w = waitMin(t);
  notify(t.pid, 'Your token number is '+t.no, 'Estimated waiting time: '+w+' minutes. You can wait at home.');
  save(); closeSheet(); go('pHome');
}

P.pFiles = function(){
  const p = me();
  return H('My Reports', 'Upload a report so the doctor can see it directly.') +
  `<div class="card"><h3>Add a New Report</h3>
    <input id="upl" type="file" accept=".pdf,image/*" onchange="addRep(this)" style="margin-top:12px">
    <p style="font-size:14px;color:var(--soft);margin:10px 0 0">Photos or PDFs are both fine.</p></div>
  ${p.reports.length ? p.reports.map((r,i)=>`<div class="item"><div class="top"><span style="font-size:28px">📄</span>
    <span><span class="nm">${esc(r.n)}</span><span class="dt">${esc(r.d)}</span></span></div>
    <div class="acts"><button class="mid no" onclick="delRep(${i})">Remove</button></div></div>`).join('')
   : '<div class="card"><p style="color:var(--soft);margin:0">No reports uploaded yet.</p></div>'}
  <h3 style="font-size:22px;margin:24px 0 12px">Past Consultation Records</h3>
  ${p.history.length ? p.history.slice().reverse().map(h=>`<div class="card">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <b style="font-size:18px">${esc(h.doctor)}</b><span class="tag">${esc(h.date)}</span></div>
    <p style="margin:12px 0 0"><span style="color:var(--soft);font-size:14px">Diagnosis</span><br>${esc(h.dx)}</p>
    <p style="margin:12px 0 0"><span style="color:var(--soft);font-size:14px">Prescription</span><br>${esc(h.rx)}</p>
    ${h.notes?`<p style="margin:12px 0 0"><span style="color:var(--soft);font-size:14px">Notes</span><br>${esc(h.notes)}</p>`:''}</div>`).join('')
   : '<div class="card"><p style="color:var(--soft);margin:0">No previous visits recorded.</p></div>'}`;
};
function addRep(i){
  const f = i.files[0]; if(!f) return;
  me().reports.push({ n:f.name, d:new Date().toISOString().slice(0,10) });
  save(); render(); toast('Report added', f.name);
}
function delRep(i){ me().reports.splice(i,1); save(); render(); }

P.pMe = function(){
  const p = me();
  return H('My Details', 'This information is visible to the doctor and nurse.') +
  `<div class="card">
    <div class="f"><label for="mN">Full Name</label><input id="mN" type="text" value="${esc(p.name)}"></div>
    <div class="two"><div class="f"><label for="mA">Age</label><input id="mA" type="number" value="${esc(p.age)}"></div>
    <div class="f"><label for="mS">Sex</label><select id="mS">${['Male','Female','Other'].map(x=>`<option ${p.sex===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
    <div class="f"><label for="mP">Mobile Number</label><input id="mP" type="tel" value="${esc(p.phone)}"></div>
    <div class="f"><label for="mB">Blood Group</label><input id="mB" type="text" value="${esc(p.blood)}" placeholder="e.g. B+"></div>
    <div class="f"><label for="mL">Any Allergies?</label><input id="mL" type="text" value="${esc(p.allergy)}" placeholder="None"></div>
    <div class="f"><label for="mD">Address</label><input id="mD" type="text" value="${esc(p.address)}"></div>
    <button class="big" onclick="saveMe()">💾 Save Details</button></div>`;
};
function saveMe(){
  const p = me();
  p.name=$('mN').value.trim()||p.name; p.age=$('mA').value; p.sex=$('mS').value; p.phone=$('mP').value.trim();
  p.blood=$('mB').value.trim(); p.allergy=$('mL').value.trim(); p.address=$('mD').value.trim();
  save(); boot(); toast('Saved successfully','');
}

/* ============ NURSE ============ */
P.nQ = function(){
  let out = H("Today's Queue", 'Call tokens and send patients in.');
  S.doctors.forEach(d=>{
    const q = S.queue.filter(t=>t.did===d.id), live = liveQ(d.id), cur = S.queue.find(t=>t.did===d.id && t.status==='consult');
    out += `<div class="card">
      <h3>${esc(d.name)} <span style="font-weight:400;color:var(--soft);font-size:15px">${esc(d.room)}</span></h3>
      <div style="margin:10px 0"><span class="tag ${d.available?'on':'off'}">${d.available?'Available':'Unavailable'}</span>
        <span class="tag">Now serving ${cur?cur.no:'—'}</span><span class="tag">${live.length} waiting</span></div>
      <button class="big teal" ${live.length && d.available ? '' : 'disabled'} onclick="callNext('${d.id}')">🔔 Call Next Token</button>
      ${live.length ? `<button class="big red out" style="margin-top:10px" onclick="skipNext('${d.id}')">Skip Next Token</button>` : ''}
    </div>`;
    out += q.length ? sortQ(q).map(t=>{ const p = pat(t.pid); return `<div class="item ${t.status==='consult'?'now':''}">
      <div class="top"><span class="tno">${t.no}</span>
        <span><span class="nm">${esc(p.name)}${t.prio?' <span class="tag prio">Priority</span>':''}</span>
        <span class="dt">${esc(p.age)} yrs &middot; ${esc(p.sex)} &middot; ${esc(p.phone)}</span>
        <span class="dt">Reason: ${esc(t.reason)}</span></span></div>
      <div style="margin-top:10px">${tagOf(t.status)} ${t.status==='wait' && waitMin(t)!==null ? `<span class="tag">~${waitMin(t)} min</span>` : ''}</div>
      <div class="acts">
        ${t.status==='wait' ? `<button class="mid go" onclick="setSt('${t.tid}','called')">Call</button>` : ''}
        ${t.status==='called' ? `<button class="mid go" onclick="setSt('${t.tid}','consult')">Send In</button>` : ''}
        ${t.status==='skip' ? `<button class="mid" onclick="setSt('${t.tid}','wait')">Restore</button>` : ''}
        ${(t.status==='wait'||t.status==='called') ? `<button class="mid ${t.prio?'no':''}" onclick="prio('${t.tid}')">${t.prio?'Remove Priority':'Emergency'}</button>` : ''}
        <button class="mid" onclick="showPat('${p.id}')">Full Details</button>
      </div></div>`; }).join('') : '<div class="card"><p style="margin:0;color:var(--soft)">No tokens for this doctor today.</p></div>';
  });
  return out;
};
function setSt(tid, s){
  const t = tok(tid); t.status = s;
  if(s==='called') notify(t.pid, 'Token '+t.no+' called', 'Please come to '+doc(t.did).room+' now.');
  if(s==='skip') notify(t.pid, 'Token '+t.no+' skipped', 'You were not present when called. Please see the nurse to rejoin the queue.');
  if(s==='wait') t.alerted = false;
  save(); turnAlerts(t.did); save(); render();
}
function callNext(did){
  const q = liveQ(did), n = q.find(t=>t.status==='wait') || q[0]; if(!n) return;
  const cur = S.queue.find(t=>t.did===did && t.status==='consult');
  if(cur && !confirm('Token '+cur.no+' is still with the doctor. Call the next one anyway?')) return;
  setSt(n.tid, 'called');
}
function skipNext(did){ const n = liveQ(did)[0]; if(n && confirm('Skip token '+n.no+'?')) setSt(n.tid, 'skip'); }
function prio(tid){
  const t = tok(tid); t.prio = !t.prio;
  if(t.prio) notify(t.pid, 'You have been moved up', 'Token '+t.no+' is marked as an emergency and will be seen sooner.');
  save(); turnAlerts(t.did); save(); render();
}

P.nNew = function(){
  return H('New Patient / Walk-In', 'Give a token to a patient arriving at the counter.') +
  `<div class="card"><h3>Existing Patient — Direct Token</h3>
    <div class="f" style="margin-top:14px"><label for="wP">Select Patient</label>
      <select id="wP">${S.patients.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.phone)}</option>`).join('')}</select></div>
    <div class="f"><label for="wD">Doctor</label>
      <select id="wD">${S.doctors.map(d=>`<option value="${d.id}" ${d.available?'':'disabled'}>${esc(d.name)}${d.available?'':' (unavailable)'}</option>`).join('')}</select></div>
    <div class="f"><label for="wR">Reason</label><input id="wR" type="text" placeholder="e.g. Dressing change"></div>
    <label style="display:flex;gap:12px;align-items:center;font-size:16px"><input type="checkbox" id="wE" style="width:22px;height:22px"> Emergency — put ahead of the queue</label>
    <button class="big orange" style="margin-top:16px" onclick="walkIn()">🎫 Generate Token</button></div>
  <div class="card"><h3>Brand New Patient</h3>
    <div class="f" style="margin-top:14px"><label for="wN">Name</label><input id="wN" type="text"></div>
    <div class="two"><div class="f"><label for="wA">Age</label><input id="wA" type="number"></div>
    <div class="f"><label for="wS">Sex</label><select id="wS"><option>Male</option><option>Female</option><option>Other</option></select></div></div>
    <div class="f"><label for="wM">Mobile Number</label><input id="wM" type="tel"></div>
    <button class="big out" onclick="addPat()">Add Patient</button>
    <p style="font-size:14px;color:var(--soft);margin:10px 0 0">Their PIN will be 1234 — they can log in later.</p></div>`;
};
function walkIn(){
  const did = $('wD').value, d = doc(did);
  if(!d.available){ alert('This doctor is currently unavailable.'); return; }
  const pid = $('wP').value;
  const t = { tid:'t'+Date.now(), no:S.nextToken++, pid, did, status:'wait', prio:$('wE').checked, at:Date.now(), reason:$('wR').value.trim()||'Walk-in' };
  S.queue.push(t);
  notify(pid, 'Your token number is '+t.no, 'Estimated waiting time: '+waitMin(t)+' minutes at '+d.room+'.');
  save(); toast('Token '+t.no+' generated', pat(pid).name); go('nQ');
}
function addPat(){
  const n = $('wN').value.trim(), m = $('wM').value.trim();
  if(!n || !m){ alert('Name and mobile number are required.'); return; }
  S.patients.push({ id:'p'+Date.now(), name:n, age:$('wA').value, sex:$('wS').value, phone:m, pin:'1234', blood:'', address:'', allergy:'None', reports:[], history:[] });
  save(); render(); toast('Patient added', n);
}

P.nDoc = function(){
  return H('Doctor Availability', 'If a doctor steps out, pause their queue from here.') +
  S.doctors.map(d=>`<div class="item"><div class="top"><span style="font-size:30px">🩺</span>
    <span><span class="nm">${esc(d.name)}</span><span class="dt">${esc(d.dept)} &middot; ${esc(d.room)}</span></span></div>
    <div style="margin-top:10px"><span class="tag ${d.available?'on':'off'}">${d.available?'Available':'Unavailable'}</span>
      <span class="tag">${liveQ(d.id).length} waiting</span></div>
    <div class="acts"><button class="mid ${d.available?'no':'go'}" onclick="togDoc('${d.id}')">${d.available?'Mark Unavailable':'Mark Available'}</button></div></div>`).join('');
};
function togDoc(did){
  const d = doc(did); d.available = !d.available;
  liveQ(did).forEach(t=>notify(t.pid, d.available?'Queue has resumed':'Queue paused briefly',
    d.name + (d.available ? ' is seeing patients again. Your token keeps its place.' : ' is unavailable for a short while. Your token is safe.')));
  save(); render();
}

/* ============ DOCTOR ============ */
P.dNow = function(){
  const d = doc(S.session.uid), cur = S.queue.find(t=>t.did===d.id && t.status==='consult');
  if(!cur) return H('Current Patient', 'No one is in the room right now.') +
    `<div class="card" style="text-align:center"><div style="font-size:52px">🪑</div>
      <h3 style="margin:8px 0 6px">No Patient Inside</h3>
      <p style="color:var(--soft);font-size:16px;margin:0 0 16px">The nurse will verify and send in the next patient.</p>
      <button class="big grey" onclick="go('dQ')">View My Queue</button></div>`;
  const p = pat(cur.pid);
  return H('Current Patient', esc(d.room) + ' &middot; ' + liveQ(d.id).length + ' waiting outside') +
  `<div class="token"><div class="lab">TOKEN</div><div class="no">${cur.no}</div>
    <div class="sub">${esc(p.name)} &middot; ${esc(p.age)} yrs &middot; ${esc(p.sex)}</div></div>
  <div class="card"><h3>Reason for Visit</h3><p style="font-size:19px;margin:6px 0 0">${esc(cur.reason)}</p>
    <div style="margin-top:12px"><span class="tag">Blood ${esc(p.blood||'—')}</span>
      <span class="tag ${p.allergy && p.allergy!=='None' ? 'off':''}">Allergy: ${esc(p.allergy||'None')}</span>
      <span class="tag">${p.history.length} past visits</span><span class="tag">${p.reports.length} reports</span></div>
    <div class="stack" style="margin-top:16px">
      <button class="big purple" onclick="consForm('${cur.tid}')">📝 Record Consultation &amp; Complete</button>
      <button class="big grey" onclick="showPat('${p.id}')">View Past Records</button></div></div>`;
};
P.dQ = function(){
  const d = doc(S.session.uid), q = S.queue.filter(t=>t.did===d.id);
  return H('My Queue', esc(d.dept) + ' &middot; ' + esc(d.room)) +
  (q.length ? sortQ(q).map(t=>{ const p = pat(t.pid); return `<div class="item ${t.status==='consult'?'now':''}">
    <div class="top"><span class="tno">${t.no}</span><span>
      <span class="nm">${esc(p.name)}${t.prio?' <span class="tag prio">Priority</span>':''}</span>
      <span class="dt">${esc(p.age)} yrs &middot; ${esc(p.sex)}</span>
      <span class="dt">Reason: ${esc(t.reason)}</span></span></div>
    <div style="margin-top:10px">${tagOf(t.status)} <span class="tag">${p.history.length} visits &middot; ${p.reports.length} reports</span></div>
    <div class="acts"><button class="mid" onclick="showPat('${p.id}')">Details</button>
      ${t.status==='consult' ? `<button class="mid go" onclick="consForm('${t.tid}')">Consult</button>` : ''}</div></div>`; }).join('')
   : '<div class="card"><p style="margin:0;color:var(--soft)">No tokens for you today.</p></div>');
};
function showPat(pid){
  const p = pat(pid);
  sheet(`<h3 style="font-size:23px">${esc(p.name)}</h3>
    <p style="color:var(--soft);font-size:16px;margin:4px 0 12px">${esc(p.age)} yrs &middot; ${esc(p.sex)} &middot; ${esc(p.phone)}</p>
    <div><span class="tag">Blood ${esc(p.blood||'—')}</span> <span class="tag">Allergy: ${esc(p.allergy||'None')}</span></div>
    <p style="margin:14px 0 0"><span style="color:var(--soft);font-size:14px">Address</span><br>${esc(p.address||'Not recorded')}</p>
    <p style="margin:14px 0 4px;color:var(--soft);font-size:14px">Reports</p>
    ${p.reports.length ? p.reports.map(r=>`<div>📄 ${esc(r.n)} <span style="color:var(--soft)">(${esc(r.d)})</span></div>`).join('') : '<div style="color:var(--soft)">None</div>'}
    <p style="margin:16px 0 4px;color:var(--soft);font-size:14px">Past Consultations</p>
    ${p.history.length ? p.history.slice().reverse().map(h=>`<div style="border-top:1px solid var(--line);padding:12px 0">
      <b>${esc(h.date)} — ${esc(h.doctor)}</b><div>${esc(h.dx)}</div>
      <div style="color:var(--soft)">${esc(h.rx)}</div>${h.notes?`<div style="color:var(--soft)">${esc(h.notes)}</div>`:''}</div>`).join('') : '<div style="color:var(--soft)">No previous records</div>'}
    <button class="big grey" style="margin-top:16px" onclick="closeSheet()">Close</button>`);
}
function consForm(tid){
  const t = tok(tid), p = pat(t.pid);
  sheet(`<h3 style="font-size:22px">Token ${t.no} — ${esc(p.name)}</h3>
    <p style="color:var(--soft);font-size:16px">Allergy: ${esc(p.allergy||'None')}</p>
    <div class="f" style="margin-top:14px"><label for="cD">Diagnosis</label><input id="cD" type="text" placeholder="e.g. Throat infection"></div>
    <div class="f"><label for="cR">Prescription</label><textarea id="cR" placeholder="Medicine, dosage, duration"></textarea></div>
    <div class="f"><label for="cN">Notes / Advice</label><textarea id="cN" placeholder="Tests, follow-up date"></textarea></div>
    <div class="stack"><button class="big" onclick="finish('${tid}')">✅ Save &amp; Complete Token</button>
    <button class="big grey" onclick="closeSheet()">Cancel</button></div>`);
}
function finish(tid){
  const t = tok(tid), p = pat(t.pid), dx = $('cD').value.trim();
  if(!dx){ alert('Diagnosis is required before completing the token.'); return; }
  p.history.push({ date:new Date().toISOString().slice(0,10), doctor:doc(t.did).name, dx, rx:$('cR').value.trim()||'No medication prescribed', notes:$('cN').value.trim() });
  t.status = 'done';
  notify(p.id, 'Your consultation is complete', 'Token '+t.no+' is closed. See prescription and notes under "My Reports".');
  save(); turnAlerts(t.did); save(); closeSheet(); render(); toast('Token '+t.no+' completed', p.name);
}

/* ============ ADMIN ============ */
P.aStat = function(){
  const done = S.queue.filter(t=>t.status==='done').length, live = S.queue.filter(t=>t.status==='wait'||t.status==='called').length;
  const sk = S.queue.filter(t=>t.status==='skip').length;
  const a = S.queue.filter(t=>t.status==='wait').map(waitMin).filter(x=>x!==null);
  const avg = a.length ? Math.round(a.reduce((x,y)=>x+y,0)/a.length) : 0;
  return H("Today's Statistics", 'How the OPD is running right now.') +
  `<div class="two-box"><div class="box"><div class="n">${S.queue.length}</div><div class="t">Tokens Issued</div></div>
   <div class="box"><div class="n">${live}</div><div class="t">Currently Waiting</div></div></div>
   <div class="two-box"><div class="box"><div class="n">${done}</div><div class="t">Completed</div></div>
   <div class="box hi"><div class="n">${avg}</div><div class="t">Avg Wait (min)</div></div></div>
   <div class="two-box"><div class="box"><div class="n">${sk}</div><div class="t">Skipped Tokens</div></div>
   <div class="box"><div class="n">${S.patients.length}</div><div class="t">Total Patients</div></div></div>
   <div class="card"><h3>Load Per Doctor</h3><div class="tw"><table>
     <tr><th>Doctor</th><th>Status</th><th>Waiting</th><th>Done</th></tr>
     ${S.doctors.map(d=>`<tr><td>${esc(d.name)}<div style="font-size:13px;color:var(--soft)">${esc(d.dept)}</div></td>
       <td><span class="tag ${d.available?'on':'off'}">${d.available?'Available':'No'}</span></td>
       <td>${liveQ(d.id).length}</td><td>${S.queue.filter(t=>t.did===d.id && t.status==='done').length}</td></tr>`).join('')}
   </table></div></div>
   <div class="card"><h3>All Tokens Today</h3><div class="tw"><table>
     <tr><th>No.</th><th>Patient</th><th>Doctor</th><th>Time</th><th>Status</th></tr>
     ${S.queue.slice().sort((a,b)=>b.at-a.at).map(t=>`<tr><td><b>${t.no}</b></td><td>${esc(pat(t.pid)?pat(t.pid).name:'—')}</td>
       <td>${esc(doc(t.did).name)}</td><td>${hhmm(t.at)}</td><td>${tagOf(t.status)}</td></tr>`).join('')}
   </table></div></div>
   <button class="big grey" onclick="resetAll()">Reset Demo Data</button>`;
};
function resetAll(){ if(confirm('Clear everything and reload sample data?')){ S = seed(); save(); location.reload(); } }

P.aDoc = function(){
  return H('Doctors', 'Profiles, timing and availability.') +
  S.doctors.map(d=>`<div class="item"><div class="top"><span style="font-size:30px">🩺</span>
    <span><span class="nm">${esc(d.name)}</span><span class="dt">${esc(d.dept)} &middot; ${esc(d.room)} &middot; PIN ${esc(d.pin)}</span></span></div>
    <div style="margin-top:10px"><span class="tag ${d.available?'on':'off'}">${d.available?'Available':'No'}</span>
      <span class="tag">~${d.avg} min/patient</span></div>
    <div class="acts"><button class="mid" onclick="togDoc('${d.id}')">Toggle Availability</button>
      <button class="mid no" onclick="delDoc('${d.id}')">Remove</button></div></div>`).join('') +
  `<div class="card"><h3>Add a New Doctor</h3>
    <div class="f" style="margin-top:14px"><label for="adN">Name</label><input id="adN" type="text" placeholder="Dr. "></div>
    <div class="f"><label for="adD">Department</label><input id="adD" type="text" placeholder="e.g. ENT"></div>
    <div class="two"><div class="f"><label for="adR">Room</label><input id="adR" type="text" placeholder="Room 9"></div>
    <div class="f"><label for="adT">Minutes per Patient</label><input id="adT" type="number" value="15"></div></div>
    <div class="f"><label for="adP">PIN</label><input id="adP" type="tel" maxlength="4" value="4444"></div>
    <button class="big" onclick="addDoc()">Add Doctor</button></div>`;
};
function addDoc(){
  const n = $('adN').value.trim(); if(!n){ alert('Please enter a name.'); return; }
  S.doctors.push({ id:'d'+Date.now(), name:n, dept:$('adD').value.trim()||'General', room:$('adR').value.trim()||'Room',
    avg:Number($('adT').value)||15, available:true, pin:$('adP').value.trim()||'4444' });
  save(); render(); toast('Doctor added', n);
}
function delDoc(id){ if(confirm('Remove this doctor?')){ S.doctors = S.doctors.filter(d=>d.id!==id); S.queue = S.queue.filter(t=>t.did!==id); save(); render(); } }

P.aNur = function(){
  return H('Nurses', 'Counter staff accounts.') +
  S.nurses.map(n=>`<div class="item"><div class="top"><span style="font-size:30px">👩\u200d⚕️</span>
    <span><span class="nm">${esc(n.name)}</span><span class="dt">${esc(n.shift)} shift &middot; PIN ${esc(n.pin)}</span></span></div>
    <div style="margin-top:10px"><span class="tag ${n.active?'on':'off'}">${n.active?'Active':'Disabled'}</span></div>
    <div class="acts"><button class="mid" onclick="togNur('${n.id}')">${n.active?'Disable':'Enable'}</button>
      <button class="mid no" onclick="delNur('${n.id}')">Remove</button></div></div>`).join('') +
  `<div class="card"><h3>Add a New Nurse</h3>
    <div class="f" style="margin-top:14px"><label for="anN">Name</label><input id="anN" type="text"></div>
    <div class="f"><label for="anS">Shift</label><select id="anS"><option>Morning</option><option>Evening</option><option>Night</option></select></div>
    <button class="big" onclick="addNur()">Add Nurse</button></div>`;
};
function togNur(id){ const n = S.nurses.find(x=>x.id===id); n.active = !n.active; save(); render(); }
function delNur(id){ if(confirm('Remove this account?')){ S.nurses = S.nurses.filter(x=>x.id!==id); save(); render(); } }
function addNur(){
  const n = $('anN').value.trim(); if(!n){ alert('Please enter a name.'); return; }
  S.nurses.push({ id:'n'+Date.now(), name:n, shift:$('anS').value, pin:'1234', active:true });
  save(); render(); toast('Nurse added', n);
}

P.aPat = function(){
  return H('Patients', 'All registered patient accounts.') +
  S.patients.map(p=>`<div class="item"><div class="top"><span style="font-size:30px">🧑</span>
    <span><span class="nm">${esc(p.name)}</span><span class="dt">${esc(p.age)} yrs &middot; ${esc(p.sex)} &middot; ${esc(p.phone)}</span>
    <span class="dt">${p.history.length} visits &middot; ${p.reports.length} reports</span></span></div>
    <div class="acts"><button class="mid" onclick="showPat('${p.id}')">Details</button>
      <button class="mid no" onclick="delPat('${p.id}')">Remove</button></div></div>`).join('');
};
function delPat(id){
  if(confirm('Remove this patient and their tokens?')){
    S.patients = S.patients.filter(p=>p.id!==id); S.queue = S.queue.filter(t=>t.pid!==id); save(); render();
  }
}

P.aFlow = function(){
  const n = [
    ['START','t'],['Patient creates account / logs in',''],['Registers for OPD check-up',''],
    ['Enters patient details',''],['Confirms registration',''],['System generates token number',''],
    ['Estimated waiting time is calculated',''],['Notification: "Your token no. is 25 — est. wait 45 min"','k'],
    ['Patient can stay at home / nearby',''],['Live queue updates',''],
    ['Notification: "Your turn is coming soon"','k'],['Patient comes to the clinic',''],
    ['NURSE DASHBOARD','k'],['Nurse verifies patient / token',''],['Nurse manages the OPD queue',''],
    ['Patient added to active queue',''],['DOCTOR DASHBOARD','k'],['Doctor views details, history and reports',''],
    ['Doctor calls token no. 25',''],['OPD consultation',''],['Doctor records consultation details',''],
    ['Token marked completed',''],['Patient dashboard updated',''],['Patient views consultation details',''],
    ['Records saved in the database',''],['END','t']
  ];
  return H('How the System Works', 'The complete flow, from account to saved record.') +
  `<div class="card"><div class="flow">${n.map((x,i)=>`<div class="fn ${x[1]}">${esc(x[0])}</div>${i<n.length-1?'<div class="fa"></div>':''}`).join('')}</div></div>`;
};

boot();
