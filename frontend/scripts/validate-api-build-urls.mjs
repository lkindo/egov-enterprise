import { pathToFileURL } from 'node:url';

export function validApiBuildUrl(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw !== raw.trim()
      || /[\u0000-\u0020\u007f]/u.test(raw) || raw.includes('?') || raw.includes('#')) return false;
  const schemeEnd = raw.indexOf('://');
  if (schemeEnd < 0 || !['http', 'https'].includes(raw.slice(0, schemeEnd).toLowerCase())) return false;
  const authorityStart = schemeEnd + 3;
  const pathStart = raw.indexOf('/', authorityStart);
  if (pathStart < 0) return false;
  const authority = raw.slice(authorityStart, pathStart);
  const pathname = raw.slice(pathStart);
  if (!authority || authority.includes('@') || !['/api/v1', '/api/v1/'].includes(pathname)) return false;
  let url;
  try { url = new URL(raw); } catch { return false; }
  return url.hostname !== '' && url.username === '' && url.password === ''
    && url.search === '' && url.hash === '' && url.pathname === pathname;
}

export function validateApiBuildEnvironment(env) {
  if (!['BACKEND_API_URL', 'NEXT_PUBLIC_API_URL'].every((name) => validApiBuildUrl(env[name]))) {
    throw new Error('Invalid frontend API build configuration.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { validateApiBuildEnvironment(process.env); } catch {
    console.error('Invalid frontend API build configuration.');
    process.exitCode = 1;
  }
}
