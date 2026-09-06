import { z } from 'zod';
import { NoteDtoSchema } from '@/types/generated-zod';

/**
 * 쪽지 작성 화면의 API/물리 스키마 경계.
 * 제목 100자는 tb_note_info.note_ttl varchar(100), 본문 4000자는 DTO/엔티티 양쪽과 같다.
 * 수신자는 쉼표 구분 다중 수신자를 지원하며, 개별 ID는 물리 컬럼(tb_note_recptn.rcvr_id varchar(20)) 상한을 따른다.
 */
export const noteComposeSchema = NoteDtoSchema.extend({
  rcverId: z.string()
    .trim()
    .min(1, '수신자를 선택해 주세요.')
    .refine((val) => {
      const ids = val.split(',').map((id) => id.trim()).filter(Boolean);
      return ids.length > 0 && ids.every((id) => id.length <= 20);
    }, '수신자 식별자가 올바르지 않습니다 (개별 최대 20자).')
    .refine((val) => {
      const ids = val.split(',').map((id) => id.trim()).filter(Boolean);
      return ids.length <= 100;
    }, '수신자는 최대 100명까지 지정할 수 있습니다.'),
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

