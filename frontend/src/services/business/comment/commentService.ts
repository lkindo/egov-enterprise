import { ApiService } from '@/services/core/ApiService';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/business/comment';
import { AxiosRequestConfig } from 'axios';
import { PageResponse } from '@/types/foundation/system';
import { CommentDtoSchema, PageResponseCommentDtoSchema } from '@/types/generated-zod';
import { z } from 'zod';

const LegacyCompatibleCommentSchema = CommentDtoSchema.extend({
  wrterId: z.preprocess((value) => value === null ? undefined : value, CommentDtoSchema.shape.wrterId),
  wrterNm: z.preprocess((value) => value === null ? undefined : value, CommentDtoSchema.shape.wrterNm),
  frstRgtrId: z.preprocess((value) => value === null ? undefined : value, CommentDtoSchema.shape.frstRgtrId),
  crtDt: z.preprocess((value) => value === null ? undefined : value, CommentDtoSchema.shape.crtDt),
});

const CommentPageBoundarySchema = PageResponseCommentDtoSchema.extend({
  list: z.array(LegacyCompatibleCommentSchema).optional(),
});

const CommentViewSchema = LegacyCompatibleCommentSchema.extend({
  ansSn: CommentDtoSchema.shape.ansSn.unwrap(),
  pstSn: CommentDtoSchema.shape.pstSn.unwrap(),
  bbsId: CommentDtoSchema.shape.bbsId.unwrap(),
  ansCn: CommentDtoSchema.shape.ansCn.unwrap(),
}).transform(({ pswd: _writeOnlyPassword, ...comment }) => ({
  ...comment,
  wrterId: comment.wrterId ?? '',
  wrterNm: comment.wrterNm ?? '작성자 정보 없음',
  crtDt: comment.crtDt ?? '',
}));

/**
 * 댓글 서비스 (Enterprise v5 Standard)
 */
class CommentService extends ApiService {
  constructor() {
    super('comments');
  }

  /** 댓글 목록 조회 */
  async getComments(params: CommentSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CommentVO>> {
    const response = await this.get<unknown>('', { ...config, params });
    const parsed = CommentPageBoundarySchema.parse(response);
    return {
      list: (parsed.list ?? []).map((comment) => CommentViewSchema.parse(comment)),
      total: parsed.total ?? 0,
      page: parsed.page ?? 1,
      size: parsed.size ?? params.size ?? 10,
      totalPage: parsed.totalPage ?? 1,
    };
  }

 /** 댓글 등록 */
 async createComment(data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<number> {
 return this.post<number>('', data, config);
 }

 /** 댓글 수정 */
 async updateComment(id: number, data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** 댓글 삭제 */
 async deleteComment(id: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const commentService = new CommentService();
