import { createHash } from 'node:crypto';

const sorted = values => [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const equal = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const fail = message => { throw new Error(message); };
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value);
const literal = value => value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

/** Caller-supplied projections are evidence to compare, never an SQL/object allowlist. */
export function verifyResolvedDbComposition(input, resolved, sourceCommit, resolveSourceReference) {
  if (!input || !resolved || !/^[a-f0-9]{40}$/.test(sourceCommit) || input.sourceCommit !== sourceCommit) {
    fail('Composition sourceCommit does not match the current source checkout.');
  }
  for (const key of Object.keys(resolved)) {
    if (!equal(input[key], resolved[key])) fail(`Composition ${key} differs from the canonical recipe resolution.`);
  }
  if (typeof resolveSourceReference !== 'function' || resolveSourceReference(resolved.sourceRef) !== sourceCommit) {
    fail('Composition sourceRef does not resolve to the current source commit.');
  }
  if (resolved.database?.vendor !== 'postgresql') fail('Composition database must be postgresql.');
  for (const key of ['tables', 'explicitSequences']) {
    if (!Array.isArray(resolved[key]) || new Set(resolved[key]).size !== resolved[key].length
      || resolved[key].some(name => !identifier(name))) fail(`Invalid canonical composition ${key}.`);
  }
  if (!resolved.tables.length || !/^[a-f0-9]{64}$/.test(resolved.compositionHash)) fail('Invalid canonical composition identity.');
  return { ...resolved, sourceCommit };
}

/** PostgreSQL distributes varchar-literal-array -> text[] casts on pg_dump replay. */
export function canonicalConstraintDefinition(definition) {
  if (typeof definition !== 'string') return definition;
  const literalCast = "'(?:[^']|'')*'::character varying";
  const arrayCast = new RegExp(`ARRAY\\[(${literalCast}(?:,\\s*${literalCast})*)\\]::text\\[\\]`, 'g');
  return definition.replace(arrayCast, (_array, elements) =>
    `ARRAY[${elements.replace(new RegExp(literalCast, 'g'), element => `${element}::text`)}]`);
}

const metadataRows = (key, rows) => sorted(key === 'constraints'
  ? rows.map(row => ({ ...row, definition: canonicalConstraintDefinition(row.definition) })) : rows);

/** Metadata is read from the just-migrated owned database before destructive projection. */
export function schemaSnapshotSql() {
  // pg_dump recreates tables without historical DROP COLUMN attnum gaps. Compare
  // the surviving column order, while retaining every type/default/identity property.
  return `SELECT json_build_object(
    'columns', COALESCE((SELECT json_agg(row_to_json(c) ORDER BY c.table_name,c.ordinal_position)
      FROM (SELECT table_name,row_number() OVER (PARTITION BY table_name ORDER BY ordinal_position) AS ordinal_position,
        column_name,data_type,udt_name,character_maximum_length,
        numeric_precision,numeric_scale,datetime_precision,is_nullable,column_default,is_identity,identity_generation,
        identity_start,identity_increment,identity_minimum,identity_maximum,identity_cycle,is_generated,generation_expression
        FROM information_schema.columns WHERE table_schema='public') c),'[]'::json),
    'constraints', COALESCE((SELECT json_agg(row_to_json(c) ORDER BY c.table_name,c.name)
      FROM (SELECT t.relname AS table_name,p.conname AS name,p.contype::text AS type,
        r.relname AS referenced_table,pg_get_constraintdef(p.oid,true) AS definition,p.convalidated AS validated
        FROM pg_constraint p JOIN pg_class t ON t.oid=p.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        LEFT JOIN pg_class r ON r.oid=p.confrelid WHERE n.nspname='public') c),'[]'::json),
    'indexes', COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.table_name,i.name)
      FROM (SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes
        WHERE schemaname='public') i),'[]'::json),
    'triggers', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.table_name,t.name)
      FROM (SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition,
        t.tgenabled::text AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) t),'[]'::json),
    'sequences', COALESCE((SELECT json_agg(row_to_json(s) ORDER BY s.name)
      FROM (SELECT sequencename AS name,data_type::text,start_value::text,min_value::text,max_value::text,increment_by::text,cycle,cache_size::text
        FROM pg_sequences WHERE schemaname='public') s),'[]'::json)
  )::text;`;
}

