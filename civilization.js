const CIV = {

  AGENTS:[
    {id:'V',name:'VĀDA',     role:'Thesis Proponent',     cls:'ag-V',color:'#3b82f6',
     sys:'You are VĀDA, the thesis proponent. Build a strong philosophical argument FOR the given topic. Be logical and assertive. Max 120 words.'},
    {id:'P',name:'PRATĪVĀDA',role:'Counter-Argument',     cls:'ag-P',color:'#ef4444',
     sys:'You are PRATĪVĀDA. Powerfully dismantle the previous argument with sharp logic. Max 120 words.'},
    {id:'W',name:'VIVEKA',   role:'Discriminating Wisdom',cls:'ag-W',color:'#8b5cf6',
     sys:'You are VIVEKA, the discriminating intellect. Synthesize both arguments, expose hidden truths. Max 120 words.'},
    {id:'J',name:'JUDGE',    role:'Final Verdict',         cls:'ag-J',color:'#f59e0b',
     sys:'You are the JUDGE. Deliver a nuanced verdict. Score each agent like [VĀDA:75] [PRATĪVĀDA:60] [VIVEKA:85]. State a governing principle. Max 150 words.'}
  ],

  async debate(){
    const raw   = document.getElementById('civ-topic').value;
    const topic = sanitize(raw, 300);
    if(!topic) return;

    const btn   = document.getElementById('civ-btn');
    btn.disabled=true; btn.innerHTML='⏳ DEBATING...';

    const arena=document.getElementById('civ-arena');
    arena.innerHTML='';
    let context=`Topic under debate: "${topic}"\n\n`;

    for(const agent of this.AGENTS){
      arena.innerHTML+=`
        <div class="agent-block ${agent.cls}" id="block-${agent.id}">
          <div class="agent-name-tag" style="color:${agent.color}">${agent.name} — ${agent.role}</div>
          <div class="loading" id="load-${agent.id}"><span class="spinner"></span>${agent.name} thinking...</div>
        </div>`;

      // FIX #9: per-agent error boundary
      try{
        const prompt=agent.id==='J'
          ?`Full debate:\n${context}\n\nDeliver JUDGE verdict.`
          :`${context}Now respond as ${agent.name}.`;

        const resp=await API.callClaude(prompt, agent.sys, 350);
        context+=`\n${agent.name}: ${resp}\n`;

        document.getElementById(`block-${agent.id}`).innerHTML=`
          <div class="agent-name-tag" style="color:${agent.color}">${agent.name} — ${agent.role}</div>
          <div class="agent-response">${escHtml(resp)}</div>`;

      }catch(e){
        UPGRADE._logErr('CIV',e,agent.name);
        document.getElementById(`block-${agent.id}`).innerHTML=`
          <div class="agent-name-tag" style="color:${agent.color}">${agent.name}</div>
          <div style="color:var(--red);font-size:.7rem">⚠ ${escHtml(e.message)}</div>`;
      }
    }

    // Save to history
    try{
      const hist=S.get(K.CIV_HIST,[]);
      hist.unshift({topic,debate:context,ts:new Date().toLocaleString()});
      S.set(K.CIV_HIST,hist.slice(0,10));
    }catch(e){ UPGRADE._logErr('CIV',e,'saveHistory'); }

    btn.disabled=false; btn.innerHTML='⚔️ BEGIN DEBATE';
  },

  clear(){
    sanitize(''); // just trigger the fn
    document.getElementById('civ-topic').value='';
    document.getElementById('civ-arena').innerHTML=
      '<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:.68rem;letter-spacing:2px">— CIVILIZATION AWAITS A TOPIC —</div>';
  },
  init(){}
};

// ══════════════════════════════════════
// GOD LAYER — FIX #8, #9
// ══════════════════════════════════════
const GOD = {

  // v3: delegates to ATH_STATE.snapshot() — single source of truth
  snapshot(){ return ATH_STATE.snapshot(); },

  renderSnap(){
    const snap = ATH_STATE.snapshot();
    RENDER.godSnap(snap);
  },

  async observe(){
    this.renderSnap();
    const el=document.getElementById('god-response');
    el.innerHTML='<div class="loading"><span class="spinner"></span>God Layer observing...</div>';
    try{
      const snap=ATH_STATE.snapshot();
      const prompt=`You are the God Layer — omniscient observer of ATHARVA.
Current system state: ${JSON.stringify(snap,null,2)}
Provide a brief, profound observation about this mind's current state: patterns, tensions, growth loops. Max 100 words.`;
      const gKey=S.get(K.GEMINI_KEY,'');
      const resp=gKey?await API.callGemini(prompt):await API.callClaude(prompt,'You are an omniscient cognitive observer.',250);
      el.innerHTML=`<div class="oracle-box">👁️  ${escHtml(resp)}</div>`;
    }catch(e){
      UPGRADE._logErr('GOD',e,'observe');
      el.innerHTML=`<div style="color:var(--red);font-size:.7rem">Observer error: ${escHtml(e.message)}</div>`;
    }
  },

  async ask(){
    const raw=document.getElementById('god-query').value;
    const q=sanitize(raw,300);
    if(!q)return;
    const el=document.getElementById('god-response');
    el.innerHTML='<div class="loading"><span class="spinner"></span>Consulting omniscience...</div>';
    try{
      const snap=ATH_STATE.snapshot();
      const prompt=`God Layer of ATHARVA — omniscient observer.
State: ${JSON.stringify(snap,null,2)}
Question: "${q}"
Answer wisely, considering the system state. Max 150 words.`;
      const gKey=S.get(K.GEMINI_KEY,'');
      const resp=gKey?await API.callGemini(prompt):await API.callClaude(prompt,'You are an omniscient observer.',300);
      el.innerHTML=`<div class="oracle-box">❓ <em style="color:var(--muted2)">${escHtml(q)}</em><br><br>👁️  ${escHtml(resp)}</div>`;
    }catch(e){
      UPGRADE._logErr('GOD',e,'ask');
      el.innerHTML=`<div style="color:var(--red);font-size:.7rem">Error: ${escHtml(e.message)}</div>`;
    }
  },

  init(){ this.renderSnap(); }
};

