package nuri.business.service.system.service.survey.dto;

import lombok.Builder;
import nuri.business.domain.system.service.survey.SurveyResult;

import java.time.LocalDateTime;

/**
 * 설문 응답(`tb_srvy_rslt`) 1건 — 조회 전용.
 *
 * <p>이 테이블은 <b>(설문 × 문항 × 항목)</b> 단위의 개별 응답 레코드다. 응답자 신상은 여기에
 * 없고 별도 테이블({@code tb_srvy_rspdnt} → {@link SurveyRespondentDto})에 있으며, <b>두 테이블은
 * ID 로 연결돼 있지 않다</b> — 이쪽은 {@code rspnsNm}(이름 문자열)만 갖는다(물리 스키마 실측
 * 2026-08-05). 그래서 "이 응답이 누구 것인가" 는 감사 컬럼 {@code frstRgtrId} 로만 확정된다.
 */
@Builder
public record SurveyResultDto(
        /** 응답 ID (PK) */
        String srvyRspnsId,
        /** 설문 ID */
        String srvyId,
        /** 설문 템플릿 ID */
        String srvyTmpltId,
        /** 문항 ID */
        String srvyQstnId,
        /** 항목 ID */
        String srvyArtclId,
        /** 응답 내용 (주관식 답변 또는 선택 항목 내용) */
        String rspdntAnsCn,
        /** 응답자명 */
        String rspnsNm,
        /** 기타 답변 */
        String etcAnsCn,
        /** 제출자 ID (감사 컬럼 @CreatedBy) */
        String frstRgtrId,
        /** 제출 일시 */
        LocalDateTime crtDt
) {

    /** 엔티티 → DTO. 조회 전용이라 역방향은 두지 않는다. */
    public static SurveyResultDto from(SurveyResult entity) {
        return SurveyResultDto.builder()
                .srvyRspnsId(entity.getSrvyRspnsId())
                .srvyId(entity.getSrvyId())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .srvyQstnId(entity.getSrvyQstnId())
                .srvyArtclId(entity.getSrvyArtclId())
                .rspdntAnsCn(entity.getRspdntAnsCn())
                .rspnsNm(entity.getRspnsNm())
                .etcAnsCn(entity.getEtcAnsCn())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
