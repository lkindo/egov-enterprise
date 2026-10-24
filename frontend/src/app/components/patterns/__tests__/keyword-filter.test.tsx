import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KeywordFilter } from '../keyword-filter';

/**
 * 조회 조건의 검색 랜드마크 이름 — 한 화면에 조회 조건이 둘 이상이면 서로 구분돼야 한다
 * (axe landmark-unique, 2026-10-24 패턴 갤러리 실측).
 */
describe('KeywordFilter 검색 랜드마크', () => {
  it('landmarkLabel 로 두 조회 조건의 검색 랜드마크를 구분한다', () => {
    render(
      <>
        <KeywordFilter label="코드·이름" landmarkLabel="코드 그룹 조회 조건" value="" onSearch={() => undefined} />
        <KeywordFilter label="부서" landmarkLabel="현황 조회 조건" value="" onSearch={() => undefined} />
      </>,
    );

    expect(screen.getAllByRole('search').map((landmark) => landmark.getAttribute('aria-label')))
      .toEqual(['코드 그룹 조회 조건', '현황 조회 조건']);
    // 랜드마크 이름이 입력 라벨을 포함하지 않으므로 라벨로 찾은 요소는 입력 하나뿐이다.
    expect(screen.getByLabelText('부서')).toBeInstanceOf(HTMLInputElement);
  });

  it('이름을 주지 않으면 종전처럼 이름 없는 랜드마크다(기존 소비 화면의 선택자를 바꾸지 않는다)', () => {
    render(<KeywordFilter label="제목" value="" onSearch={() => undefined} />);

    expect(screen.getByRole('search')).not.toHaveAttribute('aria-label');
    expect(screen.getByLabelText('제목')).toBeInstanceOf(HTMLInputElement);
  });
});
