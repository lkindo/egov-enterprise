import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReferenceSchema, baseType, dbSheets, deliverablesSchemaSql, erdMarkdown, tableOwners, typeContrast } from './export-deliverables-db.mjs';

/*
 * 산출물 DB 모드(DEC-OPS-382)의 고정 입력 시험. 일회용 컨테이너에 Flyway 를 단계 적용하는 실제 실행은 비필수
 * workflow_dispatch(.github/workflows/deliverables.yml)가 한다.
 */

test('type contrast compares names and only the lengths that share a unit', () => {
  const varchar = { type: 'character varying(100)', length: 100, precision: null };
  assert.equal(typeContrast(varchar, { type: 'VARCHAR', length: 100 }), '같음');
  assert.equal(typeContrast({ ...varchar, length: 50 }, { type: 'VARCHAR', length: 100 }), '길이 다름');
  // 정수형의 이진 정밀도(64)를 도메인 길이(19)와 비교하지 않는다.
  assert.equal(typeContrast({ type: 'bigint', length: null, precision: 64 }, { type: 'BIGINT', length: 19 }), '같음');
  assert.equal(typeContrast({ type: 'bigint', length: null, precision: 64 }, { type: 'NUMERIC', length: 19 }), '타입 다름');
  assert.equal(typeContrast({ type: 'numeric(10,2)', length: null, precision: 10 }, { type: 'NUMERIC', length: 12 }), '길이 다름');
  assert.equal(typeContrast({ type: 'timestamp without time zone', length: null, precision: null }, { type: 'DATETIME', length: null }), '같음');
  assert.equal(typeContrast(varchar, null), null);
  assert.equal(typeContrast(varchar, { type: null, length: null }), '도메인 타입 없음');
  assert.equal(baseType('character varying(20)'), 'VARCHAR');
});

const SNAPSHOT = {
  tables: [{ name: 'tb_parent', comment: '부모' }, { name: 'tb_child', comment: null }, { name: 'tb_alone', comment: '홀로' }],
  columns: [
    { table: 'tb_parent', ordinal: 1, name: 'parent_sn', type: 'bigint', udt: 'int8', length: null, precision: 64, nullable: false, default: null, comment: '번호' },
    { table: 'tb_child', ordinal: 1, name: 'child_sn', type: 'bigint', udt: 'int8', length: null, precision: 64, nullable: false, default: null, comment: null },
    { table: 'tb_child', ordinal: 2, name: 'parent_sn', type: 'bigint', udt: 'int8', length: null, precision: 64, nullable: true, default: null, comment: '부모 번호' },
    { table: 'tb_child', ordinal: 3, name: 'old_cd', type: 'character varying(5)', udt: 'varchar', length: 5, precision: null, nullable: true, default: null, comment: '옛 코드' },
    { table: 'tb_alone', ordinal: 1, name: 'note', type: 'text', udt: 'text', length: null, precision: null, nullable: true, default: null, comment: '메모' },
  ],
  constraints: [
    { table: 'tb_parent', name: 'pk_tb_parent', type: 'p', columns: ['parent_sn'], referencedTable: null, referencedColumns: null, definition: 'PRIMARY KEY (parent_sn)' },
    { table: 'tb_child', name: 'pk_tb_child', type: 'p', columns: ['child_sn'], referencedTable: null, referencedColumns: null, definition: 'PRIMARY KEY (child_sn)' },
    { table: 'tb_child', name: 'fk_child_parent', type: 'f', columns: ['parent_sn'], referencedTable: 'tb_parent', referencedColumns: ['parent_sn'], definition: 'FOREIGN KEY …' },
  ],
  terms: [
    { termName: '부모일련번호', engAbbr: 'PARENT_SN', domainName: '일련번호N19', description: null, synonyms: null, allowedValues: null, deprecated: 'N' },
    { termName: '옛코드', engAbbr: 'OLD_CD', domainName: '코드V5', description: null, synonyms: null, allowedValues: null, deprecated: 'Y' },
  ],
  words: [{ wordName: '부모', engAbbr: 'PARENT', description: null, representative: 'Y' }],
  domains: [{ group: '번호', name: '일련번호N19', type: 'NUMERIC', length: 19 }, { group: '코드', name: '코드V5', type: 'VARCHAR', length: 5 }],
};
const OWNERS = tableOwners({ 'core.json': { id: 'core', owns: { tables: ['tb_parent', 'tb_alone'] } }, 'thing.json': { id: 'thing', owns: { tables: ['tb_child', 'tb_parent'] } } });

