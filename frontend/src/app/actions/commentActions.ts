'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
}

interface CreateCommentData {
  nttId: number;
  bbsId: string;
  commentCn: string;
}

export async function createComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const nttId = formData.get('nttId') as string;
  const bbsId = formData.get('bbsId') as string;
  const commentCn = formData.get('commentCn') as string;

  if (!commentCn || commentCn.trim() === '') {
    return { success: false, message: '?볤? ?댁슜님?낅젰?댁＜?몄슂.' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const commentData: CreateCommentData = {
      nttId: parseInt(nttId),
      bbsId,
      commentCn
    };

    const response: unknown = await client.post(`/comments`, commentData, axiosConfig);

    if (response) {
      revalidatePath(`/admin/community/boards/detail`);
      return { success: true, message: '?볤님?등록?섏뿀?듬땲님' };
    } else {
      return { success: false, message: '?볤? 등록님?ㅽ뙣?덉뒿?덈떎.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.';
    console.error('Comment Create Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function deleteComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('commentId') as string;
  const bbsId = formData.get('bbsId') as string;
  const nttId = formData.get('nttId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: unknown = await client.delete(`/comments/${id}`, axiosConfig);

    if (response !== undefined) {
      revalidatePath(`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${nttId}`);
      return { success: true, message: '?볤님님?젣?섏뿀?듬땲님' };
    } else {
      return { success: false, message: '님젣님?ㅽ뙣?덉뒿?덈떎.' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.';
    console.error('Comment Delete Error:', error);
    return { success: false, message: errorMessage };
  }
}
