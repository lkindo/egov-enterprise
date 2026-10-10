/**
 * 재사용 생성물 DB 번들의 참조 데이터(설계서 B5·12.3). 생성물 DB 는 schema-only 기준선이라 원본 마이그레이션이 넣은 공통코드
 * 그룹(tb_com_cd)과 앱이 하드코딩한 게시판 마스터(BBSMSTR_*)가 빠진다. 그러면 결재 상신 전에 COM075 그룹을 손으로 만들어야 하고
 * 지식 허브·업무 홈의 게시판 영역이 빈다. 생성기는 원본 마이그레이션을 적용한 임시 DB 에서 선택한 기능의 몫만 남겨
 * `R__seed_reference_data.sql` 로 싣는다.
 *
 * 공통코드 그룹은 core 소유가 기본이다. 아래 표의 그룹만 그 기능이 선택될 때 싣는다 — 표는 생산 Java 에서 그 그룹을 읽는 파일의
 * 소유 기능과 같아야 한다(reusable-reference-data.test.mjs 가 카탈로그와 같은 소유 판정으로 대조한다).
 * 상세 코드(tb_com_dtl_cd)는 원본도 시드하지 않는다(결재 업무 구분은 기관이 등록한다 — DEC-OPS-030, PD-DB-003).
 */
export const REFERENCE_SEED_NAME = 'R__seed_reference_data.sql';

export const CODE_GROUP_OWNERS = Object.freeze({
  COM004: 'board',
  COM009: 'board',
  COM075: 'informalsanction',
});

/** 앱이 하드코딩한 게시판 마스터 행을 넣는 원본 시드. 게시판 테이블과 함께 게시판 기능 소유다. */
export const BOARD_MASTER_SEED = 'api-server/src/main/resources/db/migration/R__seed_demo.sql';
export const BOARD_MASTER_TABLE = 'tb_bbs_master';
export const CODE_GROUP_TABLE = 'tb_com_cd';

/** 선택한 기능과 테이블로 참조 데이터 계획을 만든다. */
export function referenceDataPlan(resolvedDomains, tables) {
  const selected = new Set(resolvedDomains);
  if (!tables.includes(CODE_GROUP_TABLE)) throw new Error(`참조 데이터: core 테이블 ${CODE_GROUP_TABLE} 이 구성에 없다`);
  const omittedCodeGroups = Object.entries(CODE_GROUP_OWNERS).filter(([, owner]) => !selected.has(owner)).map(([group]) => group).sort();
  const includeBoardMasters = selected.has('board');
  if (includeBoardMasters !== tables.includes(BOARD_MASTER_TABLE)) {
    throw new Error(`참조 데이터: 게시판 기능 선택(${includeBoardMasters})과 ${BOARD_MASTER_TABLE} 포함(${tables.includes(BOARD_MASTER_TABLE)})이 어긋난다`);
  }
  return {
    omittedCodeGroups,
    includeBoardMasters,
    tables: includeBoardMasters ? [CODE_GROUP_TABLE, BOARD_MASTER_TABLE] : [CODE_GROUP_TABLE],
  };
}

/** 임시 DB 에서 선택하지 않은 기능의 코드 그룹을 지우는 SQL. 지울 그룹이 없으면 빈 문자열이다. */
export function omitCodeGroupsSql(plan) {
  if (!plan.omittedCodeGroups.length) return '';
  const groups = plan.omittedCodeGroups.map(group => {
    if (!/^[A-Z0-9]{1,12}$/.test(group)) throw new Error(`참조 데이터: 코드 그룹 이름이 올바르지 않다: ${group}`);
    return `'${group}'`;
  });
  return `DELETE FROM public.${CODE_GROUP_TABLE} WHERE cd_id IN (${groups.join(', ')});`;
}

/** 원본 시드에서 게시판 마스터 ID 를 읽는다(번들 재적용 뒤 대조할 기대값). */
export function boardMasterIds(seedSql) {
  const ids = [...new Set([...seedSql.matchAll(/\(\s*'(BBSMSTR_[A-Z0-9]{12})'/g)].map(match => match[1]))].sort();
  if (!ids.length) throw new Error('참조 데이터: 게시판 마스터 시드에서 BBSMSTR_ 행을 찾지 못했다');
  return ids;
}
