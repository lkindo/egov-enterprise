'use server';

import { extractFieldErrors } from './actionUtils';
import { cookies } from 'next/headers';
import {
  executeGeneratedMultipartOperation,
  executeGeneratedOperation,
} from '@/lib/api/generated-api-client';
import { revalidatePath } from 'next/cache';
import { QNA_BOARD_ID } from '@/config/board-ids';
import {
  createPostWithFilesOperation,
  createPostOperation,
  deletePostOperation,
  likePostOperation,
  updatePostWithFilesOperation,
  updatePostOperation,
} from '@/types/generated-operations';

const BOARD_SAVE_ERROR = '게시글 저장 중 오류가 발생했습니다.';

/**
 * 저장 실패의 사유를 사용자가 다음 행동을 고를 수 있는 말로 옮긴다. [2026-09-26 DIP V9]
 *
 * 종전 catch 는 모든 실패를 '게시글 저장 중 오류가 발생했습니다.' 한 문장으로 뭉갰다 — 권한이 없는지(403),
 * 파일이 너무 큰지(413), 형식이 틀렸는지(415), 어느 입력이 잘못됐는지(400) 사용자가 알 수 없었다.
 * 상태 코드가 없는 transport 실패는 원문(`Network Error` 등)을 싣지 않고 종전 문구로 둔다.
 */
function describeSaveFailure(error: unknown): ActionResponse {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response;
  const status = response?.status;
  if (status === 403) {
    return { success: false, message: '이 게시판에 글을 쓰거나 이 글을 고칠 권한이 없습니다.' };
  }
  if (status === 413) {
    return { success: false, message: '첨부 파일이 허용 크기를 넘습니다. 파일 크기를 줄여 다시 시도해 주세요.' };
  }
  if (status === 415) {
    return { success: false, message: '보낼 수 없는 형식의 요청입니다. 첨부 파일 형식을 확인해 주세요.' };
  }
  if (status === 400) {
    const fieldErrors = extractFieldErrors(error);
    const first = fieldErrors ? Object.entries(fieldErrors)[0] : undefined;
    if (first) {
      return { success: false, field: first[0], message: first[1] };
    }
  }
  const serverMessage = typeof response?.data?.message === 'string' ? response.data.message.trim() : '';
  if (status !== undefined && status >= 400 && status < 500 && serverMessage) {
    return { success: false, message: serverMessage };
  }
  return { success: false, message: BOARD_SAVE_ERROR };
}
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
  const pstTtl = formData.get('pstTtl') as string;
  const pstCn = formData.get('pstCn') as string;
  const bbsId = formData.get('bbsId') as string;
  const isEdit = !!pstSn && pstSn !== '';

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
  // [2026-09-25 DIP I1] 기존 첨부 번호를 싣는다. 종전에는 폼이 보내는 atchFileSn 을 여기서 버려,
  //   수정 중 파일을 더하면 서버가 새 첨부 묶음을 만들고 글을 그쪽으로 옮겨 기존 첨부가 글에서 떨어져 나갔다.
  const atchFileSnRaw = formData.get('atchFileSn');
  const atchFileSn = typeof atchFileSnRaw === 'string' && /^\d+$/.test(atchFileSnRaw)
    ? Number(atchFileSnRaw)
    : undefined;

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
      atchFileSn,
      // [2026-09-25 DIP I3] Q&A 기본 상태·분류는 **등록할 때만** 채운다. 수정 폼은 이 두 값을 보내지 않으므로
      //   종전처럼 기본값을 채우면 해결된 질문이 제목 오타 하나 고친 뒤 '접수(QA01)' 로 되돌아갔다.
      //   서버는 값이 없으면 기존 값을 유지한다(BoardService.updateOwnedPost).
      qnaSttsCd: qnaSttsCd || (!isEdit && bbsId === QNA_BOARD_ID ? 'QA01' : undefined),
      qnaCatCd: qnaCatCd || (!isEdit && bbsId === QNA_BOARD_ID ? 'CAT01' : undefined),
      pswd: pswd || '1',
      scrtYn: scrtYn === 'Y' ? 'Y' : 'N',
      useYn: useYn === 'N' ? 'N' : 'Y'
    };
    
    // Extract attached files
    const files = formData.getAll('files') as File[];
    const hasFiles = files.some(file => file && file.size > 0);

    let response: unknown;
    
    if (hasFiles) {
      const uploadFiles = files.filter((file) => file && file.size > 0);
      
      if (isEdit) {
        response = await executeGeneratedMultipartOperation(updatePostWithFilesOperation, {
          path: { bbsId, pstSn: Number(pstSn) },
          body: { board: articleData, file: uploadFiles },
          config: axiosConfig,
        });
      } else {
        response = await executeGeneratedMultipartOperation(createPostWithFilesOperation, {
          path: { bbsId },
          body: { board: articleData, file: uploadFiles },
          config: axiosConfig,
        });
      }
    } else {
      // No files? Send plain JSON. This matches @RequestBody in BoardApiController.
      if (isEdit) {
        response = await executeGeneratedOperation(updatePostOperation, {
          path: { bbsId, pstSn: Number(pstSn) },
          body: articleData,
          config: axiosConfig,
        });
      } else {
        response = await executeGeneratedOperation(createPostOperation, {
          body: articleData,
          config: axiosConfig,
        });
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
    if (error instanceof Error && error.message === '저장에 실패했습니다.') {
      return { success: false, message: error.message };
    }
    return describeSaveFailure(error);
  }
}

export async function deleteBoardArticle(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstSn = formData.get('pstSn') as string;
  const bbsId = formData.get('bbsId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await executeGeneratedOperation(deletePostOperation, {
      path: { bbsId, pstSn: Number(pstSn) },
      config: axiosConfig,
    });
    
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

    const response = await executeGeneratedOperation(likePostOperation, {
      path: { bbsId, pstSn },
      config: axiosConfig,
    });

    if (response !== undefined) {
      return { success: true, count: response };
    } else {
      return { success: false };
    }
  } catch {
    return { success: false };
  }
}
