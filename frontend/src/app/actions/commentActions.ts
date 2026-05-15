'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
}

interface CreateCommentData {
  pstId: number;
  bbsId: string;
  cmntCn: string;
}

export async function createComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstId = formData.get('pstId') as string;
  const bbsId = formData.get('bbsId') as string;
  const cmntCn = formData.get('cmntCn') as string;

  if (!cmntCn || cmntCn.trim() === '') {
    return { success: false, message: '댓글 내용을 입력해주세요.' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const commentData: CreateCommentData = {
      pstId: parseInt(pstId),
      bbsId,
      cmntCn
    };

    const response: unknown = await client.post(`/comments`, commentData, axiosConfig);

    if (response) {
      revalidatePath(`/admin/community/boards/detail`);
      return { success: true, message: '댓글이 등록되었습니다.' };
    } else {
      return { success: false, message: '댓글 등록에 실패했습니다.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '오류가 발생했습니다.';
    console.error('Comment Create Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function deleteComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  const bbsId = formData.get('bbsId') as string;
  const pstId = formData.get('pstId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: unknown = await client.delete(`/comments/${id}`, axiosConfig);

    if (response !== undefined) {
      revalidatePath(`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${pstId}`);
      return { success: true, message: '댓글이 삭제되었습니다.' };
    } else {
      return { success: false, message: '삭제에 실패했습니다.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
    console.error('Comment Delete Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function updateComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  const bbsId = formData.get('bbsId') as string;
  const pstId = formData.get('pstId') as string;
  const cmntCn = formData.get('cmntCn') as string;

  if (!cmntCn || cmntCn.trim() === '') {
    return { success: false, message: '댓글 내용을 입력해주세요.' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const commentData = {
      pstId: parseInt(pstId),
      bbsId,
      cmntCn
    };

    const response: unknown = await client.put(`/comments/${id}`, commentData, axiosConfig);

    if (response) {
      revalidatePath(`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${pstId}`);
      return { success: true, message: '댓글이 수정되었습니다.' };
    } else {
      return { success: false, message: '수정에 실패했습니다.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.';
    console.error('Comment Update Error:', error);
    return { success: false, message: errorMessage };
  }
}
