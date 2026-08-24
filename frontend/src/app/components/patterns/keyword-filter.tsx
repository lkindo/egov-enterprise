'use client';

import React, { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * A1 조회 조건의 최소 형태 — 키워드 한 칸.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1 · §3 G2.
 *
 * 조건이 키워드 하나뿐인 화면이 다수라, 그 한 칸을 화면마다 다시 조립하면 라벨·버튼 문구·
 * Enter 동작이 화면마다 갈라진다(실측: 조회 조건 UI 가 화면별로 제각각인 것이 G2 미이행의
 * 실체였다). 이 컴포넌트는 그 조립을 한 곳으로 모은다.
 *
 * ⚠ 입력 중인 값은 즉시 조회하지 않는다 — 조회 시점은 `조회` 또는 Enter 다. 타이핑마다 서버를
 *   때리는 화면과 섞이면 "언제 결과가 바뀌는가"가 화면마다 달라진다. 디바운스가 필요한 화면은
 *   이 컴포넌트 대신 자체 폼을 쓴다.
 */
export interface KeywordFilterProps {
  /** 입력 라벨. 무엇으로 검색되는지 적는다(예: `제목·작성자`). */
  label: string;
  placeholder?: string;
  /** 현재 적용된 검색어. 외부에서 초기화하면 입력값도 따라간다. */
  value: string;
  /** 조회 실행. 화면은 여기서 페이지를 1로 되돌린다. */
  onSearch: (keyword: string) => void;
  /** 조건 초기화. 미지정 시 빈 문자열로 조회한다. */
  onReset?: () => void;
  /** 라벨·버튼 우측에 덧붙일 추가 조건(기간·상태 등). */
  children?: React.ReactNode;
}

export function KeywordFilter({
  label,
  placeholder,
  value,
  onSearch,
  onReset,
  children,
}: KeywordFilterProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  const [appliedValue, setAppliedValue] = useState(value);

  // 외부에서 조건이 바뀌면(초기화·복귀) 입력창도 그 값을 따른다.
  // effect 가 아니라 렌더 중 조정이다 — effect 안 setState 는 적용된 값으로 한 번 그린 뒤
  // 다시 그리는 연쇄 렌더를 만든다(React 공식 "prop 이 바뀔 때 state 조정" 패턴).
  if (value !== appliedValue) {
    setAppliedValue(value);
    setDraft(value);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-[var(--form-gap)]"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <div className="min-w-60 flex-1 space-y-1">
        <label htmlFor={inputId} className="text-[length:var(--font-size-body)] font-medium">
          {label}
        </label>
        <Input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      {children}
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm">조회</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft('');
            if (onReset) onReset();
            else onSearch('');
          }}
        >
          초기화
        </Button>
      </div>
    </form>
  );
}
