'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

export async function createBoardArticle(prevState: any, formData: FormData) {
  const nttSj = formData.get('nttSj') as string;
  const nttCn = formData.get('nttCn') as string;
  const bbsId = formData.get('bbsId') as string;

  // Validation
  if (!nttSj || nttSj.trim() === '') {
    return { success: false, message: '제목을 입력해주세요.', field: 'nttSj' };
  }
  if (!nttCn || nttCn.trim() === '') {
    return { success: false, message: '내용을 입력해주세요.', field: 'nttCn' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.post('/bbs', {
      nttSj,
      nttCn,
      bbsId
    }, axiosConfig);

    if (response.success) {
      revalidatePath(`/cop/bbs/selectBoardList`);
      return { success: true, message: '게시글이 성공적으로 등록되었습니다.', redirect: `/cop/bbs/selectBoardList?bbsId=${bbsId}` };
    } else {
      return { success: false, message: response.message || '등록에 실패했습니다.' };
    }
  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { success: false, message: error.response?.data?.message || '알 수 없는 오류가 발생했습니다.' };
  }
}

export async function deleteBoardArticle(prevState: any, formData: FormData) {
  const nttId = formData.get('nttId') as string;
  const bbsId = formData.get('bbsId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.delete(`/boards/${bbsId}/posts/${nttId}`, axiosConfig);

    if (response.success) {
      revalidatePath(`/cop/bbs/selectBoardList`);
      return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
    } else {
      return { success: false, message: response.message || '삭제에 실패했습니다.' };
    }
  } catch (error: any) {
    console.error('Delete Action Error:', error);
    return { success: false, message: error.response?.data?.message || '삭제 중 오류가 발생했습니다.' };
  }
}
