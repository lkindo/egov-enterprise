vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Badge } from '../badge';
import { Checkbox } from '../checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';
import { Skeleton } from '../skeleton';
import React from 'react';

describe('Common UI Components Extended', () => {
 describe('Badge', () => {
 it('Badge renders variants correctly', () => {
 const { rerender } = render(<Badge variant="default">기본</Badge>);
 expect(screen.getByText('기본')).toBeInTheDocument();

 rerender(<Badge variant="destructive">오류</Badge>);
 expect(screen.getByText('오류')).toHaveClass('bg-destructive');
 
 rerender(<Badge variant="outline">외곽선</Badge>);
 expect(screen.getByText('외곽선')).toHaveClass('text-foreground');
 });
 });

 describe('Checkbox', () => {
 it('Checkbox renders and handles state', () => {
 const onCheckedChange = vi.fn();
 render(<Checkbox id="test-check" onCheckedChange={onCheckedChange} />);
 const checkbox = screen.getByRole('checkbox');
 expect(checkbox).toBeInTheDocument();
 
 fireEvent.click(checkbox);
 expect(onCheckedChange).toHaveBeenCalledWith(true);
 });

 it('Checkbox can be disabled', () => {
 render(<Checkbox id="disabled-check" disabled />);
 const checkbox = screen.getByRole('checkbox');
 expect(checkbox).toBeDisabled();
 });
 });

 describe('Table', () => {
 it('Table components render correctly', () => {
 render(
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Header 1</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 <TableRow>
 <TableCell>Cell 1</TableCell>
 </TableRow>
 </TableBody>
 </Table>
 );
 
 expect(screen.getByText('Header 1')).toBeInTheDocument();
 expect(screen.getByText('Cell 1')).toBeInTheDocument();
 expect(screen.getByRole('table')).toBeInTheDocument();
 });
 });

 describe('Skeleton', () => {
 it('Skeleton renders with custom className', () => {
 const { container } = render(<Skeleton className="w-[100px] h-[20px]" />);
 const skeleton = container.firstChild as HTMLElement;
 expect(skeleton).toHaveClass('animate-pulse');
 expect(skeleton).toHaveClass('w-[100px]');
 });
 });
});
