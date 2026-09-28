import type { components, operations } from '@/types/generated-api';

type GeneratedCommentDto = components['schemas']['CommentDto'];

/** generated CommentDto 중 화면 렌더링·수정 식별에 반드시 필요한 응답 필드. */
export interface CommentVO extends GeneratedCommentDto {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  wrterNm: string;
  /** 응답을 만든 서버의 소유권·기능권한 판정. 쓰기 API는 다시 검증한다. */
  editable?: boolean;
  deletable?: boolean;
  ansCn: string;
  crtDt: string;
}

export interface CommentSaveRequest {
  pstSn: number;
  bbsId: string;
  ansCn: string;
  pswd?: string;
}

export type CommentSearchParams = operations['getComments']['parameters']['query'];