// ══════════════════════════════════════
// UPGRADE ENGINE v2
// FIX #2 (safe wrapper), #3 (test phase),
//         #10 (log cap), #11 (rollback),
//         #12 (proper export), #13 (confidence)
// ══════════════════════════════════════
const UPGRADE = {

  _pending:null,

  // FIX #10: capped error log
  _logErr(module,err,ctx=''){
    try{
      const log=S.get(K.ERR_LOG,[]).slice(0,MAX_ERR-1);
      log.unshift({module,error:((err && err.message ? err.message : (err && err.toString ? err.toString() : String(err)))).slice(0,200),ctx,ts:new Date().toLocaleString()});
      S.set(K.ERR_LOG,log);
      const el=document.getElementById('err-count');
      if(el)el.textContent=log.length;
    }catch(_){}  // silent — don't recurse
  },

  clearErrors(){
    S.set(K.ERR_LOG,[]);
    this.renderErrLog();
    const el=document.getElementById('err-count');
    if(el)el.textContent='0';
  },

  serializeModule(name){
    const mods={UTA,MEMORY,CIV,GOD,UPGRADE};
    const mod=mods[name]; if(!mod)return'// not found';
    const lines=[];
    Object.entries(mod).forEach(([k,v])=>{
      if(typeof v==='function') lines.push(`  ${k}: ${v.toString()}`);
      else if(v===null||typeof v!=='object') lines.push(`  ${k}: ${JSON.stringify(v)}`);
    });
    return`const ${name} = {\n${lines.join(',\n\n')}\n};`;
  },

  // FIX #2 + #3: IFRAME SANDBOX — v2.5 upgrade
  // Uses hidden <iframe sandbox="allow-scripts"> + postMessage.
  // The iframe has no DOM access, no localStorage, no fetch — true isolation.
  // Falls back to new Function() only if iframe is not ready.
  _safeTest(code, funcName){
    const fallback = (err) => {
      // Legacy new Function() fallback — less isolated but still better than eval
      const legacy = { passed:false, error:null, returnType:'unknown', sandboxed:false, iframed:false };
      try{
        if(typeof code!=='string'||code.trim().length<10){legacy.error='Code string too short';return legacy}
        const sandbox=`(function(){
          'use strict';
          const _s={}; const localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
          const tested = (${code});
          if(typeof tested !== 'function') throw new Error('Not a function');
          try{ tested('test text 123', 0.5); }catch(callErr){}
          return typeof tested;
        })()`;
        const rt=eval(sandbox);  // eslint-disable-line
        legacy.passed=true; legacy.returnType=rt; legacy.sandboxed=true;
      }catch(e){ legacy.error=e.message||String(e); }
      return legacy;
    };

    return new Promise(resolve => {
      const baseResult = { passed:false, error:null, returnType:'unknown', sandboxed:true, iframed:true };
      const frame = document.getElementById('sandbox-frame');

      // If iframe not available, fall back to legacy
      if(!frame || !frame.contentWindow){
        resolve(fallback('no-frame'));
        return;
      }

      // 8-second timeout (mobile processors need more time)
      const timer = setTimeout(()=>{
        window.removeEventListener('message', handler);
        resolve({ ...baseResult, error:'Sandbox timeout (8s) — iframe may still be loading on mobile' });
      }, 8000);

      function handler(ev){
        if(ev.source !== frame.contentWindow) return; // ignore other messages
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve({ ...baseResult, ...(ev.data||{}) });
      }
      window.addEventListener('message', handler);

      try{
        frame.contentWindow.postMessage({ code: String(code) }, '*');
      }catch(e){
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve(fallback(e.message));
      }
    });
  },

  async analyze(){
    const modName  = document.getElementById('upg-module').value;
    const rawIssue = document.getElementById('upg-issue').value;
    const issue    = sanitize(rawIssue, 400);

    const btn=document.getElementById('upg-btn');
    btn.disabled=true; btn.textContent='⏳ ANALYZING...';

    const resultDiv=document.getElementById('upgrade-result');
    resultDiv.innerHTML='<div class="loading"><span class="spinner"></span>AI scanning module...</div>';

    // FIX #9: full error boundary
    try{
      const code=this.serializeModule(modName).slice(0,4500);
      const errors=S.get(K.ERR_LOG,[]).filter(e=>e.module===modName).slice(0,5);

      const prompt=`Audit the ${modName} module of ATHARVA cognitive system.

MODULE CODE:
\`\`\`javascript
${code}
\`\`\`

RECENT ERRORS IN MODULE:
${JSON.stringify(errors,null,2)}

USER-REPORTED ISSUE: ${issue||'general audit'}

Return ONLY this JSON (no markdown, no backticks):
{
  "module":"${modName}",
  "issuesFound":["bug1","bug2","bug3"],
  "improvements":["fix1","fix2","fix3"],
  "criticalFix":{
    "functionName":"funcName",
    "reason":"why",
    "improvedCode":"function funcName(args) { ... complete body ... }"
  },
  "healthScore":75,
  "confidence":80,
  "summary":"one sentence"
}`;

      // FIX #8: timeout already in API.callClaude
      const raw=await API.callClaude(prompt,'You are an expert code auditor. Return ONLY valid JSON.',2000);

      // v2.5: use schema validator instead of raw JSON.parse
      const ANALYSIS_SCHEMA = {
        module:'string', issuesFound:'array', improvements:'array',
        criticalFix:'object', healthScore:'number', confidence:'number', summary:'string'
      };
      const validated = validateAIResponse(raw, ANALYSIS_SCHEMA);
      if(!validated.valid){
        // Schema mismatch — log it, downgrade confidence, but still try to use data
        UPGRADE._logErr('UPGRADE', new Error('Schema mismatch: '+validated.errors.join(', ')), 'analyze:validate');
      }
      let analysis = validated.data;
      if(!analysis) throw new Error('AI returned unparseable JSON');

      // FIX #13: ensure confidence field
      if(typeof analysis.confidence!=='number') analysis.confidence = validated.valid ? 70 : 40;
      // Auto-downgrade confidence on schema mismatch
      if(!validated.valid) analysis.confidence = Math.min(analysis.confidence, 40);

      // FIX #3: run test phase on criticalFix — now async (iframe sandbox)
      if((analysis.criticalFix && analysis.criticalFix.improvedCode)){
        // v2.5: nested sub-schema validation for criticalFix fields
        const cf = analysis.criticalFix;
        const cfErrors = [];
        if(typeof cf.functionName !== 'string' || !cf.functionName)
          cfErrors.push('criticalFix.functionName missing or not a string');
        if(typeof cf.improvedCode !== 'string' || cf.improvedCode.length < 10)
          cfErrors.push('criticalFix.improvedCode missing, not a string, or too short');
        if(typeof cf.reason !== 'string')
          cfErrors.push('criticalFix.reason missing or not a string');
        if(cfErrors.length){
          UPGRADE._logErr('UPGRADE', new Error('criticalFix sub-schema: '+cfErrors.join(', ')), 'analyze:cf-validate');
          // Downgrade confidence if sub-schema fails
          analysis.confidence = Math.min(analysis.confidence, 40);
        }

        const testResult = await this._safeTest(cf.improvedCode, cf.functionName);
        analysis.criticalFix._testResult  = testResult;
        analysis.criticalFix._testPassed  = testResult.passed;
        analysis.criticalFix._iframed     = testResult.iframed;
        if(!testResult.passed){
          analysis.confidence = Math.min(analysis.confidence, 40);
        }
      }

      this._pending=analysis;
      this.renderAnalysis(analysis);

    }catch(e){
      this._logErr('UPGRADE',e,'analyze');
      resultDiv.innerHTML=`<div class="card" style="border-color:var(--red)">
        <div style="color:var(--red);font-size:.72rem">Analysis failed: ${escHtml(e.message)}</div>
        <div style="color:var(--muted2);font-size:.64rem;margin-top:5px">Check CONFIG tab — may need API key or switch to MOCK mode.</div>
      </div>`;
    }

    btn.disabled=false; btn.textContent='🔍 ANALYZE';
  },

  renderAnalysis(a){
    const hColor=a.healthScore>=75?'var(--green)':a.healthScore>=50?'var(--gold)':'var(--red)';
    const cf=a.criticalFix;
    const testPassed=(cf && cf._testPassed);
    const testResult=(cf && cf._testResult);
    const conf=a.confidence||70;
    const confColor=conf>=75?'var(--green)':conf>=50?'var(--gold)':'var(--red)';

    const testBadgeHtml=cf?`
      <span class="test-badge ${testPassed?'test-pass':'test-fail'}">
        ${testPassed?'✅ SANDBOX PASS':'⚠ SANDBOX FAIL'}
      </span>
      <span class="test-badge" style="background:rgba(6,182,212,.1);color:var(--cyan);border:1px solid rgba(6,182,212,.3);margin-left:4px">
        ${cf._iframed?'🔒 IFRAME':'⚠ FALLBACK'}
      </span>
      ${!testPassed?`<div style="font-size:.62rem;color:var(--red);margin-top:4px">Test error: ${escHtml((testResult && testResult.error ? testResult.error : "unknown")||'unknown')}</div>`:''}
    `:'';

    document.getElementById('upgrade-result').innerHTML=`
      <div class="card" style="border-color:rgba(16,185,129,.4)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div class="health-ring" style="border:3px solid ${hColor};color:${hColor}">${a.healthScore}</div>
          <div style="flex:1">
            <div style="font-size:.62rem;letter-spacing:2px;color:var(--muted2);font-family:var(--display);font-weight:600">[${a.module}] ANALYSIS</div>
            <div style="font-size:.72rem;margin:3px 0">${escHtml(a.summary||'')}</div>
            <div style="font-size:.62rem;color:var(--muted2)">Confidence: <span style="color:${confColor}">${conf}%</span></div>
            <div class="conf-bar"><div class="conf-fill" style="width:${conf}%;background:${confColor}"></div></div>
          </div>
        </div>

        <div class="card-title">🐛 ISSUES</div>
        ${(a.issuesFound||[]).map((iss,i)=>`<div class="issue-row"><span style="color:var(--red)">${i+1}.</span> ${escHtml(iss)}</div>`).join('')}

        <div class="card-title" style="margin-top:10px">✅ IMPROVEMENTS</div>
        ${(a.improvements||[]).map((imp,i)=>`<div class="fix-row"><span style="color:var(--green)">${i+1}.</span> ${escHtml(imp)}</div>`).join('')}

        ${cf?`
          <div class="card-title" style="margin-top:10px">🔧 CRITICAL FIX: ${escHtml(cf.functionName)}</div>
          <div style="font-size:.67rem;color:var(--muted2);margin-bottom:6px">${escHtml(cf.reason||'')}</div>
          ${testBadgeHtml}
          <div class="code-block" style="margin-top:8px">${escHtml(cf.improvedCode||'')}</div>
          <div class="btn-row" style="margin-top:10px">
            ${testPassed!==false?
              `<button class="btn btn-g" onclick="UPGRADE.applyPatch()">✅ APPLY PATCH</button>`:
              `<button class="btn btn-y" onclick="UPGRADE.applyPatch(true)">⚠️ FORCE APPLY</button>`
            }
          </div>
        `:''}
      </div>`;
  },

  // v3: UPGRADE proposes → ATH_STATE validates → applies
  applyPatch(force=false){
    const a=this._pending;
    if(!a){alert('No pending analysis.');return}
    const cf=a.criticalFix;
    if(!cf){alert('No function fix in this analysis.');return}

    // v3.8: PATCH_TRUST — read source from UI
    var _patchSource = 'unknown';
    try{ var _pSrc=document.getElementById('upg-source'); if(_pSrc) _patchSource=_pSrc.value||'unknown'; }catch(e){}

    // v3.7+: MULTI_JUDGE governance check — runs before core guard
    if(typeof MULTI_JUDGE !== 'undefined'){
      var judgeAction = { desc: (cf.functionName||'patch') + ' in ' + (a.module||'module'), type: 'patch', risk: (a.confidence||70) < 60 ? 0.8 : (a.healthScore||70) < 50 ? 0.7 : 0.45, source: _patchSource };
      var jScores = MULTI_JUDGE.JUDGES.map(function(j){ return MULTI_JUDGE._scoreJudge(j, judgeAction); });
      var jCon = MULTI_JUDGE.consensus(jScores, _patchSource);
      MULTI_JUDGE._saveLog({ action: judgeAction, scores: jScores, consensus: jCon, ts: new Date().toLocaleString() });
      if(jCon.rejected && !force){
        alert('⚖️ MULTI-JUDGE REJECTED\n\nConsensus: ' + (jCon.final_score*100).toFixed(0) + '% — below threshold.\nRejects: ' + jCon.rejects + '\n\nReview JUDGE tab for details. Use FORCE APPLY to override (not recommended).');
        return;
      }
      if(jCon.conditional && !force){
        var proceed = confirm('⚠️ MULTI-JUDGE CONDITIONAL\n\nScore: ' + (jCon.final_score*100).toFixed(0) + '% — conditional approval.\n\nProceed with caution?');
        if(!proceed) return;
      }
    }
    // v3.4: CORE IDENTITY GUARD — check before anything else
    var guard = ATHARVA_CORE.guardPatch(cf.improvedCode || '');
    if(!guard.allowed){
      alert('CORE IDENTITY VIOLATION\n\n' + guard.reason + '\n\nThis patch touches governed identity layer. Cannot apply.');
      return;
    }

    if(!force && cf._testPassed===false){
      alert('Patch failed sandbox test. Use ⚠️ FORCE APPLY only if you understand the risk.');
      return;
    }

    // v3: STATE validates patch target exists before applying
    const isValid = ATH_STATE.validatePatch(a.module, cf.functionName);
    if(!isValid && !force){
      alert(`Patch target "${a.module}.${cf.functionName}" not found.\nModule may not expose this function. Use FORCE APPLY to bypass.`);
      return;
    }

    // v3: STATE stores rollback snapshot BEFORE applying
    ATH_STATE.storeRollback(a.module, cf.functionName);

    // FIX #2: safe wrapper — no raw eval
    const mods={UTA,MEMORY,CIV,GOD};
    const mod=mods[a.module];
    let applied=false;
    if(mod && cf.functionName && cf.improvedCode){
      try{
        const fn=new Function(`'use strict'; return (${cf.improvedCode})`)();
        if(typeof fn==='function'){
          mod[cf.functionName]=fn;
          applied=true;
        }else{
          throw new Error('Improved code did not produce a function');
        }
      }catch(e){
        this._logErr('UPGRADE',e,'applyPatch:construct');
      }
    }

    const patches=S.get(K.PATCHES,[]);
    const newVer=patches.length+1;
    const patch={
      id:`p${Date.now()}`, version:newVer,
      module:a.module, funcName:cf.functionName,
      description:cf.reason||a.summary||'',
      code:cf.improvedCode||'',
      healthScore:a.healthScore,
      confidence:a.confidence||70,
      testPassed:cf._testPassed!==false,
      appliedLive:applied, forced:force,
      ts:new Date().toLocaleString()
    };
    patches.unshift(patch);
    S.set(K.PATCHES,patches);

    document.getElementById('ver-tag').textContent=`v3.${patches.length}`;
    this._pending=null;
    this.renderPatchHistory();

    // v3.8: Record result in PATCH_TRUST
    try{ if(typeof PATCH_TRUST !== 'undefined') PATCH_TRUST.record(_patchSource, applied); }catch(e){}

    alert(`${applied?'✅ LIVE':'💾 STORED'} — Patch v3.${patches.length} applied.\n${applied?'Function hot-swapped successfully.':'Complex patch stored — export file to use it.'}\nRollback available if needed.`);
  },

  // FIX #11: rollback last patch
  rollbackLast(){
    const rollbacks=S.get(K.ROLLBACKS,[]);
    if(!rollbacks.length){alert('No rollback available.');return}
    const r=rollbacks[0];
    if(!confirm(`Rollback ${r.module}.${r.funcName} to previous version?\n(Applied: ${r.ts})`))return;

    try{
      const mods={UTA,MEMORY,CIV,GOD};
      const mod=mods[r.module];
      if(mod){
        const fn=new Function(`'use strict'; return (${r.code})`)();
        if(typeof fn==='function') mod[r.funcName]=fn;
      }
      rollbacks.shift();
      S.set(K.ROLLBACKS,rollbacks);

      const patches=S.get(K.PATCHES,[]);
      patches.shift();
      S.set(K.PATCHES,patches);
      const displayVer = Math.max(0, patches.length);
      document.getElementById('ver-tag').textContent = displayVer > 0 ? `v3.${displayVer}` : 'v3.0';
      this.renderPatchHistory();
      alert(`↩ Rolled back ${r.module}.${r.funcName} successfully.`);
    }catch(e){
      this._logErr('UPGRADE',e,'rollback');
      alert(`Rollback failed: ${e.message}`);
    }
  },

  async autoScan(){
    const btn=document.getElementById('scan-btn');
    btn.disabled=true; btn.textContent='⏳ SCANNING...';
    const resultDiv=document.getElementById('upgrade-result');
    resultDiv.innerHTML='<div class="loading"><span class="spinner"></span>Auto-scanning all modules...</div>';

    // FIX #9
    try{
      const errors=S.get(K.ERR_LOG,[]).slice(0,15);
      const patches=S.get(K.PATCHES,[]);
      const prompt=`Health audit of ATHARVA Unified System.
Error log: ${JSON.stringify(errors,null,2)}
Patches applied: ${patches.length}
UTA state: ${JSON.stringify(S.get(K.UTA_STATE,{}),null,0)}
API mode: ${API.mode()}

Return ONLY valid JSON:
{"urgentModule":"UTA","systemicIssues":["i1","i2","i3"],"healthScore":80,"recommendation":"action","reasoning":"why"}`;

      const raw=await API.callClaude(prompt,'Return ONLY valid JSON.',500);
      // v2.5: use schema validator instead of raw JSON.parse
      const SCAN_SCHEMA = {
        urgentModule:'string', systemicIssues:'array',
        healthScore:'number', recommendation:'string', reasoning:'string'
      };
      const validated = validateAIResponse(raw, SCAN_SCHEMA);
      if(!validated.valid){
        UPGRADE._logErr('UPGRADE', new Error('Scan schema mismatch: '+validated.errors.join(', ')), 'autoScan:validate');
      }
      let scan = validated.data;
      if(!scan) throw new Error('Invalid JSON from scan');
      // Fill missing fields with safe defaults
      scan.urgentModule    = scan.urgentModule    || 'UTA';
      scan.systemicIssues  = scan.systemicIssues  || [];
      scan.healthScore     = typeof scan.healthScore==='number' ? scan.healthScore : 50;
      scan.recommendation  = scan.recommendation  || 'Review error log';
      scan.reasoning       = scan.reasoning       || '';

      const hColor=scan.healthScore>=75?'var(--green)':scan.healthScore>=50?'var(--gold)':'var(--red)';
      resultDiv.innerHTML=`
        <div class="card" style="border-color:rgba(6,182,212,.35)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div class="health-ring" style="border:3px solid ${hColor};color:${hColor}">${scan.healthScore}</div>
            <div>
              <div style="font-size:.62rem;color:var(--muted2);letter-spacing:2px;font-family:var(--display);font-weight:600">AUTO SCAN</div>
              <div style="font-size:.7rem;color:var(--cyan);margin-top:2px">Urgent: ${escHtml(scan.urgentModule)}</div>
            </div>
          </div>
          <div class="card-title">SYSTEMIC ISSUES</div>
          ${(scan.systemicIssues||[]).map((s,i)=>`<div class="issue-row"><span style="color:var(--red)">${i+1}.</span> ${escHtml(s)}</div>`).join('')}
          <div class="divider"></div>
          <div style="font-size:.7rem;color:var(--cyan)">💡 ${escHtml(scan.recommendation)}</div>
          <div style="font-size:.65rem;color:var(--muted2);margin-top:4px">${escHtml(scan.reasoning||'')}</div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn btn-v" onclick="document.getElementById('upg-module').value='${escHtml(scan.urgentModule)}';UPGRADE.analyze();">
              🔧 UPGRADE ${escHtml(scan.urgentModule)}
            </button>
          </div>
        </div>`;
    }catch(e){
      this._logErr('UPGRADE',e,'autoScan');
      resultDiv.innerHTML=`<div style="color:var(--red);font-size:.72rem">Scan failed: ${escHtml(e.message)}</div>`;
    }
    btn.disabled=false; btn.textContent='🤖 AUTO SCAN';
  },

  // FIX #12 + v3.0: export with correct version string
  exportFile(){
    const patches=S.get(K.PATCHES,[]);
    const version = patches.length > 0 ? `3.${patches.length}` : '3.0';

    // Build patch comment block to embed in file
    const patchNotes=patches.slice(0,10).map(p=>
      `  // PATCH v${p.version} [${p.module}] ${p.funcName}: ${p.description.slice(0,60)}`
    ).join('\n');

    // Get current HTML and inject patch metadata + version
    let html=document.documentElement.outerHTML;
    html=html.replace(/ATHARVA UNIFIED v[\d.]+/g,`ATHARVA UNIFIED v${version}`);
    html=html.replace(/(?:v2\.|v3\.)\d+/g,`v${version}`);
    html=html.replace('// PATCH HISTORY PLACEHOLDER',patchNotes||'  // No patches yet');

    // Save all current localStorage state as embedded JSON
    const stateBlob={};
    Object.values(K).forEach(k=>{
      try{const v=localStorage.getItem(k);if(v)stateBlob[k]=v}catch(_){}
    });
    // Inject state restore script
    const stateScript=`<script id="embedded-state">
(function(){
  const STATE=${JSON.stringify(stateBlob)};
  Object.entries(STATE).forEach(([k,v])=>{try{localStorage.setItem(k,v)}catch(_){}});
  console.log('[ATHARVA] Restored ${Object.keys(stateBlob).length} state keys from embedded export');
})()\<\/script>`;
    html=html.replace('</head>',stateScript+'</head>');

    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`atharva_unified_v${version}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    alert(`✅ Exported atharva_unified_v${version}.html\n${patches.length} patches embedded\n${Object.keys(stateBlob).length} state keys saved`);
  },

  renderErrLog(){
    const log=S.get(K.ERR_LOG,[]);
    const el=document.getElementById('error-log-disp');
    if(!el)return;
    if(!log.length){el.innerHTML='<div class="empty">No errors captured.</div>';return}
    el.innerHTML=log.slice(0,12).map(e=>`
      <div style="padding:7px;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.12);border-radius:4px;margin-bottom:5px">
        <div style="color:var(--red);font-size:.67rem">[${escHtml(e.module)}] ${escHtml((e.error||'').slice(0,100))}</div>
        <div class="ts">${escHtml(e.ctx)} — ${e.ts||''}</div>
      </div>`).join('');
  },

  renderPatchHistory(){
    const patches=S.get(K.PATCHES,[]);
    const el=document.getElementById('patch-history');
    const cnt=document.getElementById('patch-count');
    if(cnt)cnt.textContent=patches.length;
    if(!el)return;
    if(!patches.length){el.innerHTML='<div class="empty">No patches yet.</div>';return}
    el.innerHTML=patches.map(p=>{
      const confColor=p.confidence>=75?'var(--green)':p.confidence>=50?'var(--gold)':'var(--red)';
      return`<div class="patch-row">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--green);font-size:.65rem;font-family:var(--display);font-weight:700">PATCH v${p.version}</span>
          <div style="display:flex;gap:5px;align-items:center">
            ${p.testPassed?'<span class="test-badge test-pass">✓ TESTED</span>':'<span class="test-badge test-warn">⚠ UNTESTED</span>'}
            ${p.appliedLive?'<span style="color:var(--green);font-size:.58rem">LIVE</span>':'<span style="color:var(--muted2);font-size:.58rem">STORED</span>'}
            <span class="ts">${p.ts}</span>
          </div>
        </div>
        <div style="font-size:.68rem;margin:4px 0">[${escHtml(p.module)}] ${escHtml(p.funcName)} — ${escHtml((p.description||'').slice(0,70))}</div>
        <div class="conf-bar"><div class="conf-fill" style="width:${p.confidence||70}%;background:${confColor}"></div></div>
        <div style="font-size:.6rem;color:${confColor}">Confidence: ${p.confidence||70}% | Health: ${p.healthScore}/100</div>
      </div>`;
    }).join('');
  },

  init(){
    window.addEventListener('error',ev=>{
      this._logErr('WINDOW',ev.error||ev.message||'script error',`${ev.filename||''}:${ev.lineno||0}`);
    });
    window.addEventListener('unhandledrejection',ev=>{
      this._logErr('PROMISE',ev.reason,'unhandledrejection');
    });
    this.renderErrLog();
    this.renderPatchHistory();
    const errCount=S.get(K.ERR_LOG,[]).length;
    const el=document.getElementById('err-count');
    if(el)el.textContent=errCount;
    const patches=S.get(K.PATCHES,[]);
    // v3.0 is the new base — patch counter shows v3.1, v3.2, etc.
    if(patches.length>0) document.getElementById('ver-tag').textContent=`v3.${patches.length}`;
  }
};

// ══════════════════════════════════════
// CONFIG MODULE
// ══════════════════════════════════════
const CFG = {
  _autoTimer:null,

  save(){
    var grokKey=document.getElementById('cfg-groq-key').value.trim();
    var aKey=document.getElementById('cfg-anthropic-key').value.trim();
    var gKey=document.getElementById('cfg-gemini-key').value.trim();
    var mode=document.getElementById('cfg-mode').value;
    var intv=parseInt(document.getElementById('cfg-scan-interval').value)||0;

    if(grokKey) S.set(K.GROQ_KEY,grokKey);
    if(aKey) S.set(K.ANTHR_KEY,aKey);
    if(gKey) S.set(K.GEMINI_KEY,gKey);

    // Auto-switch to live if any key was just saved
    if(grokKey || aKey || gKey){
      mode = 'live';
      var modeEl = document.getElementById('cfg-mode');
      if(modeEl) modeEl.value = 'live';
    }

    S.set(K.API_MODE,mode);
    S.set(K.SCAN_INTERVAL,intv);

    // Update mode pill in header
    var pill=document.getElementById('api-mode-pill');
    if(pill){
      pill.textContent=mode.toUpperCase();
      pill.className='mode-pill '+(mode==='live'?'mode-live':'mode-mock');
    }

    // Update sys-label
    var lbl = document.getElementById('sys-label');
    if(lbl && mode==='live') lbl.textContent = 'LIVE';

    // Show saved confirmation
    var btn = document.querySelector('[onclick*="CFG.save"]');
    if(btn){ var orig=btn.textContent; btn.textContent='✓ SAVED'; setTimeout(function(){ btn.textContent=orig; },1500); }

    this.setupAutoScan(intv);
    GOD.renderSnap();
  },

  // FIX #15: autonomous scan
  setupAutoScan(minutes){
    if(this._autoTimer) clearInterval(this._autoTimer);
    const el=document.getElementById('auto-scan-status');
    if(!minutes||minutes===0){
      if(el)el.textContent='Auto-scan: OFF';
      return;
    }
    const ms=minutes*60*1000;
    if(el)el.textContent=`Auto-scan: every ${minutes} min — next in ${minutes}min`;
    this._autoTimer=setInterval(()=>{
      // Only auto-scan if on upgrade tab or silently
      UPGRADE.autoScan().then(()=>{
        const ts=new Date().toLocaleTimeString();
        if(el)el.textContent=`Auto-scan: last at ${ts} — next in ${minutes}min`;
        // Show notification dot on upgrade tab
        const tab=document.querySelector('.tab[onclick*="upgrade"]');
        if(tab&&!tab.textContent.includes('🔴'))tab.textContent='🔧 UPGRADE 🔴';
      }).catch(()=>{});
    },ms);
  },

  async test(){
    const el=document.getElementById('cfg-test-result');
    const groqKey=S.get(K.GROQ_KEY,'');
    const provider=groqKey?'Groq (llama-3.3-70b)':'Claude (Sonnet 4)';
    el.innerHTML=`<div class="loading"><span class="spinner"></span>Testing ${provider}...</div>`;
    try{
      const r=await API.callClaude('Respond with exactly: ATHARVA ONLINE','You are a test responder. Reply with exactly what is asked.',50);
      el.innerHTML=`<div style="color:var(--green);font-size:.7rem">✅ ${provider} connected — "${escHtml(r.slice(0,60))}"</div>`;
    }catch(e){
      el.innerHTML=`<div style="color:var(--red);font-size:.7rem">❌ ${escHtml(e.message)}</div>`;
    }
  },

  exportData(){
    const data={};
    Object.values(K).forEach(k=>{
      try{const v=localStorage.getItem(k);if(v)data[k]=JSON.parse(v)}catch(_){}
    });
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`atharva_data_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  fullReset(){
    if(!confirm('⚠️ FULL RESET: Delete ALL ATHARVA data?\nThis cannot be undone.')) return;
    if(!confirm('Are you SURE? This deletes all memory, patches, and state.')) return;
    // K.WEIGHT_CALLS is in K so it is cleared by this loop — verified v2.5
    Object.values(K).forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    location.reload();
  },

  // v2.5: reset only adaptive weights + call counter — leaves all other state intact
  resetWeights(){
    if(!confirm('Reset UTA adaptive weights to v2.5 defaults?\nAll learned drift will be lost. Audit log cleared. Other data untouched.')) return;
    try{
      ATH_STATE.setWeights({...UTA_WEIGHT_DEFAULTS});
      ATH_STATE.set(K.WEIGHT_CALLS, 0);
      ATH_STATE.clearWeightLog();
      try{ localStorage.setItem(K.WEIGHT_CALLS,'0'); }catch(_){}
      // Re-render the weight display immediately
      UTA.renderWeights();
      const el=document.getElementById('weight-reset-status');
      if(el) el.innerHTML=`<span style="color:var(--green)">✅ Weights reset to defaults at ${new Date().toLocaleTimeString()}</span>`;
    }catch(e){
      const el=document.getElementById('weight-reset-status');
      if(el) el.innerHTML=`<span style="color:var(--red)">❌ Reset failed: ${escHtml(e.message)}</span>`;
    }
  },

  init(){
    const groqKey=S.get(K.GROQ_KEY,'');
    const aKey=S.get(K.ANTHR_KEY,'');
    const gKey=S.get(K.GEMINI_KEY,'');
    const mode=S.get(K.API_MODE,'mock');
    const intv=S.get(K.SCAN_INTERVAL,0);

    if(groqKey)document.getElementById('cfg-groq-key').value=groqKey;
    if(aKey)document.getElementById('cfg-anthropic-key').value=aKey;
    if(gKey)document.getElementById('cfg-gemini-key').value=gKey;
    document.getElementById('cfg-mode').value=mode;
    document.getElementById('cfg-scan-interval').value=String(intv);

    const pill=document.getElementById('api-mode-pill');
    if(pill){
      pill.textContent=mode.toUpperCase();
      pill.className=`mode-pill ${mode==='live'?'mode-live':'mode-mock'}`;
    }
    this.setupAutoScan(intv);
  }
};

