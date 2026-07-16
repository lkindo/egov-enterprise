/**
 * 행안부 '공공데이터 공통표준용어' 원천 CSV → terms 도메인 매핑 백필 마이그레이션 생성기
 *
 * [P3 잔여 이행, 2026-07-17] meta_standard_terms 는 반입 시 '공통표준도메인명' 컬럼이 소실되어
 * 헌법 제5조 3단계(도메인 타입·길이 기계검증)가 불가능했다. 본 스크립트는 원천 CSV(리포 보존본)에서
 * (용어명, 영문약어) → 도메인명 매핑을 추출해 멱등 UPDATE 마이그레이션을 재생성한다.
 * 원천 갱신(연간) 시: 새 CSV 를 sources/ 에 넣고 본 스크립트 재실행 → 신규 V2_xx 로 저장.
 *
 * 사용: node .agent/scripts/generate-terms-domain-migration.js \
 *        [csv경로=.agent/knowledge/db-standard-constitution/artifacts/sources/mois-standard-terms-20251101.csv] \
 *        [출력=api-server/src/main/resources/db/migration/V2_17__seed_terms_domain_mapping.sql]
 */
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2] || '.agent/knowledge/db-standard-constitution/artifacts/sources/mois-standard-terms-20251101.csv';
const outPath = process.argv[3] || 'api-server/src/main/resources/db/migration/V2_17__seed_terms_domain_mapping.sql';

function parseCsv(txt) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < txt.length; i++) {
        const c = txt[i];
        if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
        else {
            if (c === '"') q = true;
            else if (c === ',') { row.push(f); f = ''; }
            else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
            else f += c;
        }
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
}

const esc = (s) => s.replace(/'/g, "''");

const txt = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const rows = parseCsv(txt);
const header = rows[0];
if (header[0] !== '공통표준용어명' || header[2] !== '공통표준용어영문약어명' || header[3] !== '공통표준도메인명') {
    throw new Error('원천 CSV 컬럼 구조가 예상과 다릅니다: ' + header.slice(0, 5).join(','));
}
const data = rows.slice(1).filter((r) => r.length > 3 && r[0] && r[3]);
console.log(`원천 행: ${data.length} (도메인명 보유)`);

const CHUNK = 1000;
const chunks = [];
for (let i = 0; i < data.length; i += CHUNK) {
    const vals = data.slice(i, i + CHUNK)
        .map((r) => `('${esc(r[0])}','${esc(r[2])}','${esc(r[3])}')`)
        .join(',\n');
    chunks.push(
`UPDATE meta_standard_terms t
   SET domain_name = v.d
  FROM (VALUES
${vals}
       ) AS v(n, a, d)
 WHERE t.term_name = v.n AND t.eng_abbr = v.a
   AND t.domain_name IS DISTINCT FROM v.d;`);
}

const sql = `-- =====================================================================
-- V2_17: terms→domains 도메인 매핑 완전 복원 (P3 잔여 — 헌법 제5조 3단계 기계검증 활성화)
-- =====================================================================
-- ⚠ 본 파일은 생성물이다 — 수기 편집 금지. 재생성: node .agent/scripts/generate-terms-domain-migration.js
-- 원천: .agent/knowledge/db-standard-constitution/artifacts/sources/mois-standard-terms-20251101.csv
--   (행정안전부 '공공데이터 공통표준용어' 2025-11판, data.go.kr 15156379 — 공개 배포, 로그인 불요)
-- 근거: 반입 시 '공통표준도메인명' 컬럼 소실 실측(2026-07-17 P3 조사). 라이브 terms 13,173행이
--   원천과 (용어명+영문약어) 100% 정확 매칭, 도메인명은 domains(126행)에 전량 존재 실측.
-- 승인: 사용자(2026-07-17) — 컬럼 추가 + 전량 백필 + NOT NULL + FK.
-- 멱등: ADD COLUMN IF NOT EXISTS / IS DISTINCT FROM 조건 UPDATE / 존재검사 FK 가드.

ALTER TABLE meta_standard_terms ADD COLUMN IF NOT EXISTS domain_name varchar(100);

${chunks.join('\n\n')}

-- 백필 완결 후 무결성 봉인 (전량 매칭 실측 — 신규 용어 등록 시 도메인 지정을 강제)
ALTER TABLE meta_standard_terms ALTER COLUMN domain_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_meta_standard_terms_meta_standard_domains') THEN
    ALTER TABLE meta_standard_terms ADD CONSTRAINT fk_meta_standard_terms_meta_standard_domains
      FOREIGN KEY (domain_name) REFERENCES meta_standard_domains (domain_name) NOT VALID;
  END IF;
END $$;
ALTER TABLE meta_standard_terms VALIDATE CONSTRAINT fk_meta_standard_terms_meta_standard_domains;

-- 검증(참고): SELECT count(*) FROM meta_standard_terms WHERE domain_name IS NULL; → 0
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`생성 완료: ${outPath} (${(sql.length / 1024).toFixed(0)} KB, UPDATE ${chunks.length}개 청크)`);
