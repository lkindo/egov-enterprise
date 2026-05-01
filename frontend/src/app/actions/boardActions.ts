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
  nttSj: string;
  nttCn: string;
  bbsId: string;
  replyAt?: string;
  parntsId?: string;
  eventDate?: string;
  qnaStatus?: string;
  qnaCategory?: string;
  password?: string;
  ntcrNm?: string;
  ntcrId?: string;
}

export async function saveBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const nttId = formData.get('nttId') as string;
  const parntsId = formData.get('parntsId') as string;
  const nttSj = formData.get('nttSj') as string;
  const nttCn = formData.get('nttCn') as string;
  const bbsId = formData.get('bbsId') as string;
  const isEdit = !!nttId && nttId !== '';
  const isReply = !!parntsId && parntsId !== '' && !isEdit;

  if (!nttSj || nttSj.trim() === '') return { success: false, message: '제목을 입력해주세요.', field: 'nttSj' };
  if (!nttCn || nttCn.trim() === '') return { success: false, message: '내용을 입력해주세요.', field: 'nttCn' };

  const eventDate = formData.get('eventDate') as string;
  const qnaStatus = formData.get('qnaStatus') as string;
  const qnaCategory = formData.get('qnaCategory') as string;
  const password = formData.get('password') as string;
  const ntcrNm = formData.get('ntcrNm') as string;
  const ntcrId = formData.get('ntcrId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const articleData: BoardArticle = { 
      nttSj, 
      nttCn, 
      bbsId, 
      eventDate: eventDate || undefined, 
      qnaStatus: qnaStatus || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'QA01' : undefined), 
      qnaCategory: qnaCategory || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'CAT01' : undefined),
      password: password || '1',
      ntcrNm: ntcrNm || undefined,
      ntcrId: ntcrId || undefined
    };
    if (isReply) {
      articleData.replyAt = 'Y';
      articleData.parntsId = parntsId;
    }

    const apiFormData = new FormData();
    apiFormData.append('board', new Blob([JSON.stringify(articleData)], { type: 'application/json' }));

    // Extract files
    const files = formData.getAll('files') as File[];
    files.forEach(file => { if (file && file.size > 0) apiFormData.append('file', file); });

    let response: unknown;
    if (isEdit) {
      response = await client.put(`/bbs/${bbsId}/${nttId}`, apiFormData, {
        ...axiosConfig,
        headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
      });
    } else {
      response = await client.post(`/bbs/${bbsId}`, apiFormData, {
        ...axiosConfig,
        headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
      });
    }

    revalidatePath(`/admin/community/boards/selectBoardList`);
    const targetId = isEdit ? nttId : response as string;
    
    return {
      success: true,
      message: isEdit ? '게시글이 성공적으로 수정되었습니다.' : '게시글이 성공적으로 등록되었습니다.',
      redirect: `/admin/community/boards/detail?bbsId=${bbsId}&nttId=${targetId}`
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
    console.error('Save Action Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function deleteBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const nttId = formData.get('nttId') as string;
  const bbsId = formData.get('bbsId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/bbs/${bbsId}/${nttId}`, axiosConfig);

    revalidatePath(`/admin/community/boards/selectBoardList`);
    return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '삭제 중 오류가 발생했습니다.';
    console.error('Delete Action Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function likeBoardArticle(bbsId: string, nttId: string): Promise<{ success: boolean; count?: number }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response = await client.patch<number>(`/boards/${bbsId}/posts/${nttId}/like`, null, axiosConfig);

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
