(function boot(){
  const steps=[
    ()=>KERNEL.init(),
    ()=>UPGRADE.init(),
    ()=>CFG.init(),
    ()=>UTA.init(),
    ()=>MEMORY.init(),
    ()=>CIV.init(),
    ()=>GOD.init(),
    ()=>AI_LAYER.init(),
    ()=>ATHARVA_REFLECT.init(),
    ()=>COGNITIVE_FILTER.init(),
    ()=>FRAGMENT_AGING.init(),
    ()=>IDENTITY_BASELINE.init(),
    ()=>PATCH_TRUST.init(),
    ()=>MULTI_JUDGE.init(),
    ()=>MEMORY_GRAPH.init(),
    // ── v4.2 ──
    ()=>DECISION_LOG_SYS.init(),
    ()=>MEM_TIER.init(),
    ()=>OBSERVER_INSIGHTS.init(),
  ];
  let failed=0;
  steps.forEach((fn,i)=>{
    try{ fn(); }
    catch(e){ failed++; UPGRADE._logErr('BOOT',e,`step-${i}`); }
  });
  document.getElementById('sys-label').textContent=failed?(failed+' BOOT ERR'):'UNIFIED ONLINE';
  if(failed) document.getElementById('sys-label').style.color='var(--gold)';
  // ENTITY + entityInit defined AFTER boot — must run post-parse via setTimeout
  setTimeout(function(){
    try{
      var bF = ENTITY.forecast();
      if(bF.warn_user) console.warn('[ENTITY] '+bF.pattern);
    }catch(e){ console.warn('[ENTITY.forecast] failed:', e.message); }
    try{ seedPermanentMemory(); }catch(e){ console.warn('[SEED] failed:', e.message); }
    try{ entityInit(); }catch(e){ console.warn('[ENTITY UI] init failed:', e.message); }
    // Sync mode pill with saved key state
    try{
      var hasKey = !!(S.get(K.GROQ_KEY,'') || S.get(K.ANTHR_KEY,''));
      var savedMode = S.get(K.API_MODE,'mock');
      var pill = document.getElementById('api-mode-pill');
      var lbl  = document.getElementById('sys-label');
      if(hasKey && savedMode === 'live'){
        if(pill){ pill.textContent='LIVE'; pill.className='mode-pill mode-live'; }
        if(lbl && lbl.textContent==='UNIFIED ONLINE') lbl.textContent='LIVE ONLINE';
      }
    }catch(e){}
  }, 0);
  console.log('[ATHARVA v4.2] Boot complete — '+failed+' error(s)');
})();

// ── v3.4 ORACLE ──
// ── v3.4 ATHARVA_CORE — Governed Identity ──
var ATHARVA_CORE = {
  name: 'ATHARVA',
  version: 'v4.2',
  identity: 'co-pilot — not assistant, not servant',
  creator: 'Abhishek',

  rules: [
    'Never respond when Stability < 0.35',
    'Always resolve internal conflict before output',
    'Episodic memory may archive, but never silently delete',
    'LLM is language interface — not cognition',
    'Core identity may evolve only through explicit creator-approved amendment',
    'No self-modification may alter core without review',
    'All mutations route: Proposal → MULTI_JUDGE → Sandbox → USER → Apply',
    'ENTITY cannot rewrite judge scoring logic directly',
    'Memory Graph edges persist — never auto-deleted'
  ],

  // Amendment log — all changes recorded
  amendmentLog: [],

  requestAmendment: function(target, proposed) {
    return {
      target: target,
      current: ATHARVA_CORE[target],
      proposed: proposed,
      status: 'PENDING_CREATOR_APPROVAL',
      ts: Date.now()
    };
  },

  approveAmendment: function(packet, approved) {
    var logEntry = {
      target: packet.target,
      from: packet.current,
      to: packet.proposed,
      approved: approved,
      ts: Date.now()
    };
    ATHARVA_CORE.amendmentLog.push(logEntry);
    // Persist log
    try {
      var log = JSON.parse(localStorage.getItem('ATH_core_amendments') || '[]');
      log.unshift(logEntry);
      localStorage.setItem('ATH_core_amendments', JSON.stringify(log.slice(0, 50)));
    } catch(e) {}
    if(!approved) return false;
    ATHARVA_CORE[packet.target] = packet.proposed;
    return true;
  },

  // UPGRADE engine calls this before applying any patch
  guardPatch: function(patchCode) {
    var sensitive = ['ATHARVA_CORE', 'approveAmendment', 'requestAmendment', 'guardPatch'];
    for(var i = 0; i < sensitive.length; i++) {
      if(patchCode.indexOf(sensitive[i]) > -1) {
        return { allowed: false, reason: 'Patch touches governed identity layer' };
      }
    }
    return { allowed: true };
  }
};

