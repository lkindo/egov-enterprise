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

/**
 * 실제로 적용한 스키마에서 기능 사이 외래 키를 찾아 카탈로그 선언(필수+선택)과 양방향으로 대조한다.
 * core 테이블을 가리키는 외래 키는 core 가 늘 포함되므로 대상이 아니다. 선언 없는 새 외래 키와
 * 사라진 선언 모두 생성을 멈춘다(계획 단계 검사가 낡지 않게 하는 안전망).
 */
export function assertDeclaredCrossDomainForeignKeys(snapshot, catalog) {
  const owners = new Map(catalog.core.tables.map(table => [table, new Set(['core'])]));
  for (const capability of catalog.capabilities) for (const table of capability.database.tables) {
    owners.set(table, new Set([...(owners.get(table) ?? []), capability.id]));
  }
  if (!Array.isArray(snapshot?.constraints)) fail('Physical schema snapshot is missing constraints.');
  const actual = snapshot.constraints.filter(row => row.type === 'f').filter(row => {
    const child = owners.get(row.table_name), parent = owners.get(row.referenced_table);
    if (!child || !parent) fail(`Foreign key touches a table without catalog ownership: ${row.table_name}.${row.name}`);
    return !parent.has('core') && ![...child].some(owner => parent.has(owner));
  }).map(row => `${row.name} ${row.table_name}->${row.referenced_table}`).sort();
  const declared = [...catalog.requiredForeignKeys, ...catalog.optionalForeignKeys]
    .map(contract => `${contract.name} ${contract.childTable}->${contract.parentTable}`).sort();
  const undeclared = actual.filter(key => !declared.includes(key));
  const stale = declared.filter(key => !actual.includes(key));
  if (undeclared.length || stale.length) fail(`Cross-domain foreign keys differ from the composer catalog `
    + `(undeclared: ${undeclared.join(', ') || '-'}; stale: ${stale.join(', ') || '-'}).`);
  return actual;
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

/**
 * 메뉴 목적지를 소유 판정 단위로 줄인다. 경로(pathname)와 `tab` 값만 본다. 다른 쿼리는 소유와 무관하다.
 * `key` 는 탭 기여를 가리키는 정규형(`/path?tab=X`)이다.
 */
export function menuRouteKey(route) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || route.includes('#')) fail(`Invalid menu route: ${route}`);
  const parsed = new URL(route, 'http://composer.invalid');
  const path = parsed.pathname.replace(/\/$/, '') || '/';
  const tab = parsed.searchParams.get('tab') || null;
  return { path, tab, key: tab ? `${path}?tab=${tab}` : path };
}

/**
 * Menu rows originate exclusively from the checked-in migrations applied to an empty DB.
 * 메뉴 행은 경로를 소유한 화면(셸)이 남아 있으면 보인다. `tab` 메뉴는 그 탭을 기여한 기능이 빠지면
 * 숨긴다(`excludedMenuTabs`). 쿼리 문자열을 정확히 비교하지 않는다 — 비교하면 같은 셸의 탭 메뉴가
 * 선언 표기만 달라도 모든 생성물에서 조용히 빠진다.
 */
export function projectCompositionMenus({ menus, menuRoutes, excludedMenuTabs = [] }) {
  if (!Array.isArray(menus) || !Array.isArray(menuRoutes) || !Array.isArray(excludedMenuTabs)) fail('Canonical menu route ownership is required.');
  const shells = new Set(menuRoutes.map(route => {
    const owned = menuRouteKey(route);
    if (owned.tab) fail(`Menu ownership is by path; a tab contribution is not a retained screen: ${route}`);
    return owned.path;
  }));
  const excluded = new Set(excludedMenuTabs.map(route => {
    const contribution = menuRouteKey(route);
    if (!contribution.tab) fail(`An excluded menu tab must name its tab: ${route}`);
    return contribution.key;
  }));
  const visible = route => { const target = menuRouteKey(route); return shells.has(target.path) && !excluded.has(target.key); };
  const byId = new Map();
  for (const menu of menus) {
    if (!Number.isSafeInteger(menu.menu_sn) || menu.menu_sn <= 0 || byId.has(menu.menu_sn)) fail('Menu seed IDs must be unique positive integers.');
    byId.set(menu.menu_sn, menu);
  }
  const selected = new Set(menus.filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y'
    && row.modern_route && visible(row.modern_route)).map(row => row.menu_sn));
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
    ...(!row.modern_route || visible(row.modern_route) ? {} : { modern_route: null }),
  })).sort((a, b) => a.menu_sn - b.menu_sn);
  if (!selectedMenus.length) fail('Selected composition has no usable menu seed.');
  // [2026-10-05] 레거시 연결 프로그램(prgrm_file_nm)·프로그램 원장은 앱이 읽지 않으므로 생성물 시드에 싣지 않는다(GAP-PROGRAM-001).
  return { menus: selectedMenus };
}

