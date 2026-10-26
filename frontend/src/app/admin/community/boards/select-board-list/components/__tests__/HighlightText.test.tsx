import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-26 ADR-0043 0차 UX-01] 검색어 강조가 정규식 특수문자에서 화면을 죽이지 않는다.
 *
 * 종전 강조는 검색어를 정규식 원문으로 썼다 — 'C++'·'('·'?'·'[' 는 SyntaxError 를 던져 목록 화면 전체가 오류 경계로 바뀌었다. 내용
 * 검색(searchCnd=1)에서는 '(' 처럼 흔한 문자로도 결과가 생겨 쉽게 재현됐다. 결과가 있는 특수문자 검색어로 실제 템플릿을 그린다.
 */
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import { HighlightText } from '../HighlightText';
import { DefaultTemplate } from '../BoardTemplates';

const marks = (container: HTMLElement) => Array.from(container.querySelectorAll('mark')).map((mark) => mark.textContent);

describe('HighlightText', () => {
  it.each([
    ['C++', 'C++ 입문과 c++ 심화', ['C++', 'c++']],
    ['(', '연차(유급) 안내 (개정)', ['(', '(']],
    ['?', '왜 안 되나요? 정말?', ['?', '?']],
    ['[', '[공지] 점검 [완료]', ['[', '[']],
    ['.*', '모든 글 .* 패턴', ['.*']],
    ['\\', '경로 C:\\temp', ['\\']],
  ])('검색어 %s 를 글자 그대로 찾아 강조하고 원문을 바꾸지 않는다', (word, text, expected) => {
    const { container } = render(<p data-testid="text"><HighlightText text={text} highlight={word} /></p>);

    expect(screen.getByTestId('text')).toHaveTextContent(text, { normalizeWhitespace: false });
    expect(marks(container)).toEqual(expected);
  });

  it('대소문자를 가리지 않고 찾되 원문의 글자를 그대로 보인다', () => {
    const { container } = render(<p><HighlightText text="Java와 JAVA, java" highlight="jaVA" /></p>);
    expect(marks(container)).toEqual(['Java', 'JAVA', 'java']);
  });

  it('검색어가 비었거나 공백뿐이면 강조하지 않고, 없는 글자면 원문만 보인다', () => {
    const { container, rerender } = render(<p><HighlightText text="제목" highlight="  " /></p>);
    expect(marks(container)).toEqual([]);
    rerender(<p><HighlightText text="제목" highlight="없음" /></p>);
    expect(marks(container)).toEqual([]);
    expect(container).toHaveTextContent('제목');
  });

  it('🚨 결과가 있는 특수문자 검색어로 목록 템플릿을 그려도 오류 없이 제목과 강조를 보인다', () => {
    const { container } = render(
      <DefaultTemplate
        bbsId="BBS-1"
        querySearchWrd="C++"
        handleLike={vi.fn()}
        pendingLikePstSn={null}
        likesOpen={false}
        list={[{ pstSn: 1, pstTtl: 'C++ 컴파일 오류(빌드)', userNm: '작성자' } as never]}
      />,
    );

    expect(screen.getByRole('link')).toHaveTextContent('C++ 컴파일 오류(빌드)');
    expect(marks(container)).toEqual(['C++']);
  });
});