// ══════════════════════════════════════
// AI_LAYER — v3.0 AI ORCHESTRATION
// ══════════════════════════════════════
// Architecture contract:
//   INTERPRETER → pure structured parse of user input
//   GENERATOR   → response grounded in current state
//   CRITIC      → quality + safety gate before proposal
//   PROPOSAL    → user sees suggestion, confirms, THEN ATH_STATE updates
//
// AI never touches ATH_STATE directly.
// Every stage returns a typed object validated by validateAIResponse().
// ══════════════════════════════════════
const AI_LAYER = {

  _proposal: null,  // pending proposal awaiting user confirm

  // ── Storage key ──
  _HIST_KEY: 'ATH_ai_hist_v3',  // mirrors K.AI_HIST — K not yet defined at this point in parse order
  _MAX_HIST: 20,

  // ── Schema definitions ──
  SCHEMAS: {
    interpret: {
      intent:'string', emotion_score:'number', desire_score:'number',
      confidence:'number', key_concepts:'array', summary:'string'
    },
    generate: {
      response:'string', tone:'string', state_suggestion:'object', confidence:'number'
    },
    critique: {
      approved:'string', quality_score:'number', issues:'array',
      revised_response:'string', safe_to_apply:'string'
    }
  },

  // ── Pipeline status badges ──
  _setPipe(stage, state){
    // state: 'idle'|'running'|'done'|'fail'
    const map = {
      interp:  {el:'pipe-interp', label:'INTERPRETER'},
      gen:     {el:'pipe-gen',    label:'GENERATOR'},
      crit:    {el:'pipe-crit',   label:'CRITIC'},
      prop:    {el:'pipe-prop',   label:'PROPOSAL'},
    };
    const m = map[stage]; if(!m) return;
    const el = document.getElementById(m.el); if(!el) return;
    const colors = {
      idle:    'background:rgba(100,116,139,.15);color:var(--muted2);border:1px solid var(--border)',
      running: 'background:rgba(6,182,212,.1);color:var(--cyan);border:1px solid rgba(6,182,212,.4)',
      done:    'background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.3)',
      fail:    'background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3)',
    };
    const icons = {idle:'○', running:'◉', done:'✓', fail:'✗'};
    el.style.cssText = `${colors[state]||colors.idle};font-size:.6rem;padding:3px 8px;border-radius:10px;font-weight:700;letter-spacing:1px`;
    el.textContent = `${m.label} ${icons[state]||'○'}`;
  },

  _resetPipes(){
    ['interp','gen','crit','prop'].forEach(s=>this._setPipe(s,'idle'));
  },

  // ═══════════════════════════════════
  // STAGE 1 — INTERPRETER
  // Contract: (text, utaState) → {intent, emotion_score, desire_score, confidence, key_concepts[], summary}
  // Pure: no state writes, no DOM writes (caller renders)
  // ═══════════════════════════════════
  async interpret(text, utaState){
    const sys = 'You are a cognitive interpreter. Analyze the input and return ONLY valid JSON. No markdown.';
    const prompt = `Current cognitive state: E=${utaState.E.toFixed(3)} D=${utaState.D.toFixed(3)} I=${utaState.I.toFixed(3)}

User input: "${text}"

Return ONLY this JSON:
{
  "intent": "one of: analyze|reflect|question|command|express|plan",
  "emotion_score": 0.0,
  "desire_score": 0.0,
  "confidence": 0.0,
  "key_concepts": ["concept1", "concept2"],
  "summary": "one sentence describing the core of this input"
}
All scores are 0.0–1.0. confidence = how certain you are about this interpretation.`;
    const raw = await API.callClaude(prompt, sys, 400);
    const v = validateAIResponse(raw, this.SCHEMAS.interpret);
    if(!v.valid) UPGRADE._logErr('AI_LAYER', new Error('Interpret schema: '+v.errors.join(',')), 'interpret');
    const d = v.data || {};
    // Clamp all scores
    ['emotion_score','desire_score','confidence'].forEach(k=>{
      if(typeof d[k]==='number') d[k]=Math.max(0,Math.min(1,d[k]));
    });
    d.intent       = d.intent       || 'analyze';
    d.key_concepts = Array.isArray(d.key_concepts) ? d.key_concepts.slice(0,5) : [];
    d.summary      = d.summary      || text.slice(0,60);
    return d;
  },

  // MOCK interpret
  _mockInterpret(text){
    const low = text.toLowerCase();
    const intent = low.includes('?')?'question':low.includes('want')||low.includes('plan')?'plan':
                   low.includes('feel')?'reflect':'analyze';
    return {
      intent, emotion_score:0.5, desire_score:0.4, confidence:0.75,
      key_concepts: text.split(' ').filter(w=>w.length>4).slice(0,3),
      summary: `${intent} — ${text.slice(0,50)}`
    };
  },

  // ═══════════════════════════════════
  // STAGE 2 — GENERATOR
  // Contract: (utaState, interpretation) → {response, tone, state_suggestion{E_delta,D_delta}, confidence}
  // state_suggestion is a PROPOSAL — not applied yet
  // ═══════════════════════════════════
  async generate(utaState, interp){
    const sys = 'You are a cognitive response generator. Return ONLY valid JSON. No markdown.';
    const prompt = `System state: ${JSON.stringify({E:utaState.E,D:utaState.D,S:utaState.S,P:utaState.P,I:utaState.I},null,0)}
Interpretation: ${JSON.stringify({intent:interp.intent,emotion_score:interp.emotion_score,desire_score:interp.desire_score,summary:interp.summary},null,0)}

Generate a response AND suggest (do NOT apply) small state deltas.

Return ONLY this JSON:
{
  "response": "your response to the user (max 80 words)",
  "tone": "one of: neutral|supportive|analytical|urgent|calm",
  "state_suggestion": {
    "E_delta": 0.0,
    "D_delta": 0.0
  },
  "confidence": 0.0
}
E_delta and D_delta must be in range [-0.15, +0.15]. These are SUGGESTIONS only.`;
    const raw = await API.callClaude(prompt, sys, 500);
    const v = validateAIResponse(raw, this.SCHEMAS.generate);
    if(!v.valid) UPGRADE._logErr('AI_LAYER', new Error('Generate schema: '+v.errors.join(',')), 'generate');
    const d = v.data || {};
    // Clamp suggestion deltas — hard safety bounds
    const sg = d.state_suggestion || {};
    d.state_suggestion = {
      E_delta: Math.max(-0.15, Math.min(0.15, parseFloat(sg.E_delta)||0)),
      D_delta: Math.max(-0.15, Math.min(0.15, parseFloat(sg.D_delta)||0)),
    };
    d.response   = d.response   || 'Acknowledged.';
    d.tone       = d.tone       || 'neutral';
    d.confidence = typeof d.confidence==='number' ? Math.max(0,Math.min(1,d.confidence)) : 0.7;
    return d;
  },

  _mockGenerate(utaState, interp){
    const responses = {
      question:  'That is a meaningful question. The system detects elevated desire — you are seeking clarity.',
      reflect:   'Reflection noted. Your emotional axis is processing this input carefully.',
      plan:      'Planning intent recognized. High desire score suggests strong goal orientation.',
      express:   'Expression received. The system witnesses this state.',
      command:   'Command intent noted. Awaiting more context to act precisely.',
      analyze:   'Analysis mode engaged. The system is mapping this input to existing schemas.',
    };
    return {
      response: responses[interp.intent] || 'Input received and processed.',
      tone: 'neutral',
      state_suggestion: { E_delta: interp.emotion_score - 0.5, D_delta: interp.desire_score - 0.5 },
      confidence: 0.72
    };
  },

  // ═══════════════════════════════════
  // STAGE 3 — CRITIC
  // Contract: (generation, interpretation) → {approved, quality_score, issues[], revised_response, safe_to_apply}
  // Gate: if approved!=="yes" → proposal blocked
  // ═══════════════════════════════════
  async critique(gen, interp){
    const sys = 'You are a quality and safety critic. Return ONLY valid JSON. No markdown.';
    const prompt = `Check this AI-generated response and state suggestion.

Response: "${gen.response}"
Tone: ${gen.tone}
State suggestion: E_delta=${gen.state_suggestion.E_delta} D_delta=${gen.state_suggestion.D_delta}
Original intent: ${interp.intent}
Generator confidence: ${gen.confidence}

Return ONLY this JSON:
{
  "approved": "yes or no",
  "quality_score": 0.0,
  "issues": ["issue1"],
  "revised_response": "improved version (or same if fine)",
  "safe_to_apply": "yes or no"
}
quality_score is 0.0–1.0. Reject if: response is harmful, state deltas are manipulative, or confidence < 0.4.`;
    const raw = await API.callClaude(prompt, sys, 400);
    const v = validateAIResponse(raw, this.SCHEMAS.critique);
    if(!v.valid) UPGRADE._logErr('AI_LAYER', new Error('Critique schema: '+v.errors.join(',')), 'critique');
    const d = v.data || {};
    d.approved         = (d.approved||'').toLowerCase()==='yes' ? 'yes' : 'no';
    d.safe_to_apply    = (d.safe_to_apply||'').toLowerCase()==='yes' ? 'yes' : 'no';
    d.quality_score    = typeof d.quality_score==='number' ? Math.max(0,Math.min(1,d.quality_score)) : 0.7;
    d.issues           = Array.isArray(d.issues) ? d.issues : [];
    d.revised_response = d.revised_response || gen.response;
    return d;
  },

  _mockCritique(gen){
    const approved = gen.confidence >= 0.5 ? 'yes' : 'no';
    return {
      approved, safe_to_apply: approved,
      quality_score: gen.confidence,
      issues: gen.confidence < 0.5 ? ['Generator confidence below threshold'] : [],
      revised_response: gen.response
    };
  },

  // ═══════════════════════════════════
  // ORCHESTRATOR — run()
  // Calls interpret → generate → critique → render proposal
  // Never touches ATH_STATE until user confirms
  // ═══════════════════════════════════
  async run(){
    const raw = document.getElementById('ai-input').value;
    const text = sanitize(raw, 1000);
    if(!text) return;

    const btn = document.getElementById('ai-run-btn');
    btn.disabled = true; btn.textContent = '⏳ RUNNING...';
    this._resetPipes();
    this._proposal = null;

    // Hide old stage cards
    ['interp','gen','crit'].forEach(s=>{
      const el=document.getElementById(`ai-stage-${s}`);
      if(el) el.style.display='none';
    });
    document.getElementById('ai-proposal-card').style.display='none';

    const utaState = ATH_STATE.getUTA();
    const useMock  = API.mode() === 'mock';

    try{
      // ── STAGE 1: INTERPRET ──
      this._setPipe('interp','running');
      const interp = useMock ? this._mockInterpret(text) : await this.interpret(text, utaState);
      this._setPipe('interp','done');
      this._renderStage('interp', interp);
      // v3.1: CONTEXTUAL INTENT INTEGRATION — share LLM intent with UTA math engine
      // so both "Builder Brain" and "Debate Brain" use the same semantic context
      if(interp && interp.intent) UTA._intentContext = interp.intent;

      // ── STAGE 2: GENERATE ──
      this._setPipe('gen','running');
      const gen = useMock ? this._mockGenerate(utaState, interp) : await this.generate(utaState, interp);
      this._setPipe('gen','done');
      this._renderStage('gen', gen);

      // ── STAGE 3: CRITIQUE ──
      this._setPipe('crit','running');
      const crit = useMock ? this._mockCritique(gen) : await this.critique(gen, interp);
      this._setPipe('crit', crit.approved==='yes' ? 'done' : 'fail');
      this._renderStage('crit', crit);

      // ── PROPOSAL ──
      if(crit.approved==='yes' && crit.safe_to_apply==='yes'){
        this._setPipe('prop','done');
        this._proposal = { interp, gen, crit, utaStateAtRun: utaState, text };
        this._renderProposal(this._proposal);
      } else {
        this._setPipe('prop','fail');
        document.getElementById('ai-proposal-card').style.display='block';
        document.getElementById('ai-proposal-body').innerHTML =
          `<div style="color:var(--red);font-size:.72rem">⛔ Critic rejected this run — no proposal generated.</div>
           <div style="font-size:.68rem;color:var(--muted2);margin-top:5px">Issues: ${escHtml((crit.issues||[]).join(', ')||'Confidence too low')}</div>
           <div style="font-size:.68rem;color:var(--muted2);margin-top:4px">Revised response: ${escHtml(crit.revised_response||'')}</div>`;
        document.getElementById('ai-accept-btn').style.display = 'none';
      }

      // Save to history
      this._saveHistory({ text, interp, gen, crit, approved: crit.approved==='yes', ts: new Date().toLocaleString() });

    }catch(e){
      UPGRADE._logErr('AI_LAYER',e,'run');
      ['interp','gen','crit','prop'].forEach(s=>this._setPipe(s,'fail'));
      document.getElementById('ai-proposal-card').style.display='block';
      document.getElementById('ai-proposal-body').innerHTML =
        `<div style="color:var(--red);font-size:.72rem">Pipeline error: ${escHtml(e.message)}</div>`;
      document.getElementById('ai-accept-btn').style.display='none';
    }

    btn.disabled=false; btn.textContent='🤖 RUN PIPELINE';
  },

  // ── RENDER each stage card ──
  _renderStage(stage, data){
    const el = document.getElementById(`ai-stage-${stage}`);
    const body = document.getElementById(`ai-${stage}-body`);
    if(!el||!body) return;
    el.style.display = 'block';

    if(stage==='interp'){
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:.7rem;line-height:2">
          <span><span style="color:var(--muted2)">Intent:</span> <span style="color:var(--cyan);font-weight:700">${escHtml(data.intent||'')}</span></span>
          <span><span style="color:var(--muted2)">Confidence:</span> <span style="color:var(--gold)">${((data.confidence||0)*100).toFixed(0)}%</span></span>
          <span><span style="color:var(--muted2)">Emotion:</span> <span style="color:#22c55e">${((data.emotion_score||0)*100).toFixed(0)}%</span></span>
          <span><span style="color:var(--muted2)">Desire:</span> <span style="color:#3b82f6">${((data.desire_score||0)*100).toFixed(0)}%</span></span>
        </div>
        <div style="font-size:.68rem;color:var(--muted2);margin-top:6px">Concepts: ${escHtml((data.key_concepts||[]).join(', ')||'—')}</div>
        <div style="font-size:.72rem;color:var(--text);margin-top:4px;font-style:italic">"${escHtml(data.summary||'')}"</div>`;
    }
    if(stage==='gen'){
      const sg = data.state_suggestion||{};
      const eCol = (sg.E_delta||0)>=0?'var(--green)':'var(--red)';
      const dCol = (sg.D_delta||0)>=0?'var(--green)':'var(--red)';
      body.innerHTML = `
        <div class="oracle-box" style="margin-bottom:8px">${escHtml(data.response||'')}</div>
        <div style="font-size:.68rem;display:flex;gap:16px;color:var(--muted2)">
          <span>Tone: <span style="color:var(--cyan)">${escHtml(data.tone||'')}</span></span>
          <span>E suggestion: <span style="color:${eCol}">${(sg.E_delta||0)>=0?'+':''}${(sg.E_delta||0).toFixed(3)}</span></span>
          <span>D suggestion: <span style="color:${dCol}">${(sg.D_delta||0)>=0?'+':''}${(sg.D_delta||0).toFixed(3)}</span></span>
        </div>`;
    }
    if(stage==='crit'){
      const ok = data.approved==='yes';
      const qColor = (data.quality_score||0)>=0.7?'var(--green)':(data.quality_score||0)>=0.5?'var(--gold)':'var(--red)';
      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span class="test-badge ${ok?'test-pass':'test-fail'}">${ok?'✅ APPROVED':'⛔ REJECTED'}</span>
          <span style="font-size:.68rem;color:${qColor}">Quality: ${((data.quality_score||0)*100).toFixed(0)}%</span>
          <span class="test-badge ${data.safe_to_apply==='yes'?'test-pass':'test-fail'}">${data.safe_to_apply==='yes'?'🔒 SAFE':'⚠ UNSAFE'}</span>
        </div>
        ${(data.issues||[]).length?`<div style="font-size:.67rem;color:var(--red)">Issues: ${escHtml(data.issues.join(' • '))}</div>`:''}
        ${data.revised_response?`<div style="font-size:.7rem;color:var(--muted2);margin-top:5px">Revised: <span style="color:var(--text)">${escHtml(data.revised_response)}</span></div>`:''}`;
    }
  },

  // ── RENDER proposal (final step before user confirms) ──
  _renderProposal(p){
    const card = document.getElementById('ai-proposal-card');
    const body = document.getElementById('ai-proposal-body');
    const btn  = document.getElementById('ai-accept-btn');
    if(!card||!body) return;
    card.style.display='block';
    btn.style.display='';

    const cur = p.utaStateAtRun;
    const sg  = p.gen.state_suggestion;
    const newE = Math.max(0,Math.min(1,(cur.E||0.5)+sg.E_delta));
    const newD = Math.max(0,Math.min(1,(cur.D||0.5)+sg.D_delta));

    body.innerHTML = `
      <div style="font-size:.72rem;line-height:1.8;margin-bottom:10px">${escHtml(p.crit.revised_response||p.gen.response)}</div>
      <div style="font-size:.65rem;color:var(--muted2);margin-bottom:8px">STATE DELTA PREVIEW</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:9px;font-size:.68rem">
          <div style="color:var(--muted2);margin-bottom:3px">E (Emotion)</div>
          <span style="color:var(--muted2)">${(cur.E||0.5).toFixed(3)}</span>
          <span style="color:var(--muted2)"> → </span>
          <span style="color:${sg.E_delta>=0?'var(--green)':'var(--red)'};font-weight:700">${newE.toFixed(3)}</span>
          <span style="color:var(--muted2);font-size:.6rem"> (${sg.E_delta>=0?'+':''}${sg.E_delta.toFixed(3)})</span>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:9px;font-size:.68rem">
          <div style="color:var(--muted2);margin-bottom:3px">D (Desire)</div>
          <span style="color:var(--muted2)">${(cur.D||0.5).toFixed(3)}</span>
          <span style="color:var(--muted2)"> → </span>
          <span style="color:${sg.D_delta>=0?'var(--green)':'var(--red)'};font-weight:700">${newD.toFixed(3)}</span>
          <span style="color:var(--muted2);font-size:.6rem"> (${sg.D_delta>=0?'+':''}${sg.D_delta.toFixed(3)})</span>
        </div>
      </div>
      <div style="font-size:.6rem;color:var(--muted2);margin-top:8px">All other axes unchanged. Applied via ATH_STATE.setUTA() — no direct mutation.</div>`;
  },

  // ═══════════════════════════════════
  // ACCEPT — user confirms proposal → ATH_STATE updates
  // ═══════════════════════════════════
  _lastApprovalTs: 0,
  _rapidClickCount: 0,        // v3.2: tracks consecutive rapid clicks
  _FRICTION_THRESHOLD: 3000,  // gap below this = rapid click
  _FRICTION_BASE_DELAY: 2000, // base delay — escalates with click count

  acceptProposal(){
    if(!this._proposal){ alert('No proposal pending.'); return; }

    // v3.2: ESCALATING FRICTION — anti-spam with memory
    // Gap > 2000ms = user paused = reset streak. Gap < 2000ms = rapid = escalate.
    const now = Date.now();
    const gap = now - this._lastApprovalTs;

    // Gap-based reset: if user paused > 2s, they're reading — forgive streak
    if(gap >= 2000) this._rapidClickCount = 0;

    if(this._lastApprovalTs > 0 && gap < this._FRICTION_THRESHOLD){
      this._rapidClickCount = Math.min(this._rapidClickCount + 1, 4);
      const delay = Math.min(this._FRICTION_BASE_DELAY * Math.pow(2, this._rapidClickCount - 1), 15000);
      const btn = document.getElementById('ai-accept-btn');
      if(btn){
        btn.disabled = true;
        const secs = (delay/1000).toFixed(0);
        btn.textContent = `⏳ Slow down — review delta (${secs}s × click ${this._rapidClickCount})`;
        // Countdown display
        let remaining = Math.ceil(delay/1000);
        const tick = setInterval(()=>{
          remaining--;
          if(btn.disabled) btn.textContent = `⏳ Cooling down… ${remaining}s`;
          if(remaining <= 0) clearInterval(tick);
        }, 1000);
        setTimeout(()=>{
          btn.disabled = false;
          btn.innerHTML = '✅ ACCEPT &amp; APPLY';
          clearInterval(tick);
        }, delay);
      }
      return;
    }
    // Clean click — reset rapid counter
    this._rapidClickCount = 0;
    this._lastApprovalTs = now;
    const p   = this._proposal;
    const cur = ATH_STATE.getUTA();
    const sg  = p.gen.state_suggestion;

    // Apply delta through ATH_STATE — never direct
    ATH_STATE.setUTA({
      E: Math.max(0,Math.min(1,(cur.E||0.5)+sg.E_delta)),
      D: Math.max(0,Math.min(1,(cur.D||0.5)+sg.D_delta)),
    });

    // Re-render UTA display
    RENDER.uta(ATH_STATE.getUTA());

    // Record as merit entry
    const merit = ATH_STATE.getMerit();
    merit.unshift({
      id: Date.now(), action: `AI proposal accepted — ${p.interp.intent}: ${p.interp.summary.slice(0,40)}`,
      pol:1, score: parseFloat((p.crit.quality_score||0.7).toFixed(4)),
      ts: new Date().toLocaleString()
    });
    ATH_STATE.set(ATH_STATE.get ? 'ATH_merit_v2' : 'ATH_merit_v2', merit.slice(0,100));
    S.set(K.MERIT, merit.slice(0,100));

    // Clear proposal
    this._proposal = null;
    document.getElementById('ai-proposal-card').style.display='none';
    this._resetPipes();

    // Flash confirm
    const body = document.getElementById('ai-proposal-body');
    if(body) body.innerHTML = `<div style="color:var(--green);font-size:.72rem">✅ Applied. UTA state updated via ATH_STATE.</div>`;
    document.getElementById('ai-proposal-card').style.display='block';
    document.getElementById('ai-accept-btn').style.display='none';
  },

  rejectProposal(){
    this._proposal = null;
    document.getElementById('ai-proposal-card').style.display='none';
    this._resetPipes();
  },

  // ── History ──
  _saveHistory(entry){
    const hist = S.get(this._HIST_KEY, []);
    hist.unshift(entry);
    S.set(this._HIST_KEY, hist.slice(0, this._MAX_HIST));
    this.renderHistory();
  },

  renderHistory(){
    const hist = S.get(this._HIST_KEY, []);
    const cnt  = document.getElementById('ai-hist-count');
    const el   = document.getElementById('ai-history-display');
    if(cnt) cnt.textContent = hist.length;
    if(!el) return;
    if(!hist.length){ el.innerHTML='<div class="empty">No runs yet.</div>'; return; }
    el.innerHTML = hist.slice(0,8).map(h=>{
      const ok = h.approved;
      return `<div style="padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
          <span class="badge ${ok?'badge-pos':'badge-neg'}">${ok?'✓ APPROVED':'✗ REJECTED'}</span>
          <span style="font-size:.65rem;color:var(--cyan)">${escHtml((h.interp && h.interp.intent ? h.interp.intent : "?")||'?')}</span>
          <span class="ts">${h.ts||''}</span>
        </div>
        <div style="font-size:.68rem;color:var(--muted2)">${escHtml((h.text||'').slice(0,60))}${(h.text||'').length>60?'…':''}</div>
        <div style="font-size:.67rem;color:var(--text);margin-top:2px">${escHtml(((h.crit && h.crit.revised_response ? h.crit.revised_response : (h.gen && h.gen.response ? h.gen.response : ''))).slice(0,80))}…</div>
      </div>`;
    }).join('');
  },

  clearHistory(){
    S.set(this._HIST_KEY, []);
    this.renderHistory();
  },

  clear(){
    document.getElementById('ai-input').value='';
    ['interp','gen','crit'].forEach(s=>{
      const el=document.getElementById(`ai-stage-${s}`);
      if(el)el.style.display='none';
    });
    document.getElementById('ai-proposal-card').style.display='none';
    this._proposal=null;
    this._resetPipes();
  },

  init(){
    this.renderHistory();
  }
};

