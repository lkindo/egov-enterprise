'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A6 조회 기간 — 프리셋 + 직접 입력.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A6.
 *
 * [왜 필요한가 — 2026-08-26 실측]
 * 로그 저장소 5종(system·login·user·web·privacy)은 **처음부터** `searchBgnDe`/`searchEndDe`
 * 기간 조건을 구현하고 있었고, 컨트롤러의 `BaseSearchDto` 도 `searchKeywordFrom`/`searchKeywordTo`
 * 로 그 값을 받는다. 그런데 화면이 그 값을 한 번도 보내지 않아, 조사자는 기간을 좁힐 수단 없이
 * 전체를 페이지로 훑어야 했다 — 기능이 없던 게 아니라 **전달되지 않았다**.
 *
 * ⚠ 기간은 URL 에 싣지 않는다. 자유 검색어와 같은 취급이며(IA §1.1 6항), 새 query producer 를
 *   만들지 않는다는 기존 계약을 따른다.
 *
 * ⚠ 값 형식은 `YYYY-MM-DD` 다. 서버는 저장소에 따라 하이픈을 제거해 `YYYYMMDD` 컬럼과 비교하거나
 *   (UserLog) 문자열 그대로 비교한다(SysLog `ocrnYmd`) — 이 컴포넌트는 표시 형식만 소유하고
 *   변환은 서버 계약에 맡긴다.
 */
export type PeriodPreset = '1d' | '1w' | '1m' | 'all';

export interface PeriodValue {
  /** `YYYY-MM-DD`. 빈 문자열이면 조건 없음. */
  from: string;
  to: string;
}

export const EMPTY_PERIOD: PeriodValue = { from: '', to: '' };

/** 프리셋 라벨. 순서가 화면 간 드리프트하지 않도록 여기서 고정한다. */
const PRESETS: Array<{ key: PeriodPreset; label: string; days: number | null }> = [
  { key: '1d', label: '최근 1일', days: 1 },
  { key: '1w', label: '최근 1주', days: 7 },
  { key: '1m', label: '최근 1개월', days: 30 },
  { key: 'all', label: '전체', days: null },
];

function toYmd(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 프리셋을 실제 기간으로 바꾼다.
 *
 * ⚠ `today` 를 인자로 받는다 — 컴포넌트가 `new Date()` 를 직접 부르면 서버 렌더와 클라이언트
 *   렌더가 자정 경계에서 갈라진다. 호출 시점(클릭 핸들러)에만 현재 시각을 읽는다.
 */
export function presetToPeriod(preset: PeriodPreset, today: Date): PeriodValue {
  const found = PRESETS.find((item) => item.key === preset);
  if (!found || found.days === null) return EMPTY_PERIOD;

  const from = new Date(today);
  // '최근 1일' 은 오늘 하루다(어제부터가 아니다) — days-1 만큼 거슬러 올라간다.
  from.setDate(from.getDate() - (found.days - 1));
  return { from: toYmd(from), to: toYmd(today) };
}

export interface PeriodFilterProps {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
  /** 조회 조건 라벨. 화면마다 기준 컬럼이 다르므로 무엇의 기간인지 적는다(예: `발생일자`). */
  label: string;
}

export function PeriodFilter({ value, onChange, label }: PeriodFilterProps) {
  const fromId = useId();
  const toId = useId();
  const activePreset = value.from === '' && value.to === '' ? 'all' : null;

  return (
    <div className="space-y-1">
      <span className="block text-[length:var(--font-size-body)] font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={`${label} 프리셋`} className="flex rounded-md border border-border p-0.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={activePreset === preset.key}
              onClick={() => onChange(presetToPeriod(preset.key, new Date()))}
              className={cn(
                'flex h-[var(--control-h-sm)] items-center rounded px-3 text-xs font-bold transition-colors',
                activePreset === preset.key ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label htmlFor={fromId} className="sr-only">{`${label} 시작일`}</label>
        <Input
          id={fromId}
          type="date"
          className="w-40"
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
        <span aria-hidden="true" className="text-muted-foreground">~</span>
        <label htmlFor={toId} className="sr-only">{`${label} 종료일`}</label>
        <Input
          id={toId}
          type="date"
          className="w-40"
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * 엔드포인트가 실제로 파싱하는 날짜 형식.
 *
 * ⚠ 서버 계약이 **엔드포인트마다 다르다**(2026-08-26 백엔드 실측). 형식을 틀리면 오류가 아니라
 *   **조용히 틀린 결과**가 나오므로 호출부가 어느 계약을 쓰는지 명시하게 한다.
 *
 * | 로그 | 기대 형식 | 근거 | 틀렸을 때 |
 * |---|---|---|---|
 * | system | `YYYYMMDD` | `ocrnYmd.trim().between(...)` — 하이픈 제거 없음. 컬럼은 `@Column(length = 8)` 이고 메타 표준이 `OCRN_YMD = 연월일C8` 이다 | 문자열 비교가 어긋나 **빈 결과** |
 * | login | `YYYYMMDD` | `LocalDate.parse(x, "yyyyMMdd")` | 파싱 예외 → `catch` 가 조건을 null 로 만들어 **필터가 통째로 무시됨** |
 * | user·web | 둘 다 가능 | `x.replace("-", "")` 후 비교 | — |
 * | privacy | `yyyy-MM-dd` | `LocalDate.parse(x, "yyyy-MM-dd")` | 위와 같은 무시 |
 *
 * 이 불일치 자체는 백엔드 계약 결함이며 별도 과제다(GAP-UI-002). 여기서는 각 화면이
 * **실제 계약**을 쓰게 해서 사용자에게 거짓 결과가 보이지 않게 한다.
 */
export type PeriodParamFormat = 'compact' | 'hyphenated';

/**
 * 서버 요청 파라미터로 바꾼다. 한쪽만 입력된 기간은 **보내지 않는다** —
 * 저장소가 `between` 을 쓰므로 한쪽만 주면 조건이 통째로 무시되어, 화면은 좁혀졌다고
 * 보여 주는데 결과는 전체인 상태가 된다(가장 위험한 종류의 불일치다).
 */
export function periodToParams(
  period: PeriodValue,
  format: PeriodParamFormat,
): { searchKeywordFrom?: string; searchKeywordTo?: string } {
  if (!period.from || !period.to) return {};
  const encode = (value: string) => (format === 'compact' ? value.replace(/-/g, '') : value);
  return { searchKeywordFrom: encode(period.from), searchKeywordTo: encode(period.to) };
}