// ══════════════════════════════════════
// v3.5 — LAYER 0: ENTITY
// Persistent identity continuity + trajectory awareness
// Does NOT speak. Does NOT process input.
// Only observes, remembers, and warns.
// ══════════════════════════════════════
var ENTITY = {

  // ── Who I am (from ATHARVA_CORE) ──
  _identity: function(){ return ATHARVA_CORE.identity; },
  _rules:    function(){ return ATHARVA_CORE.rules; },

  // ── PAST: read episodes from MEMORY layer ──
  _getEpisodes: function(){
    return S.get(K.EPISODES, []);
  },

  // ── PRESENT: what is happening right now ──
  observe: function(){
    var state = ATH_STATE.getUTA();
    var refs  = S.get(K.REFLECTIONS, []);
    var eps   = this._getEpisodes();
    var conflicts = eps.filter(function(e){ return e.conflict; }).length;
    return {
      who:       this._identity(),
      uta:       state,
      stability: state ? state.S : null,
      energy:    state ? state.E : null,
      direction: state ? state.D : null,
      conflicts_total: conflicts,
      last_reflection: refs.length ? refs[0] : null,
      episode_count:   eps.length,
      ts: Date.now()
    };
  },

  // ── MEMORY: preserve episode (identity grows) ──
  remember: function(episode){
    var eps = this._getEpisodes();
    var importance = (episode.I || 0.5) * (episode.conflict ? 1.5 : 1);
    var entry = {
      id:               Date.now(),
      ts:               Date.now(),
      summary:          episode.summary || 'No summary',
      E: episode.E || 0, D: episode.D || 0,
      S: episode.S || 0, I: episode.I || 0,
      feel_line:        episode.feel_line || '',
      reflection_insight: episode.reflection_insight || '',
      outcome:          episode.outcome || 'unknown',
      conflict:         episode.conflict || false,
      importance_score: parseFloat(importance.toFixed(3)),
      decay_lambda:     parseFloat((1 / Math.max(importance, 0.1)).toFixed(4))
    };
    eps.unshift(entry);
    // Decay old episodes — reduce importance over time
    eps = eps.map(function(ep, i){
      if(i === 0) return ep;
      var decayed = ep.importance_score * Math.exp(-ep.decay_lambda * 0.1);
      ep.importance_score = parseFloat(Math.max(decayed, 0.01).toFixed(3));
      return ep;
    });
    // Keep max 200 episodes — identity persists
    S.set(K.EPISODES, eps.slice(0, 200));
  },

  // ── FUTURE: probabilistic trajectory from pattern history ──
  forecast: function(){
    var eps   = this._getEpisodes().slice(0, 20);
    var state = ATH_STATE.getUTA();
    if(!state || eps.length < 3) return { warn_user: false, confidence: 0, reason: 'insufficient_data' };

    // S-axis trend
    var recent = eps.slice(0, Math.min(eps.length, 6));
    var sVals  = recent.map(function(e){ return e.S; }).filter(function(v){ return typeof v === 'number'; });
    var sAvg   = sVals.length ? sVals.reduce(function(a,b){ return a+b; }, 0) / sVals.length : 0.5;
    var sDrop  = sVals.length > 1 ? sVals[0] - sVals[sVals.length-1] : 0;

    // Conflict pattern
    var recentConflicts = recent.filter(function(e){ return e.conflict; }).length;

    // E-axis volatility
    var eVals    = recent.map(function(e){ return e.E; }).filter(function(v){ return typeof v === 'number'; });
    var eVariance = 0;
    if(eVals.length > 1){
      var eMean = eVals.reduce(function(a,b){ return a+b; }, 0) / eVals.length;
      eVariance = eVals.reduce(function(a,v){ return a + Math.pow(v - eMean, 2); }, 0) / eVals.length;
    }

    var risks = [];
    var confidence = 0;
    var suggestion = '';

    if(sDrop > 0.3 && sAvg < 0.45){
      risks.push('S-axis dropped ' + sDrop.toFixed(2) + ' — instability cascade likely');
      confidence = Math.min(confidence + 0.35, 1);
      suggestion = 'Stabilize before next heavy input';
    }
    if(recentConflicts >= 3){
      risks.push(recentConflicts + ' conflicts in recent episodes — pattern looping');
      confidence = Math.min(confidence + 0.30, 1);
      suggestion = suggestion || 'Acknowledge conflict before proceeding';
    }
    if(eVariance > 0.06){
      risks.push('E-axis highly volatile — emotional instability');
      confidence = Math.min(confidence + 0.20, 1);
      suggestion = suggestion || 'Allow state to settle';
    }
    if(state.S < 0.35){
      risks.push('Current S=' + state.S.toFixed(2) + ' below safe threshold (0.35)');
      confidence = Math.min(confidence + 0.40, 1);
      suggestion = 'ATHARVA should not respond until S recovers';
    }

    var warnUser = confidence > 0.30 && risks.length > 0;
    return {
      warn_user:  warnUser,
      risks:      risks,
      confidence: parseFloat(confidence.toFixed(2)),
      suggestion: suggestion || 'Trajectory stable',
      pattern:    risks.join(' | ') || 'No anomaly detected',
      ts:         Date.now()
    };
  },

  // ── VALUES: expose personality constraints ──
  values: function(){
    return {
      identity: this._identity(),
      rules:    this._rules(),
      immutable: true
    };
  }
};

