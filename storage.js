// ══════════════════════════════════════════════════════
// ATHARVA — storage.js
// Safe localStorage wrapper with Array→Object migration.
// Fix #2: Object vs Array storage crash.
// ══════════════════════════════════════════════════════

var K = {
  UTA_STATE    : 'ATH_uta_state_v2',
  UTA_SCHEMAS  : 'ATH_uta_schemas_v2',
  UTA_WEIGHTS  : 'ATH_uta_weights_v1',
  EPISODES     : 'ATH_episodes_v3',
  PERM_MEM     : 'ATH_perm_mem_v3',
  MEM_GRAPH    : 'ATH_mem_graph_v1',
  AMENDMENTS   : 'ATH_core_amendments',
  DRIFT_LOG    : 'ATH_drift_log_v1',
  UPGRADE_LOG  : 'ATH_upgrade_log_v1',
  PATCH_SRC    : 'ATH_patch_trust_v1',
  FILTER_LEARN : 'ATH_filter_learn_v41',
  FILTER_THRESH: 'ATH_filter_thresh_v41',
  DECISION_LOG : 'ATH_decision_log_v42',
  MEM_TIER_DATA: 'ATH_mem_tier_v42',
  OBS_INSIGHTS : 'ATH_obs_insights_v42',
  REFLEX_STATS : 'ATH_reflex_stats_v42',
  KERNEL_LOG   : 'ATH_kernel_log_v50',
};

// ── Safe Storage Wrapper ─────────────────────────────────
var S = {

  get: function(key, fallback) {
    if(fallback === undefined) fallback = null;
    try {
      var raw = localStorage.getItem(key);
      if(raw === null || raw === undefined) return fallback;
      var parsed = JSON.parse(raw);

      // FIX #2: Array→Object migration for object-typed keys
      var objectKeys = [K.UTA_SCHEMAS, K.MEM_GRAPH, K.PATCH_SRC, K.UTA_WEIGHTS];
      if(objectKeys.indexOf(key) !== -1 && Array.isArray(parsed)) {
        console.warn('[S.get] Migrating array→object for key:', key);
        return fallback !== null ? fallback : {};
      }

      // Array-typed keys that must stay arrays
      var arrayKeys  = [K.EPISODES, K.PERM_MEM, K.DRIFT_LOG, K.UPGRADE_LOG,
                        K.FILTER_LEARN, K.DECISION_LOG, K.OBS_INSIGHTS];
      if(arrayKeys.indexOf(key) !== -1 && !Array.isArray(parsed)) {
        console.warn('[S.get] Expected array, got object for key:', key);
        return fallback !== null ? fallback : [];
      }

      return parsed;
    } catch(e) {
      console.warn('[S.get] Error key:', key, e.message);
      return fallback;
    }
  },

  set: function(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch(e) {
      console.warn('[S.set] Error key:', key, e.message);
      return false;
    }
  },

  del: function(key) {
    try { localStorage.removeItem(key); return true; }
    catch(e) { return false; }
  },

  // Test if localStorage is available (file:// blocks it on some browsers)
  available: function() {
    try {
      localStorage.setItem('__ath_test', '1');
      localStorage.removeItem('__ath_test');
      return true;
    } catch(e) { return false; }
  }
};

// Log availability on load
if(!S.available()) {
  console.warn('[STORAGE] localStorage unavailable. All data will be in-memory only.');
}
