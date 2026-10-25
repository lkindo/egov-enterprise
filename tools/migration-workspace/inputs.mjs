import { createHash, randomUUID } from 'node:crypto';
import { lstat, realpath, mkdir, open, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createInflateRaw } from 'node:zlib';
import { Readable } from 'node:stream';
import { constants } from 'node:fs';

export const INPUT_LIMITS = Object.freeze({ compressed: 250 * 1024 ** 2, expanded: 2 * 1024 ** 3, entries: 20000, ratio: 100, timeoutMs: 300000, ddl: 16 * 1024 ** 2 });
const deny = code => { throw Object.assign(new Error(code), { code }); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const excluded = /^(?:\.git|\.svn|node_modules|target|build|dist|\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;

export async function checkedPath(input, type = 'file') {
  if (typeof input !== 'string' || !path.isAbsolute(input)) deny('ABSOLUTE_PATH_REQUIRED');
  const resolved = path.resolve(input);
  for (let current = resolved; ; current = path.dirname(current)) {
    const info = await lstat(current);
    if (info.isSymbolicLink()) deny('SYMLINK_REJECTED');
    if (current === path.dirname(current)) break;
  }
  const info = await lstat(resolved);
  if (type === 'directory' ? !info.isDirectory() : !info.isFile()) deny('INPUT_TYPE_INVALID');
  return realpath(resolved);
}

/** Check size before allocating and bound reads even when a local file grows. */
export async function readBoundedFile(input, limit, code = 'INPUT_SIZE_LIMIT') {
  const resolved = await checkedPath(input);
  const handle = await open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > limit) deny(code);
    const bytes = Buffer.alloc(Math.min(limit + 1, before.size + 1));
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, length);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    const after = await handle.stat(), current = await lstat(resolved);
    if (after.size > limit || length > limit) deny(code);
    if (length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || current.isSymbolicLink() || current.ino !== before.ino || current.dev !== before.dev) deny('INPUT_CHANGED');
    return bytes.subarray(0, length);
  } finally { await handle.close(); }
}

/** Folder discovery reads metadata only. Source execution and dependency installation are absent. */
export async function inspectFolder(input, limits = INPUT_LIMITS) {
  const root = await checkedPath(input, 'directory');
  const started = Date.now();
  const hash = createHash('sha256');
  let files = 0, bytes = 0, skipped = 0;
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (Date.now() - started > limits.timeoutMs) deny('INPUT_TIMEOUT');
      if (++files > limits.entries) deny('ENTRY_LIMIT');
      if (excluded.test(entry.name)) { skipped++; continue; }
      const full = path.join(dir, entry.name);
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) { skipped++; continue; }
      if (stat.isDirectory()) await walk(full);
      else if (stat.isFile()) {
        bytes += stat.size;
        hash.update(`${path.relative(root, full)}\0${stat.size}\0${stat.mtimeMs}\0`);
      } else skipped++;
    }
  }
  await walk(root);
  return { sourceRoot: root, sourceFingerprint: hash.digest('hex'), summary: { kind: 'folder', entries: files, bytes, skipped, fingerprintKind: 'metadata', contentRecheckedByScanner: true } };
}