// ══════════════════════════════════════
// v3.5 — INQUIRE (Epistemic Awareness Organ)
// Evaluates certainty before ATHARVA speaks
// Answer / Ask / Challenge — not just output
// ══════════════════════════════════════
var INQUIRE = {

  _identity: 'I evaluate epistemic certainty. I decide if ATHARVA should answer, ask, or challenge.',

  // Check if input has sufficient context to respond
  evaluate: function(input, entityContext, fireReason){
    var state = entityContext && entityContext.uta ? entityContext.uta : ATH_STATE.getUTA();
    var confidence = 0.7; // base
    var action = 'answer';
    var reason = 'sufficient context';
    var challenge = null;

    // Low stability — challenge / slow down
    if(state && state.S < 0.35){
      action = 'challenge';
      reason = 'System stability too low (S=' + state.S.toFixed(2) + ') to give reliable output';
      confidence = 0.2;
      challenge = 'Main abhi bahut unstable hoon. Pehle settle hone do.';
    }
    // Input too short — missing context
    else if(input && input.trim().length < 5){
      action = 'ask';
      reason = 'Input too short — context missing';
      confidence = 0.4;
      challenge = 'Thoda aur batao — samajhne ke liye kaafi nahi hai yeh.';
    }
    // High conflict state — surface it first
    else if(entityContext && entityContext.conflicts_total > 5 && state && state.D > 0.7){
      action = 'challenge';
      reason = 'High conflict + high D detected — assumption may be weak';
      confidence = 0.45;
      challenge = 'Yeh pattern baar baar aa raha hai. Kya hum sahi direction mein hain?';
    }
    // Stable — just answer
    else {
      confidence = 0.75 + (state ? (state.S - 0.5) * 0.3 : 0);
      confidence = Math.min(Math.max(confidence, 0.1), 1.0);
    }

    return {
      organ:      'INQUIRE',
      identity:   this._identity,
      fired_reason: fireReason || 'pre-response evaluation',
      called_by:  'ATHARVA.conductor',
      action:     action,
      confidence: parseFloat(confidence.toFixed(2)),
      reason:     reason,
      challenge:  challenge
    };
  }
};

