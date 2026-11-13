package nuri.business.service.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 행사 참가 신청 승인·반려 요청(V2_152). 목록에서 읽은 신청 버전을 돌려보낸다 — 다르면 다른 사람이 먼저 처리한 것이다(409).
 *
 * <p>[pack 경계] 컨트롤러는 api-server 에 있지만 이 DTO 는 행사 도메인 패키지에 둔다 — 행사 기능이 빠진 생성물에 참조처 없이
 * 남지 않게 한다(결재 임시저장 요청과 같은 선례).
 */
@Schema(description = "행사 참가 신청 승인·반려")
public record EventApplicationDecisionRequest(
        @Schema(description = "목록에서 읽은 신청 버전") @NotNull @Min(0) Integer version) {
}
