const ATH_STATE = {

  // ── Generic access (mirrors S but is the canonical entry point) ──
  get(key, fallback=null){ return S.get(key, fallback); },
  set(key, val)          { S.set(key, val); },

  // ── UTA state ──
  getUTA(){ return S.get(K.UTA_STATE, {E:0.5,D:0.5,S:0.5,P:0.5,I:0.5,T:1.0,lambda:0.3,ts:0}); },
  setUTA(delta){
    const cur = this.getUTA();
    const clamp01 = v => (typeof v==='number' ? Math.min(1, Math.max(0, v)) : v);
    const axes01  = ['E','D','S','P','I','T'];
    const clamped = {};
    for(const [k,v] of Object.entries(delta)){
      clamped[k] = axes01.includes(k) ? clamp01(v) : v;
    }
    S.set(K.UTA_STATE, {...cur, ...clamped, ts: clamped.ts || Date.now()});
  },

  // ── Weights ──
  getWeights(){ return Object.assign({}, UTA_WEIGHT_DEFAULTS, S.get(K.UTA_WEIGHTS, {})); },
  setWeights(w){ S.set(K.UTA_WEIGHTS, w); },

  // ── Merit / Schemas / Memory ──
  getMerit()    { return S.get(K.MERIT, []); },
  getSchemas()  { return S.get(K.UTA_SCHEMAS, {}); },
  getMemStore() { return S.get(K.MEM_STORE, {}); },

  // ── v3.3: Reflection system ──
  getUTAHistory()   { return S.get(K.UTA_HISTORY, []); },
  getReflections()  { return S.get(K.REFLECTIONS, []); },
  pushUTAHistory(state){
    const hist = this.getUTAHistory();
    hist.push({ E:state.E, D:state.D, S:state.S, I:state.I, T:state.T, ts:Date.now() });
    S.set(K.UTA_HISTORY, hist.slice(-50)); // keep last 50 only
  },
  pushReflection(r){
    const log = this.getReflections();
    log.unshift(r);
    S.set(K.REFLECTIONS, log.slice(0, 30)); // keep last 30
  },
  clearReflections(){
    S.set(K.UTA_HISTORY, []);
    S.set(K.REFLECTIONS, []);
  },

  // v3.4 EPISODIC MEMORY — identity layer
  pushEpisode(ep){
    var eps = S.get(K.EPISODES, []);
    ep.id = 'ep_' + Date.now();
    ep.ts = Date.now();
    eps.unshift(ep);
    if(eps.length > 100) eps = eps.slice(0, 100);
    S.set(K.EPISODES, eps);
  },
  getEpisodes(){ return S.get(K.EPISODES, []); },
  clearEpisodes(){ S.set(K.EPISODES, []); },

  // ── Patch validation — UPGRADE uses this before applying ──
  validatePatch(moduleName, funcName){
    const mods = {UTA, MEMORY, CIV, GOD};
    const mod = mods[moduleName];
    return mod && typeof mod[funcName] === 'function';
  },

  // ── Rollback store ──
  storeRollback(moduleName, funcName){
    const mods = {UTA, MEMORY, CIV, GOD};
    const mod = mods[moduleName];
    if(!mod || typeof mod[funcName] !== 'function') return;
    const rollbacks = S.get(K.ROLLBACKS, []);
    rollbacks.unshift({
      module: moduleName, funcName,
      code: mod[funcName].toString(),
      ts: new Date().toLocaleString()
    });
    S.set(K.ROLLBACKS, rollbacks.slice(0, 20));
  },

  // ── God Layer snapshot — single call, returns everything ──
  snapshot(){
    const uta = this.getUTA();
    const merit = this.getMerit();
    const schemas = this.getSchemas();
    const patches = S.get(K.PATCHES, []);
    const errors = S.get(K.ERR_LOG, []);
    return {
      uta,
      meritTotal: merit.reduce((a,e)=>a+e.score,0).toFixed(3),
      meritCount: merit.length,
      schemaCount: Object.keys(schemas).length,
      patchCount: patches.length,
      errorCount: errors.length,
      apiMode: S.get(K.API_MODE,'mock'),
      ts: new Date().toLocaleString()
    };
  },

  // ── Weight Audit Log ──
  // Each entry: {call, key, before, after, delta, driftPct, autoRolled, trigger, ts}
  getWeightLog(){ return S.get(K.WEIGHT_LOG, []); },

  appendWeightLog(entries){
    if(!entries||!entries.length) return;
    const log = this.getWeightLog();
    // Prepend newest first, cap at max
    entries.forEach(e => log.unshift(e));
    S.set(K.WEIGHT_LOG, log.slice(0, WEIGHT_LOG_MAX));
  },

  clearWeightLog(){ S.set(K.WEIGHT_LOG, []); }
};