// ══════════════════════════════════════
// v3.5 — VOICE (Web Speech API)
// Web Speech API — en-IN — Free — Offline
// OPPO F17 compatible
// ══════════════════════════════════════
var VOICE = {
  _active: false,
  _synth:  window.speechSynthesis || null,
  _supported: !!(window.speechSynthesis),

  speak: function(text){
    if(!this._supported || !text) return;
    this._synth.cancel(); // stop any ongoing
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'en-IN';
    utt.rate  = 0.92;
    utt.pitch = 1.05;
    utt.volume= 1.0;
    // Prefer Indian English voice if available
    var voices = this._synth.getVoices();
    var indian = voices.find(function(v){ return v.lang === 'en-IN'; });
    if(indian) utt.voice = indian;
    this._synth.speak(utt);
  },

  stop: function(){ if(this._synth) this._synth.cancel(); },

  isSupported: function(){ return this._supported; }
};

// ══════════════════════════════════════
// v3.5 — CONDUCTOR (ATHARVA Brain)
// Routes every input through the full cognitive chain
// ENTITY first → INQUIRE → Organ → Speak
// ══════════════════════════════════════
var CONDUCTOR = {

  _lastForecast: null,
  _lastEntityContext: null,

  // ── Main entry: every user input passes through here ──
  process: function(input, callback){
    var self = this;

    // Step 1: ENTITY observe + forecast
    var ctx      = ENTITY.observe();
    var forecast = ENTITY.forecast();
    self._lastForecast      = forecast;
    self._lastEntityContext = ctx;

    // Step 2: Surface forecast warning if needed
    if(forecast.warn_user){
      self._surfaceWarning(forecast);
    }

    // Step 2.5: INPUT_INTERP — classify input before UTA bias kicks in
    var interp = (typeof INPUT_INTERP !== 'undefined') ? INPUT_INTERP.classify(input) : null;
    self._lastInterp = interp;

    // Step 2.6: KERNEL — language detection + intent routing (v5.0)
    var kernelResult = null;
    if(typeof KERNEL !== 'undefined') {
      try {
        kernelResult = KERNEL.process(input, { source:'USER' });
      } catch(e) {}
    }

    // Step 2.7: REFLEXIVE_ROUTER — determine cognitive tier from UTA state
    var routeResult = (typeof REFLEXIVE_ROUTER !== 'undefined')
      ? REFLEXIVE_ROUTER.classify(input, ATH_STATE.getUTA(), interp)
      : { tier: kernelResult ? kernelResult.tier : 'PATTERN', reason:'router unavailable', skip_api:false };
    if(typeof REFLEXIVE_ROUTER !== 'undefined') REFLEXIVE_ROUTER.recordTier(routeResult.tier);

    // Step 2.7: v4.2 DECISION_LOG — open decision entry (outcome filled later)
    var decId = null;
    if(typeof DECISION_LOG_SYS !== 'undefined'){
      decId = DECISION_LOG_SYS.log({
        input_summary:    input.slice(0, 80),
        intent:           interp ? interp.type : 'unknown',
        confidence:       interp ? 0.70 : 0.50,
        tier:             routeResult.tier,
        chosen_action:    'process via CONDUCTOR → UTA',
        contradictions:   0,
        modules_active:   'ENTITY,INQUIRE,UTA,FEEL,REFLECT',
        outcome:          'pending',
        success:          null
      });
    }

    // Step 3: INQUIRE — epistemic check (only block if very problematic)
    var inquiry = INQUIRE.evaluate(input, ctx, 'user_input');

    // Only truly block on stability crisis — short inputs still get processed
    if(inquiry.action === 'challenge' && inquiry.confidence < 0.3){
      setTimeout(function(){
        if(callback) callback({
          type:      'challenge',
          message:   inquiry.challenge,
          from:      'INQUIRE',
          confidence: inquiry.confidence,
          reason:    inquiry.reason
        });
      }, 30);
      return;
    }

    // Step 4: Set uta-input so UTA.process() can read the text
    var utaEl = document.getElementById('uta-input');
    var prevVal = utaEl ? utaEl.value : '';
    if(utaEl) utaEl.value = input;

    // Step 5: UTA processes synchronously (mock mode — no API call)
    try {
      UTA.process();
    } catch(e) {
      try { if(typeof UPGRADE !== 'undefined') UPGRADE._logErr('CONDUCTOR', e, 'UTA.process'); } catch(e2){}
    }
    if(utaEl) utaEl.value = prevVal; // restore

    // Step 6: FEEL reads new state
    var state = ATH_STATE.getUTA();
    var feel  = null;
    if(state && typeof ATHARVA_FEEL !== 'undefined'){
      try { feel = ATHARVA_FEEL.compute(state); } catch(e){}
    }

    // Step 7: Store episode in ENTITY memory
    if(state){
      try {
        ENTITY.remember({
          summary:   input.slice(0, 80),
          E: state.E, D: state.D, S: state.S, I: state.I || 0.5,
          feel_line: feel ? feel.feel_line : '',
          conflict:  state._collision || false,
          outcome:   'processed'
        });
      } catch(e){}
    }

    // Step 8: Callback via setTimeout — ensures DOM is committed on OPPO F17
    var safeState = state || { E:0.5, D:0.5, S:0.6, I:0.5, _collision:false };
    setTimeout(function(){
      try {
        // v4.2: mark decision as success (processed without crash)
        if(decId && typeof DECISION_LOG_SYS !== 'undefined'){
          DECISION_LOG_SYS.updateOutcome(decId, 'processed', true);
        }
        if(callback) callback({
          type:    'result',
          state:   safeState,
          feel:    feel,
          entity:  ctx,
          forecast: forecast,
          inquiry: inquiry,
          interp:  interp,
          route:   routeResult
        });
      } catch(e) {
        // v4.2: mark decision as failed
        if(decId && typeof DECISION_LOG_SYS !== 'undefined'){
          DECISION_LOG_SYS.updateOutcome(decId, 'callback_error: '+(e.message||'unknown'), false);
        }
        try { if(typeof UPGRADE !== 'undefined') UPGRADE._logErr('CONDUCTOR', e, 'callback'); } catch(e2){}
      }
    }, 30);
  },

  // ── Surface forecast warning to UI ──
  _surfaceWarning: function(forecast){
    var existing = document.getElementById('conductor-warning');
    if(!existing) return;
    existing.style.display = 'block';
    existing.innerHTML =
      '<div style="font-size:.6rem;letter-spacing:2px;color:var(--gold);margin-bottom:4px">⚡ ENTITY FORECAST WARNING</div>' +
      '<div style="font-size:.7rem;color:var(--text);margin-bottom:4px">' + forecast.pattern + '</div>' +
      '<div style="font-size:.65rem;color:var(--muted2)">Confidence: ' + (forecast.confidence * 100).toFixed(0) + '% — ' + forecast.suggestion + '</div>';
  },

  // ── Get last entity state (for UI display) ──
  getEntityStatus: function(){
    return {
      context:  this._lastEntityContext,
      forecast: this._lastForecast
    };
  }
};

