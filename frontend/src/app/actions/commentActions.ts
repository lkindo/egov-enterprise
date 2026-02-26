'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';

export async function deleteCommentAction(commentNo: number) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/comments/${commentNo}`, axiosConfig);
    
    revalidatePath('/admin/system/comments');
    return { success: true, message: '댓글이 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Comment Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
