'use client';

import { Download } from 'lucide-react';
import { getTodayYmd } from '@/lib/date/today-ymd';

/**
 * 내보내는 범위. **필수다** — 호출부가 자기 데이터의 범위를 선언하게 해서
 * "현재 페이지만 내보내면서 전체처럼 라벨링"(카탈로그 A6 금지)을 구조적으로 막는다.
 *
 *   page    서버 페이징의 **현재 페이지 행만** 내보낸다. 라벨이 그 사실을 밝힌다.
 *   loaded  화면이 들고 있는 결과 전량을 내보낸다(클라이언트 페이징·단일 스냅샷).
 */
export type ExportScope = 'page' | 'loaded';

interface DataExportExcelProps<T extends object = object> {
  data: ReadonlyArray<T>;
  headers: { label: string; key: string }[];
  scope: ExportScope;
  filename?: string;
  className?: string;
}

/**
 * 스프레드시트가 수식으로 해석하는 첫 글자. 셀 값이 이 글자로 시작하면 파일을 연 사람의 엑셀이
 * `=HYPERLINK(...)`·`=cmd|...` 같은 입력을 실행할 수 있다(CSV 수식 주입, OWASP).
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * CSV 셀 1개를 만든다. 사용자가 입력한 문자열이 수식 시작 글자로 시작하면 앞에 `'` 를 붙여
 * 텍스트로 고정한다(2026-09-25 DIP S2). 숫자 값은 수식을 담을 수 없으므로 그대로 둔다 —
 * 측정값의 음수를 글자로 바꾸지 않기 위해서다.
 */
export function toCsvCell(value: unknown): string {
  const raw = value ?? ''; // [2026-09-15 DEC-OPS-100] 측정값 0 을 빈 칸으로 바꾸지 않는다 — 값이 없을 때(null·undefined)만 비운다
  let text = String(raw);
  if (typeof raw !== 'number' && FORMULA_TRIGGER.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/** 파일명에 붙이는 날짜. 서버·브라우저 시간대와 무관하게 한국 날짜(yyyy-MM-dd)를 쓴다. */
export function exportFileDate(now: Date = new Date()): string {
  const ymd = getTodayYmd(now, 'Asia/Seoul');
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/**
 * 표 데이터를 CSV(UTF-8 BOM)로 내려받는 버튼.
 *
 * 서버측 전량 반출이 아니라 **넘겨받은 배열 그대로**를 파일로 만든다. 그래서 범위를 아는 것은
 * 호출부뿐이고, 라벨은 그 선언을 따른다(2026-08-26: 종전에는 현재 페이지만 내보내면서
 * `엑셀 내보내기` 라고만 적어 사용자가 조회 결과 전체로 오해할 수 있었다).
 */
export function DataExportExcel<T extends object = object>({
  data,
  headers,
  scope,
  filename = "export_data",
  className,
}: DataExportExcelProps<T>) {
  const downloadExcel = () => {
    // 1. Create CSV header
    const csvRows = [];
    csvRows.push(headers.map(h => toCsvCell(h.label)).join(','));

    // 2. Add data rows
    for (const row of data) {
      const values = headers.map(h => toCsvCell((row as Record<string, unknown>)[h.key]));
      csvRows.push(values.join(','));
    }

 // 3. Create blob and download (with BOM for Excel Korean support)
 const csvContent = "\uFEFF" + csvRows.join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');

 link.setAttribute('href', url);
 link.setAttribute('download', `${filename}_${exportFileDate()}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 return (
 <button
 onClick={downloadExcel}
 className={className || "flex items-center gap-2 px-3 py-2 text-sm font-semibold border rounded-md hover:bg-accent transition-colors"}
 >
 <Download size={16} />
 {scope === 'page' ? '현재 페이지 엑셀 내보내기' : '엑셀 내보내기'}
 </button>
 );
}
