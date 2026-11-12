package nuri.business.service.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.event.EventApplication;

import java.time.LocalDateTime;

/** 행사 참가 신청 한 건(V2_152). 신청자 이름은 관리 목록에만 싣는다(신청자 본인 응답은 null). */
@Schema(description = "행사 참가 신청")
public record EventApplicationDto(
        @Schema(description = "행사신청일련번호") Long evntAplySn,
        @Schema(description = "행사일련번호") Long evntSn,
        @Schema(description = "신청자 esntlId") String aplcntId,
        @Schema(description = "신청자 이름(관리 목록만)") String aplcntNm,
        @Schema(description = "신청상태코드", allowableValues = {"APPLIED", "APPROVED", "REJECTED", "CANCELLED"}) String aplySttsCd,
        @Schema(description = "신청일시") LocalDateTime aplyDt,
        @Schema(description = "승인·반려 일시") LocalDateTime aplyPrcsDt,
        @Schema(description = "취소 일시") LocalDateTime aplyRtrcnDt,
        @Schema(description = "버전(승인·반려 요청에 돌려보낸다)") Integer version) {

    public static EventApplicationDto from(EventApplication application, String applicantName) {
        return new EventApplicationDto(application.getEvntAplySn(), application.getEvntSn(), application.getAplcntId(),
                applicantName, application.getAplySttsCd(), application.getAplyDt(), application.getAplyPrcsDt(),
                application.getAplyRtrcnDt(), application.getVersion());
    }
}
