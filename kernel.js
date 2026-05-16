// ══════════════════════════════════════════════════════════════
// ATHARVA KERNEL v2.0 — Cognitive Language Layer
// Fix #3: Weighted Hinglish detection (word density, not just count)
// Fix #4: S-gate lowered to 0.20 — CONSCIOUS always reachable on distress
// ══════════════════════════════════════════════════════════════

var KERNEL = {

  version: 'v2.0',

  // ── Language Banks ───────────────────────────────────────────
  _LANG: {

    hindi_roman: [
      'kya','hai','nahi','hoon','karo','bhi','aur','mein','tum','mujhe',
      'kyun','kaise','yaar','bhai','chal','raha','phir','theek','bol',
      'mat','ab','log','din','raat','soch','zyada','thoda','samajh',
      'dekh','sun','bas','matlab','acha','haan','yeh','woh','apna',
      'khud','hum','tere','mere','sab','kuch','bahut','bilkul','zaroor',
      'shayad','pakka','scene','kaafi','koi','kab','kahan','kaun','karna',
      'hua','gaya','aaya','bata','dost','jaldi','bura','pareshaan',
      'pata','sahi','galat','waise','subah','dopahar','shaam','kal','aaj',
      'seedha','mushkil','tension','abhi','puri','adha','sunta','bolta'
    ],

    hindi_devanagari: /[\u0900-\u097F]/,

    tamil_roman: [
      'enna','epdi','enga','yaar','sollu','podu','paaru','vaango',
      'nandri','vanakkam','illa','aamam','seri','pochu','saari',
      'eppadi','enge','ethu','yaen','inniku','naan','nee','avan','aval',
      'romba','konjam','intha','antha','pesrom','panrom'
    ],

    telugu_roman: [
      'emi','cheppandi','ela','evaru','anni','ledu','undi','cheyyi',
      'meeru','nenu','mee','naa','ikkada','akkada','eppudu','bagunnaara',
      'chala','konchem','idi','adi','vachanu','poyanu'
    ],

    english: [
      'the','is','are','was','were','have','has','will','would','could',
      'should','can','help','what','why','how','when','where','who',
      'think','feel','know','want','need','like','make','time','please',
      'okay','thanks','yes','no','good','bad','fine','done','trying',
      'about','with','from','this','that','they','their','there','here'
    ],

    technical: [
      'uta','axis','entropy','cognitive','filter','stability','confidence',
      'fragment','episode','threshold','coherence','memory','routing',
      'conscious','reflexive','pattern','conductor','entity','atharva',
      'kernel','governance','identity','baseline','module','deploy',
      'netlify','groq','claude','api','key','token','json','error',
      'crash','boot','debug','test','patch','python','java','javascript',
      'html','css','code','function','class','variable','build'
    ]
  },

  // ── Intent Banks ─────────────────────────────────────────────
  _INTENT: {
    greeting: [
      'hi','hello','hey','hii','hy','sup','yo','namaste','namaskar',
      'good morning','good night','gm','gn','wassup','kya scene',
      'kya haal','kaise ho','bhai kya','yaar','vanakkam','hii bhai',
      'kem cho','sat sri akaal'
    ],
    distress: [
      'help','stuck','confused','problem','issue','error','crash',
      'kya karu','pata nahi','samajh nahi','mushkil','tension','pareshaan',
      'overwhelm','galat','fail','broke','broken','worried','anxious',
      'dar lag','need help','please help','bas ho gaya','thak gaya',
      'kuch nahi ho raha','hopeless'
    ],
    motivation: [
      'start','shuru','begin','focus','procrastin','lazy','nahi ho raha',
      'kaise karu','push','momentum','discipline','consistent','motivation',
      'how to','get going','aage badh','kuch karna'
    ],
    philosophical: [
      'why','meaning','conscious','exist','soul','purpose','kyu',
      'reality','truth','sach','brahman','atma','universe','god',
      'karma','dharma','moksha','enlighten','jeevan ka','sab kuch kyu'
    ],
    technical: [
      'code','bug','error','deploy','api','key','module','function',
      'variable','crash','debug','test','patch','fetch','json',
      'html','javascript','python','java','fix','build','run','syntax',
      'console','install','server','backend','frontend'
    ],
    question: [
      'kya','what','why','how','when','where','who','which',
      'kaise','kyun','kab','kahan','kaun','enna','epdi','explain',
      'bata','samjha','difference','versus','vs','better','worse'
    ],
    identity: [
      'who are you','what are you','kya hai tu','tum kya','atharva kya',
      'kaun hai','are you ai','consciousness','real','alive','tum kaun'
    ],
    memory: [
      'remember','yaad','forget','recall','store','past','history',
      'pehle','pahle','before','earlier','last time','tujhe yaad',
      'episode','fragment','mujhe yaad'
    ]
  },

  // ── Language Detection (FIX #3: word density weighted scoring) ──
  detectLanguage: function(text) {
    if(!text) return { primary:'english', hinglish:false, script:'latin', scores:{} };

    var inp      = text.toLowerCase();
    var words    = inp.split(/\s+/).filter(function(w){ return w.length > 0; });
    var wordCount = words.length || 1;

    // Devanagari → pure Hindi
    if(this._LANG.hindi_devanagari.test(text)) {
      return { primary:'hindi', hinglish:false, script:'devanagari', scores:{} };
    }

    var self   = this;
    var scores = {};

    // FIX #3: score = matched_word_count / TOTAL_WORD_COUNT
    // This weights by text density, not bank size.
    // "Digital Marketing project kya hai" (5 words):
    //   hindi_roman hits: kya, hai = 2/5 = 0.40
    //   english hits: digital(no), marketing(no), project(no) = 0/5 = 0.00
    //   → correctly detects hindi_roman dominant
    function densityScore(bankKey) {
      var bank = self._LANG[bankKey];
      if(!bank || !Array.isArray(bank)) return 0;
      var hits = words.filter(function(w) {
        return bank.indexOf(w) !== -1;
      }).length;
      return hits / wordCount;
    }

    scores.hindi_roman = densityScore('hindi_roman');
    scores.english     = densityScore('english');
    scores.technical   = densityScore('technical');
    scores.tamil       = densityScore('tamil_roman');
    scores.telugu      = densityScore('telugu_roman');

    // Hinglish = meaningful presence of BOTH hindi + english
    var hinglish = scores.hindi_roman >= 0.1 && scores.english >= 0.05;

    // Primary language selection
    var primary = 'english';
    if(scores.technical   >= 0.1)  { primary = 'technical'; }
    else if(scores.tamil  >= 0.1)  { primary = 'tamil';     }
    else if(scores.telugu >= 0.1)  { primary = 'telugu';    }
    else if(scores.hindi_roman > scores.english) {
      primary = hinglish ? 'hinglish' : 'hindi_roman';
    }

    return {
      primary:  primary,
      hinglish: hinglish,
      script:   'latin',
      scores:   {
        hindi_roman: Math.round(scores.hindi_roman * 1000) / 1000,
        english:     Math.round(scores.english     * 1000) / 1000,
        technical:   Math.round(scores.technical   * 1000) / 1000,
        tamil:       Math.round(scores.tamil       * 1000) / 1000,
        telugu:      Math.round(scores.telugu      * 1000) / 1000,
      }
    };
  },

  // ── Intent Classification ─────────────────────────────────────
  classifyIntent: function(text) {
    if(!text) return { type:'neutral', confidence:0.5, signals:[] };

    var inp     = text.toLowerCase();
    var scores  = {};
    var signals = [];
    var self    = this;

    Object.keys(this._INTENT).forEach(function(intent) {
      var words = self._INTENT[intent];
      var hits  = words.filter(function(w) { return inp.indexOf(w) !== -1; });
      if(hits.length) {
        scores[intent] = hits.length;
        hits.forEach(function(h) {
          signals.push({ intent: intent, word: h });
        });
      }
    });

    if(!Object.keys(scores).length) {
      return { type:'neutral', confidence:0.4, signals:[] };
    }

    var dominant   = Object.keys(scores).reduce(function(a,b){ return scores[a]>scores[b]?a:b; });
    var confidence = Math.min(0.95, 0.4 + scores[dominant] * 0.15);

    return { type:dominant, confidence:confidence, signals:signals };
  },

  // ── FIRE_PACKET Creation ──────────────────────────────────────
  createPacket: function(text, opts) {
    opts     = opts || {};
    var lang   = this.detectLanguage(text);
    var intent = this.classifyIntent(text);
    var tier   = opts.tier || this._determineTier(text, intent.type, opts.state);

    return {
      id:               'pkt_' + Date.now() + '_' + Math.floor(Math.random()*999),
      ts:               Date.now(),
      source:           opts.source || 'USER',
      text:             text,
      language:         lang.primary,
      hinglish:         lang.hinglish,
      script:           lang.script,
      lang_scores:      lang.scores,
      intent:           intent.type,
      intent_confidence:intent.confidence,
      intent_signals:   intent.signals || [],
      cognitive_tier:   tier,
      urgency:          opts.urgency || 'normal',
      requested_action: opts.action  || 'process',
      context:          opts.context || {}
    };
  },

  _determineTier: function(text, intent, state) {
    var s = state ? (state.S || 0.5) : 0.5;
    var i = state ? (state.I || 0.5) : 0.5;

    if(intent === 'distress')         return 'CONSCIOUS';
    if(intent === 'greeting')         return 'REFLEXIVE';
    if(s < 0.38 || i > 0.78)         return 'CONSCIOUS';
    if(text.length > 200)             return 'CONSCIOUS';
    if(text.length < 60 && s > 0.52 && i < 0.45) return 'REFLEXIVE';
    return 'PATTERN';
  },

  // ── Routing (FIX #4: S-gate = 0.20, distress always CONSCIOUS) ─
  route: function(packet, state) {
    var targets = [];
    var intent  = packet.intent;
    var tier    = packet.cognitive_tier;
    var lang    = packet.language;

    // FIX #4: Stability gate at 0.20 (was 0.38)
    // Distress bypasses gate entirely — user needs help most when unstable
    var s = state ? (state.S || 1.0) : 1.0;
    if(s < 0.20 && intent !== 'distress') {
      targets = [
        { target:'ENTITY',            action:'stability_warning', priority:1 },
        { target:'IDENTITY_BASELINE', action:'check_drift',       priority:2 }
      ];
      this._log(packet, targets, 'STABILITY_GATE');
      return targets;
    }

    if(tier === 'REFLEXIVE' || intent === 'greeting') {
      targets = [{ target:'ENTITY', action:'reflexive_respond', priority:1 }];
      this._log(packet, targets, 'REFLEXIVE');
      return targets;
    }

    if(tier === 'CONSCIOUS' || intent === 'distress') {
      targets = [
        { target:'ENTITY',            action:'observe',       priority:1 },
        { target:'UTA',               action:'process',       priority:2 },
        { target:'COGNITIVE_FILTER',  action:'regulate',      priority:3 },
        { target:'IDENTITY_BASELINE', action:'validateDrift', priority:4 }
      ];
      this._log(packet, targets, 'CONSCIOUS');
      return targets;
    }

    // PATTERN — default
    targets = [
      { target:'ENTITY', action:'observe', priority:1 },
      { target:'UTA',    action:'process', priority:2 }
    ];

    if(intent === 'memory') {
      targets.push({ target:'PERM_MEM',  action:'retrieve', priority:3 });
      targets.push({ target:'EPISODES',  action:'retrieve', priority:4 });
    } else if(intent === 'technical' || intent === 'philosophical' || intent === 'identity') {
      targets.push({ target:'PERM_MEM',  action:'retrieve', priority:3 });
    } else if(intent === 'motivation') {
      targets.push({ target:'ATHARVA_FEEL', action:'compute', priority:3 });
    }

    if(lang === 'hinglish' || lang === 'hindi_roman' || lang === 'hindi') {
      targets.push({ target:'ATHARVA_FEEL', action:'compute', priority:targets.length+1 });
    }

    this._log(packet, targets, 'PATTERN');
    return targets;
  },

  // ── Full Process ──────────────────────────────────────────────
  process: function(text, opts) {
    opts = opts || {};
    var state  = opts.state || (typeof ATH_STATE !== 'undefined' ? ATH_STATE.getUTA() : null);
    var packet = this.createPacket(text, { source: opts.source || 'USER', state: state });
    var routing = this.route(packet, state);

    return { packet:packet, routing:routing, tier:packet.cognitive_tier };
  },

  // ── Route Log ─────────────────────────────────────────────────
  _routeLog: [],

  _log: function(packet, targets, tierLabel) {
    this._routeLog.unshift({
      ts:       packet.ts,
      id:       packet.id,
      language: packet.language + (packet.hinglish ? '+EN':''),
      intent:   packet.intent,
      tier:     tierLabel,
      targets:  targets.map(function(t){ return t.target; }).join(' → ')
    });
    if(this._routeLog.length > 100) this._routeLog = this._routeLog.slice(0, 100);
  },

  getLog:   function(n) { return this._routeLog.slice(0, n||25); },
  clearLog: function()  { this._routeLog = []; },

  stats: function() {
    var log = this._routeLog;
    var out = { total:log.length, tiers:{}, langs:{}, intents:{} };
    log.forEach(function(r) {
      out.tiers[r.tier]     = (out.tiers[r.tier]     || 0) + 1;
      out.langs[r.language] = (out.langs[r.language] || 0) + 1;
      out.intents[r.intent] = (out.intents[r.intent] || 0) + 1;
    });
    return out;
  },

  renderLog: function(elId) {
    var el = document.getElementById(elId);
    if(!el) return;
    var log   = this._routeLog.slice(0, 25);
    if(!log.length) {
      el.innerHTML = '<div style="font-size:.65rem;color:var(--muted2);font-style:italic">No routing events yet.</div>';
      return;
    }
    var cols  = { REFLEXIVE:'var(--green)', PATTERN:'var(--gold)', CONSCIOUS:'var(--red)', STABILITY_GATE:'var(--violet)' };
    var html  = '';
    log.forEach(function(r) {
      var c = cols[r.tier] || 'var(--cyan)';
      html += '<div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;border-bottom:1px solid var(--border)">';
      html += '<span style="font-size:.55rem;color:'+c+';border:1px solid '+c+'55;padding:1px 5px;border-radius:8px;white-space:nowrap">'+r.tier+'</span>';
      html += '<div style="flex:1"><div style="font-size:.62rem;color:var(--cyan)">'+escHtml(r.intent)+'<span style="color:var(--muted2);margin-left:5px;font-size:.55rem">'+escHtml(r.language)+'</span></div>';
      html += '<div style="font-size:.6rem;color:var(--muted2)">'+escHtml(r.targets)+'</div></div></div>';
    });
    el.innerHTML = html;
  },

  init: function() {
    console.log('[KERNEL v2.0] Language/Intent Router online. S-gate: 0.20');
  }
};