test('table owners keep every declaring feature, including shared tables', () => {
  assert.deepEqual(OWNERS.get('tb_parent'), ['core', 'thing']);
  assert.deepEqual(OWNERS.get('tb_child'), ['thing']);
});

test('db sheets mark missing comments, terms, keys and contrasts without judging conformance', () => {
  const [tables, columns, foreignKeys, terms, words, domains] = dbSheets(SNAPSHOT, OWNERS);
  const table = new Map(tables.rows.map((row) => [row.name, row]));
  assert.deepEqual(table.get('tb_child').flags, ['설명 없음']);
  assert.deepEqual(table.get('tb_alone').flags, ['외래 키 없음', '기본 키 없음']);
  assert.deepEqual(table.get('tb_parent').primaryKey, ['parent_sn']);
  const column = new Map(columns.rows.map((row) => [`${row.table}.${row.name}`, row]));
  assert.deepEqual(column.get('tb_child.child_sn').flags, ['설명 없음', '용어 없음']);
  assert.deepEqual(column.get('tb_child.parent_sn').keys, ['FK']);
  assert.equal(column.get('tb_child.parent_sn').contrast, '타입 다름');
  assert.deepEqual(column.get('tb_child.parent_sn').flags, ['타입 다름']);
  assert.deepEqual(column.get('tb_child.old_cd').flags, ['폐기 용어']);
  assert.equal(column.get('tb_child.old_cd').contrast, '같음');
  assert.equal(foreignKeys.rows.length, 1);
  assert.deepEqual(foreignKeys.rows[0].referencedOwners, ['core', 'thing']);
  assert.equal(terms.rows.length, 2);
  assert.equal(words.rows.length, 1);
  assert.equal(domains.rows.length, 2);
  for (const sheet of [tables, columns, foreignKeys]) assert.match(sheet.notices[0], /운영 DB 실측이 아니다/u);
  assert.match(columns.notices[1], /표준 적합 판정이 아니다/u);
});

test('the ERD draws each feature with the tables its foreign keys reach and key columns only', () => {
  const erd = erdMarkdown(SNAPSHOT, OWNERS);
  const section = erd.slice(erd.indexOf('## thing'));
  assert.match(section, /소유 표 2개, 외래 키 1개\./u);
  assert.match(section, /tb_parent \|\|--o\{ tb_child : "fk_child_parent"/u);
  assert.match(section, /int8 parent_sn FK/u);
  assert.doesNotMatch(section, /old_cd/u);
  assert.match(erd, /운영 DB 실측이 아니다/u);
});

test('a reference schema that lost or gained a table or dictionary rows stops the export', () => {
  assert.doesNotThrow(() => assertReferenceSchema(SNAPSHOT, { expectedTables: ['tb_parent', 'tb_child', 'tb_alone'], metaRows: { meta_standard_terms: 2 } }));
  assert.throws(() => assertReferenceSchema(SNAPSHOT, { expectedTables: ['tb_parent', 'tb_child', 'tb_alone', 'tb_new'], metaRows: {} }), /missing: tb_new; extra: -/u);
  assert.throws(() => assertReferenceSchema(SNAPSHOT, { expectedTables: ['tb_parent', 'tb_child'], metaRows: {} }), /missing: -; extra: tb_alone/u);
  assert.throws(() => assertReferenceSchema(SNAPSHOT, { expectedTables: ['tb_parent', 'tb_child', 'tb_alone'], metaRows: { meta_standard_words: 3387 } }),
    /meta_standard_words has 1 rows/u);
});

test('the deliverables query leaves the Flyway history out and orders every list', () => {
  const sql = deliverablesSchemaSql();
  assert.equal((sql.match(/relname<>'flyway_schema_history'/gu) ?? []).length, 2);
  assert.equal((sql.match(/ORDER BY/gu) ?? []).length >= 6, true);
});