function safeName(name) {
  if (!name || name.includes('\\') || /^[\/]/.test(name) || /[\x00-\x1f:]/.test(name)) deny('ZIP_PATH_INVALID');
  const directory = name.endsWith('/');
  const parts = (directory ? name.slice(0, -1) : name).split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || /[ .]$/.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p) || /[<>"|?*]/.test(p))) deny('ZIP_PATH_INVALID');
  return { name: parts.join('/'), directory };
}
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i; for (let n = 0; n < 8; n++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
export function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** Parse central and local records before creating output. ZIP64/encryption/links are not supported. */
export function inspectZip(buffer, limits = INPUT_LIMITS) {
  if (!Buffer.isBuffer(buffer) || buffer.length > limits.compressed) deny('ZIP_SIZE_LIMIT');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break; }
  }
  if (end < 0) deny('ZIP_INVALID');
  const count = buffer.readUInt16LE(end + 10), size = buffer.readUInt32LE(end + 12), offset = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== count || count === 65535 || size === 0xffffffff || offset === 0xffffffff) deny('ZIP_UNSUPPORTED');
  if (count > limits.entries || offset + size !== end) deny('ZIP_DIRECTORY_INVALID');
  const entries = [], names = new Map(), ranges = [];
  let cursor = offset, expanded = 0, compressed = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) deny('ZIP_INVALID');
    const madeBy = buffer.readUInt16LE(cursor + 4), flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16), packed = buffer.readUInt32LE(cursor + 20), unpacked = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    const disk = buffer.readUInt16LE(cursor + 34), attrs = buffer.readUInt32LE(cursor + 38), local = buffer.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || disk || [packed, unpacked, local].includes(0xffffffff) || flags & ~0x808 || ![0, 8].includes(method)) deny('ZIP_UNSUPPORTED');
    // Non-UTF8 filenames are restricted to ASCII, avoiding platform-dependent name decoding.
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
    if (!(flags & 0x800) && rawName.some(b => b > 127)) deny('ZIP_ENCODING_UNSUPPORTED');
    let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(rawName); } catch { deny('ZIP_ENCODING_UNSUPPORTED'); }
    const entry = safeName(text);
    const unixType = (attrs >>> 16) & 0xf000;
    if ((madeBy >>> 8) === 3 && unixType && unixType !== (entry.directory ? 0x4000 : 0x8000)) deny('ZIP_LINK_REJECTED');
    for (let e = cursor + 46 + nameLength; e < cursor + 46 + nameLength + extraLength;) {
      if (e + 4 > cursor + 46 + nameLength + extraLength) deny('ZIP_INVALID');
      const id = buffer.readUInt16LE(e), len = buffer.readUInt16LE(e + 2);
      if ([1, 0x7075, 0x000d, 0x756e].includes(id)) deny('ZIP_UNSUPPORTED');
      e += 4 + len; if (e > cursor + 46 + nameLength + extraLength) deny('ZIP_INVALID');
    }
    const key = entry.name.normalize('NFC').toLowerCase();
    if (names.has(key)) deny('ZIP_NAME_COLLISION');
    names.set(key, entry.directory);
    if (unpacked > Math.max(1, packed) * limits.ratio || (entry.directory && unpacked)) deny('ZIP_EXPANSION_LIMIT');
    expanded += unpacked; compressed += packed;
    if (expanded > limits.expanded) deny('ZIP_EXPANSION_LIMIT');
    if (local + 30 > offset || buffer.readUInt32LE(local) !== 0x04034b50) deny('ZIP_LOCAL_INVALID');
    const ln = buffer.readUInt16LE(local + 26), le = buffer.readUInt16LE(local + 28), start = local + 30 + ln + le;
    if (start + packed > offset || buffer.readUInt16LE(local + 6) !== flags || buffer.readUInt16LE(local + 8) !== method || !buffer.subarray(local + 30, local + 30 + ln).equals(rawName)) deny('ZIP_LOCAL_INVALID');
    if (!(flags & 8) && (buffer.readUInt32LE(local + 14) !== crc || buffer.readUInt32LE(local + 18) !== packed || buffer.readUInt32LE(local + 22) !== unpacked)) deny('ZIP_LOCAL_INVALID');
    ranges.push([local, start + packed]);
    entries.push({ ...entry, packed, unpacked, crc, method, start, excluded: entry.name.split('/').some(p => excluded.test(p)) });
    cursor = next;
  }
  if (cursor !== end || expanded > Math.max(1, compressed) * limits.ratio) deny('ZIP_INVALID');
  ranges.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ranges.length; i++) if (ranges[i][0] < ranges[i - 1][1]) deny('ZIP_OVERLAP');
  for (const key of names.keys()) { const pieces = key.split('/'); pieces.pop(); while (pieces.length) { if (names.get(pieces.join('/')) === false) deny('ZIP_NAME_COLLISION'); pieces.pop(); } }
  return { entries, expanded, compressed, digest: digest(buffer), excluded: entries.filter(e => e.excluded).length };
}

