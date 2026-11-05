/* ---------- Study storage. LocalDemoStudyStorage keeps everything in this browser's localStorage, which also lets
   a participant resume in the same browser. ServerStudyStorage (below) also sends finished answers to the team's
   server, and is used whenever the site has a server address. ---------- */
const STUDY_VERSION='securecode-study-0.1';
const CONSENT_VERSION='draft-consent-0.3';
const STORE_KEY='sc-study-v1';
const CODE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function codeCheckChar(body){let s=0;for(const [i,c] of [...body].entries())s+=(CODE_ALPHABET.indexOf(c)+1)*(i+3);return CODE_ALPHABET[s%CODE_ALPHABET.length]}
function newParticipantCode(){
 const r=crypto.getRandomValues(new Uint8Array(7));
 const body=[...r].map(b=>CODE_ALPHABET[b%CODE_ALPHABET.length]).join('');
 const full=body+codeCheckChar(body);
 return 'SC-'+full.slice(0,4)+'-'+full.slice(4);
}
function normalizeCode(raw){
 const s=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^SC/,'');
 if(s.length!==8||[...s].some(c=>!CODE_ALPHABET.includes(c)))return null;
 if(codeCheckChar(s.slice(0,7))!==s[7])return null;
 return 'SC-'+s.slice(0,4)+'-'+s.slice(4);
}

class LocalDemoStudyStorage{
 constructor(){this.kind='local-demo';this.centralized=false}
 _read(){try{return JSON.parse(localStorage.getItem(STORE_KEY))||this._empty()}catch(e){return this._empty()}}
 _empty(){return {schema:1,participants:{},attempts:{},experience:{},allocation:[]}}
 _write(db){localStorage.setItem(STORE_KEY,JSON.stringify(db))}
 available(){try{localStorage.setItem(STORE_KEY+'-probe','1');localStorage.removeItem(STORE_KEY+'-probe');return true}catch(e){return false}}
 /* Fallback if the server can't be reached: permuted blocks of four (two AI, two no-AI) drawn with crypto randomness.
    Balanced only within this browser. The assignment method is stored, so these participants can be identified. */
 _nextCondition(db){
  if(!db.allocation.length){const b=['ai','ai','control','control'];
   for(let i=b.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[b[i],b[j]]=[b[j],b[i]]}
   db.allocation=b}
  return db.allocation.shift();
 }
 async createParticipant({consentVersion,assign}){
  let db=this._read();let code;do code=newParticipantCode();while(db.participants[code]);
  const assigned=assign?await assign(code):null;
  db=this._read();
  const condition=assigned||this._nextCondition(db);
  db.participants[code]={participant_code:code,consent_version:consentVersion,consent_status:'agreed',assigned_condition:condition,
   assignment_method:assigned?'server_balanced':'local_demo_permuted_block_4',study_version:STUDY_VERSION,created_at:new Date().toISOString(),lesson_state:null};
  this._write(db);return db.participants[code];
 }
 /* Used for test links such as ?group=ai, so their attempts are still labelled. */
 async ensureParticipant(code,condition,method){
  const db=this._read();
  if(!db.participants[code]){db.participants[code]={participant_code:code,consent_version:null,consent_status:'not_recorded_test_link',assigned_condition:condition,
   assignment_method:method,study_version:STUDY_VERSION,created_at:new Date().toISOString(),lesson_state:null};this._write(db)}
  return db.participants[code];
 }
 async findParticipant(code){return this._read().participants[code]||null}
 saveLessonState(code,state){
  const db=this._read();if(!db.participants[code])return;
  const {queue,...rest}=state;db.participants[code].lesson_state=rest;this._write(db);
 }
 async getAttempt(code,phase){return Object.values(this._read().attempts).find(a=>a.participant_code===code&&a.phase===phase)||null}
 async startAttempt(code,phase,formVersion){
  const db=this._read();
  const existing=Object.values(db.attempts).find(a=>a.participant_code===code&&a.phase===phase);
  if(existing)return existing;
  const id='att-'+crypto.randomUUID();
  db.attempts[id]={attempt_id:id,participant_code:code,phase,form_version:formVersion,status:'in_progress',
   started_at:new Date().toISOString(),submitted_at:null,submission_key:null,draft:{screen:'intro',answers:{},durations:{}},responses:null};
  this._write(db);return db.attempts[id];
 }
 saveDraft(attemptId,draft){
  const db=this._read(),a=db.attempts[attemptId];
  if(!a||a.status!=='in_progress')return false;
  a.draft=draft;a.draft_saved_at=new Date().toISOString();this._write(db);return true;
 }
 /* Idempotent: a second submission of a finalized attempt changes nothing and reports duplicate. */
 async submitAttempt(attemptId,responses,submissionKey){
  const db=this._read(),a=db.attempts[attemptId];
  if(!a)throw new Error('Unknown attempt');
  if(a.status==='submitted')return {ok:true,duplicate:true,sameKey:a.submission_key===submissionKey};
  a.responses=responses;a.status='submitted';a.submitted_at=new Date().toISOString();a.submission_key=submissionKey;
  this._write(db);return {ok:true,duplicate:false};
 }
 async saveExperience(code,answers){
  const db=this._read();
  if(db.experience[code])return {ok:true,duplicate:true};
  db.experience[code]={participant_code:code,submitted_at:new Date().toISOString(),answers};this._write(db);return {ok:true,duplicate:false};
 }
 async exportAll(){const db=this._read();return {participants:db.participants,attempts:db.attempts,experience:db.experience}}
 async clearAll(){localStorage.removeItem(STORE_KEY)}
}
/* Also sends finished tests and questionnaires to the team's server. Drafts stay in this browser, and test links
   such as ?group=ai are not sent. Anything not yet stored stays queued here and is retried. */
