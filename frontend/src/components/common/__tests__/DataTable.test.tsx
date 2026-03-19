import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, Column } from '../DataTable';
import React from 'react';

interface MockData {
 id: number;
 name: string;
 status: string;
}

const columns: Column<MockData>[] = [
 { header: '아이디', accessorKey: 'id', sortable: true },
 { header: '이름', accessorKey: 'name', sortable: true },
 { header: '상태', accessorKey: 'status' }
];

const data: MockData[] = [
 { id: 1, name: 'Alice', status: 'Active' },
 { id: 2, name: 'Bob', status: 'Inactive' }
];

describe('DataTable', () => {
 it('renders table headers and data correctly', () => {
 render(<DataTable columns={columns} data={data} title="Test Table" />);

 expect(screen.getByText('Test Table')).toBeInTheDocument();
 expect(screen.getByText('아이디')).toBeInTheDocument();
 expect(screen.getByText('Alice')).toBeInTheDocument();
 expect(screen.getByText('Bob')).toBeInTheDocument();
 });

 it('shows empty state when data is empty', () => {
 render(<DataTable columns={columns} data={[]} />);
 expect(screen.getByText(/데이터가 없습니다/)).toBeInTheDocument();
 });

 it('calls onSort when a sortable header is clicked', () => {
 const onSort = vi.fn();
 render(<DataTable columns={columns} data={data} onSort={onSort} />);

 const idHeader = screen.getByText('아이디');
 fireEvent.click(idHeader);

 expect(onSort).toHaveBeenCalledWith('id', 'asc');
 });

 it('shows skeleton loader when loading is true', () => {
 const { container } = render(<DataTable columns={columns} data={data} loading={true} />);
 // Check for presence of skeleton elements
 expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
 });

 it('calls onExport when export button is clicked', () => {
 const onExport = vi.fn();
 render(<DataTable columns={columns} data={data} onExport={onExport} />);

 const exportBtn = screen.getByRole('button', { name: /엑셀 다운로드/i });
 fireEvent.click(exportBtn);

 expect(onExport).toHaveBeenCalled();
 });
});
