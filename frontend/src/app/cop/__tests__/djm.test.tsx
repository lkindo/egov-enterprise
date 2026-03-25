import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import DeptJobListPage from '../../smart-toolkit/dept-job/selectDeptJobList/page';

vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
 default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
 usePathname: () => '/smart-toolkit/dept-job/selectDeptJobList',
 useSearchParams: () => new URLSearchParams(),
}));

describe('DeptJobListPage', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 });

 it('renders list of department jobs', async () => {
 const mockData = {
 data: {
 resultList: [
 {
 deptJobId: 'JOB_0001',
 deptJobNm: '주간 보고 작성',
 priort: '1', // High
 frstRegisterNm: '팀장',
 frstRegisterPnttm: '2024-06-01'
 }
 ],
 totalCount: 1,
 totalPages: 1
 }
 };
 (axios.get as any).mockResolvedValue(mockData);

 render(<DeptJobListPage />);

 await waitFor(() => {
 expect(screen.getByText('주간 보고 작성')).toBeDefined();
 expect(screen.getByText('높음')).toBeDefined();
 });
 });
});
