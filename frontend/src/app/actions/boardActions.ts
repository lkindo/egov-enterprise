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

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const articleData: BoardArticle = { nttSj, nttCn, bbsId };
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

    if (response) {
      revalidatePath(`/admin/community/boards`);
      const targetId = isEdit ? nttId : response as string;
      return {
        success: true,
        message: isEdit ? '게시글이 성공적으로 수정되었습니다.' : '게시글이 성공적으로 등록되었습니다.',
        redirect: `/admin/community/boards/detail?bbsId=${bbsId}&nttId=${targetId}`
      };
    } else {
      return { success: false, message: '저장에 실패했습니다.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
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

    const response: unknown = await client.delete(`/bbs/${bbsId}/${nttId}`, axiosConfig);

    if (response !== undefined) {
      revalidatePath(`/admin/community/boards`);
      return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
    } else {
      return { success: false, message: '삭제에 실패했습니다.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
    console.error('Delete Action Error:', error);
    return { success: false, message: errorMessage };
  }
}
