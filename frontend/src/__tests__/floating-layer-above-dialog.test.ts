import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🧱 플로팅 레이어(Select·Popover·Tooltip)는 Dialog 오버레이 **위**에 떠야 한다.
 *
 * [2026-09-05 CI run 33966060737 실측] 결재 기안 다이얼로그(StandardModal → Dialog, 오버레이
 * `z-[1000]`) 안의 업무 구분 Select 를 열면 드롭다운(Radix Portal, 종전 `z-50`)이 **오버레이
 * 아래에 깔려** 어떤 옵션도 마우스로 고를 수 없었다. Playwright 는 옵션 위치에서
 * `dialog-overlay` 가 포인터를 가로챈다며 180초 동안 355회 재시도한 뒤 죽었고, 사용자도 같은
 * 화면에서 같은 벽을 만난다. 같은 함정을 `CommonCodeClient` 가 이미 `z-[9999]` 수작업 4곳으로
 * 우회하고 있었다 — 즉 소비자마다 다시 밟는 구조적 결함이라 공용 컴포넌트에서 닫는다.
 *
 * 계약: 세 플로팅 콘텐츠의 모든 z 유틸리티는 dialog.tsx 의 최대 z 보다 커야 한다.
 * (토스트 계층 z-[10000] 보다는 작게 둔다 — 드롭다운이 알림을 가리면 안 된다.)
 */
const UI = path.resolve(__dirname, '..', 'components', 'ui');
const read = (file: string) => fs.readFileSync(path.join(UI, file), 'utf8');

/** 소스의 `z-[N]`·`z-N` 유틸리티를 숫자로 뽑는다. */
function zIndexes(source: string): number[] {
  // 후행 경계는 `\b` 로 잡으면 안 된다 — `z-[1100]` 의 `]` 뒤는 단어 경계가 아니라 매치가 0건이 된다.
  return [...source.matchAll(/(?<![\w-])z-(?:\[(\d+)\]|(\d+))(?![\w-])/g)].map((match) => Number(match[1] ?? match[2]));
}

const FLOATING_LAYERS = ['select.tsx', 'popover.tsx', 'tooltip.tsx'] as const;
const TOAST_LAYER_Z = 10000;

describe('플로팅 레이어는 Dialog 오버레이 위에 뜬다', () => {
  const dialogZ = zIndexes(read('dialog.tsx'));

  it('dialog.tsx 의 오버레이·콘텐츠 z 는 정수 유틸리티로 선언돼 있다 — 기준점이 사라지면 계약이 vacuous 하다', () => {
    expect(dialogZ.length).toBeGreaterThan(0);
    expect(Math.max(...dialogZ)).toBe(1000);
  });

  for (const file of FLOATING_LAYERS) {
    it(`${file} 의 모든 z 유틸리티가 Dialog 오버레이보다 높고 토스트보다는 낮다`, () => {
      const zs = zIndexes(read(file));
      expect(zs.length, `${file} 에 z 유틸리티가 없다 — 계약이 vacuous 하다`).toBeGreaterThan(0);
      expect(Math.min(...zs), `${file} 이 Dialog 오버레이(${Math.max(...dialogZ)}) 아래에 깔린다`).toBeGreaterThan(Math.max(...dialogZ));
      expect(Math.max(...zs)).toBeLessThan(TOAST_LAYER_Z);
    });
  }
});
