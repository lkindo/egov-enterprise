/**
 * 공통코드 관리 화면의 폼 스키마와 오류 요약 라벨.
 *
 * 폼 상태·제출·잠금은 CommonCodeClient 가 소유한다. 이 파일은 검증 규칙만 둔다.
 */
import { z } from 'zod';
import { CmmnClCodeDtoSchema, CmmnCodeDtoSchema, CmmnDetailCodeDtoSchema } from '@/types/generated-zod';

export const codeDetailFormSchema = CmmnDetailCodeDtoSchema.extend({
 dtlCd: CmmnDetailCodeDtoSchema.shape.dtlCd
  .unwrap()
  .trim()
  .min(1, '코드 식별자를 입력해 주세요.')
  .max(12, '코드 식별자는 12자 이하여야 합니다.'),
 dtlCdNm: CmmnDetailCodeDtoSchema.shape.dtlCdNm
  .unwrap()
  .trim()
  .min(1, '표기 레이블을 입력해 주세요.')
  .max(100, '표기 레이블은 100자 이하여야 합니다.'),
 dtlCdExpln: CmmnDetailCodeDtoSchema.shape.dtlCdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

export const CODE_DETAIL_FIELD_LABELS = {
 dtlCd: '코드 식별자',
 dtlCdNm: '표기 레이블',
 dtlCdExpln: '메타데이터 컨텍스트 설명',
 useYn: '활성 상태',
 'root.server': '저장 요청',
};

/**
 * 코드 분류(cluster) 폼.
 *
 * 서버 DTO(CmmnClCodeDto)는 clsfCd·clsfCdNm 을 @Size 로만 제한하지만, 둘 다 비면
 * insertCmmnClCode 의 required(...) 가 500 계열로 죽는다. 화면에서 먼저 막는다.
 */
export const codeClusterFormSchema = CmmnClCodeDtoSchema.extend({
 clsfCd: CmmnClCodeDtoSchema.shape.clsfCd
  .unwrap()
  .trim()
  .min(1, '분류 코드를 입력해 주세요.')
  .max(12, '분류 코드는 12자 이하여야 합니다.'),
 clsfCdNm: CmmnClCodeDtoSchema.shape.clsfCdNm
  .unwrap()
  .trim()
  .min(1, '분류명을 입력해 주세요.')
  .max(100, '분류명은 100자 이하여야 합니다.'),
 clsfCdExpln: CmmnClCodeDtoSchema.shape.clsfCdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

export const CODE_CLUSTER_FIELD_LABELS = {
 clsfCd: '분류 코드',
 clsfCdNm: '분류명',
 clsfCdExpln: '분류 설명',
 useYn: '사용 여부',
 'root.server': '저장 요청',
};

/**
 * 코드 그룹 폼.
 *
 * clsfCd(소속 분류)는 **등록할 때만** 반영된다 — 서버의 updateCmmnCode 는 명칭·설명·사용여부만
 * 갱신하고 소속 분류는 건드리지 않는다(CommonCodeGroup#update). 그래서 수정 화면에서는 읽기
 * 전용으로 보여 주고, 분류 간 이동은 탐색기 드래그앤드롭 + '그룹 소속 저장' 경로가 담당한다.
 */
export const codeGroupFormSchema = CmmnCodeDtoSchema.extend({
 cdId: CmmnCodeDtoSchema.shape.cdId
  .unwrap()
  .trim()
  .min(1, '그룹 코드를 입력해 주세요.')
  .max(20, '그룹 코드는 20자 이하여야 합니다.'),
 cdIdNm: CmmnCodeDtoSchema.shape.cdIdNm
  .unwrap()
  .trim()
  .min(1, '그룹명을 입력해 주세요.')
  .max(100, '그룹명은 100자 이하여야 합니다.'),
 cdIdExpln: CmmnCodeDtoSchema.shape.cdIdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 clsfCd: CmmnCodeDtoSchema.shape.clsfCd
  .unwrap()
  .trim()
  .min(1, '소속 분류를 선택해 주세요.')
  .max(12, '분류 코드는 12자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

export const CODE_GROUP_FIELD_LABELS = {
 cdId: '그룹 코드',
 cdIdNm: '그룹명',
 cdIdExpln: '그룹 설명',
 clsfCd: '소속 분류',
 useYn: '사용 여부',
 'root.server': '저장 요청',
};
