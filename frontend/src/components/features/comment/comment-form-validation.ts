import { CommentDtoSchema } from '@/types/generated-zod';

const postIdSchema = CommentDtoSchema.shape.pstSn
  .unwrap()
  .int('게시글 번호는 정수여야 합니다.')
  .positive('유효한 게시글 번호가 필요합니다.');

const boardIdSchema = CommentDtoSchema.shape.bbsId
  .unwrap()
  .trim()
  .min(1, '게시판 ID가 필요합니다.')
  .max(20, '게시판 ID는 최대 20자까지 입력할 수 있습니다.');

// DTO에 누락된 문자열 길이는 실제 Comment entity @Column(length=4000)을 미러링한다.
const commentContentSchema = CommentDtoSchema.shape.ansCn
  .unwrap()
  .trim()
  .min(1, '댓글 내용을 입력해 주세요.')
  .max(4000, '댓글 내용은 최대 4000자까지 입력할 수 있습니다.');

export const commentCreateFormSchema = CommentDtoSchema.pick({
  pstSn: true,
  bbsId: true,
  ansCn: true,
}).extend({
  pstSn: postIdSchema,
  bbsId: boardIdSchema,
  ansCn: commentContentSchema,
});

export const commentEditFormSchema = CommentDtoSchema.pick({
  pstSn: true,
  bbsId: true,
}).extend({
  pstSn: postIdSchema,
  bbsId: boardIdSchema,
  editCn: commentContentSchema,
});

export const commentCreateValidationLabels = {
  ansCn: '댓글 내용',
  bbsId: '게시판',
  pstSn: '게시글',
};

export const commentEditValidationLabels = {
  bbsId: '게시판',
  editCn: '댓글 수정 내용',
  pstSn: '게시글',
};

export function mapCommentEditFieldErrors(errors: Record<string, string>) {
  const mapped = { ...errors };
  if (mapped.ansCn && !mapped.editCn) mapped.editCn = mapped.ansCn;
  delete mapped.ansCn;
  return mapped;
}

