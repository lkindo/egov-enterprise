'use server';

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { revalidatePath } from 'next/cache';
import { extractErrorMessage, extractFieldErrors } from './actionUtils';

export interface ActionResponse {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

interface CreateCommentData {
  pstSn: number;
  bbsId: string;
  ansCn: string;
}

export async function createComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const pstSn = Number(formData.get('pstSn'));
  const bbsId = formData.get('bbsId') as string;
  const ansCn = formData.get('ansCn') as string;

  if (!Number.isSafeInteger(pstSn) || pstSn <= 0) {
    return { success: false, message: '유효한 게시글 번호가 필요합니다.' };
  }
  if (!ansCn || ansCn.trim() === '') {
    return {
      success: false,
      message: '댓글 내용을 입력해주세요.',
      fieldErrors: { ansCn: '댓글 내용을 입력해주세요.' },
    };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const commentData: CreateCommentData = {
      pstSn,
      bbsId,
      ansCn
    };

    // [2026-08-09 판정 정정] 종전에는 `if (response)` 로 성공을 판정했다.
    //   client 는 실패 시 **반드시 예외를 던진다** — axios 인터셉터가 HTTP 오류를 reject 하고,
    //   extractData 가 success:false 를 throw 한다. 즉 이 줄에 도달했다면 이미 성공이다.
    //   그런데 백엔드가 본문 없이 성공하면 response 가 null 이 되어 **성공을 실패로 보고**했다.
    //   사용자는 다시 누르고, 그러면 댓글이 두 개 달린다.
    //   (삭제만 `!== undefined` 로 판정해 이 문제가 없었다 — 셋의 판정이 비대칭이었다.)
    await client.post(`/comments`, commentData, axiosConfig);

    revalidatePath(`/admin/community/boards/detail`);
    return { success: true, message: '댓글이 등록되었습니다.' };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '오류가 발생했습니다.');
    const fieldErrors = extractFieldErrors(error);
    return {
      success: false,
      message: errorMessage,
      ...(fieldErrors ? { fieldErrors } : {}),
    };
  }
}

export async function deleteComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  const bbsId = formData.get('bbsId') as string;
  const pstSn = Number(formData.get('pstSn'));

  if (!Number.isSafeInteger(pstSn) || pstSn <= 0) {
    return { success: false, message: '유효한 게시글 번호가 필요합니다.' };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/comments/${id}`, axiosConfig);

    revalidatePath(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);
    return { success: true, message: '댓글이 삭제되었습니다.' };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '삭제 중 오류가 발생했습니다.');
    return { success: false, message: errorMessage };
  }
}

export async function updateComment(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  const bbsId = formData.get('bbsId') as string;
  const pstSn = Number(formData.get('pstSn'));
  const ansCn = formData.get('ansCn') as string;

  if (!Number.isSafeInteger(pstSn) || pstSn <= 0) {
    return { success: false, message: '유효한 게시글 번호가 필요합니다.' };
  }
  if (!ansCn || ansCn.trim() === '') {
    return {
      success: false,
      message: '댓글 내용을 입력해주세요.',
      fieldErrors: { ansCn: '댓글 내용을 입력해주세요.' },
    };
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const commentData = {
      pstSn,
      bbsId,
      ansCn
    };

    await client.put(`/comments/${id}`, commentData, axiosConfig);

    revalidatePath(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);
    return { success: true, message: '댓글이 수정되었습니다.' };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '수정 중 오류가 발생했습니다.');
    const fieldErrors = extractFieldErrors(error);
    return {
      success: false,
      message: errorMessage,
      ...(fieldErrors ? { fieldErrors } : {}),
    };
  }
}