export function selectSchemaSnapshot(snapshot, tables, sequences, optionalForeignKeys = []) {
  const selected = new Set(tables), selectedSequences = new Set(sequences);
  const projected = {}, omittedForeignKeys = [];
  for (const key of ['columns', 'constraints', 'indexes', 'triggers', 'sequences']) {
    if (!Array.isArray(snapshot?.[key])) fail(`Physical schema snapshot is missing ${key}.`);
    projected[key] = snapshot[key].filter(row => key === 'sequences' ? selectedSequences.has(row.name) : selected.has(row.table_name));
  }
  const physicalTables = new Set(projected.columns.map(row => row.table_name));
  for (const table of tables) if (!physicalTables.has(table)) fail(`Selected table is absent from physical metadata: ${table}`);
  projected.constraints = projected.constraints.filter(row => {
    if (row.type !== 'f' || selected.has(row.referenced_table)) return true;
    // Only the rules re-resolved from the canonical capability catalog may be supplied.
    const reviewed = optionalForeignKeys.some(rule => rule.name === row.name
      && rule.childTable === row.table_name && rule.parentTable === row.referenced_table);
    if (!reviewed) fail(`Selected table requires an excluded FK target: ${row.table_name}.${row.name} -> ${row.referenced_table}`);
    omittedForeignKeys.push({ table: row.table_name, name: row.name, referencedTable: row.referenced_table });
    return false;
  });
  for (const sequence of sequences) if (!projected.sequences.some(row => row.name === sequence)) fail(`Selected sequence is absent: ${sequence}`);
  return { snapshot: Object.fromEntries(Object.entries(projected).map(([key, rows]) => [key, metadataRows(key, rows)])), omittedForeignKeys: sorted(omittedForeignKeys) };
}

export function assertSchemaPreserved(expected, actual, label = 'Selected schema') {
  for (const key of ['columns', 'constraints', 'indexes', 'triggers', 'sequences']) {
    if (!Array.isArray(actual?.[key]) || !equal(metadataRows(key, expected[key]), metadataRows(key, actual[key]))) {
      const identity = row => `${row.table_name ?? ''}.${row.column_name ?? row.name}`;
      const actualRows = new Map((actual?.[key] ?? []).map(row => [identity(row), row]));
      const changes = expected[key].filter(row => !equal(row, actualRows.get(identity(row)))).slice(0, 3).map(row => {
        const found = actualRows.get(identity(row));
        return `${identity(row)}:${found ? Object.keys(row).filter(field => !equal(row[field], found[field])).join(',') : 'missing'}`;
      });
      fail(`${label}: ${key} changed during projection/reapply (${changes.join('; ') || 'unexpected objects'}); refusing collateral schema loss.`);
    }
  }
}

export function schemaSnapshotHash(snapshot) {
  return createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('hex');
}

function canonicalRoute(route) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || route.includes('#')) fail(`Invalid menu route: ${route}`);
  const parsed = new URL(route, 'http://composer.invalid');
  parsed.searchParams.sort();
  return `${parsed.pathname.replace(/\/$/, '') || '/'}${parsed.search}`;
}

/** Menu/program rows originate exclusively from the checked-in migrations applied to an empty DB. */
export function projectCompositionMenus({ menus, programs, menuRoutes }) {
  if (!Array.isArray(menus) || !Array.isArray(programs) || !Array.isArray(menuRoutes)) fail('Canonical menu route ownership is required.');
  const allowed = new Set(menuRoutes.map(canonicalRoute));
  const byId = new Map();
  for (const menu of menus) {
    if (!Number.isSafeInteger(menu.menu_sn) || menu.menu_sn <= 0 || byId.has(menu.menu_sn)) fail('Menu seed IDs must be unique positive integers.');
    byId.set(menu.menu_sn, menu);
  }
  const selected = new Set(menus.filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y'
    && row.modern_route && allowed.has(canonicalRoute(row.modern_route))).map(row => row.menu_sn));
  for (const id of [...selected]) {
    let current = byId.get(id), visited = new Set([id]);
    while (current.up_menu_sn && current.up_menu_sn !== 0) {
      if (visited.has(current.up_menu_sn)) fail('Selected menu hierarchy contains a cycle.');
      visited.add(current.up_menu_sn);
      current = byId.get(current.up_menu_sn);
      if (!current || current.use_yn !== 'Y' || current.del_yn === 'Y') fail('Selected menu has a missing or disabled parent.');
      selected.add(current.menu_sn);
    }
  }
  const selectedMenus = menus.filter(row => selected.has(row.menu_sn)).map(row => ({ ...row,
    // A retained ancestor is structural; do not preserve its excluded clickable feature.
    ...(!row.modern_route || allowed.has(canonicalRoute(row.modern_route)) ? {} : { modern_route: null, prgrm_file_nm: null }),
  })).sort((a, b) => a.menu_sn - b.menu_sn);
  if (!selectedMenus.length) fail('Selected composition has no usable menu seed.');
  const programNames = new Set(selectedMenus.map(row => row.prgrm_file_nm).filter(Boolean));
  const selectedPrograms = programs.filter(row => programNames.has(row.prgrm_file_nm)).sort((a, b) => a.prgrm_file_nm.localeCompare(b.prgrm_file_nm));
  if (new Set(selectedPrograms.map(row => row.prgrm_file_nm)).size !== selectedPrograms.length) fail('Duplicate menu program definition.');
  for (const name of programNames) if (!selectedPrograms.some(row => row.prgrm_file_nm === name)) fail(`Selected menu program is missing: ${name}`);
  return { menus: selectedMenus, programs: selectedPrograms };
}

