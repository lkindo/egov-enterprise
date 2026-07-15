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

/**
 * [V5 Standardized] Board Article Interface matching BoardSaveRequest.java record
 */
interface BoardArticle {
  bbsId: string;
  pstTtl: string;
  pstCn: string;
  pstBgngYmd?: string;
  pstEndYmd?: string;
  atchFileId?: string;
  evntDt?: string;
  qnaSttsCd?: string;
  qnaCatCd?: string;
  scrtYn?: string;
  useYn?: string;
  pswd?: string;
  // extra fields for form logic
  replyYn?: string;
  parnts?: string;
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

  const evntDt = formData.get('evntDt') as string;
  const qnaSttsCd = formData.get('qnaSttsCd') as string;
  const qnaCatCd = formData.get('qnaCatCd') as string;
  const pswd = formData.get('pswd') as string;
  const scrtYn = formData.get('scrtYn') as string || 'N';
  const useYn = formData.get('useYn') as string || 'Y';
  const pstBgngYmd = formData.get('pstBgngYmd') as string;
  const pstEndYmd = formData.get('pstEndYmd') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const articleData: BoardArticle = { 
      bbsId,
      pstTtl, 
      pstCn, 
      pstBgngYmd: pstBgngYmd || undefined,
      pstEndYmd: pstEndYmd || undefined,
      evntDt: evntDt || undefined, 
      qnaSttsCd: qnaSttsCd || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'QA01' : undefined), 
      qnaCatCd: qnaCatCd || (bbsId === 'BBSMSTR_DDDDDDDDDDDD' ? 'CAT01' : undefined),
      pswd: pswd || '1',
      scrtYn: scrtYn === 'Y' ? 'Y' : 'N',
      useYn: useYn === 'N' ? 'N' : 'Y'
    };
    
    if (isReply) {
      articleData.replyYn = 'Y';
      articleData.parnts = parnts;
    }

    // Extract files if any
    const files = formData.getAll('files') as File[];
    const hasFiles = files.some(file => file && file.size > 0);

    let response: any;
    
    if (hasFiles) {
      // Backend currently doesn't have @RequestPart in BoardApiController,
      // so this might still fail 415 or 400 until backend is updated.
      // But we use multipart/form-data as intended for files.
      const apiFormData = new FormData();
      apiFormData.append('board', new Blob([JSON.stringify(articleData)], { type: 'application/json' }));
      files.forEach(file => { if (file && file.size > 0) apiFormData.append('file', file); });
      
      if (isEdit) {
        response = await client.put(`/boards/${bbsId}/posts/${pstId}`, apiFormData, {
            ...axiosConfig,
            headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
          });
      } else {
        response = await client.post(`/boards/posts`, apiFormData, {
            ...axiosConfig,
            headers: { ...axiosConfig?.headers, 'Content-Type': 'multipart/form-data' }
          });
      }
    } else {
      // No files? Send plain JSON. This matches @RequestBody in BoardApiController.
      if (isEdit) {
        response = await client.put(`/boards/${bbsId}/posts/${pstId}`, articleData, axiosConfig);
      } else {
        response = await client.post(`/boards/posts`, articleData, axiosConfig);
      }
    }

    if (!response && !isEdit) {
      throw new Error('저장에 실패했습니다.');
    }

    revalidatePath(`/admin/community/boards/select-board-list`);
    const targetId = isEdit ? pstId : (response as any);
    
    return {
      success: true,
      message: isEdit ? '게시글이 성공적으로 수정되었습니다.' : '게시글이 성공적으로 등록되었습니다.',
      redirect: `/admin/community/boards/detail?bbsId=${bbsId}&pstId=${targetId}`
    };
  } catch (error: any) {
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

    const response = await client.delete(`/boards/${bbsId}/posts/${pstId}`, axiosConfig);
    
    revalidatePath(`/admin/community/boards/select-board-list`);
    return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
  } catch (error: any) {
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

    const response = await client.patch<number>(`/boards/${bbsId}/posts/${pstId}/like`, null, axiosConfig);

    if (response !== undefined) {
      return { success: true, count: response };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error('Like Action Error:', error);
    return { success: false };
  }
}
