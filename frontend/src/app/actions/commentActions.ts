'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

export async function createComment(prevState: any, formData: FormData) {
  const nttId = formData.get('nttId') as string;
  const bbsId = formData.get('bbsId') as string;
  const commentCn = formData.get('commentCn') as string;

  if (!commentCn || commentCn.trim() === '') {
    return { success: false, message: '댓글 내용을 입력해주세요.' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.post(`/comments`, {
      nttId: parseInt(nttId),
      bbsId,
      commentCn
    }, axiosConfig);

    if (response) {
      revalidatePath(`/admin/community/boards/detail`);
      return { success: true, message: '댓글이 등록되었습니다.' };
    } else {
      return { success: false, message: '댓글 등록에 실패했습니다.' };
    }
  } catch (error: any) {
    console.error('Comment Create Error:', error);
    return { success: false, message: error.response?.data?.message || '오류가 발생했습니다.' };
  }
}

export async function deleteComment(prevState: any, formData: FormData) {
  const id = formData.get('commentId') as string;
  const bbsId = formData.get('bbsId') as string;
  const nttId = formData.get('nttId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.delete(`/comments/${id}`, axiosConfig);

    if (response !== undefined) {
      revalidatePath(`/admin/community/boards/detail`);
      return { success: true, message: '댓글이 삭제되었습니다.' };
    } else {
      return { success: false, message: '삭제에 실패했습니다.' };
    }
  } catch (error: any) {
    console.error('Comment Delete Error:', error);
    return { success: false, message: error.response?.data?.message || '삭제 중 오류가 발생했습니다.' };
  }
}
