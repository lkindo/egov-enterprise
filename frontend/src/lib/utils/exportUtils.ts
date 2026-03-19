/**
 * 데이터를 CSV 형식으로 변환하여 다운로드합니다.
 */
export function exportToCsv<T>(data: T[], columns: { header: string; accessorKey: keyof T | string }[], fileName: string) {
 if (!data || !data.length) return;

 const headerRow = columns.map(col => `"${col.header}"`).join(',');
 const dataRows = data.map(item => {
 return columns.map(col => {
 const val = item[col.accessorKey as keyof T];
 return `"${val !== undefined && val !== null ? String(val).replace(/"/g, '""') : ''}"`;
 }).join(',');
 });

 const csvContent = [headerRow, ...dataRows].join('\n');
 const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');

 if (link.download !== undefined) {
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }
}