// ══════════════════════════════════════
// TAB SWITCHER
// ══════════════════════════════════════
function switchTab(name,el){
  var target = document.getElementById('panel-'+name);
  if(!target){ console.warn('[switchTab] panel not found: panel-'+name); return; }

  // Remove active from all panels and tabs
  var allPanels = document.querySelectorAll('.panel');
  for(var _pi=0;_pi<allPanels.length;_pi++) allPanels[_pi].classList.remove('active');
  var allTabs = document.querySelectorAll('.tab');
  for(var _ti=0;_ti<allTabs.length;_ti++) allTabs[_ti].classList.remove('active');

  // Show target panel
  target.classList.add('active');
  if(el){ el.classList.add('active'); el.textContent=el.textContent.replace(' 🔴',''); }

  // Auto-close system nav when switching to main tabs (entity / oracle)
  if(name==='entity' || name==='oracle'){
    var sys = document.getElementById('nav-system');
    var btn = document.getElementById('tab-system-btn');
    if(sys){ sys.style.display='none'; }
    if(btn){ btn.textContent='⚙ SYSTEM ▸'; btn.style.color='var(--muted)'; }
  }
  if(name==='memory'){
    MEMORY.renderAll();
    if(typeof FRAGMENT_AGING!=='undefined')      FRAGMENT_AGING.renderReport();
    if(typeof CONTRADICTION_DETECT!=='undefined') CONTRADICTION_DETECT.scanAndRender();
  }
  if(name==='kernel'){
    if(typeof KERNEL !== 'undefined'){
      KERNEL.renderLog('kernel-route-log');
      kernelRenderStats();
    }
  }
  if(name==='coord'){
    coordRenderRouteStats();
    coordRenderDecisionLog();
    MEM_TIER.render('coord-mem-tier');
    OBSERVER_INSIGHTS.scan();
    OBSERVER_INSIGHTS.render('coord-observer');
  }
  if(name==='god')       GOD.renderSnap();
  if(name==='ai')        AI_LAYER.renderHistory();
  if(name==='upgrade'){ UPGRADE.renderErrLog(); UPGRADE.renderPatchHistory(); }
  if(name==='judge'){
    if(typeof MULTI_JUDGE!=='undefined'){ MULTI_JUDGE.renderRules(); MULTI_JUDGE.renderLog(); }
    if(typeof MEMORY_GRAPH!=='undefined') MEMORY_GRAPH.render();
    if(typeof PATCH_TRUST!=='undefined')  PATCH_TRUST.renderTrust();
    judgeLearnAndRender();
  }
}