function sanitize(raw='', maxLen=500){
  return String(raw)
    .replace(/[<>'"`;]/g,'')   // strip injection chars
    .replace(/\0/g,'')          // null bytes
    .slice(0, maxLen)
    .trim();
}

function escHtml(s){
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Simple hash for schema keys — FIX #6
function hashKey(str){
  let h=0;
  for(let i=0;i<str.length;i++){h=((h<<5)-h+str.charCodeAt(i))|0}
  return 'sk_'+(h>>>0).toString(36);
}

// ══════════════════════════════════════
// API ENGINE — v3.0 Groq-first routing
// Priority: MOCK → Groq (free) → Gemini → Claude
// callClaude() is now a universal dispatcher — name kept for compatibility
// ══════════════════════════════════════
const API = {

  mode(){ return S.get(K.API_MODE,'mock') },

  async withTimeout(promise, ms=18000){
    return Promise.race([
      promise,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('API timeout after '+ms+'ms')),ms))
    ]);
  },

  // ── GROQ — free, fast, llama-3.3-70b-versatile (OpenAI-compatible) ──
  async callGroq(userPrompt, sys='', maxTok=1000){
    const key = S.get(K.GROQ_KEY,'');
    if(!key) throw new Error('No Groq key');
    const messages = [];
    if(sys) messages.push({role:'system', content:sys});
    messages.push({role:'user', content:userPrompt});
    const res = await this.withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'llama-3.3-70b-versatile', max_tokens:maxTok, messages})
    }));
    const data = await res.json();
    if(data.error) throw new Error(data.error.message||'Groq error');
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : null) || 'No response';
  },

  // ── CLAUDE — fallback if no Groq key ──
  async callAnthropic(userPrompt, sys='', maxTok=1000){
    const key = S.get(K.ANTHR_KEY,'');
    if(!key) throw new Error('No Anthropic key');
    const body={model:'claude-sonnet-4-20250514',max_tokens:maxTok,messages:[{role:'user',content:userPrompt}]};
    if(sys) body.system=sys;
    const res = await this.withTimeout(fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
      body:JSON.stringify(body)
    }));
    const data = await res.json();
    if(data.error) throw new Error(data.error.message||'Claude error');
    return data.content[0].text;
  },

  // ── GEMINI — used by GOD Layer if Gemini key set ──
  async callGemini(prompt){
    const key = S.get(K.GEMINI_KEY,'');
    if(!key || this.mode()==='mock') return this.callClaude(prompt,'You are a wise omniscient AI observer.');
    const res = await this.withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})}
    ));
    const d = await res.json();
    if(d.error) throw new Error(d.error.message||'Gemini error');
    return (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] ? d.candidates[0].content.parts[0].text : null)||'No response';
  },

  // ── UNIVERSAL DISPATCHER — Groq first, Claude fallback ──
  // All modules call this. Name kept as callClaude for backward compatibility.
  async callClaude(userPrompt, sys='', maxTok=1000){
    if(this.mode()==='mock') return this._mockClaude(userPrompt, sys);
    const groqKey = S.get(K.GROQ_KEY,'');
    if(groqKey){
      try{ return await this.callGroq(userPrompt, sys, maxTok); }
      catch(e){
        // Groq failed — log and try Claude
        console.warn('[ATHARVA] Groq failed, falling back to Claude:', e.message);
      }
    }
    const anthrKey = S.get(K.ANTHR_KEY,'');
    if(anthrKey) return await this.callAnthropic(userPrompt, sys, maxTok);
    throw new Error('No API key available. Add Groq key (free) or Anthropic key in CONFIG tab, or use MOCK mode.');
  },

  // ── MOCK RESPONSES — realistic, offline ──
  _mockClaude(prompt, sys){
    const p = prompt.toLowerCase();
    const s = (sys||'').toLowerCase();

    // Debate agents
    if(s.includes('vāda')||s.includes('thesis proponent'))
      return Promise.resolve(MOCK.vada(prompt));
    if(s.includes('pratīvāda')||s.includes('counter'))
      return Promise.resolve(MOCK.pratīvada(prompt));
    if(s.includes('viveka')||s.includes('discriminating'))
      return Promise.resolve(MOCK.viveka(prompt));
    if(s.includes('judge'))
      return Promise.resolve(MOCK.judge(prompt));

    // Upgrade analysis
    if(p.includes('"issuesfound"')||p.includes('module source code')||s.includes('auditor'))
      return Promise.resolve(MOCK.analysis(prompt));

    // God layer
    if(s.includes('omniscient')||p.includes('system state'))
      return Promise.resolve(MOCK.oracle(prompt));

    // Auto scan
    if(p.includes('"urgentmodule"')||p.includes('health audit'))
      return Promise.resolve(MOCK.scan(prompt));

    // Default
    return Promise.resolve(MOCK.generic(prompt));
  }
};

