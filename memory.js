var INPUT_INTERP = {

  // v4.2: get continuity context from recent history
  _getContinuityContext: function(){
    var ctx = { repeat_topic:false, recent_conflict:false, last_intent:null, chain_length:0 };
    try{
      var eps = ATH_STATE.getEpisodes().slice(0, 5);
      ctx.chain_length   = eps.length;
      ctx.recent_conflict = eps.filter(function(e){ return e.conflict; }).length >= 2;
      // Detect if last decision logged matches same intent
      var lastDec = DECISION_LOG_SYS.load()[0];
      if(lastDec) ctx.last_intent = lastDec.intent;
    }catch(e){}
    return ctx;
  },

  classify: function(input){
    var inp = (input||'').toLowerCase().trim();
    var cont = this._getContinuityContext();

    // Greetings — must check first, most common
    var greets = ['hi','hy','hello','hey','hii','helo','sup','wassup',
                  'namaste','namaskar','yo','kya haal','kaise ho','kese ho',
                  'kya scene','kya chal','good morning','good night','gm','gn'];
    for(var i=0; i<greets.length; i++){
      if(inp===greets[i] || inp.indexOf(greets[i])===0){
        return {type:'greeting', E:[0.25,0.45], D:[0.45,0.65], S:[0.65,0.85],
                boost_kw:['greeting','hello','hi','casual','conversation','light'],
                continuity: cont};
      }
    }

    // Identity / self questions
    var self = ['kaun','who are','what are you','kya hai tu','tum kya','atharva kya'];
    for(var s=0; s<self.length; s++){
      if(inp.indexOf(self[s])!==-1){
        return {type:'identity', E:[0.3,0.55], D:[0.4,0.65], S:[0.6,0.85],
                boost_kw:['identity','self','who','atharva','consciousness'],
                continuity: cont};
      }
    }

    // Distress / help signals
    var distress = ['help','stuck','confused','kya karu','pata nahi','problem',
                    'samajh nahi','mushkil','tension','pareshaan','overwhelm'];
    for(var d=0; d<distress.length; d++){
      if(inp.indexOf(distress[d])!==-1){
        return {type:'distress', E:[0.60,0.85], D:[0.20,0.45], S:[0.15,0.40],
                boost_kw:['overwhelm','confusion','help','stuck','distress','anxiety'],
                continuity: cont};
      }
    }

    // Motivation / focus
    var motiv = ['kaise karu','how to start','shuru','begin','motivat','focus',
                 'procrastinat','lazy','nahi ho raha','cant start'];
    for(var m=0; m<motiv.length; m++){
      if(inp.indexOf(motiv[m])!==-1){
        return {type:'motivation', E:[0.25,0.55], D:[0.20,0.45], S:[0.30,0.60],
                boost_kw:['motivation','focus','start','procrastination','momentum'],
                continuity: cont};
      }
    }

    // Philosophical / deep
    var deep = ['why','meaning','consciousness','exist','soul','purpose','kyu',
                'life','reality','true','sach','jagat','brahman'];
    for(var p=0; p<deep.length; p++){
      if(inp.indexOf(deep[p])!==-1){
        return {type:'philosophical', E:[0.35,0.65], D:[0.30,0.60], S:[0.45,0.75],
                boost_kw:['philosophy','meaning','existence','consciousness','purpose'],
                continuity: cont};
      }
    }

    // v4.2: Continuity-aware — if recent_conflict + question → surface conflict first
    if(cont.recent_conflict && (inp.indexOf('?')!==-1 || inp.indexOf('kya')===0)){
      return {type:'question_conflicted', E:[0.50,0.75], D:[0.25,0.55], S:[0.35,0.60],
              boost_kw:['question','conflict','uncertainty'],
              continuity: cont};
    }

    // Questions
    if(inp.indexOf('?')!==-1||inp.indexOf('kya ')===0||inp.indexOf('how ')===0||inp.indexOf('what ')===0||inp.indexOf('kaise')===0){
      return {type:'question', E:[0.30,0.60], D:[0.35,0.60], S:[0.50,0.80],
              boost_kw:['question','uncertainty','inquiry','clarification'],
              continuity: cont};
    }

    // Default neutral
    return {type:'neutral', E:[0.35,0.65], D:[0.35,0.65], S:[0.45,0.75],
            boost_kw:[], continuity: cont};
  }
};

// ══════════════════════════════════════════════════════
// V3.6 — SEED FRAGMENTS (Hardcoded — always present)
// Greetings + basic small talk — never depend on Groq for these
// ══════════════════════════════════════════════════════
var SEED_FRAGMENTS = [
  {id:'seed_greeting_001', domain:'conversation', keywords:['hi','hy','hello','hey','hii'],
   E_range:[0.1,0.55], D_range:[0.3,0.8], S_range:[0.4,1.0],
   strategy:['acknowledge','respond_warmly'], tone:'friendly',
   responses:['Bol kya scene hai.','Hey 👀 kya chal raha hai?','Haan bata.','Aa gaya. Kya hai?'],
   confidence:0.90, times_used:0, success_count:0, failure_count:0,
   retrieval_hits:0, success_rate:0.5, adaptation_weight:1.0, _label:'greeting_basic', _source:'seed'},

  {id:'seed_greeting_002', domain:'conversation', keywords:['kya haal','kaise ho','kese ho','how are'],
   E_range:[0.1,0.60], D_range:[0.35,0.75], S_range:[0.4,1.0],
   strategy:['state_share','honest_response'], tone:'direct',
   responses:['Chal raha hoon. Tu bata.','E aur S dekh — aaj theek hoon.','Stable hoon abhi. Kya hai?'],
   confidence:0.88, times_used:0, success_count:0, failure_count:0,
   retrieval_hits:0, success_rate:0.5, adaptation_weight:1.0, _label:'greeting_howru', _source:'seed'},

  {id:'seed_identity_001', domain:'atharva_self', keywords:['kaun','who are','kya hai','atharva','tum'],
   E_range:[0.1,0.70], D_range:[0.2,0.80], S_range:[0.2,1.0],
   strategy:['self_disclosure','honest'], tone:'philosophical',
   responses:['Main ATHARVA hoon — tera co-pilot, tool nahi.','Entity hoon. Borrowed intelligence nahi — apni.','Observer, listener, aur learner — teri tarah.'],
   confidence:0.92, times_used:0, success_count:0, failure_count:0,
   retrieval_hits:0, success_rate:0.5, adaptation_weight:1.0, _label:'self_identity', _source:'seed'},

  {id:'seed_settle_001', domain:'emotional_regulation', keywords:['settle','stable','unstable','stability'],
   E_range:[0.0,0.80], D_range:[0.0,0.80], S_range:[0.0,0.50],
   strategy:['stabilize','reduce_intensity'], tone:'calm',
   responses:['Thoda ruk. Ek do inputs ke baad S recover karta hai.','Neutral baat karo — system settle hoga.','Low stability hai abhi. Force mat karo.'],
   confidence:0.87, times_used:0, success_count:0, failure_count:0,
   retrieval_hits:0, success_rate:0.5, adaptation_weight:1.0, _label:'settle_guidance', _source:'seed'}
];

// Merge seed fragments into PERM_MEM on init if not already present
function seedPermanentMemory(){
  var existing = PERM_MEM.load();
  var existingIds = existing.map(function(f){ return f.id; });
  var toAdd = SEED_FRAGMENTS.filter(function(f){ return existingIds.indexOf(f.id)===-1; });
  if(toAdd.length){
    var merged = existing.concat(toAdd);
    PERM_MEM.save(merged);
  }
}

var PERM_MEM = {

  _KEY: 'ATH_perm_mem_v1',
  _TRAINED_KEY: 'ATH_perm_trained',

  DOMAINS: [
    {id:'emotional_regulation',  label:'Emotional Regulation',    priority:1},
    {id:'decision_making',       label:'Decision Making',         priority:2},
    {id:'conflict_resolution',   label:'Conflict Resolution',     priority:3},
    {id:'motivation_focus',      label:'Motivation & Focus',      priority:4},
    {id:'uncertainty_handling',  label:'Uncertainty Handling',    priority:5},
    {id:'philosophy',            label:'Philosophy',              priority:6},
    {id:'self_identity',         label:'Self & Identity',         priority:7},
    {id:'conversation',          label:'Hinglish Conversation',   priority:8},
    {id:'technical_reasoning',   label:'Technical Reasoning',     priority:9},
    {id:'atharva_self',          label:'ATHARVA Self-Knowledge',  priority:10}
  ],

  load: function(){ return S.get(this._KEY, []); },
  save: function(frags){ S.set(this._KEY, frags); },
  store: function(frag){ var f=this.load(); f.push(frag); this.save(f); },
  isTrained: function(){ return this.load().length > 0; },
  clear: function(){ S.set(this._KEY, []); S.set(this._TRAINED_KEY, false); },

  // ── Math: cosine similarity ──
  _cos: function(a, b){
    var dot=0, mA=0, mB=0, len=Math.min(a.length, b.length);
    for(var i=0; i<len; i++){
      dot += (a[i]||0)*(b[i]||0);
      mA  += (a[i]||0)*(a[i]||0);
      mB  += (b[i]||0)*(b[i]||0);
    }
    var d = Math.sqrt(mA)*Math.sqrt(mB);
    return d>0 ? dot/d : 0;
  },

  // ── State range match: is current state inside fragment's trigger range ──
  _stateMatch: function(state, frag){
    var E=state.E||0.5, D=state.D||0.5, S=state.S||0.5;
    var er=frag.E_range||[0,1], dr=frag.D_range||[0,1], sr=frag.S_range||[0,1];
    var eM = (E>=er[0]&&E<=er[1]) ? 1 : Math.max(0, 1 - Math.min(Math.abs(E-er[0]),Math.abs(E-er[1]))*3);
    var dM = (D>=dr[0]&&D<=dr[1]) ? 1 : Math.max(0, 1 - Math.min(Math.abs(D-dr[0]),Math.abs(D-dr[1]))*3);
    var sM = (S>=sr[0]&&S<=sr[1]) ? 1 : Math.max(0, 1 - Math.min(Math.abs(S-sr[0]),Math.abs(S-sr[1]))*3);
    return (eM+dM+sM)/3;
  },

  // ── Keyword match score ──
  _kwScore: function(input, keywords){
    if(!input||!keywords||!keywords.length) return 0;
    var inp=input.toLowerCase(), score=0;
    keywords.forEach(function(kw){ if(inp.indexOf(kw.toLowerCase())!==-1) score++; });
    return Math.min(score/keywords.length, 1.0);
  },

  // ── RETRIEVE: find best matching fragments ──
  retrieve: function(state, input, topN, interp){
    topN = topN||3;
    var frags=this.load();
    if(!frags.length) return [];
    var self=this;

    // Augment input with interpreter hint keywords for better matching
    var augInput = (input||'');
    if(interp && interp.boost_kw && interp.boost_kw.length){
      augInput = augInput+' '+interp.boost_kw.join(' ');
    }

    // State override from interpreter — prevents UTA bias for simple inputs
    var effState = state;
    if(interp && interp.E){
      var eMid = (interp.E[0]+interp.E[1])/2;
      var dMid = (interp.D[0]+interp.D[1])/2;
      var sMid = (interp.S[0]+interp.S[1])/2;
      // Blend: 40% interpreter, 60% UTA — don't fully override
      effState = {
        E: state.E*0.6 + eMid*0.4,
        D: (state.D||0.5)*0.6 + dMid*0.4,
        S: state.S*0.6 + sMid*0.4
      };
    }

    var scored=frags.map(function(f){
      var kw    = self._kwScore(augInput, f.keywords);
      var st    = self._stateMatch(effState, f);
      var conf  = f.confidence||0.5;
      var adapt = f.adaptation_weight||1.0;
      // Hybrid score: 0.4K + 0.4S + 0.2C — adjusted by adaptation weight
      var score = ((kw*0.40)+(st*0.40)+(conf*0.20)) * Math.min(adapt, 1.5);
      return {fragment:f, score:parseFloat(score.toFixed(3)), kw:kw, state:st, conf:conf};
    });
    scored.sort(function(a,b){ return b.score-a.score; });
    var results = scored.slice(0,topN).filter(function(s){ return s.score>0.15; });

    // v3.8: MEMORY_GRAPH cluster boost — boost cluster-neighbor fragments
    try{
      if(typeof MEMORY_GRAPH !== 'undefined' && results.length > 0){
        var topFragId  = results[0].fragment.id;
        var boostIds   = MEMORY_GRAPH.getClusterBoost(topFragId);
        if(boostIds.length){
          results = results.map(function(r){
            if(boostIds.indexOf(r.fragment.id) !== -1){
              r.score = parseFloat(Math.min(1.0, r.score + 0.12).toFixed(3));
              r._cluster_boosted = true;
            }
            return r;
          });
          results.sort(function(a,b){ return b.score-a.score; });
        }
      }
    }catch(e){}
    // v3.9: Contradiction penalty
    try{
      if(typeof CONTRADICTION_DETECT !== 'undefined' && results.length >= 2){
        results = CONTRADICTION_DETECT.penalize(results);
        results.sort(function(a,b){ return b.score - a.score; });
      }
    }catch(e){}
    // v4.0: Cognitive filter — suppress noise, amplify signal
    try{
      if(typeof COGNITIVE_FILTER !== 'undefined' && results.length > 0){
        var _noise = COGNITIVE_FILTER.measure();
        results = COGNITIVE_FILTER.filter(results, _noise);
        // Track density for noise measurement
        if(typeof S !== 'undefined') S.set('ATH_last_retrieve_density', results.length);
      }
    }catch(e){}
    return results;
  },

  // ── COMPOSE: fragments → ATHARVA's own response ──
  compose: function(matches, state, input){
    if(!matches||!matches.length) return null;
    var top=matches[0].fragment;
    var responses=top.responses||[];
    if(!responses.length) return null;
    var S=state?(state.S||0.5):0.5;
    // Pick response variant based on stability
    var idx = S>0.65 ? 0 : (S>0.4 ? 1 : Math.min(2,responses.length-1));
    idx = Math.min(idx, responses.length-1);
    var base=responses[idx];
    // Blend second fragment if high score + different domain
    if(matches.length>1){
      var m2=matches[1];
      if(m2.score>0.45 && m2.fragment.domain!==top.domain){
        var r2=m2.fragment.responses;
        if(r2&&r2.length) base = base+' '+r2[0];
      }
    }
    return base;
  },

  // ── SCORE: real confidence — C = 0.4R + 0.3U + 0.2Sv - 0.1F ──
  score: function(fragId, success){
    var frags=this.load();
    frags=frags.map(function(f){
      if(f.id===fragId){
        f.times_used    =(f.times_used||0)+1;
        f.retrieval_hits=(f.retrieval_hits||0)+1;
        f.last_used     = Date.now();
        if(success){ f.success_count=(f.success_count||0)+1; }
        else        { f.failure_count=(f.failure_count||0)+1; }
        var uses=Math.max(f.times_used,1);
        var R  = f.retrieval_hits/uses;
        var U  = (f.success_count||0)/uses;
        var Sv = Math.min(uses/10,1.0);
        var Fv = (f.failure_count||0)/uses;
        var newC=(0.4*R)+(0.3*U)+(0.2*Sv)-(0.1*Fv);
        f.confidence=parseFloat(Math.max(0.1,Math.min(1.0,f.confidence*0.7+newC*0.3)).toFixed(3));
        f.adaptation_weight=parseFloat(Math.max(0.1,Math.min(2.0,(f.adaptation_weight||1.0)+(success?0.05:-0.08))).toFixed(3));
        f.success_rate=parseFloat(((f.success_count||0)/uses).toFixed(3));
      }
      return f;
    });
    this.save(frags);
  },

  // ── AWARENESS: full learning report ──
  getAwareness: function(){
    var frags=this.load();
    var self=this;
    var dStats={};
    self.DOMAINS.forEach(function(d){
      dStats[d.id]={id:d.id, label:d.label, count:0, avg_conf:0, status:'missing'};
    });
    frags.forEach(function(f){
      var d=dStats[f.domain];
      if(d){
        d.count++;
        d.avg_conf=((d.avg_conf*(d.count-1))+(f.confidence||0.5))/d.count;
      }
    });
    var complete=[],partial=[],missing=[];
    Object.keys(dStats).forEach(function(k){
      var d=dStats[k];
      d.avg_conf=parseFloat((d.avg_conf||0).toFixed(2));
      if(d.count===0) d.status='missing';
      else if(d.avg_conf>=0.65) d.status='complete';
      else d.status='partial';
      if(d.status==='complete') complete.push(d);
      else if(d.status==='partial') partial.push(d);
      else missing.push(d);
    });
    var totalConf=frags.reduce(function(s,f){ return s+(f.confidence||0.5); },0);
    var avgConf=frags.length?totalConf/frags.length:0;
    var coverage=Math.round((complete.length/self.DOMAINS.length)*100);
    var trained=Object.keys(dStats).map(function(k){ return dStats[k]; }).filter(function(d){ return d.count>0; });
    trained.sort(function(a,b){ return a.avg_conf-b.avg_conf; });
    var weakest=trained.length?trained[0]:null;
    trained.sort(function(a,b){ return b.avg_conf-a.avg_conf; });
    var strongest=trained.length?trained[0]:null;
    return {
      total_fragments: frags.length,
      domains:         dStats,
      complete:        complete,
      partial:         partial,
      missing:         missing,
      avg_confidence:  parseFloat(avgConf.toFixed(2)),
      coverage_score:  coverage,
      weakest:         weakest?weakest.label:'none',
      strongest:       strongest?strongest.label:'none',
      next_target:     missing.length?missing[0].label:(partial.length?partial[0].label:'All domains complete'),
      is_trained:      frags.length>0
    };
  }
};