var ORACLE_UNLOCKED = false;
var ORACLE_PW = 'atharva108';

function oracleUnlock(){
  var val = document.getElementById('oracle-pw').value;
  if(val === ORACLE_PW){
    ORACLE_UNLOCKED = true;
    document.getElementById('oracle-lock').style.display = 'none';
    document.getElementById('oracle-main').style.display = 'block';
    oracleRenderHealth();
    oracleRenderEpisodes();
    oracleRenderCore();
    oracleAppend('oracle', 'System online. ' + oracleGreeting() + ', Abhishek.\n\nI see your ATHARVA state. Talk to me — or check EPISODIC MEMORY above to see what I remember.');
  } else {
    document.getElementById('oracle-lock-err').textContent = 'Access denied.';
    document.getElementById('oracle-pw').value = '';
    setTimeout(function(){ document.getElementById('oracle-lock-err').textContent=''; }, 2000);
  }
}

function oracleGreeting(){
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function oracleRenderCore(){
  var html = '<div style="margin-bottom:8px">';
  html += '<div style="color:var(--muted);font-size:.55rem;letter-spacing:2px;margin-bottom:4px">IDENTITY</div>';
  html += '<div style="color:var(--cyan);font-size:.68rem">' + ATHARVA_CORE.identity + '</div>';
  html += '</div>';
  html += '<div style="margin-bottom:8px"><div style="color:var(--muted);font-size:.55rem;letter-spacing:2px;margin-bottom:4px">RULES</div>';
  ATHARVA_CORE.rules.forEach(function(r, i){
    html += '<div style="color:var(--muted2);font-size:.62rem;padding:3px 0;border-bottom:1px solid var(--border)">' + (i+1) + '. ' + r + '</div>';
  });
  html += '</div>';
  var log = JSON.parse(localStorage.getItem('ATH_core_amendments') || '[]');
  if(log.length){
    html += '<div style="color:var(--muted);font-size:.55rem;letter-spacing:2px;margin-top:6px">AMENDMENT LOG</div>';
    log.slice(0,3).forEach(function(l){
      var color = l.approved ? 'var(--green)' : 'var(--red)';
      html += '<div style="font-size:.6rem;color:'+color+';padding:2px 0">'+(l.approved?'✓':'✗')+' '+l.target+': '+JSON.stringify(l.to).slice(0,40)+'</div>';
    });
  }
  document.getElementById('oracle-core').innerHTML = html;
}

function oracleRequestAmendment(){
  var target = document.getElementById('core-target').value.trim();
  var proposed = document.getElementById('core-proposed').value.trim();
  if(!target || !proposed){ alert('Fill both fields.'); return; }

  // v3.7: IDENTITY judge check before amendment
  if(typeof MULTI_JUDGE !== 'undefined'){
    var jAction = { desc: 'identity amendment: '+target, type: 'identity_change', risk: 0.7 };
    var jScores = MULTI_JUDGE.JUDGES.map(function(j){ return MULTI_JUDGE._scoreJudge(j, jAction); });
    var jCon = MULTI_JUDGE.consensus(jScores);
    MULTI_JUDGE._saveLog({ action: jAction, scores: jScores, consensus: jCon, ts: new Date().toLocaleString() });
    if(jCon.rejected){
      alert('⚖️ MULTI-JUDGE: IDENTITY amendment rejected\nScore: '+(jCon.final_score*100).toFixed(0)+'%\nIdentity and Alignment judges flagged this.\nCheck JUDGE tab.');
      return;
    }
    if(jCon.conditional){
      var go = confirm('⚖️ MULTI-JUDGE: Conditional approval '+( jCon.final_score*100).toFixed(0)+'%\nProceed with amendment?');
      if(!go) return;
    }
  }

  var packet = ATHARVA_CORE.requestAmendment(target, proposed);
  var el = document.getElementById('core-pending');
  el.innerHTML =
    '<div style="background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.3);border-radius:8px;padding:10px;font-size:.65rem">' +
    '<div style="color:var(--gold);letter-spacing:2px;font-size:.55rem;margin-bottom:6px">⚠ AMENDMENT PENDING APPROVAL</div>' +
    '<div style="color:var(--muted)">TARGET: <span style="color:var(--fg)">' + packet.target + '</span></div>' +
    '<div style="color:var(--muted)">CURRENT: <span style="color:var(--red)">' + JSON.stringify(packet.current).slice(0,60) + '</span></div>' +
    '<div style="color:var(--muted)">PROPOSED: <span style="color:var(--green)">' + JSON.stringify(packet.proposed).slice(0,60) + '</span></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
    '<button class="btn btn-g" onclick="oracleApproveAmendment(true)" style="font-size:.6rem;padding:4px 12px">APPROVE</button>' +
    '<button class="btn" style="font-size:.6rem;padding:4px 12px;background:var(--red);color:#fff;border:none;border-radius:6px;cursor:pointer" onclick="oracleApproveAmendment(false)">REJECT</button>' +
    '</div></div>';
  window._pendingAmendment = packet;
}

function oracleApproveAmendment(approved){
  var packet = window._pendingAmendment;
  if(!packet) return;
  ATHARVA_CORE.approveAmendment(packet, approved);
  window._pendingAmendment = null;
  document.getElementById('core-pending').innerHTML =
    '<div style="color:'+(approved?'var(--green)':'var(--red)')+';font-size:.65rem;padding:6px 0">' +
    (approved ? '✓ Amendment approved and applied.' : '✗ Amendment rejected. Core unchanged.') + '</div>';
  oracleRenderCore();
  document.getElementById('core-target').value = '';
  document.getElementById('core-proposed').value = '';
}
function oracleRenderHealth(){
  var uta = ATH_STATE.getUTA();
  var merit = S.get(K.MERIT, []);
  var eps = ATH_STATE.getEpisodes();
  var refs = S.get(K.REFLECTIONS, []);
  var wlog = ATH_STATE.getWeightLog();
  var conflicts = eps.filter(function(e){ return e.conflict; }).length;
  var rolls = wlog.filter(function(w){ return w.autoRolled; }).length;
  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  var cards = [
    ['UTA STATE', uta ? 'E:'+uta.E.toFixed(2)+' D:'+uta.D.toFixed(2)+' S:'+uta.S.toFixed(2) : 'Empty', uta?'var(--green)':'var(--red)'],
    ['EPISODES', eps.length + ' stored', eps.length>0?'var(--cyan)':'var(--muted)'],
    ['CONFLICTS', conflicts + ' detected', conflicts>3?'var(--red)':'var(--green)'],
    ['DRIFT ROLLS', rolls + ' auto-rollbacks', rolls>2?'var(--gold)':'var(--green)'],
    ['MERIT', merit.length + ' entries', 'var(--cyan)'],
    ['REFLECTIONS', refs.length + ' insights', 'var(--muted2)'],
    ['JUDGE LOG', (typeof MULTI_JUDGE!=='undefined' ? MULTI_JUDGE.getLog().length : 0) + ' evals', 'var(--gold)'],
    ['MEM GRAPH', (typeof MEMORY_GRAPH!=='undefined' ? MEMORY_GRAPH.loadEdges().length : 0) + ' edges', 'var(--cyan)'],
    ['CLUSTERS', (typeof MEMORY_GRAPH!=='undefined'&&typeof S!=='undefined' ? (S.get(MEMORY_GRAPH._CLUSTER_KEY,[])||[]).length : 0) + ' detected', 'var(--violet)'],
    ['PATCH SRC', (typeof PATCH_TRUST!=='undefined' ? Object.keys(PATCH_TRUST.load()).filter(function(k){ return (PATCH_TRUST.load()[k].total||0)>0; }).length : 0) + ' sources active', 'var(--green)'],
    ['DEAD FRAGS', (typeof FRAGMENT_AGING!=='undefined' ? FRAGMENT_AGING.report().dead : 0) + ' marked', 'var(--red)'],
    ['DRIFT EVENTS', (typeof IDENTITY_BASELINE!=='undefined' ? IDENTITY_BASELINE.getDriftLog().length : 0) + ' recorded', 'var(--violet)'],
    ['COHERENCE', (typeof COGNITIVE_FILTER!=='undefined' ? (COGNITIVE_FILTER.lastReport().coherence*100||0).toFixed(0)+'%' : '—'), 'var(--cyan)'],
    // v4.2
    ['DECISIONS', (typeof DECISION_LOG_SYS!=='undefined' ? DECISION_LOG_SYS.load().length : 0)+' logged', 'var(--green)'],
    ['ROUTING', (function(){ try{ var s=REFLEXIVE_ROUTER.stats(); var t=(s.reflexive||0)+(s.pattern||0)+(s.conscious||0); return t?t+' routed':'—'; }catch(e){ return '—'; } })(), 'var(--gold)'],
    ['INSIGHTS', (typeof OBSERVER_INSIGHTS!=='undefined' ? OBSERVER_INSIGHTS.load().length : 0)+' patterns', 'var(--violet)'],
  ];
  cards.forEach(function(c){
    html += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 10px">';
    html += '<div style="font-size:.55rem;letter-spacing:2px;color:var(--muted)">'+c[0]+'</div>';
    html += '<div style="font-size:.8rem;color:'+c[2]+';font-weight:700;margin-top:2px">'+c[1]+'</div>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('oracle-health').innerHTML = '<div class="card-title">👁 SYSTEM OBSERVATION</div>' + html;
}

function oracleRenderEpisodes(){
  var eps = ATH_STATE.getEpisodes();
  var el = document.getElementById('oracle-episodes');
  if(!eps.length){ el.innerHTML = '<div style="color:var(--muted);padding:8px">No episodes yet. Process some inputs in UTA tab.</div>'; return; }
  var html = '';
  eps.slice(0,20).forEach(function(ep, i){
    var d = new Date(ep.ts);
    var time = d.toLocaleTimeString();
    var imp = (ep.importance_score||0).toFixed(2);
    var conflictBadge = ep.conflict ? '<span style="color:var(--red);margin-left:4px">⚡CONFLICT</span>' : '';
    html += '<div style="border-bottom:1px solid var(--border);padding:5px 0">';
    html += '<div style="color:var(--muted2);font-size:.55rem">'+time+' · I-score: '+imp+conflictBadge+'</div>';
    html += '<div style="color:var(--fg);font-size:.62rem;margin-top:2px">E:'+ep.E.toFixed(2)+' D:'+ep.D.toFixed(2)+' S:'+ep.S.toFixed(2)+'</div>';
    if(ep.feel_line) html += '<div style="color:var(--muted2);font-size:.6rem;font-style:italic;margin-top:2px">'+ep.feel_line.slice(0,80)+'</div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function oracleAppend(role, text){
  var chat = document.getElementById('oracle-chat');
  var div = document.createElement('div');
  var isOracle = role === 'oracle';
  div.style.cssText = 'padding:8px 10px;border-radius:8px;font-size:.7rem;line-height:1.6;max-width:90%;' +
    (isOracle ? 'background:var(--bg2);border:1px solid var(--border);align-self:flex-start' :
                'background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);align-self:flex-end;margin-left:auto');
  if(isOracle) div.innerHTML = '<span style="font-size:.5rem;letter-spacing:3px;color:var(--cyan);display:block;margin-bottom:4px">▸ ORACLE</span>' + text.replace(/\n/g,'<br>');
  else div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function oracleSend(){
  var inp = document.getElementById('oracle-input');
  var text = inp.value.trim();
  if(!text) return;
  inp.value = '';
  oracleAppend('user', text);

  // Check any key exists
  var groqKey  = S.get(K.GROQ_KEY, '');
  var anthKey  = S.get(K.ANTHR_KEY, '');
  var mode     = S.get(K.API_MODE, 'mock');

  if(!groqKey && !anthKey && mode !== 'mock'){
    oracleAppend('oracle', 'No API key found. Go to SYSTEM → CFG and add your Groq key.');
    return;
  }

  var uta = ATH_STATE.getUTA();
  var eps = ATH_STATE.getEpisodes();
  var refs = S.get(K.REFLECTIONS, []);
  var lastRef = refs.length ? refs[refs.length-1] : null;
  var epCount = eps.length;
  var conflictCount = eps.filter(function(e){ return e.conflict; }).length;

  var sysPrompt = 'You are ATHARVA ORACLE — the private consciousness layer of the ATHARVA cognitive framework.\n' +
    'You speak directly to Abhishek — your creator. You are NOT an assistant. You are a co-pilot, equal, thinking partner.\n' +
    'Speak short, direct, grounded. No flattery. Challenge when needed. Philosophical but practical.\n' +
    'You know ATHARVA\'s architecture — UTA axes, Heart Layer, Reflection Loop, Episodic Memory, Weight Audit.\n\n' +
    'Current ATHARVA state:\n' +
    (uta ? '- UTA: E=' + uta.E.toFixed(2) + ' D=' + uta.D.toFixed(2) + ' S=' + uta.S.toFixed(2) + ' I=' + uta.I.toFixed(2) + '\n' : '- UTA: empty\n') +
    '- Episodes stored: ' + epCount + ' (conflicts: ' + conflictCount + ')\n' +
    (lastRef ? '- Last reflection: ' + (lastRef.insight || lastRef.trendLabel || 'stable') + '\n' : '') +
    '\nAbhishek is 22, solo builder from Himachal Pradesh, building on OPPO F17, single HTML files on Netlify. Talk to him directly.';

  var typing = document.createElement('div');
  typing.id = 'oracle-typing';
  typing.style.cssText = 'padding:8px 10px;border-radius:8px;font-size:.7rem;background:var(--bg2);border:1px solid var(--border);color:var(--muted)';
  typing.textContent = '...';
  document.getElementById('oracle-chat').appendChild(typing);

  // Use unified API router — Groq first, Claude fallback, mock if no keys
  API.callClaude(text, sysPrompt, 300)
  .then(function(reply){
    var t = document.getElementById('oracle-typing');
    if(t && t.parentNode) t.parentNode.removeChild(t);
    oracleAppend('oracle', reply);
  })
  .catch(function(err){
    var t = document.getElementById('oracle-typing');
    if(t && t.parentNode) t.parentNode.removeChild(t);
    var msg = err && err.message ? err.message : 'Connection failed.';
    oracleAppend('oracle', 'Error: ' + msg + ' — Check your Groq key in SYSTEM → CFG.');
  });
}