// ══════════════════════════════════════
// MOCK RESPONSE LIBRARY
// ══════════════════════════════════════
const MOCK = {
  _topics(p){
    const m=p.match(/["']([^"']{4,60})["']/);
    return m?m[1]:'this topic';
  },

  vada(p){
    const t=this._topics(p);
    return `The fundamental premise for "${t}" rests on three pillars: first, empirical observation validates its structural necessity. Second, historical precedent demonstrates its recurring emergence across civilizations. Third, the logical architecture demands its existence as a foundational axiom. Without accepting this position, all subsequent reasoning collapses into incoherence. The evidence is not merely suggestive — it is deterministic.`;
  },
  pratīvada(p){
    return `The thesis presented contains a critical logical fallacy: it assumes correlation implies causation. Furthermore, the so-called "empirical evidence" is selectively curated. What of the counter-cases? The argument ignores systemic contradictions and relies on circular reasoning. The historical precedent cited can equally justify the opposite conclusion. This position is intellectually fragile and collapses under basic scrutiny.`;
  },
  viveka(p){
    return `Both positions reveal a deeper truth: they are two faces of the same reality. VĀDA identifies structure; PRATĪVĀDA identifies process. Neither is wrong — both are incomplete. The synthesis: truth is not a fixed point but a dynamic tension between thesis and antithesis. The discriminating intellect recognizes that absolute positions are epistemic traps. The wisdom lies in holding both simultaneously without collapsing into either.`;
  },
  judge(p){
    return `After careful deliberation, the verdict acknowledges the merit in all positions.

[VĀDA:72] — Strong structural argument, but overconfident in certainty.
[PRATĪVĀDA:65] — Sharp critique, but destructive without constructive alternative.
[VIVEKA:88] — Most balanced and philosophically mature perspective.

GOVERNING PRINCIPLE: Truth emerges from the productive tension between opposing forces. Certainty is the enemy of wisdom. The highest position is not victory in debate, but the revelation of deeper complexity. System recommends continued dialectical inquiry.`;
  },

  analysis(p){
    const mod=(p.match(/auditing the (\w+) module/i)||[])[1]||'UTA';
    return JSON.stringify({
      module:mod,
      issuesFound:[
        `Weight calculations in ${mod} use fixed coefficients that don't adapt to usage patterns`,
        `Missing null-check before accessing nested properties in state transitions`,
        `Async operations lack individual timeout handling — single slow call blocks entire chain`
      ],
      improvements:[
        'Add adaptive weight system that learns from previous inputs',
        'Add optional chaining (?.) for all nested property access',
        'Wrap each async call in independent timeout Promise.race()'
      ],
      criticalFix:{
        functionName:'calcI',
        reason:'Intensity calculation is purely rule-based with no learning — should adapt weights from historical accuracy',
        improvedCode:`function calcI(text) {
  const weights = S.get(K.UTA_WEIGHTS, { excl:0.08, quest:0.04, caps:0.4, word:0.07 });
  const excl  = (text.match(/!/g)||[]).length * weights.excl;
  const quest = (text.match(/\?/g)||[]).length * weights.quest;
  const caps  = ((text.match(/[A-Z]/g)||[]).length / Math.max(text.length,1)) * weights.caps;
  const iWords = ['URGENT','CRITICAL','LOVE','HATE','AMAZING','TERRIBLE','WOW',
                  'NEVER','ALWAYS','devastated','ecstatic','furious','desperate'];
  let wScore = 0;
  const up = text.toUpperCase();
  iWords.forEach(w => { if(up.includes(w.toUpperCase())) wScore += weights.word; });
  return Math.min(1.0, Math.max(0.1, 0.3 + excl + quest + caps + wScore));
}`
      },
      healthScore:74,
      summary:`${mod} module has 3 fixable issues — main improvement is adaptive weight learning`
    });
  },

  oracle(p){
    const lines=[
      'The system shows high Desire (D) but moderate Sensation (S) — you are planning more than experiencing. Consider grounding activity.',
      'Intensity is elevated, suggesting recent high-engagement input. Time decay should stabilize this within the hour.',
      'Merit ledger is building positive momentum. The schema registry shows growing pattern recognition.',
      'Warning: E-axis below 0.4 indicates emotional suppression. The system recommends processing this state explicitly.',
      'Strong coherence between I and λ values — the system is self-regulating correctly.'
    ];
    return lines[Math.floor(Math.random()*lines.length)];
  },

  scan(p){
    return JSON.stringify({
      urgentModule:'UTA',
      systemicIssues:[
        'No API keys configured — system running in mock mode only',
        'Error log has unresolved STORAGE errors from previous sessions',
        'UTA adaptive weights not yet initialized — using static defaults'
      ],
      healthScore:68,
      recommendation:'Configure API keys in CONFIG tab to unlock live AI capabilities',
      reasoning:'UTA is the core cognitive module — its improvement has highest cascade effect on system quality'
    });
  },

  generic(p){
    return `[MOCK RESPONSE] System is in offline mode. Analysis: "${p.slice(0,60)}..." — Configure API keys in CONFIG tab for live AI responses. All core functions work offline.`;
  }
};

// ══════════════════════════════════════
// v2.5 STABLE WEIGHT ENGINE — CONSTANTS
// Three Forces: Rate Cap | Bounds Guard | Baseline Decay
// ══════════════════════════════════════
const UTA_WEIGHT_DEFAULTS = {
  excl:0.08, quest:0.04, caps:0.40, word:0.07,
  pos_e:0.07, neg_e:0.07, des_d:0.06, history_blend:0.40
};
const W_GLOBAL_MIN  = 0.01;   // hard floor for all weights
const W_GLOBAL_MAX  = 0.30;   // hard ceiling for all weights
const W_BLEND_MIN   = 0.20;   // tighter floor for history_blend
const W_BLEND_MAX   = 0.70;   // tighter ceiling for history_blend
const LEARNING_CAP    = 0.005;  // max delta per adaptWeights() call
const DECAY_RATE      = 0.01;   // 1% nudge toward defaults per decay pass
const DECAY_EVERY_N   = 100;    // calls between each decay pass
const ATHARVA_BASE_VER = 5;     // v2.5 is the patch base — all ver tags offset from here

// ── Weight Audit constants ──
const DRIFT_THRESHOLD  = 0.50;  // 50% relative drift from default triggers instability flag
const WEIGHT_LOG_MAX   = 200;   // max entries in audit log

// ══════════════════════════════════════
// v2.5 JSON SCHEMA VALIDATOR
// Use instead of raw JSON.parse on ALL AI responses
// Returns { valid, data, errors[] }
// ══════════════════════════════════════
function validateAIResponse(raw, schema){
  const result = { valid:false, data:null, errors:[] };
  // Strip markdown fences (mock or real AI may add them)
  const cleaned = String(raw||'').trim()
    .replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
  // Parse JSON
  let parsed;
  try{ parsed = JSON.parse(cleaned); }
  catch(e){
    // Fallback: try to extract first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if(m){ try{ parsed = JSON.parse(m[0]); }catch(e2){ result.errors.push('JSON parse failed: '+e2.message); return result; } }
    else{ result.errors.push('JSON parse failed: '+e.message); return result; }
  }
  // Type-check each expected field
  for(const [field, expectedType] of Object.entries(schema)){
    if(!(field in parsed)){ result.errors.push('Missing field: '+field); continue; }
    const actualType = Array.isArray(parsed[field]) ? 'array' : typeof parsed[field];
    if(actualType !== expectedType) result.errors.push(`${field}: expected ${expectedType}, got ${actualType}`);
  }
  result.data = parsed;
  result.valid = result.errors.length === 0;
  return result;
}

