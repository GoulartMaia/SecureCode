/* ---------- Study storage adapter.
   MILESTONE DEMO: everything is kept in this browser's localStorage. Nothing is sent to the research team
   and nothing syncs to another device. Browser storage is not a research database: it can be cleared or unavailable.
   A later ApiStudyStorage should implement the same async methods against the real backend (see docs/ASSESSMENT_MILESTONE.md),
   where the server assigns conditions, timestamps submissions and refuses to overwrite finalized attempts. ---------- */
const STUDY_VERSION='securecode-study-0.1';
const CONSENT_VERSION='draft-consent-0.1';
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
 /* Demo assignment procedure: permuted blocks of four (two AI, two no-AI) drawn with crypto randomness.
    Balanced only within this browser. The real study must assign on the server (see the backend plan). */
 _nextCondition(db){
  if(!db.allocation.length){const b=['ai','ai','control','control'];
   for(let i=b.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[b[i],b[j]]=[b[j],b[i]]}
   db.allocation=b}
  return db.allocation.shift();
 }
 async createParticipant({consentVersion}){
  const db=this._read();let code;do code=newParticipantCode();while(db.participants[code]);
  const condition=this._nextCondition(db);
  db.participants[code]={participant_code:code,consent_version:consentVersion,consent_status:'agreed',assigned_condition:condition,
   assignment_method:'local_demo_permuted_block_4',study_version:STUDY_VERSION,created_at:new Date().toISOString(),lesson_state:null};
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
const studyStore=new LocalDemoStudyStorage();