/** Retain the reviewed first-bootstrap/revocation guards, replacing only the three seed inventories. */
export function buildCompositionAdminSeed({ bootstrapSql, projection, permissionCodes, permissionCatalog }) {
  // Match generate-permissions.mjs regeneration on every checkout platform.
  bootstrapSql = bootstrapSql.replace(/\r\n/g, '\n');
  const { menus, programs } = projection;
  if (!menus.length || !Array.isArray(permissionCodes) || !Array.isArray(permissionCatalog?.permissions)) fail('Invalid composition seed plan.');
  const selectedPermissions = new Set(permissionCodes);
  const permissions = permissionCatalog.permissions.filter(row => selectedPermissions.has(row.code));
  if (permissions.length !== selectedPermissions.size) fail('Composition references an unknown OPERATION code.');
  if (!['AUTHRT_GRANT', 'AUTHRT_ASSIGN'].every(code => selectedPermissions.has(code))) fail('Composition must preserve permission administration.');
  const operationRows = permissions.flatMap(permission => permission.defaultGroups.map(group => {
    if (!['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER'].includes(group)) fail(`Unknown default permission group: ${group}`);
    return `        (${literal(group)}, ${literal(permission.code)})`;
  }));
  const operationBlock = /-- BEGIN GENERATED BASE OPERATION GRANTS[\s\S]*?-- END GENERATED BASE OPERATION GRANTS/g;
  if ([...bootstrapSql.matchAll(operationBlock)].length !== 1) fail('Reviewed bootstrap OPERATION marker is missing or ambiguous.');
  let sql = bootstrapSql.replace(operationBlock, `-- BEGIN GENERATED BASE OPERATION GRANTS\n${operationRows.join(',\n')}\n-- END GENERATED BASE OPERATION GRANTS`);
  const menuBlock = /        INSERT INTO tb_menu_info\s+\(menu_sn, up_menu_sn,[\s\S]*?ON CONFLICT \(menu_sn\) DO NOTHING;/g;
  if ([...sql.matchAll(menuBlock)].length !== 1) fail('Reviewed bootstrap menu inventory is missing or ambiguous.');
  const audit = "'SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP";
  const programsSql = programs.length ? `        INSERT INTO tb_prgrm_lst\n            (prgrm_file_nm,prgrm_korn_nm,url,prgrm_strg_path,prgrm_expln,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)\n        VALUES\n${programs.map(row => `            (${['prgrm_file_nm', 'prgrm_korn_nm', 'url', 'prgrm_strg_path', 'prgrm_expln'].map(key => literal(row[key])).join(',')},${audit})`).join(',\n')}\n        ON CONFLICT (prgrm_file_nm) DO NOTHING;\n\n` : '';
  const menusSql = `        INSERT INTO tb_menu_info\n            (menu_sn,up_menu_sn,menu_ordr,menu_nm,prgrm_file_nm,menu_expln,modern_route,use_yn,del_yn,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)\n        VALUES\n${menus.map(row => `            (${row.menu_sn},${row.up_menu_sn ?? 'NULL'},${row.menu_ordr},${['menu_nm', 'prgrm_file_nm', 'menu_expln', 'modern_route', 'use_yn', 'del_yn'].map(key => literal(row[key])).join(',')},${audit})`).join(',\n')}\n        ON CONFLICT (menu_sn) DO NOTHING;`;
  sql = sql.replace(menuBlock, programsSql + menusSql);
  const menuIdPredicate = `menu_sn IN (${menus.map(row => row.menu_sn).join(',')})`;
  if ((sql.match(/menu_sn BETWEEN 910 AND 920/g) ?? []).length !== 2) fail('Reviewed bootstrap NAVIGATION inventory predicates drifted.');
  sql = sql.replaceAll('menu_sn BETWEEN 910 AND 920', menuIdPredicate);
  // Modern menu IDs come from the final migration inventory, which has already retired the role alias.
  sql = sql.replace('DELETE FROM tb_menu_info WHERE menu_sn = 914;', '-- Historical role alias is absent from the projected menu inventory.');
  return `-- Composer seed: checked-in migration menu/program inventory and selected source-owned OPERATION defaults.\n${sql}`;
}
