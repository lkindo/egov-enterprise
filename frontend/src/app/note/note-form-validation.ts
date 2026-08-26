import { NoteDtoSchema, NoteRecipientDtoSchema } from '@/types/generated-zod';

/**
 * 쪽지 작성 화면의 API/물리 스키마 경계.
 * 제목 100자는 tb_note_info.note_ttl varchar(100), 본문 4000자는 DTO/엔티티 양쪽과 같다.
 */
export const noteComposeSchema = NoteDtoSchema.extend({
  rcverId: NoteRecipientDtoSchema.shape.rcverId
    .trim()
    .min(1, '수신자를 선택해 주세요.'),
  noteSj: NoteDtoSchema.shape.noteSj.unwrap()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(100),
  noteCn: NoteDtoSchema.shape.noteCn.unwrap(),
}).pick({
  rcverId: true,
  noteSj: true,
  noteCn: true,
});

