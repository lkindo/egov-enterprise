import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { crc32, inspectZip, extractZip, inspectFolder, parseDdl, INPUT_LIMITS, readBoundedFile } from './inputs.mjs';

function zip(files) {
  const locals = [], central = []; let offset = 0;
  for (const [name, content] of files) {
    const n = Buffer.from(name), raw = Buffer.from(content), packed = deflateRawSync(raw), crc = crc32(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(n.length, 26);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x800, 8); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(packed.length, 20); cd.writeUInt32LE(raw.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(offset, 42);
    locals.push(local, n, packed); central.push(cd, n); offset += local.length + n.length + packed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('file size is checked before bounded input reads', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migration-bounded-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'source.sql');
  await writeFile(file, 'select name from person');
  assert.equal((await readBoundedFile(file, 30)).toString(), 'select name from person');
  await assert.rejects(readBoundedFile(file, 8), { code: 'INPUT_SIZE_LIMIT' });
});

test('ZIP preview, CRC validation, exclusions and local extraction', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migration-input-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const bytes = zip([['src/Example.sql', 'select customer_name from customer'], ['.env', 'EXCLUDED_SYNTHETIC'], ['nested.zip', 'not extracted']]);
  assert.equal(inspectZip(bytes).excluded, 1);
  const result = await extractZip(bytes, dir);
  assert.equal(await readFile(path.join(result.sourceRoot, 'src/Example.sql'), 'utf8'), 'select customer_name from customer');
  await assert.rejects(readFile(path.join(result.sourceRoot, '.env')), { code: 'ENOENT' });
  assert.equal(result.summary.nestedArchivesExtracted, false);
  assert.equal(result.sourceFingerprint.length, 64);
});

test('ZIP rejects traversal, Windows aliases, collisions and file-parent confusion', () => {
  for (const name of ['../outside', '/absolute', 'C:/secret', 'a\\b', 'CON.txt', 'a./file', 'a:b', 'a//b']) assert.throws(() => inspectZip(zip([[name, 'x']])), { code: 'ZIP_PATH_INVALID' });
  for (const names of [['A.txt', 'a.txt'], ['a', 'a/b']]) assert.throws(() => inspectZip(zip(names.map(n => [n, 'x']))), { code: 'ZIP_NAME_COLLISION' });
});

test('ZIP rejects encryption, ZIP64, bomb expansion and tampered content', async t => {
  const bytes = zip([['test.sql', 'select name from sample']]);
  const encrypted = Buffer.from(bytes); const central = encrypted.readUInt32LE(encrypted.length - 6); encrypted.writeUInt16LE(0x801, central + 8);
  assert.throws(() => inspectZip(encrypted), { code: 'ZIP_UNSUPPORTED' });
  const zip64 = Buffer.from(bytes); zip64.writeUInt32LE(0xffffffff, central + 20); assert.throws(() => inspectZip(zip64), { code: 'ZIP_UNSUPPORTED' });
  assert.throws(() => inspectZip(zip([['bomb.txt', 'a'.repeat(100000)]])), { code: 'ZIP_EXPANSION_LIMIT' });
  assert.throws(() => inspectZip(bytes, { ...INPUT_LIMITS, entries: 0 }), { code: 'ZIP_DIRECTORY_INVALID' });
  const dir = await mkdtemp(path.join(tmpdir(), 'migration-crc-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const corrupt = Buffer.from(bytes); corrupt[40] ^= 4;
  await assert.rejects(extractZip(corrupt, dir));
});

test('folder inventory excludes build/secrets and detects metadata changes', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migration-folder-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'node_modules')); await writeFile(path.join(dir, '.env'), 'EXCLUDED'); await writeFile(path.join(dir, 'source.sql'), 'select id from person');
  const first = await inspectFolder(dir); assert.equal(first.summary.skipped, 2);
  await writeFile(path.join(dir, 'source.sql'), 'select full_name from person'); const second = await inspectFolder(dir); assert.notEqual(first.sourceFingerprint, second.sourceFingerprint);
});

test('DDL partial parser preserves quoted semicolons and explicitly reports unsupported statements', () => {
  const ddl = Buffer.from("-- draft\nCREATE TABLE person (id NUMBER(10) PRIMARY KEY, full_name VARCHAR2(60), CONSTRAINT fk FOREIGN KEY(id) REFERENCES other(id)); COMMENT ON COLUMN person.full_name IS '이름; 성명'; ALTER TABLE person ADD email text; DROP TABLE other;");
  const result = parseDdl(ddl); assert.equal(result.tables.length, 1); assert.equal(result.tables[0].columns.length, 2); assert.equal(result.tables[0].constraints.length, 1); assert.equal(result.comments[0].text, '이름; 성명'); assert.equal(result.unsupported.length, 2); assert.equal(result.liveInventory, false); assert.equal(result.partial, true);
  assert.throws(() => parseDdl(Buffer.from("COMMENT ON TABLE x IS 'unfinished")), { code: 'DDL_UNTERMINATED' });
});
