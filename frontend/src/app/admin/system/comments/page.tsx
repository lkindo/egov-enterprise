import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { commentAdminService, CommentDetail } from '@/services/admin/system/CommentAdminService';
import CommentAdminClient from './CommentAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '전사 지능형 댓글 통합 관리 | 전자정부 표준프레임워크',
  description: '시스템 전반의 모든 커뮤니케이션 스트림을 실시간으로 관제하고 무결성을 보장합니다.',
};

export default async function AdminCommentPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 패칭
  let initialComments: CommentDetail[] = [];

  try {
    const response = await commentAdminService.getComments({ page: 0, size: 500 }, axiosConfig);
    initialComments = response?.content || response?.data?.content || response || [];
  } catch (error) {
    console.error('Server-side fetch audit logs failed:', error);
  }

  return (
    <Suspense fallback={<CommentAdminLoading />}>
      <CommentAdminClient initialComments={initialComments} />
    </Suspense>
  );
}

function CommentAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 shrink-0">
        <div className="md:col-span-3 h-48 bg-slate-900/5 rounded-[3.5rem]" />
        <div className="h-48 bg-rose-50 rounded-[3.5rem]" />
      </div>
      <div className="h-28 bg-slate-50 rounded-[3.5rem]" />
      <div className="flex-1 bg-slate-100/50 rounded-[5rem] p-12 mt-8" />
    </div>
  );
}