/**
 * 라우트 게이트(proxy.ts → page-authorization.ts canEnterRegisteredPage)와 같은 진입 판정.
 * `/admin` 밖은 페이지 게이트가 없다. 등록되지 않은 `/admin` 경로는 들어갈 수 없다.
 */
export function canEnterMenuRoute(route, granted, { pagePermissions, pagePermissionModes = {} }) {
  const { path } = menuRouteKey(route);
  const lower = path.toLowerCase();
  if (lower !== '/admin' && !lower.startsWith('/admin/')) return true;
  const segments = path.split('/');
  const entry = Object.hasOwn(pagePermissions, path) ? [path, pagePermissions[path]] : Object.entries(pagePermissions).find(([candidate]) => {
    const parts = candidate.replace(/\/$/, '').split('/');
    return parts.length === segments.length && parts.every((part, index) => /^\[[^.[\]]+\]$/.test(part) ? segments[index].length > 0 : part === segments[index]);
  });
  if (!entry) return false;
  const required = entry[1];
  if (pagePermissionModes[entry[0]] === 'ALL') return required.length > 0 && required.every(code => granted.has(code));
  return required.length === 0 || required.some(code => granted.has(code));
}

/** 그룹마다 표시하는 메뉴는 그 그룹의 기능 권한으로 들어갈 수 있어야 한다(DEC-OPS-186·215). */
export function assertNavigationEnterable({ menus, navigation, operationGrants, pageAccess }) {
  const byId = new Map(menus.map(menu => [menu.menu_sn, menu]));
  const granted = new Map();
  for (const [group, code] of operationGrants) {
    if (!granted.has(group)) granted.set(group, new Set());
    granted.get(group).add(code);
  }
  const blocked = navigation.filter(row => {
    const menu = byId.get(row.menu_sn);
    if (!menu) fail(`NAVIGATION grant targets an unselected menu: ${row.authrt_cd}:${row.menu_sn}`);
    return menu.modern_route && !canEnterMenuRoute(menu.modern_route, granted.get(row.authrt_cd) ?? new Set(), pageAccess);
  });
  if (blocked.length) {
    fail(`Groups would see menus they cannot enter: ${blocked.map(row => `${row.authrt_cd}:${row.menu_sn}(${byId.get(row.menu_sn).modern_route})`).join(', ')}`);
  }
}

/**
 * 원본 마이그레이션이 남긴 그룹별 메뉴 표시 배정을 선택 메뉴만큼 투영한다. 선택 메뉴는 조상을 함께 고르므로
 * 계층 폐포가 유지된다. 그 그룹이 표시하는 하위가 하나도 남지 않은 분류 메뉴는 빼서 빈 분류를 만들지 않는다.
 */