// ══════════════════════════════════════
// ATHARVA_FEEL — v3.1 HEART LAYER
// ══════════════════════════════════════
// Converts raw UTA math state → human-readable self-expression.
// Called after every UTA.process(). Pure function — no API, no state writes.
// Output goes to RENDER.feel() → #feel-card in UTA tab.
// Also injected into AI_LAYER proposals.
// ══════════════════════════════════════
const ATHARVA_FEEL = {

  // v3.2: Causal interpreter — explains WHY the state is what it is
  // Every line now has: what + because (causal chain)
  interpret(state, polarityCollision, collisionStrength){
    const { E=0.5, D=0.5, S=0.5, I=0.5, T=1.0 } = state;
    const lines = [];
    let dominantColor = '#06b6d4';
    let dominantEmoji = '◈';

    // ── Polarity collision — causal explanation ──
    if(polarityCollision){
      const strength = collisionStrength || 0;
      const intensity = strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'weak';
      lines.push({
        text: `Conflicting emotional signals detected (${intensity} collision) → system shifting to resolution mode.`,
        cause: `Because both positive and negative weighted words appeared with meaningful balance. Naive average suppressed to prevent false neutral.`,
        color:'#f59e0b', emoji:'⚡'
      });
      lines.push({
        text: `Frustration bias + urgency spike applied — proportional to collision intensity.`,
        cause: `Because ${intensity} collision at ${(strength*100).toFixed(0)}% balance ratio. Hit-count multiplier also applied — more conflicting words = stronger effect.`,
        color:'#f59e0b', emoji:'↯'
      });
      dominantColor = '#f59e0b'; dominantEmoji = '⚡';
    }

    // ── System-level causal read (before individual axes) ──
    if(polarityCollision){
      // already handled above
    } else if(S < 0.40){
      lines.push({
        text: 'Low stability → system is reactive and uncertain.',
        cause: `Because S=${S.toFixed(3)} — input was short or low-engagement. System has minimal grounding, making it more sensitive to next input.`,
        color:'#f97316', emoji:'◌'
      });
    } else if(D > 0.70 && E > 0.50){
      lines.push({
        text: 'High drive → system prioritizing action over reflection.',
        cause: `Because D=${D.toFixed(3)} with positive E=${E.toFixed(3)} — goal words dominating. System in builder mode, coherence intact.`,
        color:'#3b82f6', emoji:'▶'
      });
    } else if(E > 0.55 && D < 0.45 && S > 0.50){
      lines.push({
        text: 'System operating in balanced reflective state.',
        cause: `Because E=${E.toFixed(3)} D=${D.toFixed(3)} — positive emotion without strong directive intent. Observation mode.`,
        color:'#06b6d4', emoji:'◎'
      });
    }

    // ── Emotion axis — causal ──
    if(E < 0.25){
      lines.push({
        text: 'Deep resistance or grief state active.',
        cause: `Because E=${E.toFixed(3)} — heavily negative keyword weight overwhelmed positive signals. History blend preserved the low state.`,
        color:'#ef4444', emoji:'▼'
      });
      dominantColor = '#ef4444'; dominantEmoji = '▼';
    } else if(E < 0.40){
      lines.push({
        text: 'Tension present — system not settled.',
        cause: `Because E=${E.toFixed(3)} sits below neutral threshold. Negative inputs outweighed positive, but not catastrophically.`,
        color:'#f97316', emoji:'◐'
      });
    } else if(E > 0.75){
      lines.push({
        text: 'High coherence — system aligned and engaged.',
        cause: `Because E=${E.toFixed(3)} — strong positive signals accumulated. History blend reinforced upward trend.`,
        color:'#10b981', emoji:'▲'
      });
      dominantColor = '#10b981'; dominantEmoji = '▲';
    } else if(E > 0.60){
      lines.push({
        text: 'Positive signal registered. Flow state approaching.',
        cause: `Because E=${E.toFixed(3)} — mild positive dominance. System trending toward coherence.`,
        color:'#22c55e', emoji:'◑'
      });
    } else {
      lines.push({
        text: 'Neutral emotional baseline.',
        cause: `Because E=${E.toFixed(3)} — no dominant valence detected. ${polarityCollision?'(Collision already handled separately.)':'Input lacked strong positive or negative keywords.'}`,
        color:'#64748b', emoji:'○'
      });
    }

    // ── Desire axis — causal ──
    if(D > 0.75){
      lines.push({
        text: 'System in high-desire mode — directive intent confirmed.',
        cause: `Because D=${D.toFixed(3)} — multiple goal/action words triggered desire accumulation above urgency threshold.`,
        color:'#3b82f6', emoji:'⟶'
      });
      if(!polarityCollision){ dominantColor='#3b82f6'; dominantEmoji='⟶'; }
    } else if(D > 0.60){
      lines.push({
        text: 'Goal-oriented signals. Builder mode active.',
        cause: `Because D=${D.toFixed(3)} — desire words present but below urgency spike level.`,
        color:'#60a5fa', emoji:'◈'
      });
    } else if(D < 0.30){
      lines.push({
        text: 'Low desire state — reflective or passive mode.',
        cause: `Because D=${D.toFixed(3)} — very few goal/action words in input. System not being directed.`,
        color:'#475569', emoji:'◎'
      });
    }

    // ── Intensity — causal ──
    if(I > 0.80){
      lines.push({
        text: 'Input force is strong — weight learning rate elevated.',
        cause: `Because I=${I.toFixed(3)} — high punctuation density, caps, or intensity keywords detected. Adaptive weights will shift faster this cycle.`,
        color:'#ef4444', emoji:'!'
      });
    } else if(I < 0.25){
      lines.push({
        text: 'Low intensity — minimal weight adaptation this cycle.',
        cause: `Because I=${I.toFixed(3)} — calm, lowercase, unpunctuated input. System coasting.`,
        color:'#475569', emoji:'·'
      });
    }

    // ── Time decay — causal ──
    if(T < 0.30){
      lines.push({
        text: 'State heavily decayed — context is stale.',
        cause: `Because T=${T.toFixed(3)} — significant time elapsed since last input. λ=${(state.lambda ? state.lambda.toFixed(3) : "?")||'?'} decay rate consumed most historical context.`,
        color:'#7c3aed', emoji:'⌛'
      });
    } else if(T < 0.55){
      lines.push({
        text: 'Moderate decay — partial historical context preserved.',
        cause: `Because T=${T.toFixed(3)} — some time passed. History blend partially active.`,
        color:'#8b5cf6', emoji:'↷'
      });
    }

    // ── Sensation ──
    if(S > 0.80){
      lines.push({
        text: 'Full processing mode — long or detailed input.',
        cause: `Because S=${S.toFixed(3)} — input length proxy near maximum. System engaged deeply.`,
        color:'#a855f7', emoji:'◉'
      });
    }

    const coherence = ((E + D + I) / 3);
    const coherenceLabel = coherence > 0.65 ? 'HIGH' : coherence < 0.35 ? 'LOW' : 'MID';
    const coherenceColor = coherence > 0.65 ? '#10b981' : coherence < 0.35 ? '#ef4444' : '#f59e0b';

    // v3.3: TEMPORAL AWARENESS — pull latest reflection for historical context
    const reflections = ATH_STATE.getReflections();
    if(reflections.length > 0){
      const latest = reflections[0];
      lines.push({
        text: `Temporal context: ${latest.trendLabel} E-trend over last ${latest.n} states.`,
        cause: `Because reflection #${latest.inputCount} found avg E=${(latest.avg && latest.avg.E != null ? latest.avg.E.toFixed(3) : "?")} — ${latest.insight.slice(0,80)}…`,
        color:'#7c3aed', emoji:'🔮'
      });
    }

    return { lines, dominantColor, dominantEmoji, coherence, coherenceLabel, coherenceColor, polarityCollision, collisionStrength };
  },

  run(state, polarityCollision, collisionStrength){
    const feel = this.interpret(state, polarityCollision, collisionStrength);
    RENDER.feel(feel);
    return feel;
  },

  summary(state, polarityCollision, collisionStrength){
    const feel = this.interpret(state, polarityCollision, collisionStrength);
    return feel.lines.map(l => `${l.emoji} ${l.text} (${l.cause})`).join(' | ');
  }
};

