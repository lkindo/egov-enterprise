/** The backend build layout is independent of the selected product profile and database. */
export const BACKEND_LAYOUTS = Object.freeze(['multi-module', 'single-module']);

export function normalizeBackendLayout(value = 'multi-module') {
  if (!BACKEND_LAYOUTS.includes(value)) {
    throw new Error(`Unsupported backend layout: ${String(value)}; expected ${BACKEND_LAYOUTS.join('|')}`);
  }
  return value;
}