const UPLOAD_KEY='sc-study-uploads';
class ServerStudyStorage extends LocalDemoStudyStorage{
 constructor(){super();this.kind='server';this.centralized=true;this.uploading=false;setTimeout(()=>this.flushUploads(),0)}
 _queue(){try{return JSON.parse(localStorage.getItem(UPLOAD_KEY))||[]}catch(e){return []}}
 _setQueue(q){localStorage.setItem(UPLOAD_KEY,JSON.stringify(q))}
 pending(){return this._queue().length}
 async flushUploads(){
  if(this.uploading)return;
  this.uploading=true;
  try{
   for(let q=this._queue();q.length;q=this._queue()){
    const r=await fetch(api+'/study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q[0]),signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error('not stored');
    this._setQueue(this._queue().slice(1));
   }
  }catch(e){clearTimeout(this.retry);this.retry=setTimeout(()=>this.flushUploads(),30000)}
  this.uploading=false;
 }
 async _send(code,kind,record){
  if(!/^SC-/.test(code))return;
  const db=this._read(),p=db.participants[code]||{};
  const participant={assigned_condition:p.assigned_condition,assignment_method:p.assignment_method,consent_version:p.consent_version,
   consent_status:p.consent_status,study_version:p.study_version,created_at:p.created_at};
  this._setQueue([...this._queue(),{code,kind,record:{participant,...record}}]);
  await this.flushUploads();
 }
 async submitAttempt(attemptId,responses,submissionKey){
  const r=await super.submitAttempt(attemptId,responses,submissionKey);
  if(!r.duplicate){
   const {draft,draft_saved_at,...attempt}=this._read().attempts[attemptId];
   await this._send(attempt.participant_code,attempt.phase,attempt);
  }
  return r;
 }
 async saveExperience(code,answers){
  const r=await super.saveExperience(code,answers);
  if(!r.duplicate)await this._send(code,'experience',{submitted_at:this._read().experience[code].submitted_at,answers});
  return r;
 }
 async clearAll(){await super.clearAll();localStorage.removeItem(UPLOAD_KEY)}
}
const studyStore=api?new ServerStudyStorage():new LocalDemoStudyStorage();
