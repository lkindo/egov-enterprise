'use client';

import { Download } from 'lucide-react';

interface DataExportExcelProps {
 data: any[];
 headers: { label: string; key: string }[];
 filename?: string;
 className?: string;
}

/**
 * ?뚯씠釉님곗씠?곕? CSV 정적?쇰줈 추출?섏뿬 ?묒님먯꽌 ...?덈룄濡님섎뒗 컴포넌트
 */
export function DataExportExcel({ data, headers, filename = "export_data", className }: DataExportExcelProps) {
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
 엑셀 내보내기
 </button>
 );
}
