'use client';

import { Download } from 'lucide-react';

/**
 * 내보내는 범위. **필수다** — 호출부가 자기 데이터의 범위를 선언하게 해서
 * "현재 페이지만 내보내면서 전체처럼 라벨링"(카탈로그 A6 금지)을 구조적으로 막는다.
 *
 *   page    서버 페이징의 **현재 페이지 행만** 내보낸다. 라벨이 그 사실을 밝힌다.
 *   loaded  화면이 들고 있는 결과 전량을 내보낸다(클라이언트 페이징·단일 스냅샷).
 */
export type ExportScope = 'page' | 'loaded';

interface DataExportExcelProps {
 data: any[];
 headers: { label: string; key: string }[];
 scope: ExportScope;
 filename?: string;
 className?: string;
}

/**
 * 표 데이터를 CSV(UTF-8 BOM)로 내려받는 버튼.
 *
 * 서버측 전량 반출이 아니라 **넘겨받은 배열 그대로**를 파일로 만든다. 그래서 범위를 아는 것은
 * 호출부뿐이고, 라벨은 그 선언을 따른다(2026-08-26: 종전에는 현재 페이지만 내보내면서
 * `엑셀 내보내기` 라고만 적어 사용자가 조회 결과 전체로 오해할 수 있었다).
 */
export function DataExportExcel({ data, headers, scope, filename = "export_data", className }: DataExportExcelProps) {
 const downloadExcel = () => {
 // 1. Create CSV header
 const csvRows = [];
 csvRows.push(headers.map(h => `"${h.label}"`).join(','));

 // 2. Add data rows
 for (const row of data) {
 const values = headers.map(h => {
 const val = row[h.key] || '';
 return `"${val.toString().replace(/"/g, '""')}"`;
 });
 csvRows.push(values.join(','));
 }

 // 3. Create blob and download (with BOM for Excel Korean support)
 const csvContent = "\uFEFF" + csvRows.join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');

 link.setAttribute('href', url);
 link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
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