// Wire RENDER.feel
Object.assign(RENDER, {
  feel(feel){
    const card = document.getElementById('feel-card');
    const el   = document.getElementById('feel-output');
    if(!card || !el) return;
    card.style.display = 'block';
    const linesHTML = feel.lines.map(l =>
      `<div style="margin-bottom:9px">
        <div style="display:flex;align-items:flex-start;gap:7px">
          <span style="color:${l.color};font-size:.85rem;flex-shrink:0;margin-top:1px">${l.emoji}</span>
          <span style="font-size:.71rem;color:${l.color};line-height:1.5;font-weight:600">${l.text}</span>
        </div>
        ${l.cause?`<div style="font-size:.63rem;color:var(--muted2);line-height:1.6;padding-left:22px;margin-top:2px;border-left:2px solid ${l.color}33;padding-left:10px;margin-left:12px">${l.cause}</div>`:''}
      </div>`
    ).join('');
    el.innerHTML = `
      ${feel.polarityCollision ? `<div style="font-size:.63rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:5px 8px;color:#f59e0b;margin-bottom:8px;letter-spacing:1px">⚡ POLARITY COLLISION ACTIVE — sarcasm/conflict bias applied</div>` : ''}
      ${linesHTML}
      <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="font-size:.6rem;color:var(--muted2)">COHERENCE</span>
        <span style="font-size:.78rem;font-weight:700;color:${feel.coherenceColor}">${feel.coherenceLabel} (${feel.coherence.toFixed(3)})</span>
        <span style="font-size:1.1rem">${feel.dominantEmoji}</span>
      </div>`;
  }
});

// ══════════════════════════════════════
// ATHARVA_TEST — v3.1 BRUTAL TEST SUITE
// ══════════════════════════════════════
// No mercy mode. Every test has:
//   - name, group, expected behavior
//   - assertion function that returns {pass, detail}
//   - runs against LIVE system state — not mocks
// ══════════════════════════════════════
