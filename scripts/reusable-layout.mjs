/** The backend build layout is independent of the selected product profile and database. */
export const BACKEND_LAYOUTS = Object.freeze(['multi-module', 'single-module']);

export function normalizeBackendLayout(value = 'multi-module') {
  if (!BACKEND_LAYOUTS.includes(value)) {
    throw new Error(`Unsupported backend layout: ${String(value)}; expected ${BACKEND_LAYOUTS.join('|')}`);
  }
  return value;
}

/**
 * ADR-0062: generated application projects set migrationTool: false and carry the offline-migration-tool rule.
 * Pre-Phase-4 PostgreSQL locks lack both markers and still preserve migration-tool runtime verification.
 */
export function hasMigrationTool(lock) {
  if (!lock || typeof lock !== 'object') return false;
  if (lock.vendorProjection) return false;
  if (lock.migrationTool === false) return false;
  if (lock.migrationTool === true) return true;
  const rules = lock.removedGates?.rules;
  if (Array.isArray(rules) && rules.some(entry => entry?.rule === 'offline-migration-tool')) return false;
  return true;
}
