vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommunityListPage from '../cmy/selectCommunityList/page';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn().mockResolvedValue({ result: { content: [], totalElements: 0 } }),
 post: vi.fn().mockResolvedValue({}),
 put: vi.fn().mockResolvedValue({}),
 delete: vi.fn().mockResolvedValue({}),
 }
}));

vi.mock('next/link', () => ({
 default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/services/business/community/communityService', () => ({
 getCommunityList: vi.fn().mockResolvedValue({
 resultList: [
 {
 cmmntyId: 'CMM_0001',
 cmmntyNm: '개발팀 커뮤니티',
 cmmntyIntrcn: '개발 관련 논의',
 frstRegisterNm: '테스트님',
 frstRegisterPnttm: '2024-05-01'
 }
 ],
 totalCount: 1,
 })
}));

describe('CommunityListPage', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 });

 it('renders list of communities', async () => {
 const { getCommunityList } = await import('@/services/business/community/communityService');
 (getCommunityList as any).mockResolvedValue({
 resultList: [
 {
 cmmntyId: 'CMM_0001',
 cmmntyNm: '개발팀 커뮤니티',
 cmmntyIntrcn: '개발 관련 논의',
 frstRegisterNm: '테스트님',
 frstRegisterPnttm: '2024-05-01'
 }
 ],
 totalCount: 1,
 });

 render(<CommunityListPage />);

 await waitFor(() => {
 expect(screen.getByText('개발팀 커뮤니티')).toBeDefined();
 });
 });
});
