'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';
import { QNA_BOARD_ID } from '@/config/board-ids';

const BOARD_SAVE_ERROR = '게시글 저장 중 오류가 발생했습니다.';
const BOARD_DELETE_ERROR = '게시글 삭제 중 오류가 발생했습니다.';

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
  atchFileSn?: number;
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

function extractTargetId(response: unknown, fallbackId: string): string {
  if (typeof response === 'string' && response.trim() !== '') {
    return response;
  }
  if (typeof response === 'number') {
    return String(response);
  }
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (obj.pstSn != null) return String(obj.pstSn);
    if (obj.id != null) return String(obj.id);
  }
  return fallbackId;
}

export async function saveBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstSn = formData.get('pstSn') as string;
  const parnts = formData.get('parnts') as string;
  const pstTtl = formData.get('pstTtl') as string;
  const pstCn = formData.get('pstCn') as string;
  const bbsId = formData.get('bbsId') as string;
  const isEdit = !!pstSn && pstSn !== '';
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
      qnaSttsCd: qnaSttsCd || (bbsId === QNA_BOARD_ID ? 'QA01' : undefined),
      qnaCatCd: qnaCatCd || (bbsId === QNA_BOARD_ID ? 'CAT01' : undefined),
      pswd: pswd || '1',
      scrtYn: scrtYn === 'Y' ? 'Y' : 'N',
      useYn: useYn === 'N' ? 'N' : 'Y'
    };
    
    if (isReply) {
      articleData.replyYn = 'Y';
      articleData.parnts = parnts;
    }

    // Extract attached files
    const files = formData.getAll('files') as File[];
    const hasFiles = files.some(file => file && file.size > 0);

    let response: unknown;
    
    if (hasFiles) {
      // Backend currently doesn't have @RequestPart in BoardApiController,
      // so this might still fail 415 or 400 until backend is updated.
      // But we use multipart/form-data as intended for files.
      const apiFormData = new FormData();
      apiFormData.append('board', new Blob([JSON.stringify(articleData)], { type: 'application/json' }));
      files.forEach(file => { if (file && file.size > 0) apiFormData.append('file', file); });
      
      if (isEdit) {
        response = await client.put(`/boards/${bbsId}/posts/${pstSn}`, apiFormData, {
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
        response = await client.put(`/boards/${bbsId}/posts/${pstSn}`, articleData, axiosConfig);
      } else {
        response = await client.post(`/boards/posts`, articleData, axiosConfig);
      }
    }

    if (!response && !isEdit) {
      throw new Error('저장에 실패했습니다.');
    }

    revalidatePath(`/admin/community/boards/select-board-list`);
    const targetId = isEdit ? pstSn : extractTargetId(response, pstSn);
    
    return {
      success: true,
      message: isEdit ? '게시글이 성공적으로 수정되었습니다.' : '게시글이 성공적으로 등록되었습니다.',
      redirect: `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${targetId}`
    };
  } catch (error) {
    const message = error instanceof Error && error.message === '저장에 실패했습니다.'
      ? error.message
      : BOARD_SAVE_ERROR;
    return { success: false, message };
  }
}

export async function deleteBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstSn = formData.get('pstSn') as string;
  const bbsId = formData.get('bbsId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/boards/${bbsId}/posts/${pstSn}`, axiosConfig);
    
    revalidatePath(`/admin/community/boards/select-board-list`);
    return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
  } catch {
    return { success: false, message: BOARD_DELETE_ERROR };
  }
}

export async function likeBoardArticle(bbsId: string, pstSn: number): Promise<{ success: boolean; count?: number }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response = await client.patch<number>(`/boards/${bbsId}/posts/${pstSn}/like`, null, axiosConfig);

    if (response !== undefined) {
      return { success: true, count: response };
    } else {
      return { success: false };
    }
  } catch {
    return { success: false };
  }
}
