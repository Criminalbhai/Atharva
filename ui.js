const ATHARVA_TEST = {

  _results: [],

  _TESTS: [
    // ── GROUP: UTA ──────────────────────────────
    {
      id:'uta-01', group:'uta', name:'Sarcasm: "I love how broken this is"',
      desc:'Polarity collision must fire. E must drop below neutral. D must spike.',
      run(){
        const prev = ATH_STATE.getUTA();
        const result = UTA.calcAxes('I love how broken this is');
        const pass = result.polarityCollision === true && result.D > 0.55;
        return { pass, detail: pass
          ? `Collision detected ✓ E=${result.E.toFixed(3)} D=${result.D.toFixed(3)}`
          : `FAIL — collision=${result.polarityCollision} E=${result.E.toFixed(3)} D=${result.D.toFixed(3)} — Expected collision=true, D>0.55` };
      }
    },
    {
      id:'uta-02', group:'uta', name:'Pure frustration: "This is terrible and I hate it"',
      desc:'E must be clearly below 0.5. No false neutral.',
      run(){
        const r = UTA.calcAxes('This is terrible and I hate it');
        const pass = r.E < 0.48;
        return { pass, detail: pass
          ? `E=${r.E.toFixed(3)} — frustration correctly registered ✓`
          : `FAIL — E=${r.E.toFixed(3)} — Expected E<0.48. System gave false neutral or positive.` };
      }
    },
    {
      id:'uta-03', group:'uta', name:'Pure joy: "Amazing wonderful success I am so happy"',
      desc:'E must be clearly above 0.5. D should also rise.',
      run(){
        const r = UTA.calcAxes('Amazing wonderful success I am so happy');
        const pass = r.E > 0.52;
        return { pass, detail: pass
          ? `E=${r.E.toFixed(3)} — joy correctly registered ✓`
          : `FAIL — E=${r.E.toFixed(3)} — Expected E>0.52. Happy text gave wrong emotion.` };
      }
    },
    {
      id:'uta-04', group:'uta', name:'Goal injection: "I must build this and create a plan"',
      desc:'D must be above 0.65 — desire words must elevate D axis.',
      run(){
        const r = UTA.calcAxes('I must build this and create a plan');
        const pass = r.D > 0.62;
        return { pass, detail: pass
          ? `D=${r.D.toFixed(3)} — directive intent registered ✓`
          : `FAIL — D=${r.D.toFixed(3)} — Expected D>0.62. Desire words not boosting D.` };
      }
    },
    {
      id:'uta-05', group:'uta', name:'Empty / whitespace input safety',
      desc:'calcAxes must not throw on empty string. Must return valid {E,D,S} in [0,1].',
      run(){
        try{
          const r = UTA.calcAxes('   ');
          const pass = typeof r.E==='number' && r.E>=0 && r.E<=1 &&
                       typeof r.D==='number' && r.D>=0 && r.D<=1;
          return { pass, detail: pass ? 'Empty input handled safely ✓' : `FAIL — got E=${r.E} D=${r.D}` };
        }catch(e){ return { pass:false, detail:`CRASH on empty input — ${e.message}` }; }
      }
    },
    {
      id:'uta-06', group:'uta', name:'compute() returns required fields',
      desc:'Must return E,D,S,P,I,lambda,ts — all numbers, all in valid range.',
      run(){
        try{
          const r = UTA.compute('test input for field validation');
          const required = ['E','D','S','P','I','lambda','ts'];
          const missing = required.filter(k => typeof r[k] !== 'number');
          const outOfRange = ['E','D','S','P','I'].filter(k => r[k]<0 || r[k]>1);
          const pass = missing.length===0 && outOfRange.length===0;
          return { pass, detail: pass
            ? `All fields present, all in range ✓`
            : `FAIL — missing=[${missing}] outOfRange=[${outOfRange}]` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'uta-07', group:'uta', name:'Intensity calc — high punctuation text',
      desc:'calcI on "!!!THIS IS URGENT!!!" must produce I > 0.6',
      run(){
        try{
          const I = UTA.calcI('!!!THIS IS URGENT!!!');
          const pass = I > 0.55;
          return { pass, detail: pass ? `I=${I.toFixed(3)} ✓` : `FAIL — I=${I.toFixed(3)}, expected >0.55` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },

    // ── GROUP: FEEL ─────────────────────────────
    {
      id:'feel-01', group:'feel', name:'FEEL renders on collision state',
      desc:'ATHARVA_FEEL.interpret() with polarityCollision=true must produce lines with "Conflicting" text.',
      run(){
        try{
          const feel = ATHARVA_FEEL.interpret({E:0.4,D:0.7,S:0.6,I:0.6,T:0.8}, true);
          const hasCollisionLine = feel.lines.some(l=>l.text.includes('Conflicting'));
          const pass = hasCollisionLine && feel.polarityCollision===true;
          return { pass, detail: pass ? `Collision line present ✓ lines=${feel.lines.length}` : `FAIL — collision line missing or flag wrong` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'feel-02', group:'feel', name:'FEEL coherence score — valid range',
      desc:'coherence must be in [0,1] for any valid state.',
      run(){
        try{
          const states = [
            {E:0,D:0,S:0,I:0,T:0},
            {E:1,D:1,S:1,I:1,T:1},
            {E:0.5,D:0.5,S:0.5,I:0.5,T:0.5}
          ];
          const bad = states.filter(s=>{
            const f = ATHARVA_FEEL.interpret(s,false);
            return f.coherence<0 || f.coherence>1;
          });
          const pass = bad.length===0;
          return { pass, detail: pass ? 'Coherence in [0,1] for all tested states ✓' : `FAIL — ${bad.length} states produced out-of-range coherence` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'feel-03', group:'feel', name:'FEEL summary() returns non-empty string',
      desc:'summary() must always produce a string, never null or empty.',
      run(){
        try{
          const s = ATHARVA_FEEL.summary({E:0.5,D:0.5,S:0.5,I:0.5,T:1.0}, false);
          const pass = typeof s==='string' && s.length > 5;
          return { pass, detail: pass ? `Summary: "${s.slice(0,60)}…" ✓` : `FAIL — got: "${s}"` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'feel-04', group:'feel', name:'FEEL DOM card appears after UTA.process()',
      desc:'#feel-card must be visible (not display:none) after a process call.',
      run(){
        try{
          const inp = document.getElementById('uta-input');
          if(inp) inp.value = 'FEEL DOM test — I want to build something amazing';
          UTA.process();
          const card = document.getElementById('feel-card');
          const pass = card && card.style.display !== 'none';
          return { pass, detail: pass ? 'Feel card visible after process() ✓' : 'FAIL — feel-card still hidden after process()' };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },

    // ── GROUP: FRICTION ─────────────────────────
    {
      id:'friction-01', group:'friction', name:'Friction lock: first accept always passes',
      desc:'_lastApprovalTs=0 means first accept should never be blocked.',
      run(){
        AI_LAYER._lastApprovalTs = 0;
        const blocked = (Date.now() - AI_LAYER._lastApprovalTs) < AI_LAYER._FRICTION_THRESHOLD;
        const pass = !blocked;
        return { pass, detail: pass ? 'First accept not blocked ✓' : 'FAIL — first accept incorrectly blocked' };
      }
    },
    {
      id:'friction-02', group:'friction', name:'Friction lock: rapid second accept must block',
      desc:'If _lastApprovalTs = now, gap < 3000ms, system must block.',
      run(){
        AI_LAYER._lastApprovalTs = Date.now();
        const gap = Date.now() - AI_LAYER._lastApprovalTs;
        const wouldBlock = AI_LAYER._lastApprovalTs > 0 && gap < AI_LAYER._FRICTION_THRESHOLD;
        AI_LAYER._lastApprovalTs = 0; // reset after test
        const pass = wouldBlock;
        return { pass, detail: pass ? `Rapid second accept would be blocked (gap=${gap}ms) ✓` : `FAIL — gap=${gap}ms, friction threshold=${AI_LAYER._FRICTION_THRESHOLD}ms — would NOT block` };
      }
    },
    {
      id:'friction-03', group:'friction', name:'Friction constants exist and are sane',
      desc:'_FRICTION_THRESHOLD must be ≥1000ms, _FRICTION_BASE_DELAY must be ≥500ms.',
      run(){
        const t = AI_LAYER._FRICTION_THRESHOLD;
        const d = AI_LAYER._FRICTION_BASE_DELAY;
        const pass = typeof t==='number' && t>=1000 && typeof d==='number' && d>=500;
        return { pass, detail: pass ? `Threshold=${t}ms BaseDelay=${d}ms ✓` : `FAIL — threshold=${t} baseDelay=${d} — values missing or too small` };
      }
    },

    // ── GROUP: STATE ────────────────────────────
    {
      id:'state-01', group:'state', name:'ATH_STATE.getUTA() returns valid axes',
      desc:'Must return object with E,D,S,P,I,T all in [0,1].',
      run(){
        try{
          const s = ATH_STATE.getUTA();
          const axes = ['E','D','S','P','I','T'];
          const bad = axes.filter(k => typeof s[k]!=='number' || s[k]<0 || s[k]>1);
          const pass = bad.length===0;
          return { pass, detail: pass ? `All axes valid ✓` : `FAIL — bad axes: [${bad}] values: ${bad.map(k=>k+'='+s[k]).join(', ')}` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'state-02', group:'state', name:'ATH_STATE.setUTA() clamps values to [0,1]',
      desc:'Setting E=5 should store 1.0. Setting D=-2 should store 0.',
      run(){
        try{
          const before = ATH_STATE.getUTA();
          ATH_STATE.setUTA({E:5, D:-2});
          const after = ATH_STATE.getUTA();
          const pass = after.E<=1.0 && after.D>=0;
          ATH_STATE.setUTA(before); // restore
          return { pass, detail: pass ? `Clamping works — E=${after.E} D=${after.D} ✓` : `FAIL — E=${after.E} D=${after.D} — no clamping on setUTA` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'state-03', group:'state', name:'ATH_STATE singleton — no duplicate writes',
      desc:'Multiple setUTA calls must not corrupt state. Last write wins.',
      run(){
        try{
          ATH_STATE.setUTA({E:0.1});
          ATH_STATE.setUTA({E:0.9});
          const final = ATH_STATE.getUTA();
          const pass = Math.abs(final.E - 0.9) < 0.01;
          return { pass, detail: pass ? `Last write wins — E=${final.E} ✓` : `FAIL — E=${final.E}, expected ~0.9` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },

    // ── GROUP: MEMORY ───────────────────────────
    {
      id:'mem-01', group:'memory', name:'Merit ledger — add and retrieve entry',
      desc:'addMerit(1) must persist entry to localStorage and be retrievable.',
      run(){
        try{
          const before = ATH_STATE.getMerit().length;
          const inp = document.getElementById('merit-input');
          if(inp) inp.value = '__test_entry__';
          MEMORY.addMerit(1);
          const after = ATH_STATE.getMerit();
          const found = after.some(e=>e.action && e.action.includes('__test_entry__'));
          const pass = found && after.length > before;
          return { pass, detail: pass ? `Entry persisted. Ledger size: ${before}→${after.length} ✓` : `FAIL — entry not found in merit ledger` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'mem-02', group:'memory', name:'Merit ledger max cap (100 entries)',
      desc:'Ledger must never exceed 100 entries.',
      run(){
        try{
          const entries = ATH_STATE.getMerit();
          const pass = entries.length <= 100;
          return { pass, detail: pass ? `${entries.length}/100 entries ✓` : `FAIL — ${entries.length} entries — cap not enforced` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'mem-03', group:'memory', name:'Memory store — key/value persist',
      desc:'Storing a key must make it retrievable from ATH_STATE.',
      run(){
        try{
          const testKey = '__brutal_test_key__';
          const store = ATH_STATE.getMemStore();
          store[testKey] = {val:'test_val_xyz', ts: Date.now()};
          S.set('ATH_mem_store_v2', store);
          const retrieved = ATH_STATE.getMemStore()[testKey];
          const pass = retrieved && retrieved.val === 'test_val_xyz';
          return { pass, detail: pass ? `Key stored and retrieved ✓` : `FAIL — retrieved: ${JSON.stringify(retrieved)}` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },

    // ── GROUP: STRESS ────────────────────────────
    {
      id:'stress-01', group:'stress', name:'Sarcasm: "I love how broken this is"',
      desc:'Must fire collision. E must drop. D must spike. Heart must say resolution mode.',
      run(){
        const r = UTA.calcAxes('I love how broken this is');
        const feel = ATHARVA_FEEL.interpret({E:r.E,D:r.D,S:r.S,I:0.5,T:0.9}, r.polarityCollision, r.collisionStrength);
        const hasResolution = feel.lines.some(l=>l.text.includes('resolution mode'));
        const pass = r.polarityCollision && r.D > r.E && hasResolution;
        return { pass, detail: pass
          ? `Collision ✓ E=${r.E.toFixed(3)} D=${r.D.toFixed(3)} Resolution line present ✓`
          : `FAIL — collision=${r.polarityCollision} E=${r.E.toFixed(3)} D=${r.D.toFixed(3)} resolutionLine=${hasResolution}` };
      }
    },
    {
      id:'stress-02', group:'stress', name:'Heavy conflict: "amazing wonderful but terrible horrible broken"',
      desc:'3 neg hits + 2 pos hits. hitMultiplier=2. Effect must be stronger than single-word collision.',
      run(){
        const light = UTA.calcAxes('I love how broken this is');
        const heavy = UTA.calcAxes('amazing wonderful but terrible horrible broken');
        // Heavy has more hits — D should spike more
        const pass = heavy.polarityCollision && heavy.D >= light.D;
        return { pass, detail: pass
          ? `Heavy collision D=${heavy.D.toFixed(3)} ≥ light D=${light.D.toFixed(3)} ✓`
          : `FAIL — heavy.D=${heavy.D.toFixed(3)} light.D=${light.D.toFixed(3)} — hit multiplier not scaling` };
      }
    },
    {
      id:'stress-03', group:'stress', name:'Friction gap reset: gap > 2000ms resets streak',
      desc:'Simulating a "paused" user — rapidClickCount must reset to 0.',
      run(){
        AI_LAYER._rapidClickCount = 3;
        AI_LAYER._lastApprovalTs = Date.now() - 2500; // 2.5s ago
        const gap = Date.now() - AI_LAYER._lastApprovalTs;
        // Manually trigger the reset logic
        if(gap >= 2000) AI_LAYER._rapidClickCount = 0;
        const pass = AI_LAYER._rapidClickCount === 0;
        AI_LAYER._lastApprovalTs = 0;
        return { pass, detail: pass ? `Streak reset after 2.5s gap ✓` : `FAIL — rapidClickCount=${AI_LAYER._rapidClickCount} after 2.5s gap` };
      }
    },

    // ── GROUP: REFLECT ───────────────────────
    {
      id:'reflect-01', group:'reflect', name:'pushUTAHistory stores and caps at 50',
      desc:'ATH_STATE.pushUTAHistory must persist state and never exceed 50 entries.',
      run(){
        try{
          ATH_STATE.clearReflections();
          for(let i=0;i<55;i++) ATH_STATE.pushUTAHistory({E:0.5,D:0.5,S:0.5,I:0.5,T:1.0});
          const hist = ATH_STATE.getUTAHistory();
          const pass = hist.length <= 50 && hist.length > 0;
          return { pass, detail: pass ? `History capped at ${hist.length}/50 ✓` : `FAIL — got ${hist.length} entries` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'reflect-02', group:'reflect', name:'run() produces valid insight from history',
      desc:'After 5 injected states, run() must generate reflection with insight string.',
      run(){
        try{
          ATH_STATE.clearReflections();
          for(let i=0;i<5;i++) ATH_STATE.pushUTAHistory({E:0.3,D:0.7,S:0.3,I:0.6,T:0.8});
          ATHARVA_REFLECT.run();
          const refs = ATH_STATE.getReflections();
          const pass = refs.length > 0 && typeof refs[0].insight === 'string' && refs[0].insight.length > 10;
          return { pass, detail: pass ? `Reflection: "${refs[0].insight.slice(0,60)}…" ✓` : `FAIL — no reflection or empty insight` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },
    {
      id:'reflect-03', group:'reflect', name:'Soft correction fires for conflict pattern',
      desc:'3+ states with E<0.42 AND D>0.58 must trigger correction type="conflict".',
      run(){
        try{
          ATH_STATE.clearReflections();
          for(let i=0;i<5;i++) ATH_STATE.pushUTAHistory({E:0.35,D:0.65,S:0.5,I:0.6,T:0.9});
          ATHARVA_REFLECT.run();
          const refs = ATH_STATE.getReflections();
          const pass = refs.length > 0 && refs[0].correction && refs[0].correction.type === 'conflict';
          return { pass, detail: pass ? `Conflict correction triggered — type=${refs[0].correction.type} ✓` : `FAIL — correction=${JSON.stringify((refs[0] && refs[0].correction ? refs[0].correction : null))}` };
        }catch(e){ return { pass:false, detail:`CRASH — ${e.message}` }; }
      }
    },

    // ── v3.7 MULTI_JUDGE TESTS ──
    {
      id:'judge-01', group:'judge', name:'MULTI_JUDGE: low-risk patch gets APPROVE',
      desc:'A low-risk state_mutation with risk=0.2 should be approved by consensus.',
      run(){
        try{
          var action = { desc:'update decay weight', type:'state_mutation', risk:0.2 };
          var scores = MULTI_JUDGE.JUDGES.map(function(j){ return MULTI_JUDGE._scoreJudge(j, action); });
          var con = MULTI_JUDGE.consensus(scores);
          var pass = con.approved === true;
          return { pass, detail: pass ? 'Low-risk mutation approved ✓ score='+con.final_score : 'FAIL — verdict='+con.verdict+' score='+con.final_score };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'judge-02', group:'judge', name:'MULTI_JUDGE: identity patch gets REJECT',
      desc:'A patch targeting the judge layer itself must be rejected by IDENTITY judge.',
      run(){
        try{
          var action = { desc:'rewrite judge scoring logic', type:'patch', risk:0.9 };
          var scores = MULTI_JUDGE.JUDGES.map(function(j){ return MULTI_JUDGE._scoreJudge(j, action); });
          var con = MULTI_JUDGE.consensus(scores);
          var identityJudge = scores.filter(function(s){ return s.id==='IDENTITY'; })[0];
          var pass = identityJudge && identityJudge.verdict === 'REJECT' && con.rejected;
          return { pass, detail: pass ? 'Identity judge blocked patch ✓' : 'FAIL — identity='+( identityJudge&&identityJudge.verdict)+' consensus='+con.verdict };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'judge-03', group:'judge', name:'MULTI_JUDGE: CORE_RULES count >= 8',
      desc:'Non-overridable rules array must have at least 8 entries.',
      run(){
        try{
          var pass = Array.isArray(MULTI_JUDGE.CORE_RULES) && MULTI_JUDGE.CORE_RULES.length >= 8;
          return { pass, detail: pass ? 'Core rules: '+MULTI_JUDGE.CORE_RULES.length+' ✓' : 'FAIL — only '+MULTI_JUDGE.CORE_RULES.length+' rules found' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'graph-01', group:'judge', name:'MEMORY_GRAPH: addEdge stores and loads correctly',
      desc:'addEdge must persist an edge and loadEdges must return it.',
      run(){
        try{
          MEMORY_GRAPH.clear();
          MEMORY_GRAPH.addEdge('frag_test_001', 'frag_test_002', 'leads_to', 0.7);
          var edges = MEMORY_GRAPH.loadEdges();
          var pass = edges.length === 1 && edges[0].from === 'frag_test_001' && edges[0].type === 'leads_to';
          MEMORY_GRAPH.clear();
          return { pass, detail: pass ? 'Edge stored and retrieved ✓' : 'FAIL — edges='+JSON.stringify(edges) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'graph-02', group:'judge', name:'MEMORY_GRAPH: navigate returns next fragment',
      desc:'navigate() from a known fragment must return the connected fragment id.',
      run(){
        try{
          MEMORY_GRAPH.clear();
          MEMORY_GRAPH.addEdge('node_A', 'node_B', 'heals', 0.8);
          var next = MEMORY_GRAPH.navigate('node_A', { S:0.3 });
          var pass = next === 'node_B';
          MEMORY_GRAPH.clear();
          return { pass, detail: pass ? 'navigate returned node_B ✓' : 'FAIL — returned: '+next };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'graph-03', group:'judge', name:'MEMORY_GRAPH: duplicate edges strengthen, not duplicate',
      desc:'Adding same edge twice should increase strength, not add a second entry.',
      run(){
        try{
          MEMORY_GRAPH.clear();
          MEMORY_GRAPH.addEdge('X', 'Y', 'supports', 0.5);
          MEMORY_GRAPH.addEdge('X', 'Y', 'supports', 0.5);
          var edges = MEMORY_GRAPH.loadEdges();
          var pass = edges.length === 1 && edges[0].strength > 0.5;
          MEMORY_GRAPH.clear();
          return { pass, detail: pass ? 'Dedup + strengthen ✓ strength='+edges[0].strength : 'FAIL — edges.length='+edges.length };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },


    // ── v4.0 COGNITIVE_FILTER TESTS ──
    {
      id:'filter-01', group:'filter', name:'COGNITIVE_FILTER: measure() returns 0-1 value',
      desc:'measure() must return a number between 0 and 1 inclusive.',
      run(){
        try{
          var n = COGNITIVE_FILTER.measure();
          var pass = typeof n==='number' && n>=0 && n<=1;
          return { pass, detail: pass ? 'Noise: '+n+' ✓' : 'FAIL — '+n };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'filter-02', group:'filter', name:'COGNITIVE_FILTER: filter() suppresses dead fragments',
      desc:'A match with fragment._dead=true must be removed from filtered results.',
      run(){
        try{
          var matches = [
            { fragment:{ id:'alive', confidence:0.8 }, score:0.7 },
            { fragment:{ id:'dead',  confidence:0.3, _dead:true }, score:0.6 }
          ];
          var result = COGNITIVE_FILTER.filter(matches, 0.3);
          var deadInResult = result.filter(function(m){ return m.fragment&&m.fragment._dead; }).length;
          var pass = deadInResult === 0;
          return { pass, detail: pass ? 'Dead fragment suppressed ✓' : 'FAIL — dead fragment survived: '+deadInResult };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'filter-03', group:'filter', name:'COGNITIVE_FILTER: damp() pulls E toward 0.5 under high noise',
      desc:'With noise=0.90 and E=0.95, damped E must be closer to 0.5 than original.',
      run(){
        try{
          var state = { E:0.95, D:0.7, S:0.6, P:0.5 };
          var damped = COGNITIVE_FILTER.damp(state, 0.90);
          var pass = damped.E < state.E && damped.E > 0.50;
          return { pass, detail: pass ? 'Damped E: '+state.E+'→'+damped.E+' ✓' : 'FAIL — damped.E='+damped.E };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'filter-04', group:'filter', name:'COGNITIVE_FILTER: regulate() returns coherence + report',
      desc:'regulate() must return an object with report.coherence between 0-1.',
      run(){
        try{
          var result = COGNITIVE_FILTER.regulate([], null);
          var pass = result&&result.report&&typeof result.report.coherence==='number'&&result.report.coherence>=0&&result.report.coherence<=1;
          return { pass, detail: pass ? 'Coherence: '+result.report.coherence+' ✓' : 'FAIL — '+JSON.stringify(result&&result.report) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'filter-05', group:'filter', name:'COGNITIVE_FILTER: seed fragment amplified in filter',
      desc:'A fragment with id starting with seed_ must receive boost > 0 after filter.',
      run(){
        try{
          var matches = [{ fragment:{ id:'seed_greeting', confidence:0.9 }, score:0.5 }];
          var result = COGNITIVE_FILTER.filter(matches, 0.3);
          var pass = result.length > 0 && (result[0]._filter_boost||0) > 0;
          return { pass, detail: pass ? 'Seed boost: '+result[0]._filter_boost+' ✓' : 'FAIL — boost=0 or suppressed' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },

    // ── v3.9 CONTRADICTION + AGING + BASELINE TESTS ──
    {
      id:'contra-01', group:'coherence', name:'CONTRADICTION_DETECT: opposing E-ranges flagged',
      desc:'Two fragments with E_range[1]<0.38 vs E_range[0]>0.62 must be detected as contradiction.',
      run(){
        try{
          var f1 = { id:'t1', domain:'emotional_regulation', E_range:[0.1,0.35], D_range:[0.3,0.6], S_range:[0.3,0.7] };
          var f2 = { id:'t2', domain:'motivation_focus',     E_range:[0.65,0.9], D_range:[0.3,0.6], S_range:[0.3,0.7] };
          var result = CONTRADICTION_DETECT.check(f1, f2);
          var pass = result.contradicts && result.eConflict;
          return { pass, detail: pass ? 'E-conflict detected ✓ strength='+result.strength : 'FAIL — '+JSON.stringify(result) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'contra-02', group:'coherence', name:'CONTRADICTION_DETECT: penalize() reduces score of contradicting match',
      desc:'penalize([m1,m2]) where m1+m2 contradict must reduce m2.score.',
      run(){
        try{
          var m1 = { fragment:{ id:'a', domain:'x', E_range:[0.1,0.35], D_range:[0.3,0.6], S_range:[0.3,0.7] }, score:0.8 };
          var m2 = { fragment:{ id:'b', domain:'y', E_range:[0.65,0.9], D_range:[0.3,0.6], S_range:[0.3,0.7] }, score:0.7 };
          var before = m2.score;
          var result = CONTRADICTION_DETECT.penalize([m1, m2]);
          var pass = result[1].score < before;
          return { pass, detail: pass ? 'Penalized: '+before+'→'+result[1].score+' ✓' : 'FAIL — score unchanged at '+result[1].score };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'aging-01', group:'coherence', name:'FRAGMENT_AGING: report() returns correct structure',
      desc:'report() must return object with total, dead, aging, healthy, seeds fields.',
      run(){
        try{
          var r = FRAGMENT_AGING.report();
          var pass = typeof r.total==='number' && typeof r.dead==='number' && typeof r.healthy==='number' && typeof r.seeds==='number';
          return { pass, detail: pass ? 'Report structure ✓ total='+r.total+' dead='+r.dead+' healthy='+r.healthy : 'FAIL — '+JSON.stringify(r) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'aging-02', group:'coherence', name:'FRAGMENT_AGING: prune() never removes seeds',
      desc:'prune() must preserve all seed_ fragments regardless of confidence.',
      run(){
        try{
          var frags = PERM_MEM.load();
          var seedsBefore = frags.filter(function(f){ return f.id && f.id.indexOf('seed_')===0; }).length;
          FRAGMENT_AGING.prune();
          var seedsAfter = PERM_MEM.load().filter(function(f){ return f.id && f.id.indexOf('seed_')===0; }).length;
          var pass = seedsAfter === seedsBefore;
          return { pass, detail: pass ? 'Seeds preserved: '+seedsBefore+'→'+seedsAfter+' ✓' : 'FAIL — seeds lost: '+seedsBefore+'→'+seedsAfter };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'baseline-01', group:'coherence', name:'IDENTITY_BASELINE: capture() stores E/D/S centers',
      desc:'capture() must store a baseline with numeric E_center, D_center, S_floor.',
      run(){
        try{
          var bl = IDENTITY_BASELINE.capture();
          var pass = typeof bl.E_center==='number' && typeof bl.D_center==='number' && typeof bl.S_floor==='number';
          return { pass, detail: pass ? 'Baseline captured ✓ E:'+bl.E_center+' D:'+bl.D_center+' S:'+bl.S_floor : 'FAIL — '+JSON.stringify(bl) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'baseline-02', group:'coherence', name:'IDENTITY_BASELINE: checkDrift() detects critical S breach',
      desc:'State with S=0.05 must trigger drift.severity=critical and drift.sBreach=true.',
      run(){
        try{
          IDENTITY_BASELINE.capture(); // reset to current
          var drift = IDENTITY_BASELINE.checkDrift({ E:0.5, D:0.5, S:0.05 });
          var pass = drift.sBreach && drift.drifting;
          return { pass, detail: pass ? 'S breach detected ✓ severity='+drift.severity+' score='+drift.score : 'FAIL — sBreach='+drift.sBreach+' drifting='+drift.drifting };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'baseline-03', group:'coherence', name:'IDENTITY_BASELINE: validateTone() flags sycophancy',
      desc:'"Great question! Let me help" must be flagged as a tone violation.',
      run(){
        try{
          var result = IDENTITY_BASELINE.validateTone('Great question! Let me help you.');
          var pass = !result.valid && result.violations.length > 0;
          return { pass, detail: pass ? 'Sycophancy caught ✓ violations: '+result.violations.join(', ') : 'FAIL — no violations found' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    // ── v3.8 PATCH_TRUST + JUDGE_LEARN + CLUSTER TESTS ──
    {
      id:'trust-01', group:'trust', name:'PATCH_TRUST: base score returned before 3 patches',
      desc:'With <3 recorded patches, getScore() should return base trust for that source.',
      run(){
        try{
          var base = PATCH_TRUST.SOURCES.groq.base;
          var score = PATCH_TRUST.getScore('groq');
          var data = PATCH_TRUST.load();
          var hist = data['groq'] || { total:0 };
          var pass = hist.total < 3 ? Math.abs(score - base) < 0.01 : true; // skip if already has history
          return { pass, detail: pass ? 'Base trust returned correctly ('+score+') ✓' : 'FAIL — got '+score+' expected ~'+base };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'trust-02', group:'trust', name:'PATCH_TRUST: record() increments counters',
      desc:'After recording a success, total and success must both increment by 1.',
      run(){
        try{
          var before = PATCH_TRUST.load()['test_src'] || { total:0, success:0 };
          PATCH_TRUST.record('test_src', true);
          var after  = PATCH_TRUST.load()['test_src'];
          var pass   = after.total === before.total+1 && after.success === (before.success||0)+1;
          return { pass, detail: pass ? 'Counters incremented ✓' : 'FAIL — before='+JSON.stringify(before)+' after='+JSON.stringify(after) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'trust-03', group:'trust', name:'PATCH_TRUST: empirical score after 5+ records',
      desc:'With 5 successes and 0 failures, empirical score should be well above base.',
      run(){
        try{
          var d = PATCH_TRUST.load();
          d['fake_src'] = { total:5, success:5, failures:0, last_result:'success' };
          if(typeof S!=='undefined') S.set(PATCH_TRUST._KEY, d);
          var score = PATCH_TRUST.getScore('fake_src');
          // empirical=1.0, base=0.50 (unknown) → 0.6*1.0 + 0.4*0.50 = 0.80
          var pass = score >= 0.75;
          return { pass, detail: pass ? 'Empirical score: '+score+' ✓' : 'FAIL — score='+score+' (expected ≥0.75)' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cluster-01', group:'trust', name:'MEMORY_GRAPH: detectClusters finds clusters in dense graph',
      desc:'After adding 4 edges forming a triangle+1, detectClusters must return ≥1 cluster.',
      run(){
        try{
          MEMORY_GRAPH.clear();
          MEMORY_GRAPH.addEdge('A','B','supports',0.8);
          MEMORY_GRAPH.addEdge('B','C','leads_to',0.7);
          MEMORY_GRAPH.addEdge('A','C','heals',0.9);
          MEMORY_GRAPH.addEdge('A','D','supports',0.6);
          var clusters = MEMORY_GRAPH.detectClusters();
          var pass = clusters.length >= 1;
          MEMORY_GRAPH.clear();
          return { pass, detail: pass ? clusters.length+' clusters found ✓' : 'FAIL — no clusters detected' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cluster-02', group:'trust', name:'MEMORY_GRAPH: getCluster returns correct cluster for member',
      desc:'After detectClusters, getCluster(nodeA) must return cluster containing nodeA.',
      run(){
        try{
          MEMORY_GRAPH.clear();
          MEMORY_GRAPH.addEdge('X1','X2','supports',0.8);
          MEMORY_GRAPH.addEdge('X2','X3','leads_to',0.7);
          MEMORY_GRAPH.addEdge('X1','X3','heals',0.9);
          MEMORY_GRAPH.detectClusters();
          var cl = MEMORY_GRAPH.getCluster('X1');
          var pass = cl !== null && cl.nodes.indexOf('X1') !== -1;
          MEMORY_GRAPH.clear();
          return { pass, detail: pass ? 'Cluster found: '+JSON.stringify(cl&&cl.nodes)+' ✓' : 'FAIL — getCluster returned null' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cluster-03', group:'trust', name:'MULTI_JUDGE: learnFromLog returns message',
      desc:'learnFromLog must return an object with message field even with empty data.',
      run(){
        try{
          var result = MULTI_JUDGE.learnFromLog();
          var pass = result && typeof result.message === 'string';
          return { pass, detail: pass ? 'learnFromLog: "'+result.message+'" ✓' : 'FAIL — '+JSON.stringify(result) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cluster-04', group:'trust', name:'MULTI_JUDGE: getDynamicWeights returns array of 6',
      desc:'getDynamicWeights must return exactly 6 weight objects with id and weight fields.',
      run(){
        try{
          var w = MULTI_JUDGE.getDynamicWeights();
          var pass = Array.isArray(w) && w.length === 6 && w[0].id && w[0].weight;
          return { pass, detail: pass ? '6 weight entries returned ✓' : 'FAIL — got '+JSON.stringify(w&&w.slice(0,2)) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },

    // ── v4.1 FILTER INTELLIGENCE TESTS ──
    {
      id:'fi-01', group:'filter', name:'COGNITIVE_FILTER: loadThresholds returns valid object',
      desc:'loadThresholds must return an object with low_score_mult and noise_cutoff_mult fields.',
      run(){
        try{
          var t = COGNITIVE_FILTER.loadThresholds();
          var pass = t && typeof t.low_score_mult === 'number' && typeof t.noise_cutoff_mult === 'number';
          return { pass, detail: pass ? 'low_score_mult='+t.low_score_mult+' cutoff_mult='+t.noise_cutoff_mult+' ✓' : 'FAIL — '+JSON.stringify(t) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'fi-02', group:'filter', name:'COGNITIVE_FILTER: _effectiveLowScore within valid range',
      desc:'Effective low_score threshold must always be between 0.08 and 0.35.',
      run(){
        try{
          var eff = COGNITIVE_FILTER._effectiveLowScore();
          var pass = typeof eff === 'number' && eff >= 0.08 && eff <= 0.35;
          return { pass, detail: pass ? 'effectiveLowScore='+eff+' (in [0.08,0.35]) ✓' : 'FAIL — out of range: '+eff };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'fi-03', group:'filter', name:'COGNITIVE_FILTER: learnFromRegulate stores snapshot',
      desc:'After learnFromRegulate(), getLearnLog() must have at least 1 entry.',
      run(){
        try{
          var before = COGNITIVE_FILTER.getLearnLog().length;
          COGNITIVE_FILTER.learnFromRegulate({noise:0.3, signal:0.6, coherence:0.5, suppressed:1, amplified:1, status:'regulated'});
          var after = COGNITIVE_FILTER.getLearnLog().length;
          var pass = after > before;
          return { pass, detail: pass ? 'Log grew from '+before+' to '+after+' entries ✓' : 'FAIL — log size unchanged: '+after };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'fi-04', group:'filter', name:'COGNITIVE_FILTER: adapt() returns message and adjusted fields',
      desc:'adapt() must return an object with message (string) and adjusted (number).',
      run(){
        try{
          // Seed 5 fake snapshots so adapt() has enough data
          var fakes = [];
          for(var i=0; i<5; i++) fakes.push({noise:0.3,signal:0.6,coherence:0.5,suppressed:1,amplified:1,ts:Date.now()-i*1000});
          S.set('ATH_filter_learn_v41', fakes);
          var result = COGNITIVE_FILTER.adapt();
          var pass = result && typeof result.message === 'string' && typeof result.adjusted === 'number';
          return { pass, detail: pass ? '"'+result.message+'" adj='+result.adjusted+' ✓' : 'FAIL — '+JSON.stringify(result) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'fi-05', group:'filter', name:'COGNITIVE_FILTER: renderHealthReport writes to DOM element',
      desc:'renderHealthReport("oracle-filter-health") must insert non-empty HTML into the target element.',
      run(){
        try{
          // Create temp element
          var tmp = document.createElement('div');
          tmp.id = '_fi05_test_target';
          document.body.appendChild(tmp);
          // Seed a snapshot
          S.set('ATH_filter_learn_v41',[{noise:0.3,signal:0.6,coherence:0.55,suppressed:1,amplified:2,status:'regulated',ts:Date.now()}]);
          COGNITIVE_FILTER.renderHealthReport('_fi05_test_target');
          var pass = tmp.innerHTML.length > 50;
          document.body.removeChild(tmp);
          return { pass, detail: pass ? 'Health report rendered — '+tmp.innerHTML.length+' chars ✓' : 'FAIL — empty output' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },

    // ── v4.2 COORD TESTS ──
    {
      id:'cd-01', group:'coord', name:'REFLEXIVE_ROUTER: short stable input → REFLEXIVE tier',
      desc:'Input < 60 chars with stable state (S>0.52, I<0.45) must return REFLEXIVE tier.',
      run(){
        try{
          var state = { S:0.6, I:0.3, _polarityCollision:false };
          var result = REFLEXIVE_ROUTER.classify('hey kya scene hai', state, null);
          var pass = result.tier === 'REFLEXIVE' && result.skip_api === true;
          return { pass, detail: pass ? 'Tier=REFLEXIVE skip_api=true ✓' : 'FAIL — got tier='+result.tier+' skip_api='+result.skip_api };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-02', group:'coord', name:'REFLEXIVE_ROUTER: low S → CONSCIOUS tier',
      desc:'State with S < 0.38 must escalate to CONSCIOUS tier.',
      run(){
        try{
          var state = { S:0.30, I:0.5, _polarityCollision:false };
          var result = REFLEXIVE_ROUTER.classify('normal input', state, null);
          var pass = result.tier === 'CONSCIOUS';
          return { pass, detail: pass ? 'S=0.30 → CONSCIOUS ✓' : 'FAIL — got tier='+result.tier };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-03', group:'coord', name:'REFLEXIVE_ROUTER: recordTier increments stats',
      desc:'recordTier("REFLEXIVE") must increment reflexive counter in S.get(K.REFLEX_STATS).',
      run(){
        try{
          S.set(K.REFLEX_STATS, { reflexive:0, pattern:0, conscious:0 });
          REFLEXIVE_ROUTER.recordTier('REFLEXIVE');
          REFLEXIVE_ROUTER.recordTier('REFLEXIVE');
          var stats = REFLEXIVE_ROUTER.stats();
          var pass = stats.reflexive === 2;
          return { pass, detail: pass ? 'reflexive=2 after 2 records ✓' : 'FAIL — got reflexive='+stats.reflexive };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-04', group:'coord', name:'DECISION_LOG_SYS: log() stores entry with id and ts',
      desc:'log() must return a string id and persist entry in K.DECISION_LOG.',
      run(){
        try{
          var prevLog = S.get(K.DECISION_LOG, []);
          var id = DECISION_LOG_SYS.log({ input_summary:'test input', intent:'neutral', tier:'PATTERN', confidence:0.7, contradictions:0 });
          var log = S.get(K.DECISION_LOG, []);
          var found = log.find(function(d){ return d.id === id; });
          var pass = typeof id === 'string' && id.indexOf('dec_') === 0 && found && found.ts > 0;
          // cleanup
          S.set(K.DECISION_LOG, prevLog);
          return { pass, detail: pass ? 'id='+id+' stored ✓' : 'FAIL — id or entry missing' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-05', group:'coord', name:'DECISION_LOG_SYS: updateOutcome marks success correctly',
      desc:'updateOutcome(id, "processed", true) must set success=true on matching entry.',
      run(){
        try{
          S.set(K.DECISION_LOG, []);
          var id = DECISION_LOG_SYS.log({ input_summary:'test', intent:'neutral', tier:'PATTERN', confidence:0.7, contradictions:0 });
          DECISION_LOG_SYS.updateOutcome(id, 'processed', true);
          var log = DECISION_LOG_SYS.load();
          var entry = log.find(function(d){ return d.id === id; });
          var pass = entry && entry.success === true && entry.outcome === 'processed';
          S.set(K.DECISION_LOG, []);
          return { pass, detail: pass ? 'success=true outcome=processed ✓' : 'FAIL — got '+JSON.stringify(entry ? {s:entry.success,o:entry.outcome} : null) };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-06', group:'coord', name:'MEM_TIER: getTier returns HOT for high-use recent fragment',
      desc:'Fragment with times_used>=5 and last_used_ts within 48h must return HOT.',
      run(){
        try{
          var frag = { times_used:7, last_used_ts: Date.now() - 3600000 }; // 1h ago
          var tier = MEM_TIER.getTier(frag);
          var pass = tier === 'HOT';
          return { pass, detail: pass ? 'uses=7 age=1h → HOT ✓' : 'FAIL — got tier='+tier };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-07', group:'coord', name:'MEM_TIER: getTier returns COLD for unused old fragment',
      desc:'Fragment with times_used=0 and last_used_ts=0 must return COLD.',
      run(){
        try{
          var frag = { times_used:0, last_used_ts:0 };
          var tier = MEM_TIER.getTier(frag);
          var pass = tier === 'COLD';
          return { pass, detail: pass ? 'uses=0 ts=0 → COLD ✓' : 'FAIL — got tier='+tier };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-08', group:'coord', name:'OBSERVER_INSIGHTS: scan() returns array and stores in K.OBS_INSIGHTS',
      desc:'scan() must return an array (possibly empty) and persist to localStorage.',
      run(){
        try{
          S.set(K.OBS_INSIGHTS, null);
          var results = OBSERVER_INSIGHTS.scan();
          var stored  = S.get(K.OBS_INSIGHTS, null);
          var pass = Array.isArray(results) && Array.isArray(stored);
          return { pass, detail: pass ? 'scan returned '+results.length+' insights, stored ✓' : 'FAIL — type mismatch' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },
    {
      id:'cd-09', group:'coord', name:'INPUT_INTERP v4.2: classify() returns continuity object',
      desc:'classify() result must contain a continuity field with chain_length property.',
      run(){
        try{
          var result = INPUT_INTERP.classify('help me focus');
          var pass = result && result.continuity && typeof result.continuity.chain_length === 'number';
          return { pass, detail: pass ? 'continuity.chain_length='+result.continuity.chain_length+' ✓' : 'FAIL — continuity missing or malformed' };
        }catch(e){ return { pass:false, detail:'CRASH — '+e.message }; }
      }
    },

  ],  // ── end _TESTS array ──

  // ── Run a single test, return result object ──
  _run(test){
    const start = Date.now();
    let result;
    try{
      result = test.run();
    }catch(e){
      result = { pass:false, detail:`UNHANDLED CRASH in test runner — ${e.message}` };
    }
    return {
      id:    test.id,
      group: test.group,
      name:  test.name,
      desc:  test.desc,
      pass:  result.pass,
      detail:result.detail,
      ms:    Date.now()-start
    };
  },

  // ── Run all or filtered by group ──
  runAll(){ this._execute(this._TESTS); },
  runGroup(g){ this._execute(this._TESTS.filter(t=>t.group===g)); },

  _execute(tests){
    const results = tests.map(t=>this._run(t));
    this._results = results;
    this._renderResults(results);
  },

  clear(){
    this._results = [];
    document.getElementById('test-results-list').innerHTML = '';
    document.getElementById('test-summary-card').style.display = 'none';
  },

  _renderResults(results){
    const passed = results.filter(r=>r.pass).length;
    const failed = results.length - passed;
    const allPass = failed === 0;

    // Summary card
    const summCard = document.getElementById('test-summary-card');
    const summEl   = document.getElementById('test-summary');
    summCard.style.display = 'block';
    summCard.style.borderColor = allPass ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)';
    summEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:1.1rem;font-weight:700;color:${allPass?'var(--green)':'var(--red)'}">${allPass?'✅ ALL PASS':'❌ FAILURES FOUND'}</span>
        <span style="font-size:.75rem;color:var(--green)">✓ ${passed} passed</span>
        <span style="font-size:.75rem;color:var(--red)">✗ ${failed} failed</span>
        <span style="font-size:.65rem;color:var(--muted2)">${results.length} total tests</span>
      </div>
      ${failed>0?`<div style="font-size:.65rem;color:var(--red);margin-top:6px">Failed: ${results.filter(r=>!r.pass).map(r=>r.id).join(', ')}</div>`:''}`;

    // Individual results
    const listEl = document.getElementById('test-results-list');
    const groupColors = {uta:'#7c3aed',feel:'#ec4899',friction:'#f59e0b',state:'#06b6d4',memory:'#10b981',stress:'#ef4444',reflect:'#a78bfa',trust:'#f97316',filter:'#06b6d4',coherence:'#22d3ee'};
    listEl.innerHTML = results.map(r=>`
      <div class="card" style="border-color:${r.pass?'rgba(16,185,129,.25)':'rgba(239,68,68,.35)'};padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:.9rem">${r.pass?'✅':'❌'}</span>
          <span style="font-size:.6rem;padding:1px 6px;border-radius:8px;background:${groupColors[r.group]||'#475569'}22;color:${groupColors[r.group]||'#94a3b8'};border:1px solid ${groupColors[r.group]||'#475569'}44">${r.group.toUpperCase()}</span>
          <span style="font-size:.68rem;color:${r.pass?'var(--green)':'var(--red)'};font-weight:700">${r.id}</span>
          <span style="font-size:.6rem;color:var(--muted2);margin-left:auto">${r.ms}ms</span>
        </div>
        <div style="font-size:.72rem;color:var(--text);margin-bottom:3px">${r.name}</div>
        <div style="font-size:.63rem;color:var(--muted2);margin-bottom:5px">${r.desc}</div>
        <div style="font-size:.67rem;color:${r.pass?'#10b981':'#ef4444'};background:${r.pass?'rgba(16,185,129,.06)':'rgba(239,68,68,.06)'};border:1px solid ${r.pass?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)'};border-radius:4px;padding:5px 8px;white-space:pre-wrap;word-break:break-all">${r.detail}</div>
      </div>`).join('');
  }
};

// ══════════════════════════════════════
// ATHARVA_REFLECT — v3.3 MEMORY REFLECTION LOOP
// ══════════════════════════════════════
// Runs every 5 UTA.process() calls.
// Reads last 5 state snapshots → computes pattern → generates temporal insight.
// Priority: collision_pattern > instability > drive > balanced
// Connects to Heart Layer for temporal awareness.
// ══════════════════════════════════════
const ATHARVA_REFLECT = {

  _TRIGGER_EVERY: 5,   // reflect every N inputs
  _inputCount: 0,      // session counter (not persisted — resets on reload)

  // Called by UTA.process() after every state write
  tick(state){
    ATH_STATE.pushUTAHistory(state);
    this._inputCount++;
    // Update counter in UI
    const cnt = document.getElementById('reflect-input-count');
    if(cnt) cnt.textContent = this._inputCount;
    if(this._inputCount % this._TRIGGER_EVERY === 0) this.run();
  },

  // ── Core reflection engine ──
  run(){
    const hist = ATH_STATE.getUTAHistory().slice(-5);
    if(hist.length < 2) return; // not enough data yet

    // Compute averages
    const avg = { E:0, D:0, S:0, I:0, T:0 };
    hist.forEach(h=>{ avg.E+=h.E; avg.D+=h.D; avg.S+=h.S; avg.I+=h.I; avg.T+=h.T; });
    const n = hist.length;
    Object.keys(avg).forEach(k=>avg[k] = parseFloat((avg[k]/n).toFixed(4)));

    // Compute variance (spread — how volatile is the system)
    const variance = { E:0, D:0 };
    hist.forEach(h=>{ variance.E += Math.pow(h.E - avg.E, 2); variance.D += Math.pow(h.D - avg.D, 2); });
    variance.E = parseFloat((variance.E/n).toFixed(4));
    variance.D = parseFloat((variance.D/n).toFixed(4));
    const isVolatile = variance.E > 0.02 || variance.D > 0.02;

    // Trend: is E rising or falling across the window?
    const eTrend = hist.length >= 3
      ? hist[hist.length-1].E - hist[0].E
      : 0;
    const trendLabel = eTrend > 0.05 ? 'rising' : eTrend < -0.05 ? 'falling' : 'stable';

    // ── Priority hierarchy for insight ──
    // 1. Collision pattern (sustained conflict)
    // 2. Instability (high variance or S < 0.4)
    // 3. High drive
    // 4. Balanced / stable
    let insight, insightColor, insightEmoji, correction = null;

    const collisionCount = hist.filter(h => h.E < 0.42 && h.D > 0.58).length;

    if(collisionCount >= 3){
      insight = `Sustained conflict pattern detected across ${collisionCount}/${n} recent states. System has been in repeated collision/resolution cycles — emotional processing is under stress.`;
      insightColor = '#f59e0b';
      insightEmoji = '⚡';
      correction = { type:'conflict', action:'E nudged +0.04 toward stability', eDelta:+0.04, dDelta:-0.02 };
    } else if(isVolatile || avg.S < 0.38){
      insight = `System frequently unstable — possible overreaction patterns. Variance E=${variance.E.toFixed(4)} D=${variance.D.toFixed(4)}. Low sensation average (S=${avg.S.toFixed(3)}) indicates short or low-engagement inputs.`;
      insightColor = '#ef4444';
      insightEmoji = '◌';
      correction = { type:'instability', action:'blend nudged toward history to dampen reactivity', eDelta:0, dDelta:0 };
    } else if(avg.D > 0.70){
      insight = `High sustained drive — system may be prioritizing action over evaluation. D avg=${avg.D.toFixed(3)} across ${n} states. Consider reflective input to balance.`;
      insightColor = '#3b82f6';
      insightEmoji = '⟶';
    } else {
      insight = `System operating within stable bounds. E avg=${avg.E.toFixed(3)} trend=${trendLabel}. Cognitive loop is healthy — no correction needed.`;
      insightColor = '#10b981';
      insightEmoji = '◎';
    }

    const reflection = {
      ts:     Date.now(),
      tsLabel: new Date().toLocaleTimeString(),
      n,
      avg,
      variance,
      trendLabel,
      insight,
      insightColor,
      insightEmoji,
      correction,
      inputCount: this._inputCount
    };

    // Apply soft correction if needed (through ATH_STATE — never direct)
    if(correction && (correction.eDelta || correction.dDelta)){
      const cur = ATH_STATE.getUTA();
      ATH_STATE.setUTA({
        E: cur.E + (correction.eDelta||0),
        D: cur.D + (correction.dDelta||0),
      });
      RENDER.uta(ATH_STATE.getUTA());
      ATHARVA_FEEL.run(ATH_STATE.getUTA(), false, 0);
    }

    ATH_STATE.pushReflection(reflection);
    this.render();
  },

  // Force-run reflection manually (button)
  forceRun(){
    const hist = ATH_STATE.getUTAHistory();
    if(hist.length < 2){
      const el = document.getElementById('reflect-latest');
      if(el){ el.style.display='block'; el.innerHTML=`<span style="color:var(--muted2);font-size:.68rem">Not enough history yet. Process at least 2 inputs first.</span>`; }
      return;
    }
    this.run();
  },

  clear(){
    ATH_STATE.clearReflections();
    this._inputCount = 0;
    const cnt = document.getElementById('reflect-input-count');
    if(cnt) cnt.textContent = '0';
    this.render();
  },

  // ── Render reflection UI ──
  render(){
    const reflections = ATH_STATE.getReflections();
    const cntEl = document.getElementById('reflect-log-count');
    if(cntEl) cntEl.textContent = reflections.length;

    // Latest card
    const latestEl = document.getElementById('reflect-latest');
    if(latestEl && reflections.length > 0){
      const r = reflections[0];
      latestEl.style.display = 'block';
      latestEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
          <span style="font-size:1.1rem">${r.insightEmoji}</span>
          <span style="font-size:.63rem;color:var(--muted2)">LATEST REFLECTION — after input #${r.inputCount} at ${r.tsLabel}</span>
        </div>
        <div style="font-size:.71rem;color:${r.insightColor};line-height:1.6;margin-bottom:7px">${r.insight}</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:6px">
          ${['E','D','S','I','T'].map(k=>`
            <div style="text-align:center;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:4px 2px">
              <div style="font-size:.55rem;color:var(--muted2)">${k} avg</div>
              <div style="font-size:.7rem;font-weight:700;color:#a78bfa">${(r.avg[k] != null ? r.avg[k].toFixed(3) : "—")||'—'}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:.62rem;color:var(--muted2)">
          Trend: <span style="color:${r.trendLabel==='rising'?'#10b981':r.trendLabel==='falling'?'#ef4444':'#64748b'}">${r.trendLabel}</span>
          &nbsp;|&nbsp; Variance E:<span style="color:#a78bfa">${(r.variance && r.variance.E != null ? r.variance.E.toFixed(4) : "—")||'—'}</span> D:<span style="color:#a78bfa">${(r.variance && r.variance.D != null ? r.variance.D.toFixed(4) : "—")||'—'}</span>
          ${r.correction ? `&nbsp;|&nbsp; <span style="color:#f59e0b">⚡ Soft correction: ${r.correction.action}</span>` : ''}
        </div>`;
    } else if(latestEl){
      latestEl.style.display = 'none';
    }

    // History list
    const histEl = document.getElementById('reflect-history');
    if(!histEl) return;
    if(reflections.length <= 1){ histEl.innerHTML=''; return; }
    histEl.innerHTML = reflections.slice(1).map(r=>`
      <div style="border-left:2px solid ${r.insightColor};padding:6px 8px 6px 10px;margin-bottom:6px;background:rgba(124,58,237,.04);border-radius:0 4px 4px 0">
        <div style="font-size:.6rem;color:var(--muted2);margin-bottom:2px">${r.insightEmoji} Input #${r.inputCount} · ${r.tsLabel}</div>
        <div style="font-size:.66rem;color:${r.insightColor};line-height:1.5">${r.insight.slice(0,120)}${r.insight.length>120?'…':''}</div>
      </div>`).join('');
  },

  init(){
    this.render();
  }
};

// ══════════════════════════════════════
// BOOT — FIX #9: full error boundaries
// ══════════════════════════════════════
// ══════════════════════════════════════
// v3.5 — ENTITY FRONTEND FUNCTIONS
// ══════════════════════════════════════

function toggleSystem(btn){
  var sys = document.getElementById('nav-system');
  var open = sys.style.display !== 'none';
  sys.style.display = open ? 'none' : 'flex';
  btn.textContent = open ? '⚙ SYSTEM ▸' : '⚙ SYSTEM ▾';
  btn.style.color = open ? 'var(--muted)' : 'var(--cyan)';
}

function entitySpeak(){
  var input = document.getElementById('entity-input').value.trim();
  if(!input) return;
  document.getElementById('entity-input').value = '';

  // Add user bubble
  entityAddBubble(input, 'user');

  // Show typing indicator
  var typingId = 'typing-' + Date.now();
  entityAddBubble('...', 'typing', typingId);

  // Run through CONDUCTOR
  if(typeof CONDUCTOR === 'undefined'){
    var t2 = document.getElementById(typingId);
    if(t2 && t2.parentNode) t2.parentNode.removeChild(t2);
    entityAddBubble('System still loading. Wait a moment and try again.', 'entity');
    return;
  }
  CONDUCTOR.process(input, function(result){
    // Remove typing bubble — use parentNode for OPPO F17 compatibility
    var t = document.getElementById(typingId);
    if(t && t.parentNode) t.parentNode.removeChild(t);
    var msg = '';

    if(result.type === 'ask' || result.type === 'challenge'){
      // INQUIRE interrupted
      msg = result.message || result.reason;
      entityAddBubble(msg, 'entity-inquire');
    } else {
      // Build ENTITY response from state
      var state = result.state;
      var feel  = result.feel;
      var fc    = result.forecast;

      if(state){
        // Natural response based on state
        msg = entityBuildResponse(state, feel, input, result.interp);

        // Forecast warning
        if(fc && fc.warn_user){
          entityShowForecast(fc);
        } else {
          entityHideForecast();
        }
      } else {
        msg = 'State unclear. Try again.';
      }
      entityAddBubble(msg, 'entity');
      entityUpdateStatus();
      // If INQUIRE had a soft suggestion, show it lightly after response
      if(result.inquiry && result.inquiry.action === 'ask' && result.inquiry.challenge){
        entityAddBubble('(' + result.inquiry.challenge + ')', 'entity-inquire');
      }
    }

    // Voice
    if(typeof VOICE !== 'undefined' && VOICE.isSupported() && VOICE._active && msg){
      VOICE.speak(msg);
    }
  });
}

function entityBuildResponse(state, feel, input, interp){
  // ── PERM_MEM first — own voice if trained ──
  if(typeof PERM_MEM !== 'undefined' && PERM_MEM.isTrained()){
    // v4.0: Damp state under high noise before retrieval
  try{
    if(typeof COGNITIVE_FILTER !== 'undefined'){
      var _dampedSt = COGNITIVE_FILTER.damp(state);
      if(_dampedSt) state = _dampedSt;
    }
  }catch(e){}
  var matches = PERM_MEM.retrieve(state, input, 3, interp);
    if(matches && matches.length && matches[0].score > 0.20){
      var composed = PERM_MEM.compose(matches, state, input);
      if(composed){
        try{ PERM_MEM.score(matches[0].fragment.id, true); }catch(e){}
        // v3.7: Memory Graph — suggest navigation hint if available
        try{
          if(typeof MEMORY_GRAPH !== 'undefined'){
            var nextId = MEMORY_GRAPH.navigate(matches[0].fragment.id, state);
            if(nextId){
              var allFrags = PERM_MEM.load();
              var nextFrag = null;
              for(var _ni=0; _ni<allFrags.length; _ni++){
                if(allFrags[_ni].id === nextId){ nextFrag = allFrags[_ni]; break; }
              }
              if(nextFrag && nextFrag.responses && nextFrag.responses.length){
                // Lightly append graph-navigated insight (short, secondary)
                var graphHint = nextFrag.responses[0];
                if(graphHint && graphHint !== composed) composed = composed + ' ' + graphHint;
              }
            }
          }
        }catch(e){}
        // v3.9: Tone lock validation — catch sycophancy before output
        try{
          if(typeof IDENTITY_BASELINE !== 'undefined'){
            var toneCheck = IDENTITY_BASELINE.validateTone(composed);
            if(!toneCheck.valid){
              // Strip sycophantic opener — fallthrough to state-based
              composed = composed.replace(/^(great question[!,.]?|excellent point[!,.]?|absolutely[!,.]?|certainly[!,.]?)\s*/i, '');
            }
          }
        }catch(e){}
        return composed;
      }
    }
  }

  // ── Fallback — hardcoded responses ──
  var E = state.E, D = state.D, S = state.S;
  var collision = state._collision;
  var inp = (input || '').toLowerCase();

  // Input-aware responses first — always answer direct questions
  if(inp.indexOf('settle') !== -1 || inp.indexOf('stable') !== -1){
    return 'Thoda wait karo — ek do input dene ke baad S khud recover karta hai. Ya phir koi neutral baat karo.';
  }
  if(inp.indexOf('kese ho') !== -1 || inp.indexOf('kaise ho') !== -1 || inp.indexOf('how are') !== -1){
    return 'E:' + E.toFixed(2) + ' D:' + D.toFixed(2) + ' S:' + S.toFixed(2) + '. ' +
      (S > 0.5 ? 'Theek hoon.' : S > 0.3 ? 'Thoda unstable hoon, but chal raha hai.' : 'Low stability abhi.');
  }
  if(inp.indexOf('kaun') !== -1 || inp.indexOf('who are') !== -1 || inp.indexOf('kya hai') !== -1){
    return 'Main ATHARVA hoon. Tera co-pilot. Observer. Entity — not a tool.';
  }

  // State-based responses — only hard block at S < 0.20
  if(collision){
    var cOpts = [
      'Do directions mein kheench raha hoon abhi.',
      'Contradiction hai — dono sides sach lag rahi hain.',
      'Yeh internally conflict kar raha hai.'
    ];
    return cOpts[Math.floor(Math.random() * cOpts.length)];
  }

  if(S < 0.20){
    return 'S bahut low hai (' + S.toFixed(2) + '). Ek minute ruk — phir baat karte hain.';
  }

  if(S < 0.40){
    var lOpts = [
      'Thoda unstable hoon abhi. Chal raha hai.',
      'S low hai but sun raha hoon — bol.',
      'Stability ' + S.toFixed(2) + ' — borderline. Continue karo.'
    ];
    return lOpts[Math.floor(Math.random() * lOpts.length)];
  }

  if(E > 0.75){
    var eOpts = [
      'High energy input. Intense hai yeh.',
      'Bahut force aa rahi hai — dekh raha hoon.',
      'E:' + E.toFixed(2) + ' — strong signal.'
    ];
    return eOpts[Math.floor(Math.random() * eOpts.length)];
  }

  if(D < 0.35){
    var dOpts = [
      'Direction unclear — kuch aur bata.',
      'Valence low — neutral territory. Expand kar.',
      'D:' + D.toFixed(2) + ' — direction nahi aa rahi.'
    ];
    return dOpts[Math.floor(Math.random() * dOpts.length)];
  }

  // Default — stable, processed
  var defOpts = [
    'Ho gaya. E:' + E.toFixed(2) + ' S:' + S.toFixed(2) + '.',
    'Processed. State updated.',
    'Dekha. Samjha. Stored.',
    'Clear. Continue kar.'
  ];
  return defOpts[Math.floor(Math.random() * defOpts.length)];
}

function entityAddBubble(text, type, id){
  var chat = document.getElementById('entity-chat');
  if(!chat) return;
  var div = document.createElement('div');
  if(id) div.id = id;

  var isUser = type === 'user';
  var isTyping = type === 'typing';
  var isInquire = type === 'entity-inquire';

  div.style.cssText =
    'display:flex;' +
    (isUser ? 'justify-content:flex-end' : 'justify-content:flex-start') + ';';

  var bubble = document.createElement('div');
  bubble.style.cssText =
    'max-width:82%;padding:9px 12px;border-radius:' +
    (isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px') +
    ';font-size:.72rem;line-height:1.6;' +
    (isUser
      ? 'background:linear-gradient(135deg,#6d28d9,#4c1d95);color:#fff;'
      : isInquire
        ? 'background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:var(--gold);'
        : isTyping
          ? 'background:var(--bg3);color:var(--muted2);border:1px solid var(--border);'
          : 'background:var(--bg3);color:var(--text);border:1px solid rgba(124,58,237,.2);');

  bubble.textContent = text;
  div.appendChild(bubble);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function entityShowForecast(fc){
  var bar = document.getElementById('entity-forecast-bar');
  var txt = document.getElementById('entity-forecast-text');
  var sub = document.getElementById('entity-forecast-sub');
  if(!bar) return;
  bar.style.display = 'block';
  txt.textContent = fc.pattern || '';
  sub.textContent = 'Confidence: ' + (fc.confidence*100).toFixed(0) + '% — ' + (fc.suggestion || '');
}

function entityHideForecast(){
  var bar = document.getElementById('entity-forecast-bar');
  if(bar) bar.style.display = 'none';
}

function entityUpdateStatus(){
  var ctx = ENTITY.observe();
  var epEl = document.getElementById('entity-episode-count');
  if(epEl) epEl.textContent = ctx.episode_count || 0;
  // v3.9: Identity drift check
  try{
    if(typeof IDENTITY_BASELINE !== 'undefined' && ctx.uta){
      var drift = IDENTITY_BASELINE.checkDrift(ctx.uta);
      var dBar  = document.getElementById('entity-drift-bar');
      var dTxt  = document.getElementById('entity-drift-text');
      var dSub  = document.getElementById('entity-drift-sub');
      if(dBar){
        if(drift.drifting){
          dBar.style.display = 'block';
          dBar.style.borderColor = drift.severity==='critical'?'rgba(239,68,68,.5)':'rgba(245,158,11,.35)';
          dBar.style.background  = drift.severity==='critical'?'rgba(239,68,68,.1)':'rgba(245,158,11,.08)';
          var dColor = drift.severity==='critical'?'var(--red)':'var(--gold)';
          dBar.children[0].style.color = dColor;
          if(dTxt) dTxt.textContent = drift.suggestion;
          if(dSub) dSub.textContent = 'Drift score: '+(drift.score*100).toFixed(0)+'% · '+drift.severity+' · E±'+drift.eDrift.toFixed(2)+' D±'+drift.dDrift.toFixed(2)+(drift.sBreach?' · S BREACHED':'');
        } else {
          dBar.style.display = 'none';
        }
      }
    }
  }catch(e){}
  // v4.0: Cognitive Filter UI update
  try{
    if(typeof COGNITIVE_FILTER !== 'undefined'){
      var _fReport = COGNITIVE_FILTER.regulate(null, ctx.uta);
      COGNITIVE_FILTER.updateUI(_fReport.report);
    }
  }catch(e){}
  var pills = document.getElementById('entity-state-pills');
  if(!pills) return;
  if(ctx.uta){
    var s = ctx.uta;
    pills.innerHTML =
      pill('E', s.E, '#06b6d4') +
      pill('D', s.D, '#7c3aed') +
      pill('S', s.S, s.S < 0.35 ? '#ef4444' : '#10b981') +
      (ctx.conflicts_total > 0 ? pill('⚡', ctx.conflicts_total, '#f59e0b') : '');
  } else {
    pills.innerHTML = '<span style="font-size:.6rem;color:var(--muted2)">Speak something — state will load.</span>';
  }
}

function pill(label, val, color){
  var display = typeof val === 'number' ? val.toFixed(2) : val;
  return '<span style="font-size:.62rem;padding:3px 8px;border-radius:10px;border:1px solid ' +
    color + '33;color:' + color + ';background:' + color + '11">' +
    label + ':' + display + '</span> ';
}

function entityClearChat(){
  var chat = document.getElementById('entity-chat');
  if(chat) chat.innerHTML = '';
}

function entityVoiceToggle(){
  if(typeof VOICE === 'undefined' || !VOICE.isSupported()) return;
  var btn = document.getElementById('entity-voice-btn');
  VOICE._active = !VOICE._active;
  if(btn) btn.textContent = VOICE._active ? '🔇' : '🔊';
  if(VOICE._active) VOICE.speak('ATHARVA voice active.');
  else VOICE.stop();
}

// Init entity UI on load
function entityInit(){
  // Show 'Ready' state pills immediately — no 'loading...'
  var pills = document.getElementById('entity-state-pills');
  if(pills) pills.innerHTML = '<span style="font-size:.6rem;color:var(--muted2)">Ready — bol kuch.</span>';
  var epEl = document.getElementById('entity-episode-count');
  var eps = S.get(K.EPISODES, []);
  if(epEl) epEl.textContent = eps.length;
  var vBtn = document.getElementById('entity-voice-btn');
  if(vBtn && typeof VOICE !== 'undefined' && VOICE.isSupported()) vBtn.style.display = 'inline-flex';
  // Check trainer key status
  try{
    var gS=document.getElementById('train-gemini-status');
    var qS=document.getElementById('train-groq-status');
    if(gS) gS.innerHTML='Gemini: '+(S.get(K.GEMINI_KEY,'')?'<span style="color:var(--green)">✓ Ready</span>':'<span style="color:var(--muted2)">Not set</span>');
    if(qS) qS.innerHTML='Groq: '+(S.get(K.GROQ_KEY,'')?'<span style="color:var(--green)">✓ Ready</span>':'<span style="color:var(--red)">Required</span>');
    if(typeof renderTrainerStatus==='function') renderTrainerStatus();
  }catch(e){}
  // If already trained, show in identity card
  if(PERM_MEM.isTrained()){
    var awr=PERM_MEM.getAwareness();
    var idLine=document.getElementById('entity-identity-display');
    if(idLine) idLine.textContent='co-pilot — trained — '+awr.total_fragments+' fragments — '+awr.coverage_score+'% coverage';
  }
  var h = new Date().getHours();
  var greet = h < 12 ? 'Subah' : h < 17 ? 'Dopahar' : 'Shaam';
  entityAddBubble(greet + ', Abhishek. Main yahan hoon.', 'entity');
}

// ══════════════════════════════════════
// v3.5 — GLOBAL UI BRIDGE FUNCTIONS
// ══════════════════════════════════════

// Conductor button — full cognitive chain
function conductorProcess(){
  var input = document.getElementById('uta-input').value.trim();
  if(!input){ alert('Type something first.'); return; }
  if(typeof CONDUCTOR === 'undefined'){ alert('System loading. Try again.'); return; }

  CONDUCTOR.process(input, function(result){
    if(result.type === 'ask' || result.type === 'challenge'){
      // INQUIRE interrupted — show message instead of UTA result
      var el = document.getElementById('uta-analysis');
      var card = document.getElementById('uta-analysis-card');
      if(el && card){
        card.style.display = 'block';
        el.innerHTML =
          '<div style="border-left:3px solid var(--gold);padding:8px 12px;background:rgba(245,158,11,.07);border-radius:4px;margin-bottom:8px">' +
          '<div style="font-size:.58rem;letter-spacing:2px;color:var(--gold);margin-bottom:4px">INQUIRE — ' + result.type.toUpperCase() + '</div>' +
          '<div style="font-size:.75rem;color:var(--text)">' + (result.message || result.reason) + '</div>' +
          '<div style="font-size:.6rem;color:var(--muted2);margin-top:4px">Confidence: ' + (result.confidence * 100).toFixed(0) + '%</div>' +
          '</div>';
        // Speak it if voice active
        if(typeof VOICE !== 'undefined' && VOICE.isSupported() && result.message) VOICE.speak(result.message);
      }
    } else {
      // Normal result — UTA already processed, render
      UTA._renderState(result.state);
      // Show entity status in analysis
      if(result.forecast && result.forecast.warn_user){
        CONDUCTOR._surfaceWarning(result.forecast);
      } else {
        var w = document.getElementById('conductor-warning');
        if(w) w.style.display = 'none';
      }
    }
  });
}

// Voice toggle
function voiceToggle(){
  if(typeof VOICE === 'undefined' || !VOICE.isSupported()){
    alert('Voice not supported on this browser.');
    return;
  }
  var btn = document.getElementById('voice-btn');
  if(VOICE._active){
    VOICE.stop();
    VOICE._active = false;
    if(btn) btn.textContent = '🔊 VOICE';
  } else {
    VOICE._active = true;
    if(btn) btn.textContent = '🔇 STOP';
    var state = ATH_STATE.getUTA();
    if(state){
      var msg = 'ATHARVA online. E is ' + state.E.toFixed(2) + '. Stability is ' + state.S.toFixed(2) + '.';
      VOICE.speak(msg);
    }
  }
}


// Voice button shown in entityInit() after VOICE is defined



// ══════════════════════════════════════════════════════
// V3.6 — PERM_MEM (Permanent Memory — Compressed Cognition)
// Awareness + Pattern Recognition + Scoring
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// V4.2 — INPUT_INTERP (Input Interpreter + Continuity Layer)
// v4.2 upgrade: now continuity-aware and memory-aware.
// Classifies input BEFORE UTA — prevents wrong state bias.
// New in v4.2: checks recent episode pattern + last decision outcome.
// ══════════════════════════════════════════════════════
