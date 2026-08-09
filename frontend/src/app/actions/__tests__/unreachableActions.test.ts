import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 🕳️ 도달 불가 서버 액션 차단 게이트.
 *
 * [2026-08-09 신설] `src/app/actions` 에서 **호출될 수 없는 함수 7개**를 발견해 삭제한 뒤 만든다.
 *
 *   codeActions.ts — saveClCode · deleteClCode · saveCmmnCode · deleteCmmnCode
 *   userActions.ts — createUserAction · updateUserAction · deleteUserAction
 *
 * `'use server'` 모듈에서 **export 되지 않은 함수는 외부에서 호출할 수 없다**.
 * 모듈 안에서도 아무도 부르지 않으면 실행 경로가 아예 없다.
 *
 * ⚠ 단순한 죽은 코드보다 나쁜 이유는 백엔드의 `UnreachableServiceLinterTest` 가 적어 둔 것과 같다 —
 * **도달 불가 코드는 결함을 숨긴다.** 위 7개는 전부 쿠키에서 토큰을 꺼내 백엔드를 호출하는
 * 인증 경계 코드였고, 한 번도 실행된 적이 없으니 검증된 적도 없다. 나중에 누군가 export 한 줄을
 * 붙이는 순간, 검증되지 않은 인가 경로가 그대로 노출된다.
 *
 * [왜 tsc 가 못 잡았나] `noUnusedLocals` 가 꺼져 있다. 켜면 저장소 전체에서 **218건**이
 * 쏟아져(실측) 이 PR 범위에서 감당할 수 없다. 그래서 서버 액션 디렉터리만 겨냥한 게이트를 둔다.
 * 전역 `noUnusedLocals` 도입은 별건으로 남긴다.
 *
 * [예외 목록 없음] 도입 시점 위반 0건이다 — 7개를 전부 삭제한 뒤 만들었다.
 * 예외 목록으로 출발하면 그 목록이 곧 서랍이 된다.
 */
describe('서버 액션 도달 가능성', () => {
  const ACTIONS_DIR = path.resolve(__dirname, '..');

  it('export 되지 않은 함수는 모듈 안에서 실제로 호출돼야 한다', () => {
    const files = fs
      .readdirSync(ACTIONS_DIR)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    // 스캔 대상이 0이면 게이트가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(ACTIONS_DIR, file), 'utf8');
      // 주석 안의 이름을 참조로 세면 "주석만 남기면 통과" 가 되어 게이트가 무력해진다.
      const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

      const declaration = /^(export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm;
      let m: RegExpExecArray | null;

      while ((m = declaration.exec(src)) !== null) {
        const exported = Boolean(m[1]);
        const name = m[2];
        if (exported) {
          continue; // export 된 것은 서버 액션 엔드포인트다 — 클라이언트가 부른다
        }

        // 선언 자신을 제외한 등장 횟수. 이름이 한 번도 더 안 나오면 아무도 안 부른다.
        const occurrences = src.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0;
        if (occurrences <= 1) {
          violations.push(`${file} — ${name}()`);
        }
      }
    }

    expect(
      violations,
      violations.length === 0
        ? ''
        : [
            '',
            '🕳️ 호출될 수 없는 서버 액션이 있습니다.',
            ...violations.map((v) => `  ❌ ${v}`),
            '',
            "'use server' 모듈에서 export 되지 않은 함수는 외부에서 호출할 수 없습니다.",
            '실제로 쓸 것이면 export 하고(⚠ 노출 전 인가를 반드시 검토), 아니면 삭제하십시오.',
            '이 부류는 실행된 적이 없어 검증된 적도 없습니다 — 그대로 노출하면 결함째로 노출됩니다.',
          ].join('\n')
    ).toEqual([]);
  });
});