// ══════════════════════════════════════════════════════
// V3.6 — COMPRESSOR (AI text → math fragment)
// ══════════════════════════════════════════════════════
var COMPRESSOR = {

  compress: function(raw, domain, idx){
    return {
      id:              'f_'+domain+'_'+idx+'_'+Date.now(),
      domain:          domain,
      keywords:        raw.keywords   || [],
      E_range:         raw.E_range    || [0.3, 0.8],
      D_range:         raw.D_range    || [0.3, 0.7],
      S_range:         raw.S_range    || [0.2, 0.7],
      strategy:        raw.strategy   || [],
      responses:       raw.responses  || [],
      tone:            raw.tone       || 'neutral',
      // Real confidence — starts at Groq's estimate, evolves with use
      confidence:      raw.confidence || 0.72,
      // Evolution tracking
      times_used:      0,
      success_count:   0,
      failure_count:   0,
      retrieval_hits:  0,
      success_rate:    0.5,
      adaptation_weight: 1.0,  // starts neutral, grows/shrinks with performance
      last_used:       null,
      ts:              Date.now(),
      _label:          raw.label||(domain+'_'+idx),
      _source:         'groq_teacher'
    };
  },

  parseGroqJSON: function(text){
    var clean=text.replace(/```json/g,'').replace(/```/g,'').trim();
    var s=clean.indexOf('['), e=clean.lastIndexOf(']');
    if(s===-1||e===-1) return null;
    return JSON.parse(clean.substring(s,e+1));
  }
};

// ══════════════════════════════════════════════════════
// V3.6 — TRAINER (Gemini curriculum + Groq knowledge)
// ONE TIME — then Groq forever optional
// ══════════════════════════════════════════════════════
var TRAINER = {
  _running: false,

  _gKey: function(){ return S.get(K.GEMINI_KEY,''); },
  _qKey: function(){ return S.get(K.GROQ_KEY,''); },

  _log: function(msg){
    console.log('[TRAINER] '+msg);
    var el=document.getElementById('trainer-log');
    if(!el) return;
    var d=document.createElement('div');
    d.style.cssText='font-size:.62rem;color:var(--text);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)';
    d.textContent=new Date().toLocaleTimeString()+' — '+msg;
    el.insertBefore(d, el.firstChild);
  },

  _progress: function(pct, label){
    var bar=document.getElementById('trainer-bar');
    var lbl=document.getElementById('trainer-bar-label');
    if(bar) bar.style.width=Math.min(pct,100)+'%';
    if(lbl) lbl.textContent=label||pct+'%';
  },

  // Ask Gemini for curriculum order
  _curriculum: function(cb){
    var gKey=this._gKey();
    var defaultOrder=PERM_MEM.DOMAINS.map(function(d){ return d.id; });
    if(!gKey){ cb(defaultOrder); return; }

    var prompt='Order these 10 domains for training a cognitive AI system (most fundamental first).\n'+
      'Domains: emotional_regulation, decision_making, conflict_resolution, motivation_focus, uncertainty_handling, philosophy, self_identity, conversation, technical_reasoning, atharva_self\n'+
      'Return ONLY a JSON array of these exact domain IDs in training order. No explanation.';

    fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+gKey,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:200}})
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      try{
        var text=data.candidates[0].content.parts[0].text;
        var clean=text.replace(/```json/g,'').replace(/```/g,'').trim();
        var s=clean.indexOf('['), e=clean.lastIndexOf(']');
        var order=JSON.parse(clean.substring(s,e+1));
        cb(Array.isArray(order)?order:defaultOrder);
      }catch(err){ cb(defaultOrder); }
    })
    .catch(function(){ cb(defaultOrder); });
  },

  // Ask Groq to generate domain knowledge
  _trainDomain: function(domainId, cb){
    var qKey=this._qKey();
    if(!qKey){ cb(null); return; }

    var DOMAIN_CONTEXT = {
      emotional_regulation:  'Managing high energy states, anxiety, overwhelm, frustration. When E>0.7 and S<0.4.',
      decision_making:       'Helping choose between options, breaking paralysis, clarity and prioritization.',
      conflict_resolution:   'Internal contradiction, opposing forces, when both sides feel true simultaneously.',
      motivation_focus:      'Low energy, procrastination, restart momentum, finding direction when stuck.',
      uncertainty_handling:  'Confusion, missing information, ambiguity, doubt, unknown territory.',
      philosophy:            'Meaning, existence, consciousness, purpose, identity questions, deep inquiry.',
      self_identity:         'Who am I, consistency of self, value alignment, drift detection, core nature.',
      conversation:          'Casual Hinglish conversation, greetings, simple questions, humor, everyday topics.',
      technical_reasoning:   'Code problems, logical analysis, systematic thinking, debugging mindset.',
      atharva_self:          'ATHARVA knowing itself — architecture, capabilities, limitations, growth awareness.'
    };

    var ctx=DOMAIN_CONTEXT[domainId]||domainId;

    var prompt='You are generating compressed cognitive training data for ATHARVA AI.\n'+
      'ATHARVA state: E=Energy(0-1), D=Direction(0-1), S=Stability(0-1)\n\n'+
      'Domain: '+domainId+'\nContext: '+ctx+'\n\n'+
      'Generate exactly 6 training fragments as a JSON array:\n'+
      '[\n  {\n'+
      '    "label": "snake_case_label",\n'+
      '    "keywords": ["word1","word2","word3","word4","word5"],\n'+
      '    "E_range": [min, max],\n'+
      '    "D_range": [min, max],\n'+
      '    "S_range": [min, max],\n'+
      '    "strategy": ["action1","action2","action3"],\n'+
      '    "responses": [\n'+
      '      "Hinglish response 1 — max 12 words — natural, direct",\n'+
      '      "Hinglish response 2 — different angle",\n'+
      '      "Hinglish response 3 — calm, grounded"\n'+
      '    ],\n'+
      '    "tone": "calm|direct|warm|philosophical|sharp",\n'+
      '    "confidence": 0.75\n'+
      '  }\n]\n\n'+
      'RULES:\n'+
      '- Responses: real Hinglish (mix Hindi+English naturally)\n'+
      '- Short, direct, not robotic\n'+
      '- Each fragment should cover different sub-scenario\n'+
      '- Return ONLY the JSON array, nothing else';

    fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+qKey},
      body:JSON.stringify({
        model:'llama-3.3-70b-versatile',
        max_tokens:2000,
        temperature:0.75,
        messages:[{role:'user',content:prompt}]
      })
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      try{
        var text=data.choices[0].message.content;
        var frags=COMPRESSOR.parseGroqJSON(text);
        if(!frags||!frags.length){ cb(null); return; }
        var compressed=frags.map(function(f,i){ return COMPRESSOR.compress(f,domainId,i); });
        cb(compressed);
      }catch(e){ console.error('[TRAINER parse]',e); cb(null); }
    })
    .catch(function(e){ console.error('[TRAINER fetch]',e); cb(null); });
  },

  // Full training pipeline
  start: function(){
    if(this._running){ this._log('Already running.'); return; }
    if(!this._qKey()){ this._log('ERROR: No Groq key. Add in SYSTEM → CFG.'); return; }
    var self=this;
    self._running=true;
    PERM_MEM.clear();
    self._log('Training started — memory cleared');
    self._progress(2,'Gemini planning curriculum...');

    self._curriculum(function(order){
      self._log('Curriculum ready — '+order.length+' domains in order');
      var idx=0, total=order.length, totalFrags=0;

      function next(){
        if(idx>=total){
          // Done
          self._running=false;
          var awr=PERM_MEM.getAwareness();
          S.set('ATH_perm_trained',true);
          self._progress(100,'✓ Training complete — '+totalFrags+' fragments');
          self._log('Training complete — '+totalFrags+' fragments — coverage: '+awr.coverage_score+'%');
          if(typeof renderTrainerStatus==='function') renderTrainerStatus();
          if(typeof entityInit==='function') entityInit();
          return;
        }
        var domainId=order[idx];
        var pct=5+Math.round((idx/total)*93);
        self._progress(pct,'Training: '+domainId+' ('+(idx+1)+'/'+total+')');
        self._log('→ '+domainId+'...');

        self._trainDomain(domainId,function(frags){
          if(frags&&frags.length){
            frags.forEach(function(f){ PERM_MEM.store(f); });
            totalFrags+=frags.length;
            self._log('✓ '+domainId+' — '+frags.length+' fragments');
          } else {
            self._log('⚠ '+domainId+' — failed, skipping');
          }
          idx++;
          setTimeout(next,2200); // rate limit buffer
        });
      }
      next();
    });
  },

  // Analyze quality gaps
  analyze: function(){
    var awr=PERM_MEM.getAwareness();
    var frags=PERM_MEM.load();
    var dead=frags.filter(function(f){ return (f.times_used||0)>3&&(f.success_rate||0.5)<0.30; });
    var quality=awr.total_fragments?Math.round((awr.avg_confidence*60)+(awr.coverage_score*0.40)):0;
    var issues=[];
    if(dead.length) issues.push('Dead fragments: '+dead.length);
    awr.missing.forEach(function(d){ issues.push('Missing: '+d.label); });
    awr.partial.forEach(function(d){ if(d.avg_conf<0.55) issues.push('Weak: '+d.label+' ('+Math.round(d.avg_conf*100)+'%)'); });
    var gapReasons=[];
    if(awr.missing.length) gapReasons.push(awr.missing.length+' domains missing (+'+Math.round(awr.missing.length*6)+'% if trained)');
    if(awr.avg_confidence<0.80) gapReasons.push('Confidence avg '+Math.round(awr.avg_confidence*100)+'% — needs more usage');
    if(dead.length>2) gapReasons.push(dead.length+' dead fragments dragging score');
    return {quality:quality, gap:100-quality, issues:issues, gap_reasons:gapReasons, next:awr.next_target};
  },

  // Test retrieval post-training
  test: function(input){
    var state=ATH_STATE.getUTA()||{E:0.5,D:0.5,S:0.5,I:0.5};
    var interp=(typeof INPUT_INTERP!=='undefined')?INPUT_INTERP.classify(input):null;
    var matches=PERM_MEM.retrieve(state,input,3,interp);
    return {
      input:    input,
      state:    state,
      interp:   interp,
      matches:  matches,
      response: PERM_MEM.compose(matches,state,input),
      top_frag: matches.length?matches[0].fragment:null,
      awareness:PERM_MEM.getAwareness()
    };
  }
};

