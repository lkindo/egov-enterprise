/**
 * 상세 본문 스크롤 영역의 키보드 도달성 계약.
 *
 * 이 파일이 존재하는 이유는 **소스 문자열 단언이 동작하지 않는 배선을 통과시켰기 때문**이다.
 * 처음에는 허브(UserOrgHubClient)에서 `useOverflowRegion` 을 부르고 그 props 를 상세 본문 div 에
 * 펼쳤는데, 그 div 는 항목을 선택해야 마운트된다. 훅의 `useLayoutEffect` 는 deps 가 고정이라
 * 허브 마운트 시 `ref.current === null` 로 한 번 돌고 다시 돌지 않아, role·tabIndex·aria-label 이
 * **한 번도 붙지 않았다**. r6 계약은 그 배선을 문자열로만 봤으므로 green 이었다.
 *
 * 그래서 스크롤 영역을 자기 컴포넌트로 분리해 훅이 그 노드와 함께 마운트되게 했고, 이 테스트가
 * 늦게 마운트되는 경우까지 **렌더 결과**로 고정한다.
 */
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { DetailScrollArea } from '../UserOrgHubParts';

/** jsdom 은 레이아웃을 계산하지 않는다 — 넘침 여부를 직접 준다. */
function setOverflow(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 0 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
}

afterEach(() => {
  for (const prop of ['scrollHeight', 'clientHeight', 'scrollWidth', 'clientWidth']) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 0 });
  }
});

/** 선택해야 나타나는 상세 패널 — 실제 허브와 같은 마운트 시점을 재현한다. */
function LateMountHarness() {
  const [selected, setSelected] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setSelected(true)}>선택</button>
      {selected && (
        <DetailScrollArea>
          <p>부서 설명이 길어 넘치는 본문</p>
        </DetailScrollArea>
      )}
    </>
  );
}

describe('상세 본문 스크롤 영역', () => {
  it('선택 뒤에 마운트돼도 넘치면 키보드로 도달 가능하고 이름이 붙는다', () => {
    setOverflow(500, 100);
    render(<LateMountHarness />);

    // 선택 전에는 존재하지 않는다.
    expect(screen.queryByRole('region', { name: '상세 정보 스크롤 영역' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '선택' }));

    const region = screen.getByRole('region', { name: '상세 정보 스크롤 영역' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('넘치지 않으면 불필요한 tab stop 을 만들지 않는다', () => {
    setOverflow(100, 100);
    render(<LateMountHarness />);
    fireEvent.click(screen.getByRole('button', { name: '선택' }));

    expect(screen.queryByRole('region', { name: '상세 정보 스크롤 영역' })).toBeNull();
    expect(screen.getByText('부서 설명이 길어 넘치는 본문').closest('div')).not.toHaveAttribute('tabindex');
  });
});
