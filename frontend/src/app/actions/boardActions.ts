'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
  field?: string;
  redirect?: string;
}

interface BoardArticle {
  pstTtl: string;
  pstCn: string;
  bbsId: string;
  replyYn?: string;
  parnts?: string;
  eventDate?: string;
  qnaStatus?: string;
  qnaCategory?: string;
  password?: string;
  ntcrNm?: string;
  ntcrId?: string;
  secretYn?: string;
  noticeYn?: string;
}

export async function saveBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstId = formData.get('pstId') as string;
  const parnts = formData.get('parnts') as string;
  const pstTtl = formData.get('pstTtl') as string;
  const pstCn = formData.get('pstCn') as string;
  const bbsId = formData.get('bbsId') as string;
  const isEdit = !!pstId && pstId !== '';
  const isReply = !!parnts && parnts !== '' && !isEdit;

  if (!pstTtl || pstTtl.trim() === '') return { success: false, message: '제목을 입력해주세요.', field: 'pstTtl' };
  if (!pstCn || pstCn.trim() === '') return { success: false, message: '내용을 입력해주세요.', field: 'pstCn' };

  const eventDate = formData.get('eventDate') as string;
  const qnaStatus = formData.get('qnaStatus') as string;
  const qnaCategory = formData.get('qnaCategory') as string;
  const password = formData.get('password') as string;
  const ntcrNm = formData.get('ntcrNm') as string;
  const ntcrId = formData.get('ntcrId') as string;
  const secretYn = formData.get('secretYn') as string || 'N';
  const noticeYn = formData.get('noticeYn') as string || 'N';

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const articleData: BoardArticle = { 
      pstTtl, 
      pstCn, 
      bbsId, 
      eventDate: eventDate || undefined, 
      qnaStatus: qnaStatus || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'QA01' : undefined), 
      qnaCategory: qnaCategory || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'CAT01' : undefined),
      password: password || '1',
      ntcrNm: ntcrNm || undefined,
      ntcrId: ntcrId || undefined,
      secretYn,
      noticeYn
    };
    if (isReply) {
      articleData.replyYn = 'Y';
      articleData.parnts = parnts;
    }

    const apiFormData = new FormData();
    apiFormData.append('board', new Blob([JSON.stringify(articleData)], { type: 'application/json' }));

    // Extract files
    const files = formData.getAll('files') as File[];
    files.forEach(file => { if (file && file.size > 0) apiFormData.append('file', file); });

    const response = isEdit 
      ? await client.put(`/bbs/${bbsId}/${pstId}`, apiFormData, {
          ...axiosConfig,
          headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
        })
      : await client.post(`/bbs/${bbsId}`, apiFormData, {
          ...axiosConfig,
          headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
        });

    if (!response && !isEdit) {
      throw new Error('저장에 실패했습니다.');
    }

    revalidatePath(`/admin/community/boards/selectBoardList`);
    const targetId = isEdit ? pstId : response as string;
    
    return {
      success: true,
      message: isEdit ? '게시글이 성공적으로 수정되었습니다.' : '게시글이 성공적으로 등록되었습니다.',
      redirect: `/admin/community/boards/detail?bbsId=${bbsId}&pstId=${targetId}`
    };
  } catch (error: unknown) {
    const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
    console.error('Save Action Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function deleteBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstId = formData.get('pstId') as string;
  const bbsId = formData.get('bbsId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response = await client.delete(`/bbs/${bbsId}/${pstId}`, axiosConfig);
    
    if (response === null || response === undefined) {
      throw new Error('삭제에 실패했습니다.');
    }

    revalidatePath(`/admin/community/boards/selectBoardList`);
    return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
  } catch (error: unknown) {
    const errorMessage = error.response?.data?.message || error.message || '삭제 중 오류가 발생했습니다.';
    console.error('Delete Action Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function likeBoardArticle(bbsId: string, pstId: string): Promise<{ success: boolean; count?: number }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response = await client.patch<number>(`/bbs/${bbsId}/${pstId}/like`, null, axiosConfig);

    if (response) {
      return { success: true, count: response };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error('Like Action Error:', error);
    return { success: false };
  }
}
