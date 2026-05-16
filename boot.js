// ══════════════════════════════════════════════════════════════
// ATHARVA — boot.js
// FIX #1: Race condition — waits for DOMContentLoaded + all modules
// before starting boot sequence. Prevents "KERNEL is not defined".
// ══════════════════════════════════════════════════════════════

(function() {

  // ── Module readiness check ────────────────────────────────────
  // All required globals must be defined before boot runs.
  var REQUIRED = [
    'K', 'S',                                      // storage
    'KERNEL',                                       // language layer
    'ATH_STATE', 'UTA',                             // cognition
    'PERM_MEM', 'DECISION_LOG_SYS', 'MEM_TIER',   // memory
    'REFLEXIVE_ROUTER', 'INPUT_INTERP',             // routing
    'COGNITIVE_FILTER', 'IDENTITY_BASELINE',        // governance
    'FRAGMENT_AGING',                               // memory health
    'ATHARVA_FEEL', 'ATHARVA_REFLECT'              // agents
  ];

  function allModulesLoaded() {
    for(var i = 0; i < REQUIRED.length; i++) {
      if(typeof window[REQUIRED[i]] === 'undefined') {
        return REQUIRED[i];   // return first missing module name
      }
    }
    return null;
  }

  // ── Boot sequence ─────────────────────────────────────────────
  function runBoot() {

    var missing = allModulesLoaded();
    if(missing) {
      console.error('[BOOT] Module not loaded:', missing, '— retrying in 50ms');
      setTimeout(runBoot, 50);
      return;
    }

    console.log('[BOOT] All modules loaded. Starting ATHARVA v5.0...');

    var failed  = 0;
    var steps   = [
      function() { KERNEL.init(); },
      function() { ATH_STATE.init(); },
      function() { PERM_MEM.init(); },
      function() { FRAGMENT_AGING.init(); },
      function() { IDENTITY_BASELINE.init(); },
      function() { COGNITIVE_FILTER.init(); },
      function() { MEM_TIER.init(); },
      function() { DECISION_LOG_SYS.init(); },
      function() { OBSERVER_INSIGHTS.init(); },
    ];

    steps.forEach(function(step, i) {
      try { step(); }
      catch(e) {
        failed++;
        console.warn('[BOOT] Step ' + i + ' failed:', e.message);
      }
    });

    // UI init — requires DOM
    try {
      if(typeof entityInit === 'function') entityInit();
    } catch(e) {
      console.warn('[BOOT] entityInit failed:', e.message);
    }

    // Update status label
    var label = document.getElementById('sys-label');
    if(label) label.textContent = failed > 0 ? 'WARN (' + failed + ')' : 'ONLINE';

    var verEl = document.getElementById('ver-tag');
    if(verEl) verEl.textContent = 'v5.0';

    console.log('[ATHARVA v5.0] Boot complete.', failed, 'error(s).');
  }

  // FIX #1: Use DOMContentLoaded — guarantees all <script> tags have parsed
  // This is safer than window.onload (which waits for images too)
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runBoot);
  } else {
    // Document already loaded (e.g. script injected after parse)
    setTimeout(runBoot, 0);
  }

})();
