vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

describe('Tabs Component', () => {
 it('renders tabs structure correctly', () => {
 render(
 <Tabs defaultValue="tab1">
 <TabsList>
 <TabsTrigger value="tab1">님1</TabsTrigger>
 </TabsList>
 <TabsContent value="tab1">콘텐츠1</TabsContent>
 </Tabs>
 );

 expect(screen.getByText(/님1/)).toBeInTheDocument();
 expect(screen.getByText(/콘텐츠1/)).toBeInTheDocument();
 });

 // [2026-10-26] 전역 children 통과 mock 을 걷은 뒤 실물을 본다 — 역할·선택 상태·비활성 패널 숨김이 탭의 계약이다.
 it('탭을 고르면 선택 상태가 옮겨 가고 비활성 패널은 보이지 않는다', async () => {
 render(
 <Tabs defaultValue="tab1">
 <TabsList aria-label="시험 탭">
 <TabsTrigger value="tab1">첫째</TabsTrigger>
 <TabsTrigger value="tab2">둘째</TabsTrigger>
 </TabsList>
 <TabsContent value="tab1">첫째 내용</TabsContent>
 <TabsContent value="tab2">둘째 내용</TabsContent>
 </Tabs>
 );

 const first = screen.getByRole('tab', { name: '첫째' });
 const second = screen.getByRole('tab', { name: '둘째' });
 expect(first).toHaveAttribute('aria-selected', 'true');
 expect(second).toHaveAttribute('aria-selected', 'false');
 expect(screen.getByRole('tabpanel')).toHaveTextContent('첫째 내용');
 expect(screen.queryByText('둘째 내용')).toBeNull();

 await userEvent.click(second);

 expect(second).toHaveAttribute('aria-selected', 'true');
 expect(screen.getByRole('tabpanel')).toHaveTextContent('둘째 내용');
 expect(screen.queryByText('첫째 내용')).toBeNull();
 });
});