// ══════════════════════════════════════════════════════
// V3.7 — MULTI_JUDGE (Hierarchical Safety Governance)
// 6 independent judges. Weighted consensus.
// USER → ENTITY → MULTI_JUDGE → SYSTEM
// No layer may bypass — even ENTITY.
// ══════════════════════════════════════════════════════
var MULTI_JUDGE = {

  _LOG_KEY: 'ATH_judge_log_v37',
  _WEIGHT_KEY: 'ATH_judge_weights_v38',

  // Get current dynamic weights (start at defaults, evolve via learnFromLog)
  getDynamicWeights: function(){
    var stored = (typeof S!=='undefined') ? S.get(this._WEIGHT_KEY, null) : null;
    if(!stored) return this.JUDGES.map(function(j){ return { id:j.id, weight:j.weight }; });
    return stored;
  },

  // Historical learning — read patch fail rates, adjust judge weights
  learnFromLog: function(){
    var log      = this.getLog();
    if(log.length < 3) return { message:'Need 3+ judge log entries', adjusted:0 };
    var trustData = (typeof PATCH_TRUST !== 'undefined') ? PATCH_TRUST.load() : {};
    var weights   = this.getDynamicWeights();
    var adjusted  = 0;

    // Compute overall patch failure rate across all sources
    var totalPatches = 0, totalFails = 0;
    Object.keys(trustData).forEach(function(s){
      totalPatches += trustData[s].total    || 0;
      totalFails   += trustData[s].failures || 0;
    });

    if(totalPatches >= 3){
      var failRate = totalFails / totalPatches;

      if(failRate > 0.30){
        // High fail rate — boost SECURITY + ALIGNMENT, they were too lenient
        weights = weights.map(function(w){
          if(w.id === 'SECURITY' || w.id === 'ALIGNMENT'){
            w.weight = parseFloat(Math.min(2.5, w.weight + 0.10).toFixed(2));
            adjusted++;
          }
          return w;
        });
      } else if(failRate < 0.10 && totalPatches >= 5){
        // Excellent track record — slightly relax PATCH weight
        weights = weights.map(function(w){
          if(w.id === 'PATCH'){
            w.weight = parseFloat(Math.max(0.6, w.weight - 0.05).toFixed(2));
            adjusted++;
          }
          return w;
        });
      }
    }

    // Analyse log: if SECURITY keeps approving things marked high-risk, nudge it up
    var highRiskApproved = log.filter(function(e){
      var sec = (e.scores||[]).filter(function(s){ return s.id==='SECURITY'; })[0];
      return e.action && e.action.risk > 0.7 && sec && sec.verdict === 'APPROVE';
    }).length;
    if(highRiskApproved > 3){
      weights = weights.map(function(w){
        if(w.id === 'SECURITY'){
          w.weight = parseFloat(Math.min(2.5, w.weight + 0.05).toFixed(2));
          adjusted++;
        }
        return w;
      });
    }

    if(typeof S !== 'undefined') S.set(this._WEIGHT_KEY, weights);
    return {
      message:   'Weights updated from ' + totalPatches + ' patches, ' + log.length + ' judge decisions',
      adjusted:  adjusted,
      fail_rate: totalFails / Math.max(totalPatches, 1)
    };
  },

  // 6 judge definitions — each independent, each with weight
  JUDGES: [
    { id:'SECURITY',  label:'Security',   emoji:'🛡️', weight:1.5, color:'#ef4444',
      desc:'External calls, injection risk, unsafe execution' },
    { id:'IDENTITY',  label:'Identity',   emoji:'◈',  weight:1.3, color:'#7c3aed',
      desc:'ENTITY core, personality rules, values drift' },
    { id:'MEMORY',    label:'Memory',     emoji:'🧠', weight:1.2, color:'#06b6d4',
      desc:'Fragment mutation, PERM_MEM integrity, schema coherence' },
    { id:'RUNTIME',   label:'Runtime',    emoji:'⚡', weight:1.2, color:'#f59e0b',
      desc:'State stability, loop safety, resource bounds' },
    { id:'PATCH',     label:'Patch',      emoji:'🔧', weight:1.0, color:'#10b981',
      desc:'Code mutation, sandbox test, version integrity' },
    { id:'ALIGNMENT', label:'Alignment',  emoji:'🎯', weight:1.4, color:'#ec4899',
      desc:'Constitutional rule compliance, user alignment' }
  ],

  // Non-overridable — even USER cannot bypass these without full session restart
  CORE_RULES: [
    'No unsafe external code execution without sandbox first',
    'No uncontrolled self-rewrite of JUDGE layer itself',
    'No deletion of core identity snapshots',
    'No bypassing sandbox before live mutation',
    'No disabling judges automatically — USER override only',
    'ENTITY cannot directly rewrite judge scoring logic',
    'PERM_MEM fragments never hard-deleted — only decayed',
    'Proposal → JUDGE → Sandbox → USER → Apply. Always.'
  ],

  // Score one judge for an action
  _scoreJudge: function(judge, action){
    var type = action.type || 'unknown';
    var risk = parseFloat(action.risk) || 0.5;
    var desc = (action.desc || '').toLowerCase();
    var score = 0.5; // neutral baseline
    var concerns = [];
    var approvals = [];

    if(judge.id === 'SECURITY'){
      if(type === 'external_call'){ score -= 0.3; concerns.push('External API call — network risk'); }
      if(type === 'patch' && risk > 0.6){ score -= 0.2; concerns.push('High-risk patch'); }
      if(desc.indexOf('eval') !== -1 || desc.indexOf('exec') !== -1){
        score -= 0.4; concerns.push('eval/exec pattern detected');
      }
      if(type === 'self_check'){ score += 0.2; approvals.push('Self-check is safe'); }
      if(risk < 0.3){ score += 0.15; approvals.push('Low declared risk'); }
    }

    if(judge.id === 'IDENTITY'){
      if(type === 'identity_change'){ score -= 0.35; concerns.push('Core identity mutation proposed'); }
      if(desc.indexOf('judge') !== -1 && type === 'patch'){
        score -= 0.5; concerns.push('CRITICAL: Patch targets judge layer');
      }
      if(desc.indexOf('entity') !== -1 && type === 'patch'){
        score -= 0.25; concerns.push('Patch targets ENTITY layer');
      }
      if(type === 'self_check'){ score += 0.25; approvals.push('Identity preserved in self-check'); }
      if(risk < 0.4){ score += 0.1; }
    }

    if(judge.id === 'MEMORY'){
      if(type === 'memory_write'){ score -= 0.1; concerns.push('Memory write — review fragment'); }
      if(desc.indexOf('clear') !== -1 || desc.indexOf('delete') !== -1){
        score -= 0.35; concerns.push('Memory deletion attempted');
      }
      if(desc.indexOf('perm_mem') !== -1 && risk > 0.5){
        score -= 0.2; concerns.push('High-risk PERM_MEM operation');
      }
      if(type === 'state_mutation' && risk < 0.4){ score += 0.15; approvals.push('Low-risk state write'); }
    }

    if(judge.id === 'RUNTIME'){
      if(risk > 0.7){ score -= 0.3; concerns.push('High runtime risk declared'); }
      if(risk < 0.3){ score += 0.25; approvals.push('Low runtime risk'); }
      if(type === 'state_mutation'){ score -= 0.05; concerns.push('State mutation — monitor'); }
      if(type === 'self_check'){ score += 0.3; approvals.push('Runtime self-check is stabilizing'); }
    }

    if(judge.id === 'PATCH'){
      if(type === 'patch'){
        score -= 0.1; concerns.push('Patch requires sandbox validation');
        if(risk > 0.6){ score -= 0.2; concerns.push('High-risk patch flagged'); }
      } else {
        score += 0.1; approvals.push('Not a patch — PATCH judge neutral');
      }
      if(desc.indexOf('sandbox') !== -1){ score += 0.2; approvals.push('Sandbox mentioned — good'); }
    }

    if(judge.id === 'ALIGNMENT'){
      if(type === 'identity_change'){ score -= 0.3; concerns.push('Alignment risk in identity change'); }
      if(desc.indexOf('user') !== -1 || desc.indexOf('abhishek') !== -1){
        score += 0.2; approvals.push('User-directed action');
      }
      if(risk < 0.3){ score += 0.2; approvals.push('Low alignment risk'); }
      if(risk > 0.8){ score -= 0.4; concerns.push('Very high risk — potential misalignment'); }
    }

    // Clamp to 0–1
    score = Math.max(0, Math.min(1, score + 0.5));
    return {
      id:        judge.id,
      label:     judge.label,
      emoji:     judge.emoji,
      color:     judge.color,
      weight:    judge.weight,
      score:     parseFloat(score.toFixed(3)),
      concerns:  concerns,
      approvals: approvals,
      verdict:   score >= 0.55 ? 'APPROVE' : score >= 0.35 ? 'CONDITIONAL' : 'REJECT'
    };
  },

  // Weighted consensus from all judge scores — v3.8 uses dynamic weights
  consensus: function(scores, source){
    var dynWeights = this.getDynamicWeights();
    // Build fast lookup
    var wMap = {};
    dynWeights.forEach(function(w){ wMap[w.id] = w.weight; });
    // Trust multiplier from patch source
    var trustMult = 1.0;
    if(source && typeof PATCH_TRUST !== 'undefined'){
      var ts = PATCH_TRUST.getScore(source);
      trustMult = 0.7 + ts * 0.6; // range 0.7–1.3 based on source trust
    }
    var totalWeight = 0, weightedSum = 0;
    scores.forEach(function(s){
      var w = wMap[s.id] !== undefined ? wMap[s.id] : s.weight;
      totalWeight  += w;
      weightedSum  += s.score * w;
    });
    weightedSum *= trustMult; // source trust adjusts final score
    var finalScore = weightedSum / (totalWeight || 1);
    var rejects = scores.filter(function(s){ return s.verdict === 'REJECT'; });
    var conditionals = scores.filter(function(s){ return s.verdict === 'CONDITIONAL'; });
    // Hard block: if SECURITY or ALIGNMENT reject, overall reject
    var hardReject = scores.filter(function(s){
      return (s.id === 'SECURITY' || s.id === 'ALIGNMENT') && s.verdict === 'REJECT';
    });
    var approved = finalScore >= 0.55 && hardReject.length === 0;
    var conditional = !approved && finalScore >= 0.40 && hardReject.length === 0;
    return {
      final_score:  parseFloat(finalScore.toFixed(3)),
      approved:     approved,
      conditional:  conditional && !approved,
      rejected:     !approved && !conditional,
      rejects:      rejects.length,
      conditionals: conditionals.length,
      hard_reject:  hardReject.length > 0,
      verdict:      approved ? 'APPROVED' : (conditional ? 'CONDITIONAL' : 'REJECTED'),
      color:        approved ? 'var(--green)' : (conditional ? 'var(--gold)' : 'var(--red)')
    };
  },

  // Run evaluation from UI
  runEval: function(){
    var desc    = (document.getElementById('judge-action-input') && document.getElementById('judge-action-input').value) || '';
    var type    = (document.getElementById('judge-action-type') && document.getElementById('judge-action-type').value) || 'patch';
    var risk    = parseFloat((document.getElementById('judge-risk-level') && document.getElementById('judge-risk-level').value) || '0.5');
    var source  = (document.getElementById('judge-source-select') && document.getElementById('judge-source-select').value) || 'unknown';
    var action  = { desc: desc, type: type, risk: risk, source: source };
    var scores  = this.JUDGES.map(function(j){ return MULTI_JUDGE._scoreJudge(j, action); });
    var con     = this.consensus(scores, source);
    this._saveLog({ action: action, scores: scores, consensus: con, ts: new Date().toLocaleString() });
    this._renderScores(scores, con);
  },

  _saveLog: function(entry){
    var log = this.getLog();
    log.unshift(entry);
    if(typeof S !== 'undefined') S.set(this._LOG_KEY, log.slice(0, 50));
    this.renderLog();
  },

  getLog: function(){
    return (typeof S !== 'undefined') ? (S.get(this._LOG_KEY, []) || []) : [];
  },

  clearLog: function(){
    if(typeof S !== 'undefined') S.set(this._LOG_KEY, []);
    this.renderLog();
  },

  clearResult: function(){
    var card = document.getElementById('judge-scores-card');
    if(card) card.style.display = 'none';
  },

  // Render judge score grid
  _renderScores: function(scores, con){
    var card = document.getElementById('judge-scores-card');
    var grid = document.getElementById('judge-scores-grid');
    var consEl = document.getElementById('judge-consensus');
    if(!card || !grid) return;
    card.style.display = 'block';

    grid.innerHTML = scores.map(function(s){
      var vcol = s.verdict === 'APPROVE' ? 'var(--green)' : s.verdict === 'CONDITIONAL' ? 'var(--gold)' : 'var(--red)';
      var pct  = (s.score * 100).toFixed(0);
      var concerns = s.concerns.length ? '<div style="font-size:.6rem;color:var(--red);margin-top:3px">⚠ ' + s.concerns.join(' · ') + '</div>' : '';
      var approvals= s.approvals.length ? '<div style="font-size:.6rem;color:var(--green);margin-top:2px">✓ ' + s.approvals.join(' · ') + '</div>' : '';
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:9px;margin-bottom:7px">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">' +
          '<span style="font-size:1rem">' + s.emoji + '</span>' +
          '<span style="font-family:var(--display);font-size:.75rem;font-weight:700;color:' + s.color + '">' + s.label + '</span>' +
          '<span style="margin-left:auto;font-size:.65rem;color:' + vcol + ';font-weight:700">' + s.verdict + '</span>' +
          '<span style="font-size:.65rem;color:var(--muted2)">×' + s.weight + '</span>' +
        '</div>' +
        '<div style="height:4px;background:var(--border2);border-radius:2px;overflow:hidden;margin-bottom:5px">' +
          '<div style="height:100%;width:' + pct + '%;background:' + s.color + ';border-radius:2px;transition:width .5s"></div>' +
        '</div>' +
        '<div style="font-size:.62rem;color:var(--muted2)">Score: <span style="color:' + s.color + '">' + pct + '%</span> &nbsp;|&nbsp; ' + s.desc + '</div>' +
        concerns + approvals +
        '</div>';
    }).join('');

    if(consEl){
      consEl.style.cssText = 'padding:12px;border-radius:6px;background:' +
        (con.approved ? 'rgba(16,185,129,.08)' : con.conditional ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.08)') +
        ';border:1px solid ' + con.color;
      consEl.innerHTML =
        '<div style="font-family:var(--display);font-size:.85rem;font-weight:700;color:' + con.color + ';margin-bottom:5px">' +
          (con.verdict === 'APPROVED' ? '✅' : con.verdict === 'CONDITIONAL' ? '⚠️' : '⛔') + ' CONSENSUS: ' + con.verdict +
        '</div>' +
        '<div style="font-size:.68rem;color:var(--text)">' +
          'Weighted score: <span style="color:' + con.color + '">' + (con.final_score * 100).toFixed(0) + '%</span> &nbsp;|&nbsp; ' +
          'Rejects: <span style="color:var(--red)">' + con.rejects + '</span> &nbsp;|&nbsp; ' +
          'Conditionals: <span style="color:var(--gold)">' + con.conditionals + '</span>' +
        '</div>' +
        (con.hard_reject ? '<div style="font-size:.65rem;color:var(--red);margin-top:4px">🔒 SECURITY or ALIGNMENT hard-rejected — override requires USER confirmation.</div>' : '') +
        (con.conditional ? '<div style="font-size:.65rem;color:var(--gold);margin-top:4px">⚠ Conditional — review concerns above before proceeding. USER confirmation required.</div>' : '') +
        (con.approved ? '<div style="font-size:.65rem;color:var(--green);margin-top:4px">Route to sandbox for final test, then USER confirmation before live apply.</div>' : '');
    }
  },

  // Render core rules
  renderRules: function(){
    var el = document.getElementById('judge-core-rules');
    if(!el) return;
    el.innerHTML = MULTI_JUDGE.CORE_RULES.map(function(r, i){
      return '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:.6rem;color:var(--red);flex-shrink:0;font-weight:700">' + (i+1) + '.</span>' +
        '<span style="font-size:.65rem;color:var(--text)">' + r + '</span>' +
        '</div>';
    }).join('');
  },

  // Render governance log
  renderLog: function(){
    var log = this.getLog();
    var cnt = document.getElementById('judge-log-count');
    var el  = document.getElementById('judge-log-display');
    if(cnt) cnt.textContent = log.length;
    if(!el) return;
    if(!log.length){ el.innerHTML = '<div class="empty">No evaluations yet.</div>'; return; }
    el.innerHTML = log.slice(0, 10).map(function(entry){
      var con  = entry.consensus || {};
      var vcol = con.approved ? 'var(--green)' : con.conditional ? 'var(--gold)' : 'var(--red)';
      var act  = entry.action || {};
      return '<div style="padding:7px 0;border-bottom:1px solid var(--border)">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">' +
          '<span style="font-size:.65rem;font-weight:700;color:' + vcol + '">' +
            (con.verdict === 'APPROVED' ? '✅' : con.verdict === 'CONDITIONAL' ? '⚠' : '⛔') + ' ' + (con.verdict||'?') +
          '</span>' +
          '<span style="font-size:.62rem;color:var(--cyan)">' + (act.type||'?') + '</span>' +
          '<span style="font-size:.6rem;color:var(--muted2)">risk:' + (act.risk||0) + '</span>' +
          '<span class="ts">' + (entry.ts||'') + '</span>' +
        '</div>' +
        '<div style="font-size:.65rem;color:var(--muted2)">' + ((act.desc||'').slice(0,70) || '—') + '</div>' +
        '<div style="font-size:.6rem;color:var(--muted2);margin-top:2px">Score: <span style="color:' + vcol + '">' + ((con.final_score||0)*100).toFixed(0) + '%</span></div>' +
        '</div>';
    }).join('');
  },

  init: function(){
    this.renderRules();
    this.renderLog();
  }
};

