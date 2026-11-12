package nuri.business.service.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 사용자 화면의 신청 가능한 행사(V2_152). {@code acceptingApplications} 는 마감(마감일, 없으면 시작일)이 지나지 않았고 정원이 남았을
 * 때 참이다 — 서버의 신청 판정과 같다. {@code myStatus} 는 내 신청 상태(없으면 null)다.
 */
@Schema(description = "신청 가능한 행사")
public record OpenEventDto(
        @Schema(description = "행사일련번호") Long evntSn,
        @Schema(description = "행사명") String evntNm,
        @Schema(description = "행사내용") String evntCn,
        @Schema(description = "행사시작일자(yyyyMMdd)") String evntBgngYmd,
        @Schema(description = "행사종료일자(yyyyMMdd)") String evntEndYmd,
        @Schema(description = "담당자명") String picNm,
        @Schema(description = "정원인원수(없으면 정원 없음)") Integer pscpNope,
        @Schema(description = "신청마감일자(yyyyMMdd, 없으면 행사 시작일까지)") String aplyDdlnYmd,
        @Schema(description = "자리를 차지한 신청 수(신청·승인)") long seatsTaken,
        @Schema(description = "지금 신청을 받는가(마감 전이고 자리가 남았다)") boolean acceptingApplications,
        @Schema(description = "내 신청 상태", allowableValues = {"APPLIED", "APPROVED", "REJECTED", "CANCELLED"}) String myStatus,
        @Schema(description = "내 신청의 버전") Integer myApplicationVersion) {
}
