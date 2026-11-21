/**
 * 운영 계약 실행 명령의 기대 문자열 — 한 곳.
 *
 * `package.json` 의 `test:operational-contracts` 와 게이트 원장(`config/governance/gates.json`)의 같은 명령은 이 값과 글자까지 같아야 한다.
 * 여러 계약이 "이 실행기가 내 시험을 파일 목록을 좁히지 않고 싣는다"를 각자 확인하는데, 종전에는 그 여섯 곳이 명령 전체를 저마다 적어
 * 실행 방식을 바꾸려면 아홉 군데를 함께 고쳐야 했다. 확인하는 내용(글자까지 같음)은 그대로 두고 적는 곳만 하나로 모은다.
 *
 * 동시 실행 수는 실행 자원의 손잡이이지 시험 범위가 아니다 — 파일 집합·reporter·결과 위치는 바꾸지 않는다.
 * [2026-11-22 실측, 이 저장소의 Windows 개발 기계(12 논리 코어·32GB), 같은 커밋 단독 실행, 2,858건 모두 통과]
 *   2 → 34.6분 · 4 → 23.3분 · 6 → 20.0분. 6 은 파일 시간 합이 4 보다 19% 늘어(경합) 부하가 겹칠 때의 시간 초과 여유가 줄므로 4 로 둔다.
 */
export const OPERATIONAL_CONTRACTS_CONCURRENCY = 4;

export const OPERATIONAL_CONTRACTS_RUNNER = [
  `node -e "require('node:fs').mkdirSync('build/operational-contracts',{recursive:true})"`,
  '&&',
  `node --test --test-concurrency=${OPERATIONAL_CONTRACTS_CONCURRENCY}`,
  '--test-reporter=spec --test-reporter-destination=stdout',
  '--test-reporter=./scripts/node-test-junit-reporter.mjs --test-reporter-destination=build/operational-contracts/junit.xml',
  '"scripts/*.test.mjs" ".agent/scripts/*.test.js" "tools/migration-workspace/*.test.mjs"',
  '"tools/migration-workspace-prototype/*.test.mjs" "tools/requirements-workspace/*.test.mjs"',
].join(' ');