export function projectCompositionNavigation({ menus, navigation, operationGrants, pageAccess }) {
  if (!Array.isArray(navigation)) fail('Original NAVIGATION grants are required.');
  const byId = new Map(menus.map(menu => [menu.menu_sn, menu]));
  const rows = navigation.filter(row => byId.has(row.menu_sn));
  const shown = new Set();
  for (const row of rows) {
    if (!byId.get(row.menu_sn).modern_route) continue;
    for (let current = byId.get(row.menu_sn); current; current = byId.get(current.up_menu_sn)) shown.add(`${row.authrt_cd}:${current.menu_sn}`);
  }
  const projected = rows.filter(row => shown.has(`${row.authrt_cd}:${row.menu_sn}`))
    .map(row => ({ authrt_cd: row.authrt_cd, menu_sn: row.menu_sn }))
    .sort((left, right) => left.authrt_cd.localeCompare(right.authrt_cd) || left.menu_sn - right.menu_sn);
  if (!projected.some(row => row.authrt_cd === 'ROLE_ADMIN')) fail('Projected NAVIGATION grants leave the administrator without menus.');
  assertNavigationEnterable({ menus, navigation: projected, operationGrants, pageAccess });
  return projected;
}

/** Retain the reviewed first-bootstrap/revocation guards, replacing only the three seed inventories. */
const ADMIN_NAVIGATION_STATEMENT = `            INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
            SELECT 'ROLE_ADMIN','NAVIGATION',menu_sn::text,'SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP
              FROM tb_menu_info WHERE menu_sn BETWEEN 910 AND 920;`;

export function buildCompositionAdminSeed({ bootstrapSql, projection, permissionCodes, permissionCatalog, navigation }) {
  // Match generate-permissions.mjs regeneration on every checkout platform.
  bootstrapSql = bootstrapSql.replace(/\r\n/g, '\n');
  const { menus } = projection;
  if (!menus.length || !Array.isArray(permissionCodes) || !Array.isArray(permissionCatalog?.permissions) || !Array.isArray(navigation)) fail('Invalid composition seed plan.');
  const menuIds = new Set(menus.map(row => row.menu_sn));
  if (!navigation.length || navigation.some(row => !['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER'].includes(row.authrt_cd) || !menuIds.has(row.menu_sn))) {
    fail('Composition NAVIGATION grants must name a known group and a selected menu.');
  }
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
  const menusSql = `        INSERT INTO tb_menu_info\n            (menu_sn,up_menu_sn,menu_ordr,menu_nm,menu_expln,modern_route,use_yn,del_yn,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)\n        VALUES\n${menus.map(row => `            (${row.menu_sn},${row.up_menu_sn ?? 'NULL'},${row.menu_ordr},${['menu_nm', 'menu_expln', 'modern_route', 'use_yn', 'del_yn'].map(key => literal(row[key])).join(',')},${audit})`).join(',\n')}\n        ON CONFLICT (menu_sn) DO NOTHING;`;
  sql = sql.replace(menuBlock, menusSql);
  const menuIdPredicate = `menu_sn IN (${menus.map(row => row.menu_sn).join(',')})`;
  if ((sql.match(/menu_sn BETWEEN 910 AND 920/g) ?? []).length !== 2) fail('Reviewed bootstrap NAVIGATION inventory predicates drifted.');
  // 빈 base 의 메뉴 표시는 관리자 전용 문장 대신, 원본 배정을 선택 메뉴만큼 투영한 그룹별 행으로 쓴다.
  if (sql.split(ADMIN_NAVIGATION_STATEMENT).length !== 2) fail('Reviewed bootstrap NAVIGATION grant statement drifted.');
  sql = sql.replace(ADMIN_NAVIGATION_STATEMENT, `            INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
            SELECT seed.group_code,'NAVIGATION',seed.menu_sn,${audit}
            FROM (VALUES
${navigation.map(row => `                (${literal(row.authrt_cd)}, ${literal(String(row.menu_sn))})`).join(',\n')}
            ) AS seed(group_code, menu_sn)
            JOIN tb_menu_info menu ON menu.menu_sn::text = seed.menu_sn;`);
  sql = sql.replaceAll('menu_sn BETWEEN 910 AND 920', menuIdPredicate);
  // Modern menu IDs come from the final migration inventory, which has already retired the role alias.
  sql = sql.replace('DELETE FROM tb_menu_info WHERE menu_sn = 914;', '-- Historical role alias is absent from the projected menu inventory.');
  return `-- Composer seed: checked-in migration menu inventory and selected source-owned OPERATION defaults.\n${sql}`;
}