export async function extractZip(buffer, workspace, limits = INPUT_LIMITS) {
  const inspected = inspectZip(buffer, limits), started = Date.now();
  const parent = path.join(await checkedPath(workspace, 'directory'), 'inputs');
  await mkdir(parent, { recursive: true });
  await checkedPath(parent, 'directory');
  const destination = path.join(parent, randomUUID());
  await mkdir(destination, { mode: 0o700 });
  let actual = 0;
  try {
    for (const entry of inspected.entries) {
      if (Date.now() - started > limits.timeoutMs) deny('INPUT_TIMEOUT');
      // Validate every entry, including excluded ones, without writing excluded source/configuration.
      const packed = buffer.subarray(entry.start, entry.start + entry.packed);
      const target = path.resolve(destination, entry.name);
      if (!target.startsWith(destination + path.sep)) deny('ZIP_PATH_INVALID');
      let handle, size = 0, crc = 0xffffffff;
      if (!entry.excluded) {
        if (entry.directory) await mkdir(target, { recursive: true, mode: 0o700 });
        else { await mkdir(path.dirname(target), { recursive: true, mode: 0o700 }); handle = await open(target, 'wx', 0o600); }
      }
      const source = Readable.from([packed]), output = entry.method === 0 ? source : source.pipe(createInflateRaw());
      try {
        for await (const chunk of output) {
          if (Date.now() - started > limits.timeoutMs) deny('INPUT_TIMEOUT');
          size += chunk.length; actual += chunk.length;
          if (size > entry.unpacked || actual > limits.expanded || size > Math.max(1, entry.packed) * limits.ratio) deny('ZIP_EXPANSION_LIMIT');
          for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
          if (handle) { let position = 0; while (position < chunk.length) { const written = await handle.write(chunk, position, chunk.length - position); position += written.bytesWritten; } }
        }
        if (size !== entry.unpacked || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) deny('ZIP_CONTENT_INVALID');
      } catch (error) { if (error.code?.startsWith('ZIP_') || error.code === 'INPUT_TIMEOUT') throw error; deny('ZIP_DECOMPRESSION_FAILED'); }
      finally { output.destroy(); source.destroy(); await handle?.close(); }
    }
  } catch (error) {
    // destination is a fresh UUID child created by this call, never an input/user directory.
    await rm(destination, { recursive: true, force: true }); throw error;
  }
  return { sourceRoot: destination, sourceFingerprint: inspected.digest, summary: { kind: 'zip', entries: inspected.entries.length, bytes: actual, skipped: inspected.excluded, nestedArchivesExtracted: false } };
}

function statements(sql) {
  const out = []; let start = 0, quote = '', line = false, block = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], n = sql[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (quote) { if (c === quote) { if (n === quote) i++; else quote = ''; } continue; }
    if (c === '-' && n === '-') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === ';') { out.push(sql.slice(start, i)); start = i + 1; }
  }
  if (quote || block) deny('DDL_UNTERMINATED');
  if (sql.slice(start).trim()) out.push(sql.slice(start));
  return out;
}
function splitColumns(body) {
  const parts = []; let start = 0, depth = 0, quote = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { if (c === quote) { if (body[i + 1] === quote) i++; else quote = ''; } continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { parts.push(body.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(body.slice(start).trim()); return parts;
}
const identifier = '(?:"(?:[^"\\r\\n]|"")+"|[A-Za-z_][A-Za-z_0-9$]*)';
const qualified = `${identifier}(?:\\.${identifier})?`;
export function parseDdl(bytes) {
  if (bytes.length > INPUT_LIMITS.ddl) deny('DDL_SIZE_LIMIT');
  let sql; try { sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { deny('DDL_ENCODING_UNSUPPORTED'); }
  const result = { formatVersion: 1, kind: 'ddl-draft', dialects: ['postgresql', 'oracle'], liveInventory: false, tables: [], comments: [], unsupported: [], digest: digest(bytes) };
  statements(sql).forEach((raw, index) => {
    // Preserve quoted comment text; remove only leading standalone SQL comments.
    const statement = raw.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
    if (!statement) return;
    const create = statement.match(new RegExp(`^CREATE\\s+TABLE\\s+(${qualified})\\s*\\(([\\s\\S]*)\\)\\s*$`, 'i'));
    if (create) {
      const table = { name: create[1], columns: [], constraints: [], partial: false };
      for (const fragment of splitColumns(create[2])) {
        if (/^(?:CONSTRAINT\s+\S+\s+)?(?:PRIMARY\s+KEY|FOREIGN\s+KEY)\s*\(/i.test(fragment)) table.constraints.push(fragment);
        else {
          const column = fragment.match(new RegExp(`^(${identifier})\\s+([A-Za-z][A-Za-z0-9_ ]*(?:\\([^)]*\\))?)([\\s\\S]*)$`));
          if (column && !/^(?:CHECK|UNIQUE|CONSTRAINT|EXCLUDE)$/i.test(column[1])) table.columns.push({ name: column[1], declaration: fragment.slice(column[1].length).trim() });
          else { table.partial = true; result.unsupported.push({ statement: index + 1, reason: 'UNSUPPORTED_TABLE_FRAGMENT' }); }
        }
      }
      result.tables.push(table);
    } else {
      const comment = statement.match(new RegExp(`^COMMENT\\s+ON\\s+(TABLE|COLUMN)\\s+(${qualified}(?:\\.${identifier})?)\\s+IS\\s+'((?:[^']|'')*)'\\s*$`, 'i'));
      if (comment) result.comments.push({ kind: comment[1].toLowerCase(), name: comment[2], text: comment[3].replaceAll("''", "'") });
      else result.unsupported.push({ statement: index + 1, reason: 'UNSUPPORTED_STATEMENT' });
    }
  });
  result.partial = result.unsupported.length > 0;
  return result;
}