// ══════════════════════════════════════
// RENDER — v3.0 CENTRALIZED DOM LAYER
// ══════════════════════════════════════
// Only module allowed to write to the DOM.
// Contract: receives data objects, writes HTML, returns nothing.
// No state reads from localStorage inside render functions.
// ══════════════════════════════════════
const RENDER = {

  uta(state){
    const defs=[
      {k:'E',label:'EMOTION',   color:'#22c55e'},
      {k:'D',label:'DESIRE',    color:'#3b82f6'},
      {k:'S',label:'SENSATION', color:'#a855f7'},
      {k:'P',label:'PERCEPT',   color:'#f59e0b'},
      {k:'I',label:'INTENSITY', color:'#ef4444'},
      {k:'T',label:'T-DECAY',   color:'#06b6d4'},
    ];
    const el = document.getElementById('axes-display');
    if(!el) return;
    el.innerHTML = defs.map(d=>{
      const v = typeof state[d.k]==='number' ? state[d.k] : 0;
      return`<div class="axis-box">
        <div class="axis-label">${d.label}</div>
        <div class="axis-val" style="color:${d.color}">${v.toFixed(3)}</div>
        <div class="axis-bar"><div class="axis-fill" style="width:${(v*100).toFixed(1)}%;background:${d.color}"></div></div>
      </div>`;
    }).join('');
  },

  weights(w, callCount){
    const el = document.getElementById('weight-display');
    if(!el) return;
    const nextDecay = DECAY_EVERY_N - (callCount % DECAY_EVERY_N);
    el.innerHTML = `<div style="font-size:.58rem;color:var(--muted2);margin-bottom:7px">
      Calls: <span style="color:var(--cyan)">${callCount}</span> &nbsp;|&nbsp;
      Next decay in: <span style="color:var(--gold)">${nextDecay}</span> calls &nbsp;|&nbsp;
      Cap: <span style="color:var(--muted2)">±${LEARNING_CAP}</span>
    </div>` +
    Object.entries(w)
      .filter(([k]) => k !== 'history_blend')
      .map(([k,v]) => {
        const def = UTA_WEIGHT_DEFAULTS[k] || 0;
        const drift = v - def;
        const driftColor = Math.abs(drift) < 0.005 ? 'var(--muted2)' : drift > 0 ? 'var(--green)' : 'var(--red)';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:.6rem;color:var(--muted2);width:72px">${k}</span>
          <div style="flex:1;height:3px;background:var(--border2);border-radius:1px">
            <div style="height:100%;width:${Math.min(v*300,100)}%;background:var(--cyan);border-radius:1px"></div>
          </div>
          <span style="font-size:.6rem;color:var(--cyan);width:38px;text-align:right">${v.toFixed(3)}</span>
          <span style="font-size:.58rem;color:${driftColor};width:44px;text-align:right">${drift>=0?'+':''}${drift.toFixed(3)}</span>
        </div>`;
      }).join('') +
    `<div style="font-size:.58rem;color:var(--muted2);margin-top:7px">blend: <span style="color:var(--cyan)">${w.history_blend.toFixed(3)}</span> <span style="color:var(--muted)">[${W_BLEND_MIN}–${W_BLEND_MAX}]</span></div>`;
  },

  analysis(delta, wCallCount, wDrift, blend){
    const card = document.getElementById('uta-analysis-card');
    if(!card) return;
    card.style.display = 'block';
    document.getElementById('uta-analysis').innerHTML = `
      <div style="font-size:.7rem;line-height:2;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">
        <span><span style="color:var(--muted2)">I:</span> <span style="color:var(--gold)">${delta.I.toFixed(4)}</span></span>
        <span><span style="color:var(--muted2)">λ:</span> <span style="color:var(--gold)">${delta.lambda.toFixed(4)}</span></span>
        <span><span style="color:var(--muted2)">E→</span> <span style="color:#22c55e">${delta.E.toFixed(4)}</span></span>
        <span><span style="color:var(--muted2)">D→</span> <span style="color:#3b82f6">${delta.D.toFixed(4)}</span></span>
        <span><span style="color:var(--muted2)">S→</span> <span style="color:#a855f7">${delta.S.toFixed(4)}</span></span>
        <span><span style="color:var(--muted2)">P→</span> <span style="color:#f59e0b">${delta.P.toFixed(4)}</span></span>
        <span style="grid-column:1/-1;color:var(--muted);font-size:.6rem">blend=${blend.toFixed(2)} | calls=${wCallCount} | drift=${wDrift.toFixed(4)} ${wCallCount%100===0?'✦ DECAY APPLIED':''}</span>
      </div>`;
  },

  // ── Weight Audit Log renderer ──
  weightAudit(log){
    const el = document.getElementById('weight-audit-display');
    const cnt = document.getElementById('weight-audit-count');
    const flagEl = document.getElementById('weight-instability-flag');
    if(!el) return;
    const allLog = ATH_STATE.getWeightLog();
    const instabilities = allLog.filter(e=>e.instability);
    const rollbacks     = allLog.filter(e=>e.autoRolled);
    if(cnt) cnt.textContent = allLog.length;
    if(flagEl){
      if(instabilities.length){
        flagEl.style.display='block';
        flagEl.innerHTML=`⚠ ${instabilities.length} instability event${instabilities.length>1?'s':''} — ${rollbacks.length} auto-rolled back`;
      } else { flagEl.style.display='none'; }
    }
    if(!log.length){ el.innerHTML='<div class="empty">No weight changes recorded yet.</div>'; return; }
    el.innerHTML = log.slice(0,15).map(e=>{
      const dCol = e.delta>0?'var(--green)':e.delta<0?'var(--red)':'var(--muted2)';
      const instBadge = e.instability?`<span style="font-size:.55rem;background:rgba(239,68,68,.2);color:var(--red);border:1px solid rgba(239,68,68,.3);padding:1px 5px;border-radius:8px">⚠ UNSTABLE</span>`:'';
      const rollBadge = e.autoRolled?`<span style="font-size:.55rem;background:rgba(245,158,11,.2);color:var(--gold);border:1px solid rgba(245,158,11,.3);padding:1px 5px;border-radius:8px">↩ AUTO-ROLLED</span>`:'';
      const decBadge  = e.trigger==='decay'?`<span style="font-size:.55rem;background:rgba(6,182,212,.1);color:var(--cyan);border:1px solid rgba(6,182,212,.2);padding:1px 5px;border-radius:8px">✦ DECAY</span>`:'';
      return `<div style="padding:5px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:7px">
        <span style="font-size:.6rem;color:var(--muted2);width:44px;flex-shrink:0">#${e.call||'?'}</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span style="font-size:.65rem;color:var(--cyan);font-weight:700">${escHtml(e.key)}</span>
            <span style="font-size:.62rem;color:var(--muted2)">${(e.before||0).toFixed(4)}</span>
            <span style="font-size:.6rem;color:var(--muted2)">→</span>
            <span style="font-size:.62rem;color:var(--text);font-weight:700">${(e.after||0).toFixed(4)}</span>
            <span style="font-size:.6rem;color:${dCol}">(${e.delta>=0?'+':''}${(e.delta||0).toFixed(4)})</span>
            ${instBadge}${rollBadge}${decBadge}
          </div>
          <div style="font-size:.58rem;color:var(--muted2)">drift: ${((e.driftPct||0)*100).toFixed(1)}% from default${e.ts?' · '+e.ts:''}</div>
        </div>
      </div>`;
    }).join('');
  },

  godSnap(snap){
    const el = document.getElementById('god-state-snap');
    if(!el) return;
    const uta = snap.uta;
    const axes = ['E','D','S','P','I','T'].map(k=>{
      const v = typeof uta[k]==='number'?uta[k]:0;
      return`<div style="text-align:center;padding:6px 4px;background:var(--bg3);border:1px solid var(--border);border-radius:5px">
        <div style="font-size:.55rem;color:var(--muted2)">${k}</div>
        <div style="font-size:.9rem;font-weight:700;color:var(--cyan)">${v.toFixed(3)}</div>
      </div>`;
    });
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px">${axes.join('')}</div>
      <div style="font-size:.65rem;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;color:var(--muted2)">
        <span>λ <span style="color:var(--text)">${(uta.lambda||0).toFixed(4)}</span></span>
        <span>Merit <span style="color:var(--green)">${snap.meritTotal} (${snap.meritCount})</span></span>
        <span>Schemas <span style="color:var(--violet)">${snap.schemaCount}</span></span>
        <span>Patches <span style="color:var(--gold)">${snap.patchCount}</span></span>
        <span>Errors <span style="color:var(--red)">${snap.errorCount}</span></span>
        <span>Mode <span style="color:${snap.apiMode==='live'?'var(--green)':'var(--gold)'}">${snap.apiMode.toUpperCase()}</span></span>
      </div>
      <div class="ts" style="margin-top:6px">${snap.ts}</div>`;
  }
};

// ══════════════════════════════════════
// UTA — Universal Thought Architecture
// FIX #5 (ts init), #14 (adaptive weights)
// v3: compute() is now PURE — no DOM, no S.set
// v3: process() is orchestrator — calls compute → ATH_STATE → RENDER
// ══════════════════════════════════════
const UTA = {

  DEFAULT:{ E:0.5, D:0.5, S:0.5, P:0.5, I:0.5, T:1.0, lambda:0.3, ts:0 },
  state:null,

  init(){
    this.state = ATH_STATE.getUTA();
    // FIX #5: proper timestamp init
    if(!this.state || typeof this.state !== 'object'){
      this.state = { ...this.DEFAULT, ts:Date.now() };
    }
    if(!this.state.ts || this.state.ts === 0){
      this.state.ts = Date.now();
    }
    ATH_STATE.setUTA(this.state);
    RENDER.uta(this.state);
    const w = ATH_STATE.getWeights();
    let callCount = 0;
    try{ callCount = parseInt(localStorage.getItem(K.WEIGHT_CALLS)||'0',10)||0; }catch(_){}
    RENDER.weights(w, callCount);
    RENDER.weightAudit(ATH_STATE.getWeightLog());
  },

  // v3: delegate to ATH_STATE — single source of truth
  getWeights(){ return ATH_STATE.getWeights(); },

  // v2.5 STABLE WEIGHT ENGINE — adaptWeights()
  // Force 1: Learning Rate Cap  — all deltas ≤ ±LEARNING_CAP
  // Force 2: Bounds Guard       — hard clamp every call, history_blend has own range
  // Force 3: Baseline Decay     — every DECAY_EVERY_N calls, nudge 1% toward defaults
  // v3.0 AUDIT LAYER (new):
  //   • Log every delta to ATH_weight_log_v3 (black-box recorder)
  //   • Flag instability if any weight drifts > DRIFT_THRESHOLD (50%) from default
  //   • Auto-rollback that weight to default if flagged
  adaptWeights(I, prevState){
    const wBefore = this.getWeights();
    const w = {...wBefore};  // work on a copy

    // ── Force 1: Learning Rate Cap ──
    if(I < 0.2){
      const delta = Math.min(+0.003, LEARNING_CAP);
      w.excl = w.excl + delta;
    }
    const drift = Math.abs(this.state.E - 0.5) + Math.abs(this.state.D - 0.5);
    if(drift > 0.8){
      const delta = Math.min(+0.005, LEARNING_CAP);
      w.word = w.word - delta;
    }

    // ── Force 2: Bounds Guard ──
    for(const key of Object.keys(w)){
      if(typeof w[key] !== 'number') continue;
      if(key === 'history_blend'){
        w[key] = Math.max(W_BLEND_MIN, Math.min(W_BLEND_MAX, w[key]));
      } else {
        w[key] = Math.max(W_GLOBAL_MIN, Math.min(W_GLOBAL_MAX, w[key]));
      }
    }

    // ── Force 3: Baseline Decay ──
    let callCount = 0;
    try{ callCount = (parseInt(localStorage.getItem(K.WEIGHT_CALLS)||'0',10)||0) + 1; }catch(_){ callCount = 1; }
    try{ localStorage.setItem(K.WEIGHT_CALLS, String(callCount)); }catch(_){}

    const isDecayCall = (callCount % DECAY_EVERY_N === 0);
    if(isDecayCall){
      for(const key of Object.keys(w)){
        const def = UTA_WEIGHT_DEFAULTS[key];
        if(typeof def === 'number' && typeof w[key] === 'number'){
          w[key] = w[key] + DECAY_RATE * (def - w[key]);
        }
      }
      // Final bounds pass after decay
      for(const key of Object.keys(w)){
        if(typeof w[key] !== 'number') continue;
        w[key] = key==='history_blend'
          ? Math.max(W_BLEND_MIN, Math.min(W_BLEND_MAX, w[key]))
          : Math.max(W_GLOBAL_MIN, Math.min(W_GLOBAL_MAX, w[key]));
      }
      console.log(`[ATHARVA v3 UTA] Baseline decay at call #${callCount}`);
    }

    // ── v3 AUDIT: Drift Detection + Auto-Rollback ──
    const auditEntries = [];
    const ts = new Date().toLocaleTimeString();
    for(const key of Object.keys(w)){
      const def = UTA_WEIGHT_DEFAULTS[key];
      if(typeof def !== 'number' || typeof w[key] !== 'number') continue;
      const before   = wBefore[key];
      const after    = w[key];
      const delta    = after - before;
      // Skip if no change at all
      if(Math.abs(delta) < 0.0001 && !isDecayCall) continue;

      // Relative drift from baseline: |current - default| / default
      const driftPct = def !== 0 ? Math.abs(after - def) / Math.abs(def) : 0;
      const instability = driftPct > DRIFT_THRESHOLD;

      let autoRolled = false;
      if(instability){
        // Auto-rollback: reset this specific weight to default
        w[key] = def;
        autoRolled = true;
        UPGRADE._logErr('UTA', new Error(
          `Weight "${key}" drifted ${(driftPct*100).toFixed(1)}% from default — auto-rolled to ${def}`
        ), 'adaptWeights:autoRollback');
      }

      auditEntries.push({
        call: callCount, key, before: parseFloat(before.toFixed(5)),
        after: parseFloat((autoRolled ? def : after).toFixed(5)),
        delta: parseFloat((autoRolled ? def - before : delta).toFixed(5)),
        driftPct: parseFloat(driftPct.toFixed(4)),
        instability, autoRolled,
        trigger: isDecayCall ? 'decay' : (delta !== 0 ? 'learn' : 'none'),
        ts
      });
    }

    if(auditEntries.length) ATH_STATE.appendWeightLog(auditEntries);

    ATH_STATE.setWeights(w);
    return callCount;
  },

  calcI(text){
    const w = this.getWeights();
    const excl  = (text.match(/!/g)||[]).length * w.excl;
    const quest = (text.match(/\?/g)||[]).length * w.quest;
    const caps  = ((text.match(/[A-Z]/g)||[]).length / Math.max(text.length,1)) * w.caps;
    const iWords = ['URGENT','CRITICAL','LOVE','HATE','AMAZING','TERRIBLE','BRILLIANT',
                    'WOW','INCREDIBLE','NEVER','ALWAYS','devastated','ecstatic','furious',
                    'desperate','vital','crucial','absolutely','impossible'];
    let wScore=0; const up=text.toUpperCase();
    iWords.forEach(wd=>{if(up.includes(wd.toUpperCase()))wScore+=w.word});
    return Math.min(1.0, Math.max(0.1, 0.3+excl+quest+caps+wScore));
  },

  calcAxes(text){
    const w = this.getWeights();
    const low = text.toLowerCase();
    // v3.2: weighted word lists — strong words count more than weak ones
    const posW=[
      {wd:'love',wt:1.4},{wd:'amazing',wt:1.3},{wd:'wonderful',wt:1.2},{wd:'excited',wt:1.1},
      {wd:'happy',wt:1.0},{wd:'joy',wt:1.0},{wd:'great',wt:0.8},{wd:'good',wt:0.6},
      {wd:'hope',wt:0.7},{wd:'success',wt:0.9}
    ];
    const negW=[
      {wd:'hate',wt:1.4},{wd:'horrible',wt:1.3},{wd:'terrible',wt:1.2},{wd:'broken',wt:1.1},
      {wd:'pain',wt:1.0},{wd:'fail',wt:1.0},{wd:'angry',wt:1.1},{wd:'sad',wt:0.8},
      {wd:'fear',wt:0.9},{wd:'worry',wt:0.7},{wd:'bad',wt:0.6}
    ];
    const desW=['want','need','wish','desire','will','must','should','goal','plan','build','create'];
    let E=0.5, D=0.5;
    let posStrength=0, negStrength=0, posHits=0, negHits=0;

    posW.forEach(({wd,wt})=>{ if(low.includes(wd)){ E+=w.pos_e*wt; posStrength+=wt; posHits++; }});
    negW.forEach(({wd,wt})=>{ if(low.includes(wd)){ E-=w.neg_e*wt; negStrength+=wt; negHits++; }});
    desW.forEach(wd=>{ if(low.includes(wd)) D+=w.des_d; });

    // v3.2: WEIGHTED COLLISION LAYER
    // Collision only fires if BOTH sides have meaningful strength.
    // Adjustment scales with I (intensity) and collision imbalance ratio.
    let polarityCollision = false;
    let collisionStrength = 0;
    if(posHits > 0 && negHits > 0){
      const totalStrength = posStrength + negStrength;
      const posRatio = posStrength / totalStrength;
      const negRatio = negStrength / totalStrength;
      if(posRatio > 0.15 && negRatio > 0.15){
        polarityCollision = true;
        // Weighted strength ratio (how balanced the collision is)
        collisionStrength = Math.min(posStrength, negStrength) / Math.max(posStrength, negStrength);
        // Hit-count multiplier: more conflicting words = stronger effect
        const hitMultiplier = Math.min(posHits, negHits); // e.g. 2 pos + 3 neg → multiplier=2
        const I = this.calcI(text);
        // Combined: strength from weights + hit count + intensity
        const scale = (0.05 * hitMultiplier) + (collisionStrength * 0.06 * (0.5 + I * 0.5));
        E = Math.max(0, E - Math.min(scale, 0.30));   // cap at 0.30 max shift
        D = Math.min(1, D + Math.min(scale * 0.9, 0.25));
      }
    }
    this._lastPolarityCollision = polarityCollision;
    this._lastCollisionStrength = collisionStrength;

    const Sv = 0.3+Math.min(text.length,500)/500*0.7;
    return{
      E:Math.min(1,Math.max(0,E)),
      D:Math.min(1,Math.max(0,D)),
      S:Math.min(1,Math.max(0,Sv)),
      polarityCollision,
      collisionStrength
    };
  },

  applyDecay(){
    // FIX #5: guard zero/invalid timestamp
    const now = Date.now();
    const lastTs = this.state.ts && this.state.ts > 0 ? this.state.ts : now;
    const dtHr   = (now - lastTs) / 3_600_000;
    const λ      = (this.state.lambda && this.state.lambda > 0) ? this.state.lambda : 0.3;
    const decay  = Math.exp(-λ * dtHr);
    ['E','D','S','P'].forEach(ax=>{
      const cur = typeof this.state[ax]==='number' ? this.state[ax] : 0.5;
      this.state[ax] = parseFloat((0.5+(cur-0.5)*decay).toFixed(6));
    });
    this.state.T  = parseFloat(decay.toFixed(6));
    this.state.ts = now;
  },

  // ══ v3: PURE COMPUTE — no DOM, no S.set, no side effects ══
  // Receives text, returns a state delta plain object.
  // Callers (process) are responsible for writing to ATH_STATE and RENDER.
  compute(text){
    const I  = this.calcI(text);
    const { E, D, S: Sv, polarityCollision, collisionStrength } = this.calcAxes(text);
    const w     = ATH_STATE.getWeights();
    const cur   = ATH_STATE.getUTA();
    // v3.1: CONTEXTUAL INTENT INTEGRATION
    // AI_LAYER.interpret() stores intent here so local math and LLM share context.
    // 'command'/'plan' → lower blend (input dominates; user is directing)
    // 'reflect'/'analyze' → higher blend (history matters; user is processing)
    // Intent consumed after one use to avoid stale context.
    let blend = w.history_blend;
    const intent = this._intentContext || null;
    if(intent === 'command' || intent === 'plan')
      blend = Math.max(blend - 0.10, W_BLEND_MIN);
    else if(intent === 'reflect' || intent === 'analyze')
      blend = Math.min(blend + 0.05, W_BLEND_MAX);
    this._intentContext = null; // consume once
    return {
      E:      parseFloat((cur.E * blend + E  * (1-blend)).toFixed(4)),
      D:      parseFloat((cur.D * blend + D  * (1-blend)).toFixed(4)),
      S:      parseFloat((cur.S * blend + Sv * (1-blend)).toFixed(4)),
      P:      parseFloat((0.5+(I-0.5)*0.35).toFixed(4)),
      I:      parseFloat(I.toFixed(4)),
      lambda: parseFloat((1/Math.max(I,0.1)).toFixed(4)),
      ts:     Date.now(),
      _polarityCollision: polarityCollision || false,
      _collisionStrength: collisionStrength || 0
    };
  },

  // ══ v3: ORCHESTRATOR — thin glue, no logic, no DOM ══
  // Calls compute() → ATH_STATE → RENDER in strict order.
  process(){
    const raw  = document.getElementById('uta-input').value;
    const text = sanitize(raw, 2000);
    if(!text) return;

    const prevState = ATH_STATE.getUTA();
    this.state      = prevState;   // keep this.state in sync for applyDecay
    this.applyDecay();

    // PURE compute — returns delta, writes nothing
    const delta = this.compute(text);

    // STATE writes — all in one place
    ATH_STATE.setUTA(delta);
    this.state = ATH_STATE.getUTA();  // sync internal cache

    // Schema update
    const schemas  = ATH_STATE.getSchemas();
    const sk       = hashKey(text.slice(0,40));
    const existing = schemas[sk] || { label:text.slice(0,28), count:0 };
    existing.count++;
    schemas[sk] = existing;
    ATH_STATE.set(K.UTA_SCHEMAS, schemas);

    // Adaptive weights
    const wCallCount = this.adaptWeights(delta.I, prevState);
    const w = ATH_STATE.getWeights();
    const wDrift = Object.entries(w)
      .filter(([k]) => k !== 'history_blend')
      .reduce((sum,[k,v]) => sum + Math.abs(v - (UTA_WEIGHT_DEFAULTS[k]||v)), 0);

    // RENDER — all DOM in one place
    RENDER.uta(ATH_STATE.getUTA());
    RENDER.weights(w, wCallCount);
    RENDER.analysis(delta, wCallCount, wDrift, w.history_blend);

    // v3.1: HEART LAYER — system self-expression after every process()
    ATHARVA_FEEL.run(ATH_STATE.getUTA(), delta._polarityCollision || false, delta._collisionStrength || 0);

    // v3.3: REFLECTION LOOP — tick state history, trigger reflection every 5 inputs
    ATHARVA_REFLECT.tick(ATH_STATE.getUTA());

    // v3.4: EPISODIC MEMORY — store meaningful episodes
    (function(){
      var st = ATH_STATE.getUTA();
      var feelEl = document.getElementById('feel-output');
      var feelLine = feelEl ? feelEl.innerText.slice(0,120) : '';
      var importance = (st.I||0.5) * (delta._polarityCollision ? 2 : 1);
      if(importance > 0.4){
        ATH_STATE.pushEpisode({
          E: st.E, D: st.D, S: st.S, I: st.I,
          feel_line: feelLine,
          conflict: delta._polarityCollision || false,
          importance_score: Math.min(importance, 2.0)
        });
      }
    })();

    document.getElementById('uta-input').value='';
  },

  decay(){
    this.state = ATH_STATE.getUTA();
    this.applyDecay();
    ATH_STATE.setUTA(this.state);
    RENDER.uta(ATH_STATE.getUTA());
    document.getElementById('uta-analysis-card').style.display='block';
    document.getElementById('uta-analysis').innerHTML=
      `<span style="color:var(--muted2);font-size:.7rem">Decay applied — T = ${this.state.T} | λ = ${this.state.lambda}</span>`;
  },

  reset(){
    if(!confirm('Reset UTA state to baseline?')) return;
    this.state = { ...this.DEFAULT, ts:Date.now() };
    ATH_STATE.setUTA(this.state);
    RENDER.uta(this.state);
    document.getElementById('uta-analysis-card').style.display='none';
  },

  // v3: render() and renderWeights() now delegate to RENDER module
  // Kept as wrappers so existing callers still work during refactor transition
  render()       { RENDER.uta(ATH_STATE.getUTA()); },
  renderWeights(){
    const w = ATH_STATE.getWeights();
    let callCount = 0;
    try{ callCount = parseInt(localStorage.getItem(K.WEIGHT_CALLS)||'0',10)||0; }catch(_){}
    RENDER.weights(w, callCount);
    RENDER.weightAudit(ATH_STATE.getWeightLog());
  }
};

// ══════════════════════════════════════
// MEMORY — FIX #4 (MEM_STORE as obj)
// ══════════════════════════════════════
const MEMORY = {

  init(){ this.renderAll(); },

  addMerit(pol){
    const raw  = document.getElementById('merit-input').value;
    const text = sanitize(raw, 200);
    if(!text) return;
    const state = ATH_STATE.getUTA();
    const I = typeof state.I==='number' ? state.I : 0.5;
    const entry = { id:Date.now(), action:text, pol, score:parseFloat((pol*I).toFixed(4)), ts:new Date().toLocaleString() };
    const ledger = S.get(K.MERIT, []);
    ledger.unshift(entry);
    S.set(K.MERIT, ledger.slice(0,100));

    // Schema update with hash key
    const schemas=S.get(K.UTA_SCHEMAS,{});
    const sk=hashKey(text.slice(0,30));
    const ex=schemas[sk]||{label:text.slice(0,24),count:0};
    ex.count++;
    schemas[sk]=ex;
    S.set(K.UTA_SCHEMAS,schemas);

    document.getElementById('merit-input').value='';
    this.renderLedger();
    this.renderSchemas();
  },

  store(){
    const key = sanitize(document.getElementById('mem-key').value, 60);
    const val = sanitize(document.getElementById('mem-val').value, 500);
    if(!key||!val) return;
    // FIX #4: MEM_STORE is always {}
    const store = S.get(K.MEM_STORE, {});
    // guard: if somehow stored as array, reset
    const storeObj = Array.isArray(store) ? {} : store;
    storeObj[key]={ val, ts:new Date().toLocaleString() };
    S.set(K.MEM_STORE, storeObj);
    document.getElementById('mem-key').value='';
    document.getElementById('mem-val').value='';
    this.renderLog();
  },

  clearAll(){
    if(!confirm('Clear ALL memory? Cannot undo.')) return;
    S.set(K.MERIT,[]);
    S.set(K.MEM_STORE,{});   // FIX #4: {} not []
    S.set(K.UTA_SCHEMAS,{});
    this.renderAll();
  },

  renderLedger(){
    const ledger=S.get(K.MERIT,[]);
    const el=document.getElementById('merit-display');
    if(!ledger.length){el.innerHTML='<div class="empty">No merit entries yet.</div>';return}
    const total=ledger.reduce((s,e)=>s+(e.score||0),0);
    el.innerHTML=`<div style="font-size:.8rem;margin-bottom:8px;font-family:var(--display);font-weight:700">
      Total: <span style="color:${total>=0?'var(--green)':'var(--red)'}">${total.toFixed(3)}</span></div>
      ${ledger.slice(0,20).map(e=>`
        <div class="merit-row">
          <span class="badge ${e.pol>0?'badge-pos':'badge-neg'}">${e.pol>0?'+MER':'−DEM'}</span>
          <span style="flex:1;font-size:.68rem">${escHtml(e.action)}</span>
          <span style="color:${e.pol>0?'var(--green)':'var(--red)'};font-size:.68rem">${(e.score||0).toFixed(3)}</span>
        </div>`).join('')}`;
  },

  renderSchemas(){
    const schemas=S.get(K.UTA_SCHEMAS,{});
    const el=document.getElementById('schema-display');
    const entries=Object.entries(schemas).sort((a,b)=>(b[1].count||0)-(a[1].count||0));
    if(!entries.length){el.innerHTML='<div class="empty">No schemas registered.</div>';return}
    el.innerHTML=entries.slice(0,20).map(([k,v])=>{
      const n = typeof v==='object'?v.count:v;
      const label = typeof v==='object'?v.label:k.slice(0,28);
      const P=(1-Math.exp(-n/5)).toFixed(3);
      return`<div class="schema-row">
        <span style="color:var(--cyan);font-size:.65rem">${escHtml(label.slice(0,28))}</span>
        <span style="color:var(--muted2);font-size:.62rem">n=${n} &nbsp; P=${P}</span>
      </div>`;
    }).join('');
  },

  renderLog(){
    // FIX #4: always treat as object
    const raw=S.get(K.MEM_STORE,{});
    const store=Array.isArray(raw)?{}:raw;
    const el=document.getElementById('mem-log-display');
    const entries=Object.entries(store);
    if(!entries.length){el.innerHTML='<div class="empty">Empty.</div>';return}
    el.innerHTML=entries.map(([k,{val,ts}])=>`
      <div style="padding:6px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:.65rem;color:var(--cyan)">${escHtml(k)}</div>
        <div style="font-size:.7rem;margin:2px 0">${escHtml((val||'').slice(0,120))}</div>
        <div class="ts">${ts||''}</div>
      </div>`).join('');
  },

  renderAll(){ this.renderLedger(); this.renderSchemas(); this.renderLog(); }
};

// ══════════════════════════════════════
// CIVILIZATION — FIX #8 (timeout), #9 (error boundaries)
// ══════════════════════════════════════