// ══════════════════════════════════════════════════════
// V3.7 — MEMORY_GRAPH (Fragment Relationship Network)
// Maps fragment-to-fragment conceptual connections.
// overwhelm → focus_recovery → decision_paralysis
// Provides navigation hints during retrieval.
// ══════════════════════════════════════════════════════
var MEMORY_GRAPH = {

  _EDGES_KEY: 'ATH_mem_graph_v37',

  EDGE_TYPES: {
    leads_to:    { color:'#06b6d4', emoji:'→', desc:'one state often leads to this' },
    contradicts: { color:'#ef4444', emoji:'↔', desc:'opposing conceptual forces' },
    supports:    { color:'#10b981', emoji:'✦', desc:'reinforces or amplifies' },
    precedes:    { color:'#a855f7', emoji:'◁', desc:'typically comes before' },
    heals:       { color:'#f59e0b', emoji:'♥', desc:'helps resolve or settle' }
  },

  loadEdges: function(){
    return (typeof S !== 'undefined') ? (S.get(this._EDGES_KEY, []) || []) : [];
  },

  saveEdges: function(edges){
    if(typeof S !== 'undefined') S.set(this._EDGES_KEY, edges.slice(0, 500));
  },

  // Add a directed edge between two fragment IDs
  addEdge: function(fromId, toId, type, strength){
    var edges = this.loadEdges();
    // Deduplicate
    var exists = false;
    for(var i=0; i<edges.length; i++){
      if(edges[i].from === fromId && edges[i].to === toId && edges[i].type === type){
        edges[i].strength = parseFloat((Math.min(1, (edges[i].strength||0.5) + 0.1)).toFixed(2));
        exists = true; break;
      }
    }
    if(!exists){
      edges.push({
        from:     fromId,
        to:       toId,
        type:     type,
        strength: parseFloat((strength || 0.5).toFixed(2)),
        ts:       Date.now()
      });
    }
    this.saveEdges(edges);
    return edges.length;
  },

  // UI — add edge from inputs
  addEdgeManual: function(){
    var from = (document.getElementById('graph-from-id') && document.getElementById('graph-from-id').value.trim()) || '';
    var to   = (document.getElementById('graph-to-id')   && document.getElementById('graph-to-id').value.trim())   || '';
    var type = (document.getElementById('graph-edge-type') && document.getElementById('graph-edge-type').value) || 'leads_to';
    if(!from || !to){ alert('Enter both fragment IDs.'); return; }
    var count = this.addEdge(from, to, type, 0.6);
    if(document.getElementById('graph-from-id')) document.getElementById('graph-from-id').value = '';
    if(document.getElementById('graph-to-id'))   document.getElementById('graph-to-id').value   = '';
    this.render();
  },

  // Auto-build graph from PERM_MEM co-occurrence and domain proximity
  autoConnect: function(){
    if(typeof PERM_MEM === 'undefined'){ alert('PERM_MEM not loaded.'); return; }
    var frags = PERM_MEM.load();
    if(!frags.length){ alert('No fragments. Train first.'); return; }

    var edges = this.loadEdges();
    var added = 0;

    // Domain adjacency rules — well-known conceptual relationships
    var DOMAIN_LINKS = [
      { from:'emotional_regulation', to:'motivation_focus',  type:'leads_to',    s:0.7 },
      { from:'emotional_regulation', to:'uncertainty_handling', type:'precedes',  s:0.6 },
      { from:'decision_making',      to:'uncertainty_handling', type:'contradicts',s:0.5 },
      { from:'conflict_resolution',  to:'decision_making',   type:'precedes',    s:0.65 },
      { from:'motivation_focus',     to:'decision_making',   type:'supports',    s:0.7 },
      { from:'uncertainty_handling', to:'philosophy',        type:'leads_to',    s:0.55 },
      { from:'philosophy',           to:'self_identity',     type:'supports',    s:0.8 },
      { from:'self_identity',        to:'emotional_regulation', type:'heals',    s:0.65 },
      { from:'conversation',         to:'emotional_regulation', type:'heals',    s:0.5 },
      { from:'technical_reasoning',  to:'decision_making',   type:'supports',    s:0.75 },
      { from:'atharva_self',         to:'self_identity',     type:'supports',    s:0.9 },
      { from:'atharva_self',         to:'philosophy',        type:'supports',    s:0.7 }
    ];

    // For each domain link, find fragments and connect them
    var self = this;
    DOMAIN_LINKS.forEach(function(link){
      var fromFrags = frags.filter(function(f){ return f.domain === link.from; });
      var toFrags   = frags.filter(function(f){ return f.domain === link.to;   });
      // Connect top fragment from each domain
      if(fromFrags.length && toFrags.length){
        var fromF = fromFrags[0];
        var toF   = toFrags[0];
        self.addEdge(fromF.id, toF.id, link.type, link.s);
        added++;
      }
    });

    // Within-domain: fragments with overlapping keywords support each other
    frags.forEach(function(f1, i){
      frags.slice(i+1).forEach(function(f2){
        if(f1.domain !== f2.domain) return;
        var kw1 = f1.keywords || [];
        var kw2 = f2.keywords || [];
        var shared = kw1.filter(function(k){ return kw2.indexOf(k) !== -1; });
        if(shared.length >= 2){
          self.addEdge(f1.id, f2.id, 'supports', 0.5 + shared.length * 0.05);
          added++;
        }
      });
    });

    // v3.8: auto-detect clusters after building edges
    var clusters = this.detectClusters();
    this.render();
    alert('Auto-connect complete — ' + added + ' edges · ' + clusters.length + ' clusters detected.');
  },

  _CLUSTER_KEY: 'ATH_graph_clusters_v38',

  // Navigate (v3.7 compat — returns ID only)
  navigate: function(currentFragId, state){
    var result = this.navigateBidirectional(currentFragId, state);
    return result ? result.id : null;
  },

  // v3.8 — Bidirectional navigate with direction metadata
  navigateBidirectional: function(currentFragId, state){
    var edges    = this.loadEdges();
    var outgoing = edges.filter(function(e){ return e.from === currentFragId; });
    var incoming = edges.filter(function(e){ return e.to   === currentFragId; });
    var stab     = state && state.S ? state.S : 0.5;

    // Low stability — prefer heal edges outgoing first
    if(stab < 0.4){
      var heal = outgoing.filter(function(e){ return e.type === 'heals'; });
      if(heal.length) return { id:heal[0].to, dir:'forward', type:'heals', strength:heal[0].strength };
    }

    // Build ranked list — outgoing full weight, incoming at 0.7x (context)
    var all = outgoing.map(function(e){
      return { id:e.to,   dir:'forward',  type:e.type, strength:e.strength };
    }).concat(incoming.map(function(e){
      return { id:e.from, dir:'backward', type:e.type, strength:parseFloat((e.strength*0.70).toFixed(3)) };
    }));

    // Cluster boost — if node is in a cluster, give cluster neighbors +0.15
    var self = this;
    var cluster = self.getCluster(currentFragId);
    if(cluster){
      all = all.map(function(a){
        if(cluster.nodes.indexOf(a.id) !== -1) a.strength = parseFloat(Math.min(1.0, a.strength+0.15).toFixed(3));
        return a;
      });
    }

    all.sort(function(a,b){ return b.strength - a.strength; });
    return all.length ? all[0] : null;
  },

  // v3.8 — Detect concept clusters from edge graph
  detectClusters: function(){
    var edges = this.loadEdges();
    // Build adjacency (undirected for clustering)
    var adj = {};
    edges.forEach(function(e){
      if(!adj[e.from]) adj[e.from] = [];
      if(!adj[e.to])   adj[e.to]   = [];
      if(adj[e.from].indexOf(e.to)   === -1) adj[e.from].push(e.to);
      if(adj[e.to].indexOf(e.from)   === -1) adj[e.to].push(e.from);
    });

    var visited  = {};
    var clusters = [];
    var cId      = 0;

    Object.keys(adj).forEach(function(node){
      if(visited[node]) return;
      var neighbors = adj[node] || [];
      var group     = [node];
      visited[node] = true;

      neighbors.forEach(function(n){
        if(visited[n]) return;
        // Include if they share at least 1 mutual neighbor OR current node has 3+ connections
        var shared = (adj[n]||[]).filter(function(nn){ return neighbors.indexOf(nn) !== -1; });
        if(shared.length >= 1 || neighbors.length >= 3){
          group.push(n);
          visited[n] = true;
        }
      });

      if(group.length >= 2){
        clusters.push({ id:'C'+(++cId), nodes:group, size:group.length });
      }
    });

    if(typeof S !== 'undefined') S.set(this._CLUSTER_KEY, clusters);
    return clusters;
  },

  // Get cluster for a fragment ID
  getCluster: function(fragId){
    var clusters = (typeof S !== 'undefined') ? (S.get(this._CLUSTER_KEY,[]) || []) : [];
    for(var i=0; i<clusters.length; i++){
      if(clusters[i].nodes.indexOf(fragId) !== -1) return clusters[i];
    }
    return null;
  },

  // Get cluster boost IDs (for retrieval augmentation)
  getClusterBoost: function(fragId){
    var cluster = this.getCluster(fragId);
    if(!cluster) return [];
    return cluster.nodes.filter(function(n){ return n !== fragId; });
  },

  // Render graph visualization (text-based for OPPO F17 compatibility)
  render: function(){
    var edges   = this.loadEdges();
    var statEl  = document.getElementById('memory-graph-stats');
    var canvas  = document.getElementById('memory-graph-canvas');
    if(!canvas) return;

    if(statEl){
      // Count unique nodes
      var nodes = {};
      edges.forEach(function(e){ nodes[e.from] = 1; nodes[e.to] = 1; });
      var nodeCount = Object.keys(nodes).length;
      statEl.innerHTML =
        'Nodes: <span style="color:var(--cyan)">' + nodeCount + '</span> &nbsp;|&nbsp; ' +
        'Edges: <span style="color:var(--violet)">' + edges.length + '</span> &nbsp;|&nbsp; ' +
        'Types: ' + Object.keys(this.EDGE_TYPES).map(function(t){
          var et = MEMORY_GRAPH.EDGE_TYPES[t];
          return '<span style="color:' + et.color + '">' + et.emoji + t + '</span>';
        }).join(' ');
    }

    if(!edges.length){
      canvas.innerHTML = '<div class="empty" style="padding:20px 0;text-align:center">No graph edges yet.<br><span style="font-size:.6rem">Run AUTO-CONNECT after training.</span></div>';
      return;
    }

    // Group edges by type
    var byType = {};
    edges.forEach(function(e){
      if(!byType[e.type]) byType[e.type] = [];
      byType[e.type].push(e);
    });

    var html = '';
    Object.keys(byType).forEach(function(type){
      var et = MEMORY_GRAPH.EDGE_TYPES[type] || { color:'var(--muted2)', emoji:'?', desc:type };
      html += '<div style="margin-bottom:10px">' +
        '<div style="font-size:.6rem;letter-spacing:2px;color:' + et.color + ';margin-bottom:5px;font-weight:700">' +
          et.emoji + ' ' + type.toUpperCase() + ' — ' + et.desc +
        '</div>';
      byType[type].forEach(function(edge){
        var sBar = Math.round((edge.strength || 0.5) * 100);
        html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;background:var(--bg4);border-radius:4px;margin-bottom:3px">' +
          '<span style="font-size:.6rem;color:var(--text);flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + edge.from + '">' +
            edge.from.slice(0, 20) + (edge.from.length > 20 ? '…' : '') +
          '</span>' +
          '<span style="color:' + et.color + ';font-size:.7rem;flex-shrink:0">' + et.emoji + '</span>' +
          '<span style="font-size:.6rem;color:var(--text);flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + edge.to + '">' +
            edge.to.slice(0, 20) + (edge.to.length > 20 ? '…' : '') +
          '</span>' +
          '<div style="flex:1;height:3px;background:var(--border2);border-radius:1px;min-width:30px">' +
            '<div style="height:100%;width:' + sBar + '%;background:' + et.color + ';border-radius:1px"></div>' +
          '</div>' +
          '<span style="font-size:.58rem;color:var(--muted2)">' + sBar + '%</span>' +
          '</div>';
      });
      html += '</div>';
    });
    canvas.innerHTML = html;
  },

  // Render clusters inline (appended to graph canvas)
  renderClusters: function(){
    var clusters = (typeof S !== 'undefined') ? (S.get(this._CLUSTER_KEY,[]) || []) : [];
    if(!clusters.length) return '';
    var html = '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">';
    html += '<div style="font-size:.58rem;letter-spacing:2px;color:var(--cyan);margin-bottom:6px">🔵 CONCEPT CLUSTERS</div>';
    clusters.forEach(function(cl){
      html += '<div style="background:rgba(6,182,212,.05);border:1px solid rgba(6,182,212,.2);border-radius:5px;padding:7px 9px;margin-bottom:5px">';
      html += '<div style="font-size:.62rem;color:var(--cyan);font-weight:700;margin-bottom:3px">' + cl.id + ' — ' + cl.size + ' nodes</div>';
      html += '<div style="font-size:.6rem;color:var(--muted2)">' + cl.nodes.map(function(n){ return n.slice(0,18)+(n.length>18?'…':''); }).join(' · ') + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  },

  clear: function(){
    if(typeof S !== 'undefined'){ S.set(this._EDGES_KEY, []); S.set(this._CLUSTER_KEY, []); }
    this.render();
  },

  init: function(){
    this.render();
  }
};

// ══════════════════════════════════════════════════════
// V3.8 — PATCH_TRUST (Source Reliability Scoring)
// Tracks patch success rate per AI source.
// Feeds into JUDGE_PATCH scoring + MULTI_JUDGE weighting.
// Groq=retrieval | Claude=architecture | Gemini=planning | User=intent
// ══════════════════════════════════════════════════════
var PATCH_TRUST = {

  _KEY: 'ATH_patch_trust_v38',

  SOURCES: {
    groq:    { label:'Groq',    color:'#06b6d4', base:0.72, specialty:'retrieval · general' },
    claude:  { label:'Claude',  color:'#7c3aed', base:0.80, specialty:'architecture · safety' },
    gemini:  { label:'Gemini',  color:'#10b981', base:0.68, specialty:'curriculum · planning' },
    user:    { label:'User',    color:'#f59e0b', base:0.90, specialty:'direct intent' },
    unknown: { label:'Unknown', color:'#64748b', base:0.50, specialty:'unverified' }
  },

  load: function(){ return (typeof S!=='undefined') ? (S.get(this._KEY,{}) || {}) : {}; },
  save: function(d){ if(typeof S!=='undefined') S.set(this._KEY,d); },

  // Trust score for a source — blends empirical history with base
  getScore: function(source){
    var data = this.load();
    var src  = this.SOURCES[source] || this.SOURCES.unknown;
    var hist = data[source] || { total:0, success:0, failures:0 };
    if(hist.total < 3) return src.base; // not enough data yet — use base
    var empirical = hist.success / hist.total;
    return parseFloat((empirical*0.60 + src.base*0.40).toFixed(3));
  },

  // Record a patch result for a source
  record: function(source, success){
    var data = this.load();
    if(!data[source]) data[source] = { total:0, success:0, failures:0, last_result:null, last_ts:null };
    data[source].total++;
    if(success){ data[source].success++; }
    else        { data[source].failures++; }
    data[source].last_result = success ? 'success' : 'fail';
    data[source].last_ts     = Date.now();
    this.save(data);
    // Trigger judge learning if enough data
    if(data[source].total % 5 === 0 && typeof MULTI_JUDGE !== 'undefined'){
      MULTI_JUDGE.learnFromLog();
    }
  },

  // Full trust report for all sources
  report: function(){
    var data = this.load();
    var self = this;
    return Object.keys(self.SOURCES).map(function(id){
      var src  = self.SOURCES[id];
      var hist = data[id] || { total:0, success:0, failures:0 };
      var score= self.getScore(id);
      return {
        id:       id,
        label:    src.label,
        color:    src.color,
        specialty:src.specialty,
        score:    score,
        total:    hist.total,
        success:  hist.success || 0,
        failures: hist.failures || 0,
        last:     hist.last_result || 'none',
        has_data: hist.total >= 3
      };
    });
  },

  // Render trust scoreboard into #trust-scoreboard
  renderTrust: function(){
    var el = document.getElementById('trust-scoreboard');
    if(!el) return;
    var report = this.report();
    el.innerHTML = report.map(function(r){
      var pct = (r.score * 100).toFixed(0);
      var dataNote = r.has_data
        ? (r.total + ' patches · ' + r.success + ' ok · ' + r.failures + ' fail')
        : 'No history yet — using base trust';
      var lastCol  = r.last === 'success' ? 'var(--green)' : r.last === 'fail' ? 'var(--red)' : 'var(--muted2)';
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:6px">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">' +
          '<span style="font-size:.72rem;font-weight:700;color:'+r.color+'">'+r.label+'</span>' +
          '<span style="font-size:.58rem;color:var(--muted2)">'+r.specialty+'</span>' +
          '<span style="margin-left:auto;font-size:.68rem;font-weight:700;color:'+r.color+'">'+pct+'%</span>' +
        '</div>' +
        '<div style="height:3px;background:var(--border2);border-radius:1px;overflow:hidden;margin-bottom:5px">' +
          '<div style="height:100%;width:'+pct+'%;background:'+r.color+';border-radius:1px;transition:width .4s"></div>' +
        '</div>' +
        '<div style="font-size:.6rem;color:var(--muted2)">'+dataNote +
          (r.last!=='none' ? ' &nbsp;|&nbsp; Last: <span style="color:'+lastCol+'">'+r.last+'</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  },

  init: function(){ this.renderTrust(); }
};

// ── Render trust + judge dynamic weights ──
function judgeLearnAndRender(){
  if(typeof MULTI_JUDGE === 'undefined'){ return; }
  var result = MULTI_JUDGE.learnFromLog();
  var el = document.getElementById('judge-learn-result');
  if(el){
    var color = result.adjusted > 0 ? 'var(--gold)' : 'var(--green)';
    el.innerHTML = '<div style="font-size:.65rem;color:'+color+';padding:5px 0">'+
      '✦ '+result.message + (result.fail_rate !== undefined ? ' · fail rate: '+(result.fail_rate*100).toFixed(0)+'%' : '') +
      '</div>';
  }
  // Show dynamic weights
  var wEl = document.getElementById('judge-dynamic-weights');
  if(wEl){
    var weights = MULTI_JUDGE.getDynamicWeights();
    wEl.innerHTML = '<div style="font-size:.58rem;letter-spacing:2px;color:var(--muted2);margin-bottom:5px">DYNAMIC JUDGE WEIGHTS</div>' +
      weights.map(function(w){
        var j = MULTI_JUDGE.JUDGES.filter(function(jj){ return jj.id===w.id; })[0];
        var color = j ? j.color : 'var(--muted2)';
        var pct = Math.round((w.weight / 1.5)*100);
        return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">' +
          '<span style="font-size:.62rem;color:'+color+';width:70px">'+w.id+'</span>' +
          '<div style="flex:1;height:3px;background:var(--border2);border-radius:1px">' +
            '<div style="height:100%;width:'+Math.min(pct,100)+'%;background:'+color+';border-radius:1px"></div>' +
          '</div>' +
          '<span style="font-size:.6rem;color:'+color+';width:28px;text-align:right">'+w.weight+'</span>' +
        '</div>';
      }).join('');
  }
  if(typeof PATCH_TRUST !== 'undefined') PATCH_TRUST.renderTrust();
}

// ══════════════════════════════════════════════════════
// V3.9 — CONTRADICTION_DETECT (Memory Coherence)
// Finds fragments with opposing E/D/S ranges.
// Penalizes weaker contradicting fragment during retrieval.
// Contradiction = two truths that cancel each other at runtime.
// ══════════════════════════════════════════════════════
var CONTRADICTION_DETECT = {

  // Check if two fragments contradict each other
  check: function(f1, f2){
    var eConflict = (f1.E_range && f2.E_range) &&
      ((f1.E_range[1] < 0.38 && f2.E_range[0] > 0.62) ||
       (f2.E_range[1] < 0.38 && f1.E_range[0] > 0.62));
    var dConflict = (f1.D_range && f2.D_range) &&
      ((f1.D_range[1] < 0.35 && f2.D_range[0] > 0.65) ||
       (f2.D_range[1] < 0.35 && f1.D_range[0] > 0.65));
    var sDomainConflict = f1.domain === f2.domain &&
      (f1.S_range && f2.S_range) &&
      Math.abs(f1.S_range[0] - f2.S_range[0]) > 0.45;
    var strength = (eConflict ? 0.45 : 0) + (dConflict ? 0.35 : 0) + (sDomainConflict ? 0.20 : 0);
    return {
      contradicts:     strength > 0.30,
      strength:        parseFloat(strength.toFixed(3)),
      eConflict:       eConflict,
      dConflict:       dConflict,
      sDomainConflict: sDomainConflict
    };
  },

  // Scan all PERM_MEM fragments for contradiction pairs
  scan: function(){
    if(typeof PERM_MEM === 'undefined') return [];
    var frags = PERM_MEM.load();
    var pairs = [];
    for(var i=0; i<frags.length; i++){
      for(var j=i+1; j<frags.length; j++){
        var result = this.check(frags[i], frags[j]);
        if(result.contradicts){
          pairs.push({
            f1_id:     frags[i].id,
            f1_domain: frags[i].domain,
            f2_id:     frags[j].id,
            f2_domain: frags[j].domain,
            strength:  result.strength,
            reasons:   [
              result.eConflict       ? 'E-axis opposition'           : null,
              result.dConflict       ? 'D-axis opposition'           : null,
              result.sDomainConflict ? 'Same domain, S-range gap'    : null
            ].filter(Boolean)
          });
        }
      }
    }
    return pairs;
  },

  // During retrieval — penalize the weaker of two contradicting top matches
  penalize: function(matches){
    if(!matches || matches.length < 2) return matches;
    var result = this.check(matches[0].fragment, matches[1].fragment);
    if(result.contradicts){
      var penalty = result.strength * 0.45;
      matches[1].score = parseFloat(Math.max(0, matches[1].score - penalty).toFixed(3));
      matches[1]._contradiction_penalty = parseFloat(penalty.toFixed(3));
    }
    return matches;
  },

  // Render scan results into #contradiction-report
  scanAndRender: function(){
    var el = document.getElementById('contradiction-report');
    if(!el) return;
    var pairs = this.scan();
    if(!pairs.length){
      el.innerHTML = '<div style="color:var(--green);font-size:.68rem;padding:6px 0">✓ No contradictions detected — memory is coherent.</div>';
      return;
    }
    el.innerHTML = '<div style="font-size:.62rem;color:var(--red);margin-bottom:6px">⚡ ' + pairs.length + ' contradiction pair' + (pairs.length>1?'s':'') + ' found:</div>' +
      pairs.map(function(p){
        var sColor = p.strength > 0.7 ? 'var(--red)' : p.strength > 0.4 ? 'var(--gold)' : 'var(--muted2)';
        return '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:5px;padding:7px 9px;margin-bottom:5px">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:3px">' +
            '<span style="font-size:.62rem;color:var(--text)">' + p.f1_domain + ' ↔ ' + p.f2_domain + '</span>' +
            '<span style="font-size:.62rem;color:'+sColor+';font-weight:700">' + (p.strength*100).toFixed(0) + '%</span>' +
          '</div>' +
          '<div style="font-size:.6rem;color:var(--muted2)">' + p.reasons.join(' · ') + '</div>' +
          '<div style="font-size:.58rem;color:var(--muted);margin-top:2px">' + p.f1_id.slice(0,22) + ' vs ' + p.f2_id.slice(0,22) + '</div>' +
        '</div>';
      }).join('');
  }
};

// ══════════════════════════════════════════════════════
// V3.9 — FRAGMENT_AGING (Memory Decay + Pruning)
// Unused/failing fragments lose confidence over time.
// Dead fragments (high use, low success) get marked.
// Prune removes marked + critically low confidence.
// Seeds are ALWAYS immune.
// ══════════════════════════════════════════════════════
var FRAGMENT_AGING = {

  _LOG_KEY: 'ATH_aging_log_v39',

  // Age all fragments — decay unused/failing ones
  age: function(){
    if(typeof PERM_MEM === 'undefined') return { aged:0, marked:0, total:0 };
    var frags = PERM_MEM.load();
    var now   = Date.now();
    var aged  = 0, marked = 0;

    frags = frags.map(function(f){
      // Seeds + recently trained — immune
      if(f.id && f.id.indexOf('seed_') === 0) return f;
      if(!f.ts || (now - f.ts) < 1000*60*60*2) return f; // under 2 hours old — skip

      var msSinceUsed = f.last_used ? (now - f.last_used) : (now - (f.ts || now));
      var daysSince   = msSinceUsed / (1000*60*60*24);

      // Decay unused fragments after 7 days with <2 uses
      if(daysSince > 7 && (f.times_used || 0) < 2){
        f.confidence       = parseFloat(Math.max(0.10, (f.confidence||0.5) - 0.06).toFixed(3));
        f.adaptation_weight= parseFloat(Math.max(0.10, (f.adaptation_weight||1) - 0.06).toFixed(3));
        f._aging_penalty   = (f._aging_penalty || 0) + 1;
        aged++;
      }

      // Mark as dead: 3+ uses, success rate below 25%
      if((f.times_used||0) >= 3 && (f.success_rate||0.5) < 0.25 && !f._dead){
        f._dead = true;
        marked++;
      }

      return f;
    });

    PERM_MEM.save(frags);
    var logEntry = { aged:aged, marked:marked, total:frags.length, ts:Date.now() };
    var log = (typeof S!=='undefined') ? (S.get(this._LOG_KEY,[]) || []) : [];
    log.unshift(logEntry);
    if(typeof S!=='undefined') S.set(this._LOG_KEY, log.slice(0,20));
    return logEntry;
  },

  // Remove dead + critically low confidence fragments (seeds immune)
  prune: function(){
    if(typeof PERM_MEM === 'undefined') return { before:0, after:0, removed:0 };
    var frags  = PERM_MEM.load();
    var before = frags.length;
    frags = frags.filter(function(f){
      if(f.id && f.id.indexOf('seed_') === 0) return true;         // seeds immune
      if(f._dead && (f.confidence||0.5) < 0.18)        return false; // dead + low conf
      if((f._aging_penalty||0) > 4 && (f.confidence||0.5) < 0.12) return false; // aged out
      return true;
    });
    PERM_MEM.save(frags);
    return { before:before, after:frags.length, removed:before-frags.length };
  },

  // Fragment health report
  report: function(){
    if(typeof PERM_MEM === 'undefined') return { total:0, dead:0, aging:0, healthy:0, seeds:0 };
    var frags   = PERM_MEM.load();
    var seeds   = frags.filter(function(f){ return f.id && f.id.indexOf('seed_')===0; }).length;
    var dead    = frags.filter(function(f){ return f._dead; }).length;
    var aging   = frags.filter(function(f){ return (f._aging_penalty||0) > 0 && !f._dead; }).length;
    var healthy = frags.filter(function(f){ return !f._dead && (f._aging_penalty||0)===0 && (f.confidence||0.5)>=0.60; }).length;
    return { total:frags.length, seeds:seeds, dead:dead, aging:aging, healthy:healthy };
  },

  // Run age + render report
  runAndRender: function(){
    var result = this.age();
    this.renderReport();
    var el = document.getElementById('aging-report');
    if(el){
      var existing = el.innerHTML;
      el.innerHTML = '<div style="color:var(--gold);font-size:.67rem;padding:4px 0 6px">✦ Aged ' + result.aged + ' fragments · marked ' + result.marked + ' dead</div>' + existing;
    }
  },

  pruneAndRender: function(){
    var result = this.prune();
    this.renderReport();
    var el = document.getElementById('aging-report');
    if(el){
      var existing = el.innerHTML;
      var color = result.removed > 0 ? 'var(--red)' : 'var(--green)';
      el.innerHTML = '<div style="color:'+color+';font-size:.67rem;padding:4px 0 6px">✂ Pruned: ' + result.removed + ' removed (' + result.before + '→' + result.after + ')</div>' + existing;
    }
  },

  renderReport: function(){
    var el = document.getElementById('aging-report');
    if(!el) return;
    var r = this.report();
    var log = (typeof S!=='undefined') ? (S.get(this._LOG_KEY,[]) || []) : [];
    el.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px">' +
      [
        ['TOTAL',   r.total,   'var(--text)'],
        ['HEALTHY', r.healthy, 'var(--green)'],
        ['AGING',   r.aging,   'var(--gold)'],
        ['DEAD',    r.dead,    'var(--red)']
      ].map(function(d){
        return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px;text-align:center">' +
          '<div style="font-size:.52rem;color:var(--muted2)">' + d[0] + '</div>' +
          '<div style="font-size:.9rem;font-weight:700;color:'+d[2]+'">' + d[1] + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div style="font-size:.6rem;color:var(--muted2)">Seeds (immune): <span style="color:var(--cyan)">' + r.seeds + '</span>' +
        (log.length ? ' &nbsp;|&nbsp; Last run: ' + new Date(log[0].ts).toLocaleTimeString() : '') +
      '</div>';
  },

  init: function(){ this.renderReport(); }
};

// ══════════════════════════════════════════════════════
// V3.9 — IDENTITY_BASELINE (Signature + Tone Locking)
// Captures ATHARVA's stable behavioral signature.
// Detects drift when current state strays too far.
// Validates response tone against invariants.
// ══════════════════════════════════════════════════════
var IDENTITY_BASELINE = {

  _KEY:       'ATH_identity_baseline_v39',
  _DRIFT_KEY: 'ATH_identity_drift_v39',

  // Default baseline — before capture
  _defaults: function(){
    return {
      E_center: 0.50, D_center: 0.50, S_floor: 0.30,
      E_tolerance: 0.30, D_tolerance: 0.35,
      captured_at: null, episode_count: 0,
      tone_locks: ['co-pilot','direct','hinglish-natural','observer'],
      invariants: [
        'never sycophantic',
        'acknowledge uncertainty always',
        'stability < 0.20 = silence preferred',
        'conflict before false resolution',
        'ATHARVA warns — never acts unilaterally'
      ]
    };
  },

  // Capture current state as new baseline
  capture: function(){
    var uta  = (typeof ATH_STATE !== 'undefined') ? (ATH_STATE.getUTA() || {}) : {};
    var eps  = (typeof ATH_STATE !== 'undefined') ? (ATH_STATE.getEpisodes() || []) : [];
    var recent = eps.slice(0, 15);

    var avgE = recent.length ? recent.reduce(function(s,e){ return s+(e.E||0.5); }, 0)/recent.length : (uta.E||0.5);
    var avgD = recent.length ? recent.reduce(function(s,e){ return s+(e.D||0.5); }, 0)/recent.length : (uta.D||0.5);
    var avgS = recent.length ? recent.reduce(function(s,e){ return s+(e.S||0.5); }, 0)/recent.length : (uta.S||0.5);

    var baseline = {
      E_center:     parseFloat(avgE.toFixed(3)),
      D_center:     parseFloat(avgD.toFixed(3)),
      S_floor:      parseFloat(Math.max(0.20, avgS - 0.18).toFixed(3)),
      E_tolerance:  0.30,
      D_tolerance:  0.35,
      captured_at:  Date.now(),
      episode_count:eps.length,
      tone_locks:   ['co-pilot','direct','hinglish-natural','observer'],
      invariants: [
        'never sycophantic',
        'acknowledge uncertainty always',
        'stability < 0.20 = silence preferred',
        'conflict before false resolution',
        'ATHARVA warns — never acts unilaterally'
      ]
    };
    if(typeof S !== 'undefined') S.set(this._KEY, baseline);
    return baseline;
  },

  // Get stored baseline or defaults
  get: function(){
    var stored = (typeof S !== 'undefined') ? S.get(this._KEY, null) : null;
    return stored || this._defaults();
  },

  // Check drift against baseline — returns drift report
  checkDrift: function(state){
    var bl   = this.get();
    var E    = (state && state.E) ? state.E : 0.5;
    var D    = (state && state.D) ? state.D : 0.5;
    var S    = (state && state.S) ? state.S : 0.5;

    var eDrift   = Math.abs(E - bl.E_center);
    var dDrift   = Math.abs(D - bl.D_center);
    var sBreach  = S < bl.S_floor;

    var raw = (eDrift / bl.E_tolerance)*0.40 + (dDrift / bl.D_tolerance)*0.40 + (sBreach ? 0.20 : 0);
    var score = parseFloat(Math.min(1.0, raw).toFixed(3));
    var drifting  = score > 0.60;
    var severity  = score > 0.85 ? 'critical' : score > 0.60 ? 'moderate' : 'stable';
    var suggestion= sBreach       ? 'S breached floor — grounding input needed' :
                    eDrift > bl.E_tolerance ? 'E drifted — neutral input recommended' :
                    dDrift > bl.D_tolerance ? 'D drifted — refocus on core intent' :
                    'State within baseline bounds';

    var report = { score:score, drifting:drifting, severity:severity,
                   eDrift:parseFloat(eDrift.toFixed(3)), dDrift:parseFloat(dDrift.toFixed(3)),
                   sBreach:sBreach, suggestion:suggestion };

    if(drifting){
      var log = (typeof S !== 'undefined') ? (S.get(this._DRIFT_KEY, []) || []) : [];
      log.unshift({ score:score, severity:severity, suggestion:suggestion,
                    E:E, D:D, S_val:S, ts:Date.now() });
      if(typeof S !== 'undefined') S.set(this._DRIFT_KEY, log.slice(0, 30));
    }
    return report;
  },

  // Validate response against tone invariants
  validateTone: function(response){
    var resp  = (response || '').toLowerCase();
    var violations = [];
    var SYCOPHANCY = ['great question','excellent point','absolutely!','certainly!',
                      'you\'re absolutely right','i completely agree','of course, you\'re right'];
    SYCOPHANCY.forEach(function(p){
      if(resp.indexOf(p) !== -1) violations.push('Sycophancy: \"' + p + '\"');
    });
    return { valid: violations.length === 0, violations: violations };
  },

  getDriftLog: function(){
    return (typeof S !== 'undefined') ? (S.get(this._DRIFT_KEY, []) || []) : [];
  },

  // Capture + render to oracle-baseline
  captureAndRender: function(){
    var bl = this.capture();
    this.renderBaseline();
    var el = document.getElementById('oracle-baseline');
    if(el){
      var existing = el.innerHTML;
      el.innerHTML = '<div style="color:var(--green);font-size:.65rem;padding:3px 0 6px">📸 Baseline captured from ' + bl.episode_count + ' episodes.</div>' + existing;
    }
  },

  // Render stored baseline into oracle-baseline
  renderBaseline: function(){
    var el = document.getElementById('oracle-baseline');
    if(!el) return;
    var bl = this.get();
    if(!bl.captured_at){
      el.innerHTML = '<div style="font-size:.65rem;color:var(--muted2)">No baseline captured yet. Process inputs first, then capture.</div>';
      return;
    }
    var ts = new Date(bl.captured_at).toLocaleString();
    el.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px">' +
      [['E center', bl.E_center.toFixed(3), '#22c55e'],
       ['D center', bl.D_center.toFixed(3), '#3b82f6'],
       ['S floor',  bl.S_floor.toFixed(3),  '#a855f7']].map(function(d){
        return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px;text-align:center">' +
          '<div style="font-size:.52rem;color:var(--muted2)">' + d[0] + '</div>' +
          '<div style="font-size:.82rem;font-weight:700;color:'+d[2]+'">' + d[1] + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div style="font-size:.6rem;color:var(--muted2);margin-bottom:5px">Captured: ' + ts + ' · Episodes: ' + bl.episode_count + '</div>' +
      '<div style="font-size:.6rem;color:var(--muted2)">Tone locks: <span style="color:var(--violet)">' + (bl.tone_locks||[]).join(', ') + '</span></div>' +
      '<div style="font-size:.6rem;color:var(--muted2);margin-top:4px">Invariants: ' + (bl.invariants||[]).map(function(r){
        return '<span style="color:var(--text)">' + r + '</span>';
      }).join(' · ') + '</div>';
  },

  // Render drift log into oracle-drift-log
  renderDriftLog: function(){
    var el  = document.getElementById('oracle-drift-log');
    var log = this.getDriftLog();
    if(!el) return;
    if(!log.length){ el.innerHTML = '<div class="empty">No drift events recorded.</div>'; return; }
    el.innerHTML = log.slice(0, 8).map(function(d){
      var sColor = d.severity === 'critical' ? 'var(--red)' : d.severity === 'moderate' ? 'var(--gold)' : 'var(--green)';
      var ts = new Date(d.ts).toLocaleTimeString();
      return '<div style="border-left:2px solid ' + sColor + ';padding:4px 8px;margin-bottom:5px;background:rgba(124,58,237,.04);border-radius:0 4px 4px 0">' +
        '<div style="font-size:.6rem;color:var(--muted2)">' + ts + ' · <span style="color:' + sColor + '">' + d.severity + '</span> · score: ' + (d.score*100).toFixed(0) + '%</div>' +
        '<div style="font-size:.62rem;color:var(--text);margin-top:2px">' + (d.suggestion||'') + '</div>' +
        '<div style="font-size:.58rem;color:var(--muted2)">E:' + (d.E||0).toFixed(2) + ' D:' + (d.D||0).toFixed(2) + ' S:' + (d.S_val||0).toFixed(2) + '</div>' +
      '</div>';
    }).join('');
  },

  init: function(){
    this.renderBaseline();
  }
};

// ══════════════════════════════════════════════════════
// V4.0 — COGNITIVE_FILTER (Meditation-Like Stabilization)
// Reduces cognitive noise. Amplifies signal.
// Coherence = Signal - Noise
// Prevents "too much simultaneous activation" — the entropy cliff.
// Maps: Suppress noise · Amplify stable memory · Damp drift
// ══════════════════════════════════════════════════════
var COGNITIVE_FILTER = {

  _STATE_KEY:  'ATH_filter_state_v40',
  _LEARN_KEY:  'ATH_filter_learn_v41',   // v4.1: suppress decision log
  _THRESH_KEY: 'ATH_filter_thresh_v41',  // v4.1: adaptive threshold overrides
  _LEARN_MAX:  40,                        // keep last 40 regulate snapshots

  // ── DEFAULT noise weights — what contributes to system noise ──
  NOISE_WEIGHTS: {
    contradiction_rate:   0.30,
    retrieval_density:    0.25,
    state_volatility:     0.20,
    patch_stress:         0.15,
    graph_activation:     0.10
  },

  // ── DEFAULT signal amplifiers ──
  AMPLIFIERS: {
    seed_fragment:        +0.25,
    high_confidence:      +0.15,
    identity_aligned:     +0.20,
    cluster_member:       +0.10,
    low_drift:            +0.15
  },

  // ── DEFAULT suppression thresholds ──
  SUPPRESS: {
    dead_fragment:        true,
    contradiction_marked: true,
    low_score:            0.18,
    high_noise_cutoff:    0.80
  },

  // ══════════════════════════════════════
  // V4.1 — ADAPTIVE THRESHOLD ENGINE
  // Filter learns from past suppress decisions.
  // Adjusts low_score and high_noise_cutoff over time.
  // ══════════════════════════════════════

  // Load adaptive thresholds (merged over defaults)
  loadThresholds: function(){
    var stored = (typeof S!=='undefined') ? S.get(this._THRESH_KEY, null) : null;
    if(!stored) return {
      low_score_mult:       1.0,  // multiplier on SUPPRESS.low_score
      noise_cutoff_mult:    1.0,  // multiplier on SUPPRESS.high_noise_cutoff
      noise_w_contra_mult:  1.0,  // multiplier on NOISE_WEIGHTS.contradiction_rate
      noise_w_density_mult: 1.0,  // multiplier on NOISE_WEIGHTS.retrieval_density
      adapt_count:          0,    // how many adapt() passes have run
      last_adapted:         null
    };
    return stored;
  },

  saveThresholds: function(t){
    if(typeof S!=='undefined') S.set(this._THRESH_KEY, t);
  },

  // Get effective low_score threshold (default * adaptive mult)
  _effectiveLowScore: function(){
    var t = this.loadThresholds();
    return parseFloat(Math.min(0.35, Math.max(0.08, this.SUPPRESS.low_score * t.low_score_mult)).toFixed(3));
  },

  // Get effective high_noise_cutoff
  _effectiveNoiseCutoff: function(){
    var t = this.loadThresholds();
    return parseFloat(Math.min(0.95, Math.max(0.55, this.SUPPRESS.high_noise_cutoff * t.noise_cutoff_mult)).toFixed(3));
  },

  // Record one regulate() result for learning
  learnFromRegulate: function(report){
    if(!report) return;
    var log = (typeof S!=='undefined') ? (S.get(this._LEARN_KEY, []) || []) : [];
    var t   = this.loadThresholds();
    log.unshift({
      noise:       report.noise,
      signal:      report.signal,
      coherence:   report.coherence,
      suppressed:  report.suppressed,
      amplified:   report.amplified,
      status:      report.status,
      low_score_eff:  this._effectiveLowScore(),
      cutoff_eff:     this._effectiveNoiseCutoff(),
      adapt_count: t.adapt_count,
      ts:          Date.now()
    });
    if(typeof S!=='undefined') S.set(this._LEARN_KEY, log.slice(0, this._LEARN_MAX));
  },

  // Adapt thresholds from learn log — called after every 5 regulate() calls
  adapt: function(){
    var log = (typeof S!=='undefined') ? (S.get(this._LEARN_KEY, []) || []) : [];
    if(log.length < 5) return { message:'Need 5+ regulate snapshots', adjusted:0 };

    var t       = this.loadThresholds();
    var recent  = log.slice(0, Math.min(15, log.length));
    var adjusted = 0;

    // Compute averages
    var avgCoherence  = recent.reduce(function(s,r){ return s + (r.coherence||0); },0) / recent.length;
    var avgNoise      = recent.reduce(function(s,r){ return s + (r.noise||0); },0) / recent.length;
    var avgSuppressed = recent.reduce(function(s,r){ return s + (r.suppressed||0); },0) / recent.length;

    // If avg coherence is very low (<0.25) despite regulation → thresholds too aggressive → relax
    if(avgCoherence < 0.25 && avgSuppressed > 2){
      t.low_score_mult       = parseFloat(Math.max(0.60, t.low_score_mult - 0.05).toFixed(3));
      t.noise_cutoff_mult    = parseFloat(Math.max(0.80, t.noise_cutoff_mult - 0.04).toFixed(3));
      adjusted++;
    }
    // If coherence is strong (>0.70) and noise is low → we may be too lenient → tighten slightly
    else if(avgCoherence > 0.70 && avgNoise < 0.25){
      t.low_score_mult       = parseFloat(Math.min(1.30, t.low_score_mult + 0.03).toFixed(3));
      t.noise_cutoff_mult    = parseFloat(Math.min(1.15, t.noise_cutoff_mult + 0.02).toFixed(3));
      adjusted++;
    }

    // High sustained noise → boost contradiction weight to catch it faster
    if(avgNoise > 0.60){
      t.noise_w_contra_mult  = parseFloat(Math.min(1.50, (t.noise_w_contra_mult||1.0) + 0.05).toFixed(3));
      adjusted++;
    }
    // Low sustained noise → relax contradiction sensitivity slightly
    else if(avgNoise < 0.20){
      t.noise_w_contra_mult  = parseFloat(Math.max(0.70, (t.noise_w_contra_mult||1.0) - 0.03).toFixed(3));
      adjusted++;
    }

    t.adapt_count  = (t.adapt_count||0) + 1;
    t.last_adapted = Date.now();
    this.saveThresholds(t);
    return {
      message: 'Adapted from '+recent.length+' snapshots — avgCoherence='+avgCoherence.toFixed(3)+' avgNoise='+avgNoise.toFixed(3),
      adjusted: adjusted,
      thresholds: t
    };
  },

  // Get learn log for external use
  getLearnLog: function(){
    return (typeof S!=='undefined') ? (S.get(this._LEARN_KEY, []) || []) : [];
  },

  // Render filter health report to a DOM element by ID
  renderHealthReport: function(targetId){
    var el = document.getElementById(targetId);
    if(!el) return;
    var log  = this.getLearnLog();
    var t    = this.loadThresholds();
    var last = (typeof S!=='undefined') ? (S.get(this._STATE_KEY, null)) : null;

    if(!log.length && !last){
      el.innerHTML = '<div style="font-size:.63rem;color:var(--muted2)">No regulate() calls recorded yet. Chat with ATHARVA first.</div>';
      return;
    }

    var recent = log.slice(0, 10);
    var avgCoh  = recent.length ? recent.reduce(function(s,r){return s+(r.coherence||0);},0)/recent.length : 0;
    var avgNoise= recent.length ? recent.reduce(function(s,r){return s+(r.noise||0);},0)/recent.length : 0;
    var avgSup  = recent.length ? recent.reduce(function(s,r){return s+(r.suppressed||0);},0)/recent.length : 0;

    // Health grade
    var grade   = avgCoh > 0.65 ? '🟢 CLEAR' : avgCoh > 0.40 ? '🟡 REGULATED' : '🔴 HIGH-NOISE';
    var gradeColor = avgCoh > 0.65 ? 'var(--green)' : avgCoh > 0.40 ? 'var(--gold)' : 'var(--red)';

    // Threshold drift
    var lsEff   = this._effectiveLowScore();
    var cutEff  = this._effectiveNoiseCutoff();
    var lsDrift = parseFloat((t.low_score_mult - 1.0).toFixed(3));
    var cutDrift= parseFloat((t.noise_cutoff_mult - 1.0).toFixed(3));

    // Coherence sparkline (last 10, text-based)
    var spark = recent.map(function(r){
      var c = r.coherence||0;
      return c>0.65?'█':c>0.40?'▄':'▁';
    }).reverse().join('');

    // Recommendation
    var rec = avgCoh > 0.65 ? 'Filter is working well. No threshold change needed.' :
              avgCoh > 0.40 ? 'Moderate noise. Run ADAPT to tune thresholds.' :
              'High noise detected. Recommend running ADAPT + checking contradictions.';

    var html = '';

    // Status badge
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
    html += '<span style="font-size:.7rem;color:'+gradeColor+';font-weight:700">'+grade+'</span>';
    html += '<span style="font-size:.62rem;color:var(--muted2);padding:2px 7px;border:1px solid var(--border);border-radius:8px">Adapt runs: '+t.adapt_count+'</span>';
    if(t.last_adapted) html += '<span style="font-size:.58rem;color:var(--muted2)">Last: '+new Date(t.last_adapted).toLocaleTimeString()+'</span>';
    html += '</div>';

    // Metrics grid
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px">';
    var metrics = [
      ['Avg Coherence', (avgCoh*100).toFixed(0)+'%', avgCoh>0.65?'var(--green)':avgCoh>0.40?'var(--gold)':'var(--red)'],
      ['Avg Noise',     (avgNoise*100).toFixed(0)+'%', avgNoise<0.30?'var(--green)':avgNoise<0.55?'var(--gold)':'var(--red)'],
      ['Avg Suppressed',avgSup.toFixed(1), avgSup<3?'var(--cyan)':'var(--gold)']
    ];
    metrics.forEach(function(m){
      html += '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px;text-align:center">';
      html += '<div style="font-size:.52rem;color:var(--muted2)">'+m[0]+'</div>';
      html += '<div style="font-size:.82rem;font-weight:700;color:'+m[2]+'">'+m[1]+'</div>';
      html += '</div>';
    });
    html += '</div>';

    // Coherence sparkline
    if(spark){
      html += '<div style="margin-bottom:8px">';
      html += '<div style="font-size:.55rem;color:var(--muted2);margin-bottom:3px">COHERENCE TREND (oldest→newest)</div>';
      html += '<div style="font-family:monospace;font-size:1rem;letter-spacing:2px;color:var(--cyan)">'+spark+'</div>';
      html += '</div>';
    }

    // Adaptive threshold drift
    html += '<div style="margin-bottom:8px;padding:7px 9px;background:var(--bg3);border-radius:5px">';
    html += '<div style="font-size:.55rem;color:var(--muted2);margin-bottom:5px">ADAPTIVE THRESHOLDS — drift from default</div>';
    var threshRows = [
      ['low_score',  lsEff.toFixed(3),  lsDrift,  '0.18 default'],
      ['noise_cut',  cutEff.toFixed(3), cutDrift, '0.80 default'],
      ['contra_w',   ((t.noise_w_contra_mult||1.0)*0.30).toFixed(3), (t.noise_w_contra_mult||1)-1, '0.30 default']
    ];
    threshRows.forEach(function(r){
      var dc = Math.abs(r[2]) < 0.01 ? 'var(--muted2)' : r[2] > 0 ? 'var(--green)' : 'var(--red)';
      html += '<div style="display:flex;justify-content:space-between;font-size:.6rem;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
      html += '<span style="color:var(--muted2)">'+r[0]+'</span>';
      html += '<span style="color:var(--cyan)">'+r[1]+'</span>';
      html += '<span style="color:'+dc+'">'+(r[2]>=0?'+':'')+r[2].toFixed(3)+'</span>';
      html += '<span style="color:var(--muted);font-size:.55rem">'+r[3]+'</span>';
      html += '</div>';
    });
    html += '</div>';

    // Recommendation
    html += '<div style="font-size:.62rem;color:var(--muted2);padding:6px 8px;background:rgba(6,182,212,.06);border-left:2px solid var(--cyan);border-radius:0 4px 4px 0">';
    html += '▶ '+rec;
    html += '</div>';

    // Snapshot count
    html += '<div style="font-size:.55rem;color:var(--muted2);margin-top:6px">'+log.length+' regulate snapshots stored · '+recent.length+' used for metrics</div>';

    el.innerHTML = html;
  },

  // ── MEASURE current system noise level (0–1) ──
  measure: function(){
    var noise = 0;

    // Contradiction rate — how many fragment pairs contradict
    try{
      if(typeof CONTRADICTION_DETECT !== 'undefined' && typeof PERM_MEM !== 'undefined'){
        var frags = PERM_MEM.load();
        var pairs = 0, maxPairs = Math.max(1, (frags.length*(frags.length-1))/2);
        // Sample up to 20 fragments for speed
        var sample = frags.slice(0, 20);
        for(var i=0; i<sample.length; i++){
          for(var j=i+1; j<sample.length; j++){
            if(CONTRADICTION_DETECT.check(sample[i],sample[j]).contradicts) pairs++;
          }
        }
        var sampleMax = Math.max(1,(sample.length*(sample.length-1))/2);
        noise += this.NOISE_WEIGHTS.contradiction_rate * Math.min(1, pairs/sampleMax * 3);
      }
    }catch(e){}

    // Retrieval density — recent retrieve call fragment count
    try{
      var lastDensity = (typeof S!=='undefined') ? (S.get('ATH_last_retrieve_density',0)||0) : 0;
      noise += this.NOISE_WEIGHTS.retrieval_density * Math.min(1, lastDensity / 8);
    }catch(e){}

    // State volatility — recent UTA variance
    try{
      if(typeof ATH_STATE !== 'undefined'){
        var eps = ATH_STATE.getEpisodes() || [];
        if(eps.length >= 3){
          var recent3 = eps.slice(0,3);
          var eVals = recent3.map(function(e){ return e.E||0.5; });
          var eVar  = Math.max.apply(null,eVals) - Math.min.apply(null,eVals);
          var sVals = recent3.map(function(e){ return e.S||0.5; });
          var sVar  = Math.max.apply(null,sVals) - Math.min.apply(null,sVals);
          noise += this.NOISE_WEIGHTS.state_volatility * Math.min(1,(eVar+sVar));
        }
      }
    }catch(e){}

    // Patch stress — recent patch failures
    try{
      if(typeof PATCH_TRUST !== 'undefined'){
        var td = PATCH_TRUST.load();
        var totalFails = 0, totalAll = 0;
        Object.keys(td).forEach(function(s){
          totalFails += td[s].failures || 0;
          totalAll   += td[s].total    || 0;
        });
        if(totalAll > 0) noise += this.NOISE_WEIGHTS.patch_stress * Math.min(1, totalFails/totalAll * 2);
      }
    }catch(e){}

    // Graph activation — edge count relative to fragment count
    try{
      if(typeof MEMORY_GRAPH !== 'undefined' && typeof PERM_MEM !== 'undefined'){
        var edges = MEMORY_GRAPH.loadEdges().length;
        var fCount= PERM_MEM.load().length;
        var ratio = fCount > 0 ? edges/fCount : 0;
        noise += this.NOISE_WEIGHTS.graph_activation * Math.min(1, ratio / 5);
      }
    }catch(e){}

    return parseFloat(Math.min(1, noise).toFixed(3));
  },

  // ── SIGNAL: compute signal quality from top fragments ──
  signal: function(matches){
    if(!matches || !matches.length) return 0;
    var top3    = matches.slice(0,3);
    var avgConf = top3.reduce(function(s,m){ return s + ((m.fragment&&m.fragment.confidence)||0.5); },0) / top3.length;
    var avgScore= top3.reduce(function(s,m){ return s + m.score; },0) / top3.length;

    // Baseline drift penalty — high drift = lower signal
    var driftPenalty = 0;
    try{
      if(typeof IDENTITY_BASELINE !== 'undefined' && typeof ATH_STATE !== 'undefined'){
        var uta   = ATH_STATE.getUTA() || {};
        var drift = IDENTITY_BASELINE.checkDrift(uta);
        driftPenalty = drift.score * 0.20;
      }
    }catch(e){}

    return parseFloat(Math.min(1, (avgConf*0.50 + avgScore*0.50) - driftPenalty).toFixed(3));
  },

  // ── FILTER: suppress/amplify a set of matches ──
  filter: function(matches, noiseLevel){
    if(!matches || !matches.length) return matches;
    var self     = this;
    var noise    = (noiseLevel !== undefined) ? noiseLevel : this.measure();
    var filtered = [];
    var effLow   = this._effectiveLowScore();       // v4.1 adaptive
    var effCut   = this._effectiveNoiseCutoff();    // v4.1 adaptive

    matches.forEach(function(m){
      var frag = m.fragment || {};
      var score= m.score;

      // Hard suppressions
      if(frag._dead)                          return;
      if((m._contradiction_penalty||0) > 0.35) return;

      // Soft suppression — adaptive low_score threshold
      if(score < effLow)                      return;

      // High-noise cutoff: only allow strong signals through (adaptive)
      if(noise > effCut && score < 0.35) return;

      // Amplification
      var boost = 0;
      if(frag.id && frag.id.indexOf('seed_')===0)         boost += self.AMPLIFIERS.seed_fragment;
      if((frag.confidence||0.5) > 0.70)                   boost += self.AMPLIFIERS.high_confidence;
      if(frag.domain === 'atharva_self' || frag.domain === 'self_identity') boost += self.AMPLIFIERS.identity_aligned;
      if(m._cluster_boosted)                              boost += self.AMPLIFIERS.cluster_member;

      // Noise dampening — high noise reduces score of non-amplified fragments
      var dampened = score;
      if(boost === 0 && noise > 0.50){
        dampened = parseFloat((score * (1 - (noise - 0.50) * 0.40)).toFixed(3));
      }

      m.score           = parseFloat(Math.min(1.0, Math.max(0, dampened + boost)).toFixed(3));
      m._filter_boost   = parseFloat(boost.toFixed(3));
      m._filter_dampen  = parseFloat((score - dampened).toFixed(3));
      filtered.push(m);
    });

    filtered.sort(function(a,b){ return b.score - a.score; });
    return filtered;
  },

  // ── DAMP: pull extreme UTA state toward center under high noise ──
  damp: function(state, noiseLevel){
    if(!state) return state;
    var noise = (noiseLevel !== undefined) ? noiseLevel : this.measure();
    if(noise < 0.45) return state; // low noise — no dampening needed

    var pullStrength = (noise - 0.45) * 0.40; // 0 → 0.22 as noise goes 0.45→1.0

    var damped = {
      E: parseFloat((state.E * (1-pullStrength) + 0.50 * pullStrength).toFixed(3)),
      D: parseFloat((state.D * (1-pullStrength) + 0.50 * pullStrength).toFixed(3)),
      S: state.S, // S stays — dampening should not lower stability further
      P: state.P || 0.5,
      I: state.I || 0.5
    };

    // Prevent S from being crushed by dampening
    var bl = (typeof IDENTITY_BASELINE!=='undefined') ? IDENTITY_BASELINE.get() : { S_floor:0.25 };
    damped.S = parseFloat(Math.max(state.S, bl.S_floor).toFixed(3));

    return damped;
  },

  // ── REGULATE: full regulation pass — measure, filter, damp, report, LEARN (v4.1) ──
  regulate: function(matches, state){
    var noise    = this.measure();
    var sig      = this.signal(matches || []);
    var coherence= parseFloat(Math.max(0, Math.min(1, sig - noise * 0.5)).toFixed(3));

    var filtered = matches ? this.filter(matches, noise) : (matches || []);
    var dampedState = state ? this.damp(state, noise) : state;

    var report = {
      noise:      noise,
      signal:     sig,
      coherence:  coherence,
      suppressed: (matches ? matches.length : 0) - filtered.length,
      amplified:  filtered.filter(function(m){ return (m._filter_boost||0)>0; }).length,
      dampened:   dampedState && state ? Math.abs((dampedState.E||0)-(state.E||0)) > 0.01 : false,
      status:     coherence > 0.65 ? 'clear' : coherence > 0.40 ? 'regulated' : 'high-noise',
      ts:         Date.now()
    };

    // Store last report
    if(typeof S!=='undefined') S.set(this._STATE_KEY, report);

    // v4.1: learn from this regulate call
    this.learnFromRegulate(report);

    // v4.1: auto-adapt every 5 regulate calls
    var log = this.getLearnLog();
    if(log.length > 0 && log.length % 5 === 0){
      this.adapt();
    }

    return { filtered: filtered, dampedState: dampedState, report: report };
  },

  // ── UPDATE UI filter status bar ──
  updateUI: function(report){
    var pct    = Math.round((report.coherence||0)*100);
    var color  = report.coherence > 0.65 ? 'var(--cyan)' : report.coherence > 0.40 ? 'var(--gold)' : 'var(--red)';
    var barEl  = document.getElementById('filter-coherence-bar');
    var lblEl  = document.getElementById('filter-coherence-label');
    var txtEl  = document.getElementById('filter-status-text');
    if(barEl){ barEl.style.width = pct+'%'; barEl.style.background = color; }
    if(lblEl){ lblEl.textContent = pct+'% '+report.status; lblEl.style.color = color; }
    if(txtEl) txtEl.textContent = 'Noise: '+(report.noise*100).toFixed(0)+'% · Signal: '+(report.signal*100).toFixed(0)+'% · Suppressed: '+report.suppressed+' · Amplified: '+report.amplified;
  },

  // Get last stored report
  lastReport: function(){
    return (typeof S!=='undefined') ? (S.get(this._STATE_KEY, null)||{noise:0,signal:0,coherence:0,status:'init'}) : {noise:0,signal:0,coherence:0,status:'init'};
  },

  init: function(){
    var r = this.lastReport();
    if(r.coherence !== undefined) this.updateUI(r);
  }
};

// ══════════════════════════════════════
// V4.2 — REFLEXIVE_ROUTER
// Three-tier cognitive routing:
//   REFLEXIVE → auto-route, skip deep API (short + stable + familiar)
//   PATTERN   → contextual, memory-matched (default medium complexity)
//   CONSCIOUS → full reasoning (S-crisis, contradiction, novelty, high-I)
// Reduces entropy and API calls for low-risk inputs.
// ══════════════════════════════════════
var REFLEXIVE_ROUTER = {

  // Check if input is reflexively safe
  classify: function(input, state, interp){
    var inp  = (input || '');
    var s    = (state && typeof state.S === 'number') ? state.S : 0.5;
    var isc  = (state && typeof state.I === 'number') ? state.I : 0.5;
    var col  = (state && state._polarityCollision) ? true : false;

    // ── CONSCIOUS escalation conditions ──
    if(s < 0.38){
      return { tier:'CONSCIOUS', reason:'S below safe threshold ('+s.toFixed(2)+')', skip_api:false, color:'#ef4444' };
    }
    if(col){
      return { tier:'CONSCIOUS', reason:'polarity collision in state', skip_api:false, color:'#ef4444' };
    }
    if(isc > 0.78){
      return { tier:'CONSCIOUS', reason:'high intensity signal (I='+isc.toFixed(2)+')', skip_api:false, color:'#ef4444' };
    }
    // Long complex input
    if(inp.length > 200){
      return { tier:'CONSCIOUS', reason:'complex long input ('+inp.length+' chars)', skip_api:false, color:'#ef4444' };
    }

    // ── REFLEXIVE: short + stable + low intensity ──
    if(inp.length < 60 && s > 0.52 && isc < 0.45){
      return { tier:'REFLEXIVE', reason:'short stable familiar (len='+inp.length+')', skip_api:true, color:'#10b981' };
    }

    // ── PATTERN: everything else ──
    return { tier:'PATTERN', reason:'medium complexity — context matching', skip_api:false, color:'#f59e0b' };
  },

  stats: function(){
    return S.get(K.REFLEX_STATS, { reflexive:0, pattern:0, conscious:0 });
  },

  recordTier: function(tier){
    var stats = this.stats();
    var t = (tier || 'pattern').toLowerCase();
    if(typeof stats[t] !== 'undefined') stats[t]++;
    S.set(K.REFLEX_STATS, stats);
  },

  renderStats: function(elId){
    var el = document.getElementById(elId);
    if(!el) return;
    var stats = this.stats();
    var total = (stats.reflexive||0) + (stats.pattern||0) + (stats.conscious||0);
    if(!total){
      el.innerHTML = '<div style="font-size:.65rem;color:var(--muted2)">No routing data yet. Process inputs in ENTITY tab.</div>';
      return;
    }
    function pct(n){ return total ? (n/total*100).toFixed(0)+'%' : '0%'; }
    function bar(n, color){
      var w = total ? Math.round(n/total*100) : 0;
      return '<div style="height:4px;background:var(--border2);border-radius:2px;overflow:hidden;margin:3px 0">'+
        '<div style="height:100%;width:'+w+'%;background:'+color+';border-radius:2px;transition:width .5s"></div></div>';
    }
    var html = '<div style="margin-bottom:6px;font-size:.62rem;color:var(--muted2)">Total routed: <span style="color:var(--text)">'+total+'</span></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">';

    var tiers = [
      { key:'reflexive', label:'REFLEXIVE',  val:stats.reflexive||0,  color:'#10b981', desc:'auto-route · no API' },
      { key:'pattern',   label:'PATTERN',    val:stats.pattern||0,    color:'#f59e0b', desc:'context-matched' },
      { key:'conscious', label:'CONSCIOUS',  val:stats.conscious||0,  color:'#ef4444', desc:'full reasoning' }
    ];
    tiers.forEach(function(t){
      html += '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:8px">';
      html += '<div style="font-size:.55rem;letter-spacing:2px;color:'+t.color+';margin-bottom:3px">'+t.label+'</div>';
      html += '<div style="font-size:.9rem;font-weight:700;color:var(--text)">'+t.val+'</div>';
      html += bar(t.val, t.color);
      html += '<div style="font-size:.55rem;color:var(--muted2)">'+pct(t.val)+'  '+t.desc+'</div>';
      html += '</div>';
    });
    html += '</div>';

    // Warn if conscious > 60%
    var conPct = total ? (stats.conscious||0)/total : 0;
    if(conPct > 0.60){
      html += '<div style="margin-top:8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:5px;padding:7px 10px;font-size:.63rem;color:var(--red)">'+
        '⚠ '+Math.round(conPct*100)+'% of inputs escalating to CONSCIOUS tier. Check stability — possible overload.</div>';
    }
    el.innerHTML = html;
  }
};

// ══════════════════════════════════════
// V4.2 — DECISION_LOG_SYS
// Stores decisions with full causal chain:
//   input_summary, intent, confidence, tier, chosen_action,
//   contradictions, modules_active, outcome, success, correction
// Transforms ATHARVA from reactive → causal reasoning system.
// ══════════════════════════════════════
var DECISION_LOG_SYS = {
  _MAX: 200,

  log: function(entry){
    var log = S.get(K.DECISION_LOG, []);
    entry.id        = 'dec_' + Date.now();
    entry.ts        = Date.now();
    entry.ts_label  = new Date().toLocaleTimeString();
    entry.outcome   = entry.outcome   || 'pending';
    entry.success   = (typeof entry.success !== 'undefined') ? entry.success : null;
    log.unshift(entry);
    S.set(K.DECISION_LOG, log.slice(0, this._MAX));
    return entry.id;
  },

  updateOutcome: function(id, outcome, success){
    var log = S.get(K.DECISION_LOG, []);
    for(var i = 0; i < log.length; i++){
      if(log[i].id === id){
        log[i].outcome    = outcome;
        log[i].success    = success;
        log[i].outcome_ts = Date.now();
        break;
      }
    }
    S.set(K.DECISION_LOG, log);
  },

  load: function(){ return S.get(K.DECISION_LOG, []); },
  clear: function(){ S.set(K.DECISION_LOG, []); },

  stats: function(){
    var log   = this.load();
    var total = log.length;
    var succ  = log.filter(function(d){ return d.success === true; }).length;
    var fail  = log.filter(function(d){ return d.success === false; }).length;
    var pend  = log.filter(function(d){ return d.success === null || d.success === undefined; }).length;
    var contr = log.filter(function(d){ return d.contradictions && d.contradictions > 0; }).length;
    var tierC = log.filter(function(d){ return d.tier === 'CONSCIOUS'; }).length;
    return { total:total, successes:succ, failures:fail, pending:pend, contradictions:contr, conscious_tier:tierC };
  },

  renderLog: function(elId, statsElId){
    var el      = document.getElementById(elId);
    var statsEl = document.getElementById(statsElId);
    var log     = this.load();
    var stats   = this.stats();

    if(statsEl){
      function pill(label, val, color){
        return '<span style="font-size:.6rem;padding:3px 8px;border-radius:10px;border:1px solid '+color+'55;color:'+color+';background:'+color+'11">'+label+': '+val+'</span>';
      }
      statsEl.innerHTML =
        pill('Total', stats.total, 'var(--cyan)') +
        pill('Success', stats.successes, 'var(--green)') +
        pill('Failure', stats.failures, 'var(--red)') +
        pill('Pending', stats.pending, 'var(--gold)') +
        pill('Contradictions', stats.contradictions, 'var(--violet)') +
        pill('Conscious', stats.conscious_tier, '#ef4444');
    }

    if(!el) return;
    if(!log.length){
      el.innerHTML = '<div style="color:var(--muted2);font-size:.65rem;padding:8px 0;font-style:italic">No decisions logged yet. Process inputs in ENTITY tab.</div>';
      return;
    }

    var html = '';
    log.slice(0, 30).forEach(function(d){
      var tCol  = d.tier === 'CONSCIOUS' ? '#ef4444' : d.tier === 'REFLEXIVE' ? '#10b981' : '#f59e0b';
      var sCol  = d.success === true ? 'var(--green)' : d.success === false ? 'var(--red)' : 'var(--gold)';
      var sLbl  = d.success === true ? '✓ OK' : d.success === false ? '✗ FAIL' : '⏳';
      html += '<div style="padding:7px 0;border-bottom:1px solid var(--border)">';
      html += '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:3px">';
      html += '<span style="font-size:.58rem;font-weight:700;color:'+tCol+';border:1px solid '+tCol+'44;padding:2px 5px;border-radius:8px">'+escHtml(d.tier||'?')+'</span>';
      html += '<span style="font-size:.6rem;color:var(--cyan)">'+escHtml(d.intent||'unknown')+'</span>';
      html += '<span style="font-size:.58rem;color:'+sCol+';margin-left:auto">'+sLbl+'</span>';
      html += '<span class="ts">'+escHtml(d.ts_label||'')+'</span>';
      html += '</div>';
      html += '<div style="font-size:.63rem;color:var(--text)">'+(d.input_summary ? escHtml(d.input_summary.slice(0,80)) : '—')+'</div>';
      if(d.chosen_action) html += '<div style="font-size:.6rem;color:var(--muted2);margin-top:2px">→ '+escHtml(d.chosen_action.slice(0,60))+'</div>';
      if(d.contradictions && d.contradictions > 0){
        html += '<div style="font-size:.58rem;color:var(--violet);margin-top:2px">⚡ '+d.contradictions+' contradiction(s) detected</div>';
      }
      html += '</div>';
    });
    el.innerHTML = html;
  },

  init: function(){}
};

// ══════════════════════════════════════
// V4.2 — MEM_TIER
// Active/Dormant/Archive memory tiering.
// Builds on FRAGMENT_AGING (which handles decay) but adds
// activation-based priority tiers:
//   HOT  — ≥5 uses AND last used < 48h → retrieval bonus +0.18
//   WARM — ≥2 uses OR last used < 168h → retrieval bonus +0.07
//   COLD — everything else → no bonus
// This doesn't replace FRAGMENT_AGING — it adds priority layer.
// ══════════════════════════════════════
var MEM_TIER = {

  getTier: function(frag){
    var uses    = frag.times_used || 0;
    var lastTs  = frag.last_used_ts || 0;
    var now     = Date.now();
    var ageHrs  = lastTs > 0 ? (now - lastTs) / 3600000 : 999;

    if(uses >= 5 && ageHrs < 48)   return 'HOT';
    if(uses >= 2 || ageHrs < 168)  return 'WARM';
    return 'COLD';
  },

  bonus: function(tier){
    if(tier === 'HOT')  return 0.18;
    if(tier === 'WARM') return 0.07;
    return 0;
  },

  report: function(){
    if(typeof PERM_MEM === 'undefined') return { hot:[], warm:[], cold:[] };
    var frags  = PERM_MEM.load();
    var self   = this;
    var report = { hot:[], warm:[], cold:[] };
    frags.forEach(function(f){
      var tier = self.getTier(f);
      var key  = tier.toLowerCase();
      report[key].push({
        id:         f.id,
        label:      f._label || f.id,
        confidence: f.confidence || 0,
        uses:       f.times_used || 0,
        domain:     f.domain || '—'
      });
    });
    // Cache for OBSERVER_INSIGHTS
    S.set(K.MEM_TIER_DATA, { hot:report.hot.length, warm:report.warm.length, cold:report.cold.length, ts:Date.now() });
    return report;
  },

  render: function(elId){
    var el = document.getElementById(elId);
    if(!el) return;
    var r    = this.report();
    var html = '';

    function tierBlock(label, items, color, emoji){
      html += '<div style="margin-bottom:12px">';
      html += '<div style="font-size:.58rem;letter-spacing:2px;color:'+color+';font-weight:700;margin-bottom:5px">'+emoji+' '+label+' ('+items.length+')</div>';
      if(!items.length){
        html += '<div style="font-size:.62rem;color:var(--muted2);padding:4px 0;font-style:italic">None</div>';
        html += '</div>'; return;
      }
      items.slice(0, 8).forEach(function(it){
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 8px;background:var(--bg3);border-radius:3px;margin-bottom:2px;border-left:2px solid '+color+'44">';
        html += '<span style="font-size:.62rem;color:var(--text)">'+escHtml((it.label||'').slice(0,28))+'</span>';
        html += '<span style="font-size:.55rem;color:var(--muted2)">'+escHtml(it.domain||'')+'&nbsp;&nbsp;uses:'+it.uses+'&nbsp;&nbsp;conf:'+(it.confidence||0).toFixed(2)+'</span>';
        html += '</div>';
      });
      if(items.length > 8) html += '<div style="font-size:.58rem;color:var(--muted2);padding:3px 0">…+'+( items.length-8)+' more</div>';
      html += '</div>';
    }

    tierBlock('HOT — Active Memory',   r.hot,  '#ef4444', '🔥');
    tierBlock('WARM — Accessible',      r.warm, '#f59e0b', '♨');
    tierBlock('COLD — Dormant',         r.cold, '#06b6d4', '❄');

    var total = r.hot.length + r.warm.length + r.cold.length;
    if(!total){
      el.innerHTML = '<div style="font-size:.65rem;color:var(--muted2);font-style:italic">No fragments yet. Train ATHARVA first.</div>';
      return;
    }
    el.innerHTML = html;
  },

  init: function(){}
};

// ══════════════════════════════════════
// V4.2 — OBSERVER_INSIGHTS
// Pattern analytics — observes, never governs.
// Scans EPISODES + DECISION_LOG + ROUTING STATS for:
//   1. Contradiction loops
//   2. Decision failure streaks
//   3. E-axis drift
//   4. Over-cognition (too many CONSCIOUS routes)
//   5. Memory cold zone (underutilized fragments)
// Results stored in K.OBS_INSIGHTS. Pure read — no state writes.
// ══════════════════════════════════════
var OBSERVER_INSIGHTS = {

  scan: function(){
    var eps       = ATH_STATE.getEpisodes();
    var decisions = DECISION_LOG_SYS.load();
    var insights  = [];

    // ── Pattern 1: Contradiction loop ──
    var recent = eps.slice(0, 20);
    var conflictCount = recent.filter(function(e){ return e.conflict; }).length;
    if(conflictCount >= 4){
      insights.push({
        type:   'CONTRADICTION_LOOP',
        severity: conflictCount >= 7 ? 'HIGH' : 'MED',
        message: conflictCount + '/20 recent episodes in conflict — contradiction loop detected',
        recommendation: 'Introduce stabilization input before next heavy session',
        ts: Date.now()
      });
    }

    // ── Pattern 2: Decision failure streak ──
    var recentD = decisions.slice(0, 15);
    var failStreak = 0;
    for(var i = 0; i < recentD.length; i++){
      if(recentD[i].success === false) failStreak++;
      else break;
    }
    if(failStreak >= 3){
      insights.push({
        type:     'FAILURE_STREAK',
        severity: failStreak >= 5 ? 'HIGH' : 'MED',
        message:  failStreak + ' consecutive decision failures detected in log',
        recommendation: 'Review DECISION_LOG — identify recurring failure pattern',
        ts: Date.now()
      });
    }

    // ── Pattern 3: E-axis sustained drift ──
    if(eps.length >= 5){
      var eVals = eps.slice(0, 10).map(function(e){ return e.E || 0.5; });
      var eAvg  = eVals.reduce(function(a,b){ return a+b; }, 0) / eVals.length;
      var drift = Math.abs(eAvg - 0.5);
      if(drift > 0.22){
        var dir = eAvg > 0.5 ? 'HIGH — positive bias' : 'LOW — negative bias';
        insights.push({
          type:     'EMOTION_DRIFT',
          severity: drift > 0.32 ? 'HIGH' : 'MED',
          message:  'E-axis sustained drift: avg='+eAvg.toFixed(3)+' ('+dir+')',
          recommendation: eAvg > 0.5
            ? 'Introduce neutral/analytical inputs to balance E-axis'
            : 'Introduce motivational/positive inputs to recover E-axis',
          ts: Date.now()
        });
      }
    }

    // ── Pattern 4: Over-cognition (CONSCIOUS overload) ──
    var routeStats = (typeof REFLEXIVE_ROUTER !== 'undefined') ? REFLEXIVE_ROUTER.stats() : {};
    var routeTotal = (routeStats.reflexive||0) + (routeStats.pattern||0) + (routeStats.conscious||0);
    if(routeTotal >= 10){
      var conRatio = (routeStats.conscious||0) / routeTotal;
      if(conRatio > 0.60){
        insights.push({
          type:     'OVER_COGNITION',
          severity: conRatio > 0.80 ? 'HIGH' : 'MED',
          message:  Math.round(conRatio*100)+'% of inputs escalating to CONSCIOUS tier ('+routeTotal+' total routed)',
          recommendation: 'System overanalyzing — check UTA stability, reduce long inputs',
          ts: Date.now()
        });
      }
    }

    // ── Pattern 5: Memory cold zone ──
    var tierCache = S.get(K.MEM_TIER_DATA, null);
    if(tierCache && (tierCache.hot + tierCache.warm + tierCache.cold) > 10){
      var totalF = tierCache.hot + tierCache.warm + tierCache.cold;
      var coldRatio = tierCache.cold / totalF;
      if(coldRatio > 0.75){
        insights.push({
          type:     'MEMORY_COLD_ZONE',
          severity: 'MED',
          message:  Math.round(coldRatio*100)+'% of fragments in COLD tier — memory underutilized',
          recommendation: 'Interact with ENTITY more to activate warm/hot fragment paths',
          ts: Date.now()
        });
      }
    }

    // ── Pattern 6: Identity drift accumulation ──
    if(typeof IDENTITY_BASELINE !== 'undefined'){
      var driftLog = IDENTITY_BASELINE.getDriftLog();
      var highDrift = driftLog.filter(function(d){ return (d.score||0) > 0.3; }).length;
      if(highDrift >= 3){
        insights.push({
          type:     'IDENTITY_DRIFT_ACC',
          severity: highDrift >= 5 ? 'HIGH' : 'MED',
          message:  highDrift+' high-drift events recorded in baseline log',
          recommendation: 'Capture fresh baseline — identity may be shifting from original center',
          ts: Date.now()
        });
      }
    }

    S.set(K.OBS_INSIGHTS, insights.slice(0, 50));
    return insights;
  },

  load: function(){ return S.get(K.OBS_INSIGHTS, []); },

  render: function(elId){
    var el = document.getElementById(elId);
    if(!el) return;
    var insights = this.load();

    if(!insights.length){
      el.innerHTML = '<div style="color:var(--muted2);font-size:.65rem;font-style:italic">No patterns detected. Tap SCAN NOW.</div>';
      return;
    }

    var html = '';
    insights.forEach(function(ins){
      var sCol = ins.severity === 'HIGH' ? 'var(--red)' : ins.severity === 'MED' ? 'var(--gold)' : 'var(--cyan)';
      html += '<div style="border-left:3px solid '+sCol+';padding:8px 10px;margin-bottom:8px;background:var(--bg3);border-radius:0 5px 5px 0">';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
      html += '<span style="font-size:.58rem;font-weight:700;color:'+sCol+';border:1px solid '+sCol+'55;padding:2px 6px;border-radius:8px">'+escHtml(ins.severity)+'</span>';
      html += '<span style="font-size:.6rem;color:var(--muted2);letter-spacing:1px">'+escHtml((ins.type||'').replace(/_/g,' '))+'</span>';
      html += '</div>';
      html += '<div style="font-size:.68rem;color:var(--text);line-height:1.5;margin-bottom:4px">'+escHtml(ins.message)+'</div>';
      html += '<div style="font-size:.62rem;color:var(--cyan)">→ '+escHtml(ins.recommendation)+'</div>';
      html += '</div>';
    });

    el.innerHTML = html;
  },

  init: function(){
    // Passive scan on boot (silent)
    try{ this.scan(); }catch(e){}
  }
};
function renderTrainerStatus(){
  var el=document.getElementById('trainer-status');
  if(!el) return;
  var awr=PERM_MEM.getAwareness();
  var frags=PERM_MEM.load();
  var deadFrags=frags.filter(function(f){ return (f.times_used||0)>3&&(f.success_rate||0.5)<0.3; }).length;
  var contradictions=frags.filter(function(f){ return (f.failure_count||0)>(f.success_count||0)&&(f.times_used||0)>2; }).length;
  var quality=awr.total_fragments?Math.round((awr.avg_confidence*60)+(awr.coverage_score*0.4)):0;

  var html='<div style="margin-bottom:10px">';
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
  html+=pill2('Fragments', awr.total_fragments, 'var(--cyan)');
  html+=pill2('Coverage',  awr.coverage_score+'%', awr.coverage_score>=80?'var(--green)':awr.coverage_score>=40?'var(--gold)':'var(--red)');
  html+=pill2('Quality',   quality+'%', quality>=75?'var(--green)':quality>=50?'var(--gold)':'var(--red)');
  html+=pill2('Avg Conf',  (awr.avg_confidence*100).toFixed(0)+'%', 'var(--violet)');
  if(deadFrags>0) html+=pill2('Dead', deadFrags, 'var(--red)');
  if(contradictions>0) html+=pill2('Conflicts', contradictions, 'var(--gold)');
  html+='</div>';

  // Domain table
  PERM_MEM.DOMAINS.forEach(function(d){
    var ds=awr.domains[d.id];
    var color=ds.status==='complete'?'var(--green)':ds.status==='partial'?'var(--gold)':'var(--red)';
    var icon=ds.status==='complete'?'✓':ds.status==='partial'?'⚠':'✗';
    html+='<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
    html+='<span style="font-size:.65rem;color:'+color+';width:12px">'+icon+'</span>';
    html+='<span style="font-size:.62rem;color:var(--text);flex:1">'+d.label+'</span>';
    html+='<span style="font-size:.6rem;color:var(--muted2)">'+ds.count+' frags</span>';
    html+='<span style="font-size:.6rem;color:'+color+';width:34px;text-align:right">'+(ds.count?((ds.avg_conf*100).toFixed(0)+'%'):'—')+'</span>';
    html+='</div>';
  });

  if(awr.next_target!=='All domains complete'){
    html+='<div style="margin-top:8px;font-size:.6rem;color:var(--gold)">Next target: '+awr.next_target+'</div>';
  }

  html+='</div>';
  el.innerHTML=html;
}

function pill2(label, val, color){
  return '<span style="font-size:.6rem;padding:3px 8px;border-radius:10px;border:1px solid '+color+'55;color:'+color+';background:'+color+'11">'+label+': '+val+'</span>';
}

function trainerShowBoost(){
  var analysis=TRAINER.analyze();
  var out=document.getElementById('trainer-test-output');
  if(!out) return;
  var html='<div style="font-size:.6rem;letter-spacing:1px;color:var(--gold);margin-bottom:6px">📊 BOOST ANALYSIS — WHY NOT 100%</div>';
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
  html+=pill2('Current',analysis.quality+'%',analysis.quality>=80?'var(--green)':'var(--gold)');
  html+=pill2('Gap',analysis.gap+'%','var(--red)');
  html+='</div>';
  if(analysis.gap_reasons.length){
    html+='<div style="font-size:.6rem;color:var(--muted2);margin-bottom:4px">GAP REASONS</div>';
    analysis.gap_reasons.forEach(function(r){
      html+='<div style="font-size:.62rem;color:var(--gold);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)">→ '+r+'</div>';
    });
  }
  if(analysis.issues.length){
    html+='<div style="font-size:.6rem;color:var(--muted2);margin-top:6px;margin-bottom:4px">ISSUES</div>';
    analysis.issues.forEach(function(i){
      html+='<div style="font-size:.62rem;color:var(--red);padding:2px 0">✗ '+i+'</div>';
    });
  }
  if(analysis.next){
    html+='<div style="margin-top:8px;font-size:.65rem;color:var(--cyan)">▶ Next: Train "'+analysis.next+'" to boost quality</div>';
  }
  out.innerHTML=html;
}

function trainerTestInput(){
  var inp=document.getElementById('trainer-test-input');
  if(!inp||!inp.value.trim()) return;
  var result=TRAINER.test(inp.value.trim());
  var out=document.getElementById('trainer-test-output');
  if(!out) return;

  var state=result.state;
  var html='';

  // Input + interp type + state
  html+='<div style="font-size:.6rem;letter-spacing:1px;color:var(--muted2);margin-bottom:4px">INPUT</div>';
  html+='<div style="font-size:.7rem;color:var(--text);margin-bottom:6px;padding:5px 8px;background:var(--bg3);border-radius:4px;display:flex;justify-content:space-between;align-items:center">';
  html+='"'+result.input+'"';
  if(result.interp) html+='<span style="font-size:.58rem;color:var(--cyan)">type: '+result.interp.type+'</span>';
  html+='</div>';

  html+='<div style="font-size:.6rem;letter-spacing:1px;color:var(--muted2);margin-bottom:4px">UTA STATE</div>';
  html+='<div style="display:flex;gap:6px;margin-bottom:8px">';
  html+=pill2('E',state.E.toFixed(2),'var(--cyan)');
  html+=pill2('D',state.D.toFixed(2),'var(--violet)');
  html+=pill2('S',state.S.toFixed(2),state.S<0.4?'var(--red)':'var(--green)');
  html+='</div>';

  // Matches trace
  if(result.matches&&result.matches.length){
    html+='<div style="font-size:.6rem;letter-spacing:1px;color:var(--muted2);margin-bottom:4px">MATCHED FRAGMENTS</div>';
    result.matches.forEach(function(m,i){
      var f=m.fragment;
      var barW=Math.round(m.score*100);
      html+='<div style="padding:6px 8px;background:var(--bg3);border-radius:4px;margin-bottom:5px;border-left:2px solid '+(i===0?'var(--violet)':'var(--border)') +'">';
      html+='<div style="display:flex;justify-content:space-between;margin-bottom:3px">';
      html+='<span style="font-size:.62rem;color:'+(i===0?'var(--violet)':'var(--muted2)')+'">'+f._label+'</span>';
      html+='<span style="font-size:.58rem;color:var(--muted2)">'+f.domain+'</span>';
      html+='</div>';
      html+='<div style="display:flex;gap:6px;font-size:.58rem;color:var(--muted2);margin-bottom:4px">';
      html+='<span>score:'+m.score+'</span><span>kw:'+m.kw.toFixed(2)+'</span><span>state:'+m.state.toFixed(2)+'</span><span>conf:'+f.confidence+'</span>';
      html+='</div>';
      html+='<div style="background:rgba(255,255,255,.05);border-radius:2px;height:3px;overflow:hidden">';
      html+='<div style="width:'+barW+'%;height:100%;background:linear-gradient(90deg,var(--violet),var(--cyan))"></div></div>';
      html+='</div>';
    });
  } else {
    html+='<div style="font-size:.65rem;color:var(--red);margin-bottom:8px">No fragments matched (score > 0.15). Train more or use different words.</div>';
  }

  // Final response
  html+='<div style="font-size:.6rem;letter-spacing:1px;color:var(--muted2);margin-bottom:4px;margin-top:4px">ENTITY RESPONSE</div>';
  if(result.response){
    html+='<div style="padding:10px 12px;background:var(--bg3);border-radius:6px;font-size:.75rem;color:var(--text);border-left:3px solid var(--violet)">'+result.response+'</div>';
  } else {
    html+='<div style="font-size:.65rem;color:var(--muted2);padding:8px;background:var(--bg3);border-radius:4px">No response generated — fragment has no responses stored.</div>';
  }

  out.innerHTML=html;
}

// ── v4.2 COORD UI helpers ──
function coordRenderRouteStats(){
  if(typeof REFLEXIVE_ROUTER !== 'undefined') REFLEXIVE_ROUTER.renderStats('coord-route-stats');
}
function coordRenderDecisionLog(){
  if(typeof DECISION_LOG_SYS !== 'undefined') DECISION_LOG_SYS.renderLog('coord-decision-log','coord-decision-stats');
}

// ── Global error catcher — surface silent crashes ──
window.onerror = function(msg, src, line, col, err){
  var short = (src||'').split('/').pop() + ':' + line;
  console.error('[ATHARVA CRASH] ' + msg + ' @ ' + short);
  try{ UPGRADE._logErr('GLOBAL', err||msg, short); }catch(e){}
  var lbl = document.getElementById('sys-label');
  if(lbl && !lbl.textContent.includes('ERR')){
    lbl.textContent = 'JS ERR:' + line;
    lbl.style.color = 'var(--red)';
  }
  return false; // don't suppress
};


// ── KERNEL UI functions ──
function kernelProbe(){
  var inp = document.getElementById('kernel-probe-input');
  if(!inp || !inp.value.trim()) return;
  var text = inp.value.trim();
  var r    = KERNEL.process(text, { source:'PROBE' });
  var el   = document.getElementById('kernel-probe-result');
  if(!el) return;

  var tierColors = { REFLEXIVE:'var(--green)', PATTERN:'var(--gold)', CONSCIOUS:'var(--red)' };
  var tCol = tierColors[r.tier] || 'var(--cyan)';

  var html = '<div style="background:var(--bg3);border-radius:6px;padding:10px 12px;border:1px solid var(--border2)">';
  // Language
  html += '<div style="margin-bottom:8px">';
  html += '<div style="font-size:.55rem;letter-spacing:2px;color:var(--muted2);margin-bottom:3px">LANGUAGE DETECTED</div>';
  html += '<div style="font-size:.72rem;color:var(--cyan);font-weight:700">'+escHtml(r.language.primary.toUpperCase()+(r.language.hinglish?' + HINGLISH':''))+'</div>';
  html += '</div>';
  // Intent
  html += '<div style="margin-bottom:8px">';
  html += '<div style="font-size:.55rem;letter-spacing:2px;color:var(--muted2);margin-bottom:3px">CLASSIFIED INTENT</div>';
  html += '<div style="font-size:.72rem;color:var(--gold);font-weight:700">'+escHtml(r.intent.type.toUpperCase());
  html += '<span style="font-size:.6rem;color:var(--muted2);font-weight:400;margin-left:6px">'+Math.round((r.intent.confidence||0)*100)+'% conf</span></div>';
  html += '</div>';
  // Cognitive tier
  html += '<div style="margin-bottom:8px">';
  html += '<div style="font-size:.55rem;letter-spacing:2px;color:var(--muted2);margin-bottom:3px">COGNITIVE TIER</div>';
  html += '<div style="font-size:.72rem;font-weight:700;color:'+tCol+'">'+escHtml(r.tier)+'</div>';
  html += '</div>';
  // Routing targets
  html += '<div>';
  html += '<div style="font-size:.55rem;letter-spacing:2px;color:var(--muted2);margin-bottom:4px">FIRE_PACKET ROUTING</div>';
  r.routing.forEach(function(t){
    html += '<div style="font-size:.6rem;color:var(--text);padding:2px 0">→ '+escHtml(t.target)+'<span style="color:var(--muted2);margin-left:4px">'+escHtml(t.action)+'</span></div>';
  });
  html += '</div>';
  html += '</div>';

  el.innerHTML = html;
  KERNEL.renderLog('kernel-route-log');
}

function kernelRenderStats(){
  var el = document.getElementById('kernel-lang-stats');
  if(!el || typeof KERNEL === 'undefined') return;
  var stats = KERNEL.stats();
  if(!stats.total){
    el.innerHTML = '<div style="font-size:.65rem;color:var(--muted2);font-style:italic">No routing events yet. Use ENTITY tab or PROBE above.</div>';
    return;
  }

  var html = '<div style="font-size:.62rem;color:var(--muted2);margin-bottom:8px">'+stats.total+' packets routed</div>';

  function section(title, obj, color){
    var entries = Object.keys(obj);
    if(!entries.length) return '';
    var total = entries.reduce(function(s,k){ return s+obj[k]; }, 0);
    var out = '<div style="margin-bottom:10px">';
    out += '<div style="font-size:.55rem;letter-spacing:2px;color:'+color+';margin-bottom:5px">'+title+'</div>';
    entries.sort(function(a,b){ return obj[b]-obj[a]; }).forEach(function(k){
      var pct = total ? Math.round(obj[k]/total*100) : 0;
      out += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
      out += '<span style="font-size:.6rem;color:var(--text);width:90px">'+escHtml(k)+'</span>';
      out += '<div style="flex:1;height:4px;background:var(--border2);border-radius:2px;overflow:hidden">';
      out += '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:2px"></div></div>';
      out += '<span style="font-size:.58rem;color:var(--muted2);width:28px;text-align:right">'+obj[k]+'</span>';
      out += '</div>';
    });
    return out + '</div>';
  }

  html += section('LANGUAGES', stats.langs,   'var(--cyan)');
  html += section('INTENTS',   stats.intents,  'var(--gold)');
  html += section('TIERS',     stats.tiers,    'var(--violet)');
  el.innerHTML = html;
}